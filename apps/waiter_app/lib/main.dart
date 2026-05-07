import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';
import 'theme_service.dart';
import 'auth/login_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WaiterApp());
}

class WaiterApp extends StatelessWidget {
  const WaiterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService.instance,
      builder: (context, _) {
        return MaterialApp(
          title: 'Zamzam Waiter',
          debugShowCheckedModeBanner: false,
          theme: ZamzamTheme.light(
            primaryColor: ThemeService.instance.primaryColor,
          ),
          darkTheme: ZamzamTheme.dark(
            primaryColor: ThemeService.instance.primaryColor,
          ),
          themeMode: ThemeService.instance.isDarkMode ? ThemeMode.dark : ThemeMode.light,
          home: const LoginPage(),
        );
      },
    );
  }
}
