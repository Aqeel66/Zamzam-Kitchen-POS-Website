import 'package:flutter/material.dart';
import 'package:pos_terminal/auth/login_page.dart';
import 'package:pos_terminal/theme_service.dart';
import 'package:pos_terminal/localization_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ThemeService().init();
  runApp(const POSApp());
}

class POSApp extends StatelessWidget {
  const POSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([ThemeService(), LocalizationService()]),
      builder: (context, child) {
        return MaterialApp(
          title: 'Zamzam Kitchen POS',
          debugShowCheckedModeBanner: false,
          theme: ThemeService().themeData,
          home: const LoginPage(),
        );
      },
    );
  }
}
