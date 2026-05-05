import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme_service.dart';
import '../localization_service.dart';

class HumanResourceView extends StatefulWidget {
  final List<dynamic> shifts;
  final List<dynamic> users;
  final Map<String, dynamic> hrStats;
  final Map<String, dynamic> operationalData;
  final bool isLoading;
  final Future<void> Function() onClockIn;
  final VoidCallback onRefresh;

  const HumanResourceView({
    super.key,
    required this.shifts,
    required this.users,
    required this.hrStats,
    required this.operationalData,
    required this.isLoading,
    required this.onClockIn,
    required this.onRefresh,
  });

  @override
  State<HumanResourceView> createState() => _HumanResourceViewState();
}

class _HumanResourceViewState extends State<HumanResourceView> with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

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
                      Text('Comprehensive staff performance and management', style: TextStyle(color: themeHint, fontSize: 14)),
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
              const SizedBox(height: 24),
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                labelColor: themePrimary,
                unselectedLabelColor: themeHint,
                indicatorColor: themePrimary,
                indicatorSize: TabBarIndicatorSize.label,
                dividerColor: Colors.transparent,
                tabs: [
                  Tab(text: LocalizationService().translate('overview')),
                  Tab(text: LocalizationService().translate('staff_online')),
                  Tab(text: 'Analytics & Performance'),
                ],
              ),
              const SizedBox(height: 24),
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOverviewTab(theme, themeText, themeCard, themeBorder, themePrimary, themeHint),
                    _buildStaffDirectoryTab(theme, themeText, themeCard, themeBorder, themePrimary, themeHint, themeBg),
                    _buildAnalyticsTab(theme, themeText, themeCard, themeBorder, themePrimary, themeHint),
                  ],
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  Widget _buildOverviewTab(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint) {
    return Column(
      children: [
        _buildHRStatsGrid(theme, themeText, themeCard, themeBorder, themePrimary),
        const SizedBox(height: 24),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 2, child: _buildShiftsTable(theme, themeText, themeCard, themeBorder, themePrimary, themeHint)),
              const SizedBox(width: 24),
              Expanded(flex: 1, child: _buildTopPerformersMini(theme, themeText, themeCard, themeBorder, themePrimary, themeHint)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStaffDirectoryTab(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint, Color themeBg) {
    return _buildStaffStatusList(theme, themeText, themeCard, themeBorder, themePrimary, themeHint, themeBg);
  }

  Widget _buildAnalyticsTab(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint) {
    return SingleChildScrollView(
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildAnalyticsCard('Sales by Staff', _buildStaffSalesChart(themePrimary, themeHint), themeText, themeCard, themeBorder)),
              const SizedBox(width: 24),
              Expanded(child: _buildAnalyticsCard('Shift Coverage Trend', _buildAttendanceTrendChart(themePrimary, themeHint), themeText, themeCard, themeBorder)),
            ],
          ),
          const SizedBox(height: 24),
          _buildAnalyticsCard('Efficiency Metrics', _buildEfficiencyTable(themeText, themeBorder, themePrimary, themeHint), themeText, themeCard, themeBorder),
        ],
      ),
    );
  }

  Widget _buildAnalyticsCard(String title, Widget content, Color themeText, Color themeCard, Color themeBorder) {
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
          Text(title, style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          content,
        ],
      ),
    );
  }

  Widget _buildStaffSalesChart(Color primary, Color hint) {
    // Attempt to use real data from operationalData if available
    final staffData = (widget.operationalData['staff_performance'] as List?) ?? [
      {'name': 'Sarah', 'sales': 1250.0},
      {'name': 'James', 'sales': 980.0},
      {'name': 'Elena', 'sales': 1100.0},
      {'name': 'Mike', 'sales': 750.0},
      {'name': 'Anna', 'sales': 1400.0},
    ];

    return SizedBox(
      height: 250,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: (staffData.map((e) => (e['sales'] as num).toDouble()).reduce((a, b) => a > b ? a : b) * 1.2),
          barTouchData: BarTouchData(
            touchTooltipData: BarTouchTooltipData(
              tooltipBgColor: primary,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                return BarTooltipItem(
                  '${staffData[groupIndex]['name']}\n',
                  const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  children: [
                    TextSpan(
                      text: '\$${rod.toY.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                    ),
                  ],
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  int idx = value.toInt();
                  if (idx >= 0 && idx < staffData.length) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 12.0),
                      child: Text(staffData[idx]['name'] as String, style: TextStyle(color: hint, fontSize: 10, fontWeight: FontWeight.w600)),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 45,
                getTitlesWidget: (value, meta) => Text('\$${value.toInt()}', style: TextStyle(color: hint, fontSize: 10)),
              ),
            ),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: FlGridData(
            show: true, 
            drawVerticalLine: false,
            getDrawingHorizontalLine: (v) => FlLine(color: hint.withValues(alpha: 0.1), strokeWidth: 1, dashArray: [5, 5]),
          ),
          borderData: FlBorderData(show: false),
          barGroups: staffData.asMap().entries.map((e) {
            return BarChartGroupData(
              x: e.key,
              barRods: [
                BarChartRodData(
                  toY: (e.value['sales'] as num).toDouble(),
                  gradient: LinearGradient(
                    colors: [primary, primary.withValues(alpha: 0.7)],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                  width: 24,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                  backDrawRodData: BackgroundBarChartRodData(
                    show: true,
                    toY: 1600,
                    color: primary.withValues(alpha: 0.05),
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildAttendanceTrendChart(Color primary, Color hint) {
    return SizedBox(
      height: 250,
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true, 
            drawVerticalLine: false,
            getDrawingHorizontalLine: (v) => FlLine(color: hint.withValues(alpha: 0.1), strokeWidth: 1, dashArray: [5, 5]),
          ),
          titlesData: FlTitlesData(
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  if (value >= 0 && value < 7) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 12.0),
                      child: Text(days[value.toInt()], style: TextStyle(color: hint, fontSize: 10, fontWeight: FontWeight.w600)),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 45,
                getTitlesWidget: (value, meta) => Text('\${value.toInt()}h', style: TextStyle(color: hint, fontSize: 10)),
              ),
            ),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [
            LineChartBarData(
              spots: const [
                FlSpot(0, 42),
                FlSpot(1, 38),
                FlSpot(2, 45),
                FlSpot(3, 40),
                FlSpot(4, 52),
                FlSpot(5, 60),
                FlSpot(6, 58),
              ],
              isCurved: true,
              color: primary,
              barWidth: 4,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, barData, index) => FlDotCirclePainter(
                  radius: 4,
                  color: Colors.white,
                  strokeWidth: 3,
                  strokeColor: primary,
                ),
              ),
              belowBarData: BarAreaData(
                show: true, 
                gradient: LinearGradient(
                  colors: [primary.withValues(alpha: 0.2), primary.withValues(alpha: 0.0)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              tooltipBgColor: primary,
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((s) => LineTooltipItem(
                  '${s.y.toInt()} Hours',
                  const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                )).toList();
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEfficiencyTable(Color themeText, Color themeBorder, Color themePrimary, Color themeHint) {
    final staff = [
      {'name': 'Anna Smith', 'orders': 45, 'avg_time': '12m', 'rating': 4.9},
      {'name': 'Sarah Jones', 'orders': 38, 'avg_time': '14m', 'rating': 4.7},
      {'name': 'Elena Rodriguez', 'orders': 42, 'avg_time': '11m', 'rating': 4.8},
      {'name': 'James Wilson', 'orders': 30, 'avg_time': '15m', 'rating': 4.5},
    ];

    return SizedBox(
      width: double.infinity,
      child: DataTable(
        headingRowColor: WidgetStateProperty.all(themePrimary.withValues(alpha: 0.05)),
        horizontalMargin: 0,
        columns: const [
          DataColumn(label: Text('Staff Member', style: TextStyle(fontWeight: FontWeight.bold))),
          DataColumn(label: Text('Orders Handled', style: TextStyle(fontWeight: FontWeight.bold))),
          DataColumn(label: Text('Avg. Service Time', style: TextStyle(fontWeight: FontWeight.bold))),
          DataColumn(label: Text('Satisfaction', style: TextStyle(fontWeight: FontWeight.bold))),
        ],
        rows: staff.map((s) => DataRow(cells: [
          DataCell(Text(s['name'] as String, style: TextStyle(color: themeText, fontWeight: FontWeight.w500))),
          DataCell(Text('${s['orders']}', style: TextStyle(color: themeText))),
          DataCell(Text(s['avg_time'] as String, style: TextStyle(color: themeText))),
          DataCell(Row(
            children: [
              const Icon(Icons.star_rounded, color: Colors.orange, size: 16),
              const SizedBox(width: 4),
              Text('${s['rating']}', style: TextStyle(color: themeText, fontWeight: FontWeight.bold)),
            ],
          )),
        ])).toList(),
      ),
    );
  }

  Widget _buildTopPerformersMini(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint) {
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
          Text('Top Servers', style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          _buildPerformerRow('Anna Smith', '\$1,400', 0.95, themePrimary, themeText),
          const SizedBox(height: 16),
          _buildPerformerRow('Elena R.', '\$1,100', 0.82, themePrimary, themeText),
          const SizedBox(height: 16),
          _buildPerformerRow('James W.', '\$980', 0.65, themePrimary, themeText),
        ],
      ),
    );
  }

  Widget _buildPerformerRow(String name, String amount, double progress, Color primary, Color text) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(name, style: TextStyle(color: text, fontWeight: FontWeight.w600, fontSize: 13)),
            Text(amount, style: TextStyle(color: primary, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: primary.withValues(alpha: 0.1),
          valueColor: AlwaysStoppedAnimation<Color>(primary),
          borderRadius: BorderRadius.circular(4),
          minHeight: 4,
        ),
      ],
    );
  }

  Widget _buildHRStatsGrid(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary) {
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      crossAxisSpacing: 24,
      mainAxisSpacing: 24,
      childAspectRatio: 2.5,
      children: [
        _buildHRStatCard('Total Hours', '${widget.hrStats['total_hours'] ?? 0}h', Icons.access_time_rounded, themePrimary, themeCard, themeText, themeBorder),
        _buildHRStatCard('Active Staff', '${widget.shifts.where((s) => s['status'] == 'Active').length}', Icons.people_rounded, Colors.green, themeCard, themeText, themeBorder),
        _buildHRStatCard('Payroll Est.', '\$${double.tryParse((widget.hrStats['estimated_pay'] ?? 0).toString())?.toStringAsFixed(2) ?? "0.00"}', Icons.payments_outlined, Colors.orange, themeCard, themeText, themeBorder),
      ],
    );
  }

  Widget _buildHRStatCard(String title, String value, IconData icon, Color color, Color themeCard, Color themeText, Color themeBorder) {
    return Container(
      padding: const EdgeInsets.all(20),
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
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title, style: TextStyle(color: themeText.withValues(alpha: 0.6), fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value, style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
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
                            radius: 18,
                            backgroundColor: themePrimary.withValues(alpha: 0.1),
                            child: Text((shift['first_name'] ?? 'U')[0].toUpperCase(), style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${shift['first_name']} ${shift['last_name']}', style: TextStyle(color: themeText, fontWeight: FontWeight.w600, fontSize: 14)),
                                Text('In: ${_formatTime(shift['clock_in'])}  |  Out: ${_formatTime(shift['clock_out'], def: 'Active')}', style: TextStyle(color: themeHint, fontSize: 11)),
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

  String _formatTime(dynamic time, {String def = '--:--'}) {
    if (time == null) return def;
    String s = time.toString();
    if (s.contains(' ')) return s.split(' ')[1].substring(0, 5);
    if (s.length > 5) return s.substring(0, 5);
    return s;
  }

  Widget _buildStaffStatusList(ThemeData theme, Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint, Color themeBg) {
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
          Text('Staff Directory', style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                childAspectRatio: 2.8,
              ),
              itemCount: widget.users.length,
              itemBuilder: (context, index) {
                final user = widget.users[index];
                final isActive = widget.shifts.any((s) => s['user_id'] == user['id'] && s['status'] == 'Active');
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: themeBg.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: themeBorder),
                  ),
                  child: Row(
                    children: [
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 22,
                            backgroundColor: themePrimary.withValues(alpha: 0.1),
                            child: Text((user['first_name'] ?? 'U')[0].toUpperCase(), style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold)),
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
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('${user['first_name']} ${user['last_name']}', style: TextStyle(color: themeText, fontWeight: FontWeight.w600, fontSize: 15)),
                            Text(user['roles'] ?? 'Staff', style: TextStyle(color: themeHint, fontSize: 12)),
                          ],
                        ),
                      ),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(isActive ? 'Online' : 'Offline', style: TextStyle(color: isActive ? Colors.green : themeHint, fontSize: 11, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Icon(Icons.more_horiz, color: themeHint, size: 16),
                        ],
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
