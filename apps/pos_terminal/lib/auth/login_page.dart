import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pos_terminal/theme_service.dart';
import 'package:pos_terminal/localization_service.dart';
import '../dashboard/pos_mission_control.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> with SingleTickerProviderStateMixin {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  String? _syncError;
  bool _isSyncing = false;
  
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

    // Give the app a moment to settle before fetching branding
    Future.delayed(const Duration(milliseconds: 500), () {
      if (mounted) _fetchBranding();
    });
  }


  Future<void> _fetchBranding() async {
    setState(() {
      _isSyncing = true;
      _syncError = null;
    });
    try {
      final cacheBuster = DateTime.now().millisecondsSinceEpoch;
      final url = '${ThemeService.apiBaseUrl}/api/settings?t=$cacheBuster';
      debugPrint('LoginPage: Fetching branding from $url');
      
      final response = await http.get(
        Uri.parse(url),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final tenant = data['tenant'];
        
        if (tenant != null) {
          ThemeService().setFlavorFromString(
            tenant['theme_mode'] ?? 'dark',
            accentColorHex: tenant['primary_accent_color'],
            logoUrl: tenant['logo_url'],
            secondaryLogoUrl: tenant['secondary_logo_url'],
            restaurantName: tenant['restaurant_name'] ?? tenant['business_name'] ?? 'ZAMZAM KITCHEN',
            tagline: tenant['tagline'] ?? 'Universal Access Portal',
          );
          
          if (mounted) setState(() {});
        }
      } else {
        setState(() => _syncError = 'API Error ${response.statusCode}');
      }
    } catch (e) {
      setState(() => _syncError = 'Connection Error: $e');
    } finally {
      if (mounted) setState(() => _isSyncing = false);
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

          final data = jsonDecode(response.body);
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => POSMissionControl(
                user: data['user'],
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
          _errorMessage = data['message'] ?? LocalizationService().translate('login_failed');
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = LocalizationService().translate('connection_error');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final theme = ThemeService().themeData;
        final themePrimary = theme.primaryColor;
        final loc = LocalizationService();
        final isDark = ThemeService().isDarkMode;

        return Scaffold(
          backgroundColor: theme.scaffoldBackgroundColor,
          body: Stack(
            children: [
              // Background Gradient - Enhanced to be more reactive
              Container(
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
              ),

              // Manual Sync Button
              Positioned(
                top: 24,
                left: 24,
                child: IconButton(
                  icon: Icon(Icons.sync, color: themePrimary.withValues(alpha: 0.5)),
                  onPressed: _fetchBranding,
                  tooltip: 'Sync Branding',
                ),
              ),
              
              // Decorative background shapes
              Positioned(
                top: -150,
                right: -150,
                child: Container(
                  width: 400,
                  height: 400,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: themePrimary.withValues(alpha: 0.08),
                  ),
                ),
              ),

              Positioned(
                bottom: -100,
                left: -100,
                child: Container(
                  width: 300,
                  height: 300,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: themePrimary.withValues(alpha: 0.05),
                  ),
                ),
              ),
              
              Center(
                child: SingleChildScrollView(
                  child: Container(
                    width: 480,
                    padding: const EdgeInsets.all(48),
                    decoration: BoxDecoration(
                      color: isDark ? theme.cardColor.withValues(alpha: 0.85) : theme.cardColor,
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: themePrimary.withValues(alpha: 0.2)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2), 
                          blurRadius: 50, 
                          spreadRadius: -10
                        )
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Branding Logos
                        ScaleTransition(
                          scale: _pulseAnimation,
                          child: Wrap(
                            alignment: WrapAlignment.center,
                            spacing: 32,
                            runSpacing: 20,
                            children: [
                              _buildLogoCircle(ThemeService().logoUrl, themePrimary, isDark),
                              if (ThemeService().secondaryLogoUrl != null && ThemeService().secondaryLogoUrl!.isNotEmpty)
                                _buildLogoCircle(ThemeService().secondaryLogoUrl, themePrimary, isDark),
                            ],
                          ),
                        ),
                        const SizedBox(height: 40),
                        Text(
                          ThemeService().restaurantName.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isDark ? Colors.white : theme.textTheme.headlineMedium?.color,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          (ThemeService().tagline != null && ThemeService().tagline!.isNotEmpty)
                              ? ThemeService().tagline!
                              : loc.translate('mission_control_pos'),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: isDark ? Colors.white.withValues(alpha: 0.8) : theme.primaryColor.withValues(alpha: 0.8),
                            fontSize: 14,
                            fontStyle: FontStyle.italic,
                            letterSpacing: 2.0,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 56),
                        
                        // Form Fields
                        _buildTextField(
                          controller: _usernameController,
                          label: loc.translate('username'),
                          icon: Icons.person_outline,
                          themePrimary: themePrimary,
                          isDark: isDark,
                          theme: theme,
                        ),
                        const SizedBox(height: 24),
                        _buildTextField(
                          controller: _passwordController,
                          label: loc.translate('password'),
                          icon: Icons.lock_outline,
                          isPassword: true,
                          themePrimary: themePrimary,
                          isDark: isDark,
                          theme: theme,
                        ),
                        
                        if (_errorMessage != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 24),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.redAccent.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ),
                        
                        const SizedBox(height: 48),
                        
                        // Login Button
                        SizedBox(
                          width: double.infinity,
                          height: 60,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: themePrimary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 12,
                              shadowColor: themePrimary.withValues(alpha: 0.5),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 28,
                                    width: 28,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 3,
                                    ),
                                  )
                                : Text(
                                    loc.translate('authenticate').toUpperCase(),
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 2,
                                    ),
                                  ),
                          ),
                        ),
                        
                        const SizedBox(height: 32),
                        TextButton(
                          onPressed: () {},
                          child: Text(
                            loc.translate('forgot_password'),
                            style: TextStyle(
                              color: isDark ? Colors.white38 : theme.textTheme.bodySmall?.color,
                              fontSize: 13,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              
              // Version info
              Positioned(
                bottom: 24,
                right: 24,
                child: Text(
                  'v3.1.2-PREMIUM',
                  style: TextStyle(
                    color: isDark ? Colors.white12 : theme.dividerColor, 
                    fontSize: 10,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required Color themePrimary,
    required bool isDark,
    required ThemeData theme,
    bool isPassword = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.05) : theme.scaffoldBackgroundColor.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : theme.dividerColor),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword,
        style: TextStyle(color: isDark ? Colors.white : theme.textTheme.bodyLarge?.color, fontSize: 16),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: isDark ? Colors.white38 : theme.textTheme.bodySmall?.color, fontSize: 14),
          prefixIcon: Icon(icon, color: themePrimary.withValues(alpha: 0.8), size: 22),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: themePrimary, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 20),
        ),
      ),
    );
  }
  
  Widget _buildLogoCircle(String? url, Color themePrimary, bool isDark) {
    return Container(
      height: 120,
      width: 120,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
        border: Border.all(color: themePrimary.withValues(alpha: 0.3), width: 2),
        boxShadow: [
          BoxShadow(
            color: themePrimary.withValues(alpha: 0.15),
            blurRadius: 25,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(60),
        child: url != null && url.isNotEmpty
          ? Image.network(
              url,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return Center(
                  child: CircularProgressIndicator(
                    value: loadingProgress.expectedTotalBytes != null
                        ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                        : null,
                    strokeWidth: 2,
                    color: themePrimary.withValues(alpha: 0.5),
                  ),
                );
              },
              errorBuilder: (context, error, stackTrace) {
                debugPrint('LoginPage: Failed to load logo from $url');
                return Icon(Icons.restaurant, color: themePrimary, size: 50);
              },
            )
          : Image.asset(
              'packages/pos_terminal/assets/images/logo.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) => Icon(Icons.restaurant, color: themePrimary, size: 50),
            ),
      ),
    );
  }
}
