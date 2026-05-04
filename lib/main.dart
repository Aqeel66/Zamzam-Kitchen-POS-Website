import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:pos_terminal/theme_service.dart';
import 'router/auth_gate.dart';

void main() {
  runApp(const ZamamKitchenApp());
}

class ZamamKitchenApp extends StatefulWidget {
  const ZamamKitchenApp({super.key});

  @override
  State<ZamamKitchenApp> createState() => _ZamamKitchenAppState();
}

class _ZamamKitchenAppState extends State<ZamamKitchenApp> {
  @override
  void initState() {
    super.initState();
    ThemeService.instance.addListener(_updateTheme);
  }

  @override
  void dispose() {
    ThemeService.instance.removeListener(_updateTheme);
    super.dispose();
  }

  void _updateTheme() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: ThemeService.instance.restaurantName,
      theme: ThemeService.instance.currentTheme,
      darkTheme: ThemeService.instance.currentTheme, // Using current theme for both for now to ensure consistency
      themeMode: ThemeService.instance.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      home: const AuthGate(),
      debugShowCheckedModeBanner: false,
    );
  }
}
