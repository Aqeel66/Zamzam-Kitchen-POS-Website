import 'package:flutter/material.dart';
import '../theme_service.dart';

class WaiterDashboard extends StatefulWidget {
  final Function(BuildContext)? onLogout;
  const WaiterDashboard({super.key, this.onLogout});

  @override
  State<WaiterDashboard> createState() => _WaiterDashboardState();
}

class _WaiterDashboardState extends State<WaiterDashboard> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(ThemeService.instance.restaurantName),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => widget.onLogout?.call(context),
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant_menu, size: 64, color: theme.primaryColor),
            const SizedBox(height: 24),
            Text(
              'Waiter Dashboard',
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            const Text('Module coming soon...'),
          ],
        ),
      ),
    );
  }
}
