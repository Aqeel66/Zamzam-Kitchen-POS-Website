import 'package:flutter/material.dart';
import '../theme_service.dart';
import '../localization_service.dart';

class HumanResourceView extends StatefulWidget {
  final List<dynamic> shifts;
  final List<dynamic> users;
  final Map<String, dynamic> hrStats;
  final bool isLoading;
  final Future<void> Function() onClockIn;
  final VoidCallback onRefresh;

  const HumanResourceView({
    super.key,
    required this.shifts,
    required this.users,
    required this.hrStats,
    required this.isLoading,
    required this.onClockIn,
    required this.onRefresh,
  });

  @override
  State<HumanResourceView> createState() => _HumanResourceViewState();
}

class _HumanResourceViewState extends State<HumanResourceView> {
  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final theme = ThemeService().themeData;
        final themeBg = theme.scaffoldBackgroundColor;
        final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
        final themeCard = theme.cardColor;
        final themeBorder = themeText.withValues(alpha: 0.15);
        final themePrimary = theme.primaryColor;
        final themeHint = themeText.withValues(alpha: 0.6);

        return Container(
          color: themeBg,
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(LocalizationService().translate('human_resource'), style: TextStyle(color: themeText, fontSize: 28, fontWeight: FontWeight.bold)),
                      Text('Manage staff shifts and attendance', style: TextStyle(color: themeHint, fontSize: 14)),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: widget.onRefresh,
                        icon: Icon(Icons.refresh_rounded, color: themePrimary),
                        tooltip: 'Refresh',
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton.icon(
                        onPressed: widget.onClockIn,
                        icon: const Icon(Icons.timer_outlined, color: Colors.white, size: 18),
                        label: Text(LocalizationService().translate('clock_in_out'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: themePrimary,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stats and Recent Activity
                    Expanded(
                      flex: 2,
                      child: Column(
                        children: [
                          _buildHRStatsGrid(theme, themeText, themeCard, themeBorder, themePrimary),
                          const SizedBox(height: 24),
                          Expanded(child: _buildShiftsTable(theme, themeText, themeCard, themeBorder, themePrimary, themeHint)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 32),
                    // Staff Status List
                    SizedBox(
                      width: 350,
                      child: _buildStaffStatusList(theme, themeText, themeCard, themeBorder, themePrimary, themeHint),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  Widget _buildHRStatsGrid(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary) {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      crossAxisSpacing: 24,
      mainAxisSpacing: 24,
      childAspectRatio: 2.2,
      children: [
        _buildHRStatCard('Total Hours', '${widget.hrStats['total_hours'] ?? 0}h', Icons.access_time_rounded, themePrimary, themeCard, themeText, themeBorder),
        _buildHRStatCard('Active Staff', '${widget.shifts.where((s) => s['status'] == 'Active').length}', Icons.people_rounded, Colors.green, themeCard, themeText, themeBorder),
        _buildHRStatCard('Payroll Est.', '\$${double.tryParse((widget.hrStats['estimated_pay'] ?? 0).toString())?.toStringAsFixed(2) ?? "0.00"}', Icons.payments_outlined, Colors.orange, themeCard, themeText, themeBorder),
      ],
    );
  }

  Widget _buildHRStatCard(String title, String value, IconData icon, Color color, Color themeCard, Color themeText, Color themeBorder) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title, style: TextStyle(color: themeText.withValues(alpha: 0.6), fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShiftsTable(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(LocalizationService().translate('recent_activity'), style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Expanded(
            child: widget.isLoading 
              ? Center(child: CircularProgressIndicator(color: themePrimary))
              : widget.shifts.isEmpty
                ? Center(child: Text('No recent shift activity', style: TextStyle(color: themeHint)))
                : ListView.separated(
                    itemCount: widget.shifts.length,
                    separatorBuilder: (_, _) => Divider(color: themeBorder, height: 24),
                    itemBuilder: (context, index) {
                      final shift = widget.shifts[index];
                      final isActive = shift['status'] == 'Active';
                      return Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: themePrimary.withValues(alpha: 0.1),
                            child: Text((shift['first_name'] ?? 'U')[0].toUpperCase(), style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${shift['first_name']} ${shift['last_name']}', style: TextStyle(color: themeText, fontWeight: FontWeight.w600)),
                                Text('In: ${shift['clock_in'] ?? '--'}  |  Out: ${shift['clock_out'] ?? 'Active'}', style: TextStyle(color: themeHint, fontSize: 12)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isActive ? Colors.green.withValues(alpha: 0.1) : themeHint.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isActive ? Colors.green : themeHint, width: 0.5),
                            ),
                            child: Text(
                              shift['status']?.toString().toUpperCase() ?? 'UNKNOWN',
                              style: TextStyle(color: isActive ? Colors.green : themeHint, fontWeight: FontWeight.bold, fontSize: 10),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStaffStatusList(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(LocalizationService().translate('staff_online'), style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Expanded(
            child: ListView.builder(
              itemCount: widget.users.length,
              itemBuilder: (context, index) {
                final user = widget.users[index];
                final isActive = widget.shifts.any((s) => s['user_id'] == user['id'] && s['status'] == 'Active');
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: themePrimary.withValues(alpha: 0.1),
                            child: Text((user['first_name'] ?? 'U')[0].toUpperCase(), style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                          if (isActive)
                            Positioned(
                              right: 0,
                              bottom: 0,
                              child: Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: Colors.green,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: themeCard, width: 2),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${user['first_name']} ${user['last_name']}', style: TextStyle(color: themeText, fontWeight: FontWeight.w600, fontSize: 14)),
                            Text(user['roles'] ?? 'Staff', style: TextStyle(color: themeHint, fontSize: 11)),
                          ],
                        ),
                      ),
                      Text(
                        isActive ? 'Online' : 'Offline',
                        style: TextStyle(color: isActive ? Colors.green : themeHint, fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
