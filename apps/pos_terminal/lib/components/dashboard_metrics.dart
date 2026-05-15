import 'package:flutter/material.dart';
import '../theme_service.dart';

class DashboardMetric extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const DashboardMetric({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final cardBg = theme.cardColor;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: themeText.withOpacity(0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 20),
            Text(
              label,
              style: TextStyle(
                color: themeText.withOpacity(0.7),
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                color: themeText,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SmallMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const SmallMetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = ThemeService().themeData;
    final cardBg = theme.cardColor;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: themeText.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: themeText.withOpacity(0.7),
                    fontSize: 14,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: themeText,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class TrendChart extends StatelessWidget {
  final String title;
  final List<dynamic> trends;
  final Color color;

  const TrendChart({
    super.key,
    required this.title,
    required this.trends,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final List<String> monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final List<Map<String, dynamic>> last6Months = [];

    for (int i = 5; i >= 0; i--) {
      final d = DateTime(now.year, now.month - i, 1);
      last6Months.add({'month': monthNames[d.month - 1], 'total': 0.0});
    }

    for (var t in trends) {
      final month = t['month']?.toString() ?? '';
      final total = double.tryParse(t['total'].toString()) ?? 0.0;
      final index = last6Months.indexWhere((m) => m['month'] == month);
      if (index != -1) {
        last6Months[index]['total'] = total;
      }
    }

    double maxVal = 1.0;
    for (var item in last6Months) {
      double val = double.tryParse(item['total'].toString()) ?? 0.0;
      if (val > maxVal) maxVal = val;
    }

    final theme = ThemeService().themeData;
    final cardBg = theme.cardColor;
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: themeText.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: themeText,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            height: 200,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: last6Months.map((t) {
                final double total =
                    double.tryParse(t['total'].toString()) ?? 0.0;
                final heightFactor = total / maxVal;

                return Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        total > 0 ? '\$${total.toStringAsFixed(0)}' : '',
                        style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        height: 140 * heightFactor + 2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [color, color.withOpacity(0.3)],
                          ),
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(8),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        t['month'] ?? '',
                        style: TextStyle(
                          color: themeText.withOpacity(0.5),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

