import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';
import 'package:flutter/foundation.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cached_network_image/cached_network_image.dart';

enum AppThemeFlavor {
  light,
  dark,
  midnightBlue,
  navyBlue,
  emeraldGreen,
  auraPurple,
}

final presets = [
  {'name': 'Pulse Orange', 'color': const Color(0xFFF15A24), 'hex': '#F15A24'},
  {'name': 'Navy Blue', 'color': const Color(0xFF1E3A8A), 'hex': '#1E3A8A'},
  {'name': 'Ocean Blue', 'color': const Color(0xFF0EA5E9), 'hex': '#0EA5E9'},
  {'name': 'Emerald', 'color': const Color(0xFF10B981), 'hex': '#10B981'},
  {'name': 'Royal Purple', 'color': const Color(0xFF8B5CF6), 'hex': '#8B5CF6'},
  {'name': 'Crimson', 'color': const Color(0xFFEF4444), 'hex': '#EF4444'},
  {'name': 'Amber', 'color': const Color(0xFFF59E0B), 'hex': '#F59E0B'},
];

class ThemeService extends ChangeNotifier {
  static final ThemeService _instance = ThemeService._internal();
  factory ThemeService() => _instance;
  ThemeService._internal();

  static ThemeService get instance => _instance;

  AppThemeFlavor _currentFlavor = AppThemeFlavor.dark;
  Color? _customAccentColor;
  String? _logoPath;
  String? _secondaryLogoPath;
  String? _loginBackgroundPath;
  String _restaurantName = 'ZAMZAM KITCHEN';
  String _tagline = '';
  bool _isInitialized = false;
  static String get currency => '\$';

  Future<void> init() async {
    if (_isInitialized) return;
    try {
      final prefs = await SharedPreferences.getInstance();

      // Load Theme Flavor
      final flavorIndex = prefs.getInt('theme_flavor');
      if (flavorIndex != null) {
        _currentFlavor = AppThemeFlavor.values[flavorIndex];
      }

      // Load Custom Accent
      final accentHex = prefs.getString('theme_accent_hex');
      if (accentHex != null) {
        _customAccentColor = _hexToColor(accentHex);
      }

      // Load Branding
      _logoPath = prefs.getString('branding_logo');
      _secondaryLogoPath = prefs.getString('branding_secondary_logo');
      _loginBackgroundPath = prefs.getString('branding_login_bg');
      _restaurantName = prefs.getString('branding_name') ?? 'ZAMZAM KITCHEN';
      _tagline = prefs.getString('branding_tagline') ?? '';

      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('ThemeService: Error during initialization: $e');
    }
  }

