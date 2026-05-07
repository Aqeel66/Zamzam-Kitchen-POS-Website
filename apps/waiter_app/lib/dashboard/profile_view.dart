import 'package:flutter/material.dart';
import '../theme_service.dart';

class ProfileView extends StatelessWidget {
  final Map<String, dynamic>? userData;
  final Function(BuildContext) onLogout;

  const ProfileView({
    super.key,
    required this.userData,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themePrimary = theme.primaryColor;
    
    final String name = userData?['name'] ?? 'Staff Member';
    final String username = userData?['username'] ?? 'N/A';
    final String email = userData?['email'] ?? 'No email provided';
    final String role = (userData?['roles'] as List?)?.join(', ') ?? 'Waiter';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 60,
              child: Icon(Icons.person, size: 60),
            ),
            const SizedBox(height: 24),
            Text(
              name,
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(
              role,
              style: TextStyle(color: themePrimary, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 40),
            _buildInfoCard(theme, [
              _buildInfoRow(Icons.account_circle_outlined, 'Username', username),
              const Divider(),
              _buildInfoRow(Icons.email_outlined, 'Email', email),
              const Divider(),
              _buildInfoRow(Icons.business_outlined, 'Branch', 'Main Branch'),
            ]),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 55,
              child: OutlinedButton.icon(
                onPressed: () => onLogout(context),
                icon: const Icon(Icons.logout, color: Colors.red),
                label: const Text('LOGOUT', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'App Version 1.0.0 (Build 20260507)',
              style: TextStyle(color: theme.hintColor, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(ThemeData theme, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.1)),
      ),
      child: Column(children: children),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }
}
