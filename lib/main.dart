import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';
import 'router/auth_gate.dart';

void main() {
  runApp(const ZamamKitchenApp());
}

class ZamamKitchenApp extends StatelessWidget {
  const ZamamKitchenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Zamam Kitchen Platform',
      theme: ZamamTheme.lightTheme,
      darkTheme: ZamamTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const AuthGate(),
      debugShowCheckedModeBanner: false,
    );
  }
}