  Future<void> _saveToCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('theme_flavor', _currentFlavor.index);
      if (_customAccentColor != null) {
        await prefs.setString(
          'theme_accent_hex',
          _colorToHex(_customAccentColor!),
        );
      }
      await prefs.setString('branding_logo', _logoPath ?? '');
      await prefs.setString(
        'branding_secondary_logo',
        _secondaryLogoPath ?? '',
      );
      await prefs.setString('branding_login_bg', _loginBackgroundPath ?? '');
      await prefs.setString('branding_name', _restaurantName);
      await prefs.setString('branding_tagline', _tagline);
    } catch (e) {
      debugPrint('ThemeService: Error saving to cache: $e');
    }
  }

  String _colorToHex(Color color) {
    return '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}';
  }

  ThemeData get currentTheme => themeData;

  static String get apiBaseUrl {
    if (kIsWeb) {
      final origin = html.window.location.origin;
      final hostname = html.window.location.hostname ?? '';
      if (hostname == 'localhost' ||
          hostname == '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.')) {
        final protocol = html.window.location.protocol;
        return '$protocol//$hostname:5000';
      }
      // Force HTTPS in production to avoid redirects that strip POST method
      if (origin.startsWith('http://')) {
        return origin.replaceFirst('http://', 'https://');
      }
      return origin;
    }
    return kDebugMode ? 'http://localhost:5000' : 'https://zamzamkitchen.net';
  }

  AppThemeFlavor get currentFlavor => _currentFlavor;
  Color? get customAccentColor => _customAccentColor;

  String? get logoUrl {
    if (_logoPath == null || _logoPath!.isEmpty) return null;
    return resolveImageUrl(_logoPath!);
  }

  String? get secondaryLogoUrl {
    if (_secondaryLogoPath == null || _secondaryLogoPath!.isEmpty) return null;
    return resolveImageUrl(_secondaryLogoPath!);
  }

  String? get loginBackgroundUrl {
    if (_loginBackgroundPath == null || _loginBackgroundPath!.isEmpty)
      return null;
    return resolveImageUrl(_loginBackgroundPath!);
  }

  static ImageProvider getImage(String? path) {
    if (path == null || path.isEmpty) {
      // Use a reliable remote placeholder instead of a local asset that might be missing
      return const CachedNetworkImageProvider(
        'https://placehold.co/600x400/2c2c2c/white?text=No+Image',
      );
    }

    // Handle local asset paths if they are passed as image paths
    if (path.startsWith('assets/') || path.startsWith('packages/')) {
      String cleanPath = path;
      if (cleanPath.startsWith('packages/pos_terminal/')) {
        cleanPath = cleanPath.substring(22);
      }
      return AssetImage(cleanPath);
    }

    final url = resolveImageUrl(path);
    return CachedNetworkImageProvider(url);
  }

  String get restaurantName => _restaurantName;
  String get tagline => _tagline;

  // Cache buster should be stable to avoid unnecessary re-downloads
  static String _cacheBuster = DateTime.now().millisecondsSinceEpoch.toString();
  static String get cacheBuster => _cacheBuster;

  // Session state
  String _userName = 'User';
  List<String> _userRoles = [];
  List<String> _userPermissions = [];

  String get userName => _userName;
  List<String> get userRoles => _userRoles;
  String get userRole => _userRoles.isNotEmpty ? _userRoles[0] : 'Staff';

  void setUser({
    required String name,
    List<String>? roles,
    List<String>? permissions,
  }) {
    _userName = name;
    _userRoles = roles ?? [];
    _userPermissions = permissions ?? [];
    notifyListeners();
  }

  static String resolveImageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return '$path?t=$_cacheBuster';

    // Remove any leading slashes or "assets/" to avoid double path segments
    String cleanPath = path;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (cleanPath.startsWith('assets/')) cleanPath = cleanPath.substring(7);

    return '${ThemeService.apiBaseUrl}/assets/$cleanPath?t=$_cacheBuster';
  }

  void setFlavor(AppThemeFlavor flavor) {
    debugPrint('ThemeService: Setting flavor to $flavor');
    if (_currentFlavor != flavor) {
      _currentFlavor = flavor;
      notifyListeners();
      debugPrint('ThemeService: Notified listeners for flavor $flavor');
    }
  }

  void setAccentColor(Color? color) {
    if (_customAccentColor != color) {
      _customAccentColor = color;
      notifyListeners();
    }
  }

  void updateBranding({
    String? logoUrl,
    String? secondaryLogoUrl,
    String? loginBackgroundUrl,
    String? restaurantName,
    String? tagline,
  }) {
    bool changed = false;
    _cacheBuster = DateTime.now().millisecondsSinceEpoch.toString();
    if (logoUrl != null && _logoPath != logoUrl) {
      debugPrint('ThemeService: Updating logo from "$_logoPath" to "$logoUrl"');
      _logoPath = logoUrl;
      changed = true;
    }
    if (secondaryLogoUrl != null && _secondaryLogoPath != secondaryLogoUrl) {
      debugPrint(
        'ThemeService: Updating secondary logo from "$_secondaryLogoPath" to "$secondaryLogoUrl"',
      );
      _secondaryLogoPath = secondaryLogoUrl;
      changed = true;
    }
    if (loginBackgroundUrl != null &&
        _loginBackgroundPath != loginBackgroundUrl) {
      debugPrint(
        'ThemeService: Updating login background from "$_loginBackgroundPath" to "$loginBackgroundUrl"',
      );
      _loginBackgroundPath = loginBackgroundUrl;
      changed = true;
    }
    if (restaurantName != null && _restaurantName != restaurantName) {
      debugPrint(
        'ThemeService: Updating restaurant name from "$_restaurantName" to "$restaurantName"',
      );
      _restaurantName = restaurantName;
      changed = true;
    }
    if (tagline != null && _tagline != tagline) {
      debugPrint(
        'ThemeService: Updating tagline from "$_tagline" to "$tagline"',
      );
      _tagline = tagline;
      changed = true;
    }
    if (changed) {
      _saveToCache();
      notifyListeners();
    }
  }

  void setFlavorFromString(
    String? flavorStr, {
    String? accentColorHex,
    String? logoUrl,
    String? secondaryLogoUrl,
    String? loginBackgroundUrl,
    String? restaurantName,
    String? tagline,
  }) {
    debugPrint(
      'ThemeService: Syncing from string. Raw Flavor: "$flavorStr", Tagline: "$tagline"',
    );

    // Update local paths if provided
    if (accentColorHex != null && accentColorHex.isNotEmpty) {
      _customAccentColor = _hexToColor(accentColorHex);
    }

    final normalizedFlavor = (flavorStr ?? 'dark').toLowerCase().trim();
    debugPrint('ThemeService: Normalized Flavor: "$normalizedFlavor"');

    switch (normalizedFlavor) {
      case 'classic light':
      case 'classic_light':
      case 'light':
        setFlavor(AppThemeFlavor.light);
        break;
      case 'midnight blue':
      case 'midnight_blue':
      case 'midnight':
        setFlavor(AppThemeFlavor.midnightBlue);
        break;
      case 'navy blue':
      case 'navy_blue':
      case 'navy':
        setFlavor(AppThemeFlavor.navyBlue);
        break;
      case 'emerald green':
      case 'emerald_green':
      case 'emerald':
        setFlavor(AppThemeFlavor.emeraldGreen);
        break;
      case 'aura purple':
      case 'aura_purple':
      case 'aura':
        setFlavor(AppThemeFlavor.auraPurple);
        break;
      case 'classic dark':
      case 'classic_dark':
      case 'dark':
      default:
        setFlavor(AppThemeFlavor.dark);
        break;
    }

    // Update branding state with provided values
    updateBranding(
      logoUrl: logoUrl,
      secondaryLogoUrl: secondaryLogoUrl,
      loginBackgroundUrl: loginBackgroundUrl,
      restaurantName: restaurantName,
      tagline: tagline,
    );
  }

  Color _hexToColor(String hexString) {
    final buffer = StringBuffer();
    if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
    buffer.write(hexString.replaceFirst('#', ''));
    try {
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (e) {
      return ZamamTheme.pulseOrange;
    }
  }

  ThemeData get themeData {
    ThemeData baseTheme;
    switch (_currentFlavor) {
      case AppThemeFlavor.light:
        baseTheme = ZamamTheme.lightTheme;
        break;
      case AppThemeFlavor.dark:
        baseTheme = ZamamTheme.darkTheme;
        break;
      case AppThemeFlavor.midnightBlue:
        baseTheme = ZamamTheme.midnightBlueTheme;
        break;
      case AppThemeFlavor.navyBlue:
        baseTheme = ZamamTheme.navyBlueTheme;
        break;
      case AppThemeFlavor.emeraldGreen:
        baseTheme = ZamamTheme.emeraldGreenTheme;
        break;
      case AppThemeFlavor.auraPurple:
        baseTheme = ZamamTheme.auraPurpleTheme;
        break;
    }

    if (_customAccentColor != null) {
      return baseTheme.copyWith(
        primaryColor: _customAccentColor,
        colorScheme: baseTheme.colorScheme.copyWith(
          primary: _customAccentColor,
          secondary: _customAccentColor,
        ),
      );
    }
    return baseTheme;
  }

  bool get isDarkMode {
    return _currentFlavor != AppThemeFlavor.light;
  }
}
