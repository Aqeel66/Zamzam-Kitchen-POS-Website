import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pos_terminal/dashboard/pos_mission_control.dart';
import 'package:pos_terminal/theme_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Fetch branding on startup
    _fetchBranding();
  }

  Future<void> _fetchBranding() async {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final response = await http
          .get(
            Uri.parse('${ThemeService.apiBaseUrl}/api/settings?t=$timestamp'),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final tenant = data['tenant'];
        if (tenant != null) {
          ThemeService.instance.setFlavorFromString(
            tenant['theme_mode'] ?? 'dark',
            loginBackgroundUrl: tenant['login_background_url'],
            restaurantName: tenant['restaurant_name'] ?? 'ZAMZAM KITCHEN',
            tagline: tenant['tagline'] ?? 'Universal Access Portal',
            logoUrl: tenant['logo_url'],
            secondaryLogoUrl: tenant['secondary_logo_url'],
          );
          if (mounted) setState(() {});
        }
      }
    } catch (e) {
      debugPrint('LoginPage: Branding Sync Error: $e');
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await http.post(
        Uri.parse('${ThemeService.apiBaseUrl}/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': _usernameController.text.trim(),
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => POSMissionControl(
                onLogout: (ctx) {
                  Navigator.of(ctx).pushReplacement(
                    MaterialPageRoute(builder: (context) => const LoginPage()),
                  );
                },
              ),
            ),
          );
        }
      } else {
        final data = jsonDecode(response.body);
        setState(() {
          _errorMessage = data['message'] ?? 'Login failed';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Connection error. Please check backend.';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accentColor = theme.primaryColor;
    final textColor = isDark ? Colors.white : Colors.black87;
    final subTextColor = isDark ? Colors.white60 : Colors.black54;

    final themePrimary = theme.primaryColor;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Background Image or Gradient
          Positioned.fill(
            child: ThemeService.instance.loginBackgroundUrl != null
                ? Image.network(
                    ThemeService.instance.loginBackgroundUrl!.startsWith('http')
                        ? '${ThemeService.instance.loginBackgroundUrl!}?t=${DateTime.now().millisecondsSinceEpoch}'
                        : '${ThemeService.apiBaseUrl}/assets/${ThemeService.instance.loginBackgroundUrl!}?t=${DateTime.now().millisecondsSinceEpoch}',
                    fit: BoxFit.cover,
                    color: Colors.black.withValues(alpha: 0.6),
                    colorBlendMode: BlendMode.darken,
                    errorBuilder: (context, error, stackTrace) =>
                        _buildDefaultBackground(theme, themePrimary),
                  )
                : _buildDefaultBackground(theme, themePrimary),
          ),

          Center(
            child: SingleChildScrollView(
              child: Container(
                width: 480,
                padding: const EdgeInsets.all(40),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.05)
                      : theme.cardColor.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.1)
                        : theme.dividerColor.withValues(alpha: 0.2),
                  ),
                  boxShadow: !isDark
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 20,
                            spreadRadius: 5,
                          ),
                        ]
                      : null,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Dual Logos Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Primary Logo
                        _buildLogoCircle(
                          ThemeService.instance.logoUrl,
                          accentColor,
                          isDark,
                          _pulseAnimation,
                        ),

                        // Secondary Logo
                        if (ThemeService.instance.secondaryLogoUrl != null) ...[
                          const SizedBox(width: 20),
                          _buildLogoCircle(
                            ThemeService.instance.secondaryLogoUrl,
                            accentColor,
                            isDark,
                            null,
                            isSecondary: true,
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 32),
                    Text(
                      ThemeService.instance.restaurantName.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: textColor,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      ThemeService.instance.tagline,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: subTextColor,
                        fontSize: 14,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 48),

                    // Form Fields
                    _buildTextField(
                      controller: _usernameController,
                      label: 'Username',
                      icon: Icons.person_outline,
                      accentColor: accentColor,
                      isDark: isDark,
                      textColor: textColor,
                      subTextColor: subTextColor,
                    ),
                    const SizedBox(height: 20),
                    _buildTextField(
                      controller: _passwordController,
                      label: 'Password',
                      icon: Icons.lock_outline,
                      isPassword: true,
                      accentColor: accentColor,
                      isDark: isDark,
                      textColor: textColor,
                      subTextColor: subTextColor,
                    ),

                    if (_errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 20),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: Colors.redAccent,
                            fontSize: 13,
                          ),
                        ),
                      ),

                    const SizedBox(height: 40),

                    // Login Button
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: accentColor,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 8,
                          shadowColor: accentColor.withValues(alpha: 0.4),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                'AUTHENTICATE',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.5,
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 24),
                    TextButton(
                      onPressed: () {},
                      child: Text(
                        'Forgot Password?',
                        style: TextStyle(color: subTextColor),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultBackground(ThemeData theme, Color themePrimary) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            theme.scaffoldBackgroundColor,
            theme.scaffoldBackgroundColor.withValues(alpha: 0.9),
            themePrimary.withValues(alpha: 0.25),
            theme.scaffoldBackgroundColor.withValues(alpha: 0.8),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoCircle(
    String? url,
    Color accentColor,
    bool isDark,
    Animation<double>? pulse, {
    bool isSecondary = false,
  }) {
    final logoWidget = Container(
      height: isSecondary ? 80 : 120,
      width: isSecondary ? 80 : 120,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.transparent,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(isSecondary ? 40 : 60),
        child: url != null && url.isNotEmpty
            ? Image.network(
                url.startsWith('http')
                    ? url
                    : '${ThemeService.apiBaseUrl}/assets/$url',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Icon(
                  isSecondary ? Icons.verified : Icons.restaurant,
                  color: accentColor,
                  size: isSecondary ? 40 : 60,
                ),
              )
            : Image.asset(
                'packages/pos_terminal/assets/images/logo.png',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Icon(
                  isSecondary ? Icons.verified : Icons.restaurant,
                  color: accentColor,
                  size: isSecondary ? 40 : 60,
                ),
              ),
      ),
    );

    if (pulse != null) {
      return ScaleTransition(scale: pulse, child: logoWidget);
    }
    return logoWidget;
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required Color accentColor,
    required bool isDark,
    required Color textColor,
    required Color subTextColor,
    bool isPassword = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : Colors.black.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.black12),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword,
        style: TextStyle(color: textColor, fontSize: 16),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: subTextColor, fontSize: 14),
          prefixIcon: Icon(
            icon,
            color: accentColor.withValues(alpha: 0.8),
            size: 22,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: accentColor, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 20),
        ),
      ),
    );
  }
}
