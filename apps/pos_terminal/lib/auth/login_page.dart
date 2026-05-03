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
        Uri.parse('https://zamzamkitchen.net/api/auth/login'),
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
          backgroundColor: isDark ? const Color(0xFF0F0F0F) : theme.scaffoldBackgroundColor,
          body: Stack(
            children: [
              // Background Gradient
              Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.center,
                    radius: 1.5,
                    colors: [
                      themePrimary.withValues(alpha: 0.1),
                      isDark ? Colors.black : theme.scaffoldBackgroundColor,
                    ],
                  ),
                ),
              ),
              
              Center(
                child: SingleChildScrollView(
                  child: Container(
                    width: 450,
                    padding: const EdgeInsets.all(40),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withValues(alpha: 0.05) : theme.cardColor,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: isDark ? Colors.white.withValues(alpha: 0.1) : theme.dividerColor),
                      boxShadow: isDark ? [] : [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, spreadRadius: 5)
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Pulsing Logo
                        ScaleTransition(
                          scale: _pulseAnimation,
                          child: Container(
                            height: 120,
                            width: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: themePrimary.withValues(alpha: 0.3),
                                  blurRadius: 30,
                                  spreadRadius: 10,
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(60),
                              child: Image.asset(
                                'packages/pos_terminal/assets/images/logo.png',
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return Icon(Icons.restaurant, color: themePrimary, size: 60);
                                },
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          loc.translate('restaurant_name').toUpperCase(),
                          style: TextStyle(
                            color: isDark ? Colors.white : theme.textTheme.headlineMedium?.color,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                        Text(
                          loc.translate('mission_control_pos'),
                          style: TextStyle(
                            color: isDark ? Colors.white60 : theme.textTheme.bodySmall?.color,
                            fontSize: 14,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 48),
                        
                        // Form Fields
                        _buildTextField(
                          controller: _usernameController,
                          label: loc.translate('username'),
                          icon: Icons.person_outline,
                          themePrimary: themePrimary,
                          isDark: isDark,
                          theme: theme,
                        ),
                        const SizedBox(height: 20),
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
                            padding: const EdgeInsets.only(top: 20),
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: Colors.redAccent, fontSize: 13),
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
                              backgroundColor: themePrimary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 8,
                              shadowColor: themePrimary.withValues(alpha: 0.4),
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
                                : Text(
                                    loc.translate('authenticate').toUpperCase(),
                                    style: const TextStyle(
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
                            loc.translate('forgot_password'),
                            style: TextStyle(color: isDark ? Colors.white38 : theme.textTheme.bodySmall?.color),
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
                  'v3.1.0-MODERNIZED',
                  style: TextStyle(color: isDark ? Colors.white12 : theme.dividerColor, fontSize: 10),
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
        color: isDark ? Colors.white.withValues(alpha: 0.05) : theme.scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword,
        style: TextStyle(color: isDark ? Colors.white : theme.textTheme.bodyLarge?.color),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: isDark ? Colors.white38 : theme.textTheme.bodySmall?.color),
          prefixIcon: Icon(icon, color: themePrimary.withValues(alpha: 0.7)),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: themePrimary, width: 1),
          ),
          contentPadding: const EdgeInsets.symmetric(vertical: 18),
        ),
      ),
    );
  }
}
