import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

enum AppThemeFlavor { light, dark, midnightBlue, emeraldGreen, auraPurple }

class ThemeService extends ChangeNotifier {
  static final ThemeService _instance = ThemeService._internal();
  factory ThemeService() => _instance;
  ThemeService._internal();

  AppThemeFlavor _currentFlavor = AppThemeFlavor.dark;

  AppThemeFlavor get currentFlavor => _currentFlavor;

  void setFlavor(AppThemeFlavor flavor) {
    debugPrint('ThemeService: Setting flavor to $flavor');
    if (_currentFlavor != flavor) {
      _currentFlavor = flavor;
      notifyListeners();
      debugPrint('ThemeService: Notified listeners for flavor $flavor');
    }
  }

  void setFlavorFromString(String? flavorStr) {
    if (flavorStr == null) return;
    
    switch (flavorStr.toLowerCase()) {
      case 'light':
        setFlavor(AppThemeFlavor.light);
        break;
      case 'dark':
        setFlavor(AppThemeFlavor.dark);
        break;
      case 'midnight blue':
        setFlavor(AppThemeFlavor.midnightBlue);
        break;
      case 'emerald green':
        setFlavor(AppThemeFlavor.emeraldGreen);
        break;
      case 'aura purple':
        setFlavor(AppThemeFlavor.auraPurple);
        break;
      default:
        // Default to dark if unknown
        setFlavor(AppThemeFlavor.dark);
    }
  }

  ThemeData get themeData {
    switch (_currentFlavor) {
      case AppThemeFlavor.light:
        return ZamamTheme.lightTheme;
      case AppThemeFlavor.dark:
        return ZamamTheme.darkTheme;
      case AppThemeFlavor.midnightBlue:
        return ZamamTheme.midnightBlueTheme;
      case AppThemeFlavor.emeraldGreen:
        return ZamamTheme.emeraldGreenTheme;
      case AppThemeFlavor.auraPurple:
        return ZamamTheme.auraPurpleTheme;
    }
  }

  bool get isDarkMode {
    return _currentFlavor != AppThemeFlavor.light;
  }
}
