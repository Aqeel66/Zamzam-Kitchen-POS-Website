import 'package:flutter/material.dart';

class ZamamTheme {
  // Primary 'Pulse Orange' accent
  static const Color pulseOrange = Color(0xFFF15A24);

  // Adaptive Typography: Manrope for headlines, Inter for data displays
  static TextTheme getTextTheme({required bool isDark}) {
    return TextTheme(
      displayLarge: const TextStyle(fontWeight: FontWeight.bold, fontSize: 32),
      displayMedium: const TextStyle(fontWeight: FontWeight.bold, fontSize: 24),
      titleLarge: const TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
      bodyLarge: const TextStyle(fontSize: 16),
      bodyMedium: const TextStyle(fontSize: 14),
      labelSmall: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
    ).apply(
      bodyColor: isDark ? Colors.white : Colors.black87,
      displayColor: isDark ? Colors.white : Colors.black,
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: pulseOrange,
      scaffoldBackgroundColor: const Color(0xFFF5F5F5),
      colorScheme: const ColorScheme.light(
        primary: pulseOrange,
        secondary: pulseOrange,
        surface: Colors.white,
      ),
      textTheme: getTextTheme(isDark: false),
      tabBarTheme: const TabBarThemeData(
        labelColor: pulseOrange,
        unselectedLabelColor: Colors.black54,
        indicatorColor: pulseOrange,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        color: Colors.white,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: pulseOrange,
      scaffoldBackgroundColor: const Color(0xFF1B1411), // Old Dark Brown
      cardColor: const Color(0xFF2A201C), // Matching Card Brown
      colorScheme: const ColorScheme.dark(
        primary: pulseOrange,
        secondary: pulseOrange,
        surface: Color(0xFF2A201C),
      ),
      textTheme: getTextTheme(isDark: true),
      tabBarTheme: TabBarThemeData(
        labelColor: pulseOrange,
        unselectedLabelColor: Colors.white70,
        indicatorColor: pulseOrange,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF2A201C),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        color: const Color(0xFF2A201C),
      ),
    );
  }

  static ThemeData get midnightBlueTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF00D2FF),
      scaffoldBackgroundColor: const Color(0xFF0A192F),
      cardColor: const Color(0xFF112240),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF00D2FF),
        secondary: Color(0xFF64FFDA),
        surface: Color(0xFF112240),
        onSurface: Colors.white,
      ),
      textTheme: getTextTheme(isDark: true),
      tabBarTheme: const TabBarThemeData(
        labelColor: Color(0xFF00D2FF),
        unselectedLabelColor: Colors.white60,
        indicatorColor: Color(0xFF00D2FF),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF112240),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        color: const Color(0xFF112240),
      ),
    );
  }

  static ThemeData get emeraldGreenTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF10B981),
      scaffoldBackgroundColor: const Color(0xFF064E3B),
      cardColor: const Color(0xFF065F46),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF10B981),
        secondary: Color(0xFF34D399),
        surface: Color(0xFF065F46),
        onSurface: Colors.white,
      ),
      textTheme: getTextTheme(isDark: true),
      tabBarTheme: const TabBarThemeData(
        labelColor: Color(0xFF10B981),
        unselectedLabelColor: Colors.white60,
        indicatorColor: Color(0xFF10B981),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF065F46),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        color: const Color(0xFF065F46),
      ),
    );
  }

  static ThemeData get auraPurpleTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF8B5CF6),
      scaffoldBackgroundColor: const Color(0xFF2D1B69),
      cardColor: const Color(0xFF3C2A85),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF8B5CF6),
        secondary: Color(0xFFA78BFA),
        surface: Color(0xFF3C2A85),
        onSurface: Colors.white,
      ),
      textTheme: getTextTheme(isDark: true),
      tabBarTheme: const TabBarThemeData(
        labelColor: Color(0xFF8B5CF6),
        unselectedLabelColor: Colors.white60,
        indicatorColor: Color(0xFF8B5CF6),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF3C2A85),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        color: const Color(0xFF3C2A85),
      ),
    );
  }
}
