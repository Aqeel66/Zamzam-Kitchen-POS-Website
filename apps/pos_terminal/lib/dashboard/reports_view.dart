import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme_service.dart';
import '../localization_service.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart';

class ReportsView extends StatefulWidget {
  final Map<String, dynamic> summaryData;
  final Map<String, dynamic> financialData;
  final Map<String, dynamic> operationalData;
  final List<dynamic> placedOrders;
  final List<dynamic> shifts;
  final bool isLoading;


  const ReportsView({
    super.key,
    required this.summaryData,
    required this.financialData,
    required this.operationalData,
    required this.placedOrders,
    required this.shifts,
    required this.isLoading,
  });

  @override
  State<ReportsView> createState() => _ReportsViewState();
}

class _ReportsViewState extends State<ReportsView> {
  int _selectedTab = 0;
  DateTimeRange? _reportDateRange;
  String _reportTypeFilter = 'ALL';
  String _reportStatusFilter = 'ALL';
  List<dynamic> _reportOrders = [];
  bool _isReportLoading = false;
  Set<String> _availableDates = {};
  DateTime _firstDate = DateTime(2023); // Reset to 2023 to allow navigation while loading
  List<dynamic> _inventoryItems = [];
  List<dynamic> _suppliers = [];
  List<dynamic> _expenses = [];
  List<dynamic> _menuData = [];
  List<dynamic> _purchases = [];
  String _invItemFilter = 'ALL';
  String _invSupplierFilter = 'ALL';
  String _invStatusFilter = 'ALL';
  DateTimeRange? _invDateRange;
  DateTimeRange? _finDateRange;
  String _finTypeFilter = 'ALL';
  String _finPayFilter = 'ALL';
  String _finChannelFilter = 'ALL';
  String _finCustomerFilter = 'ALL';
  String _finItemFilter = 'ALL';
  String _finCategoryFilter = 'ALL';
  String _orderSearchQuery = '';
  String _orderItemFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _reportOrders = widget.placedOrders;
    _fetchAvailableDates();
    _fetchInventory();
    _fetchSuppliers();
    _fetchExpenses();
    _fetchMenuData();
    _fetchPurchases();
  }

  Future<void> _fetchPurchases() async {
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/purchases'));
      if (res.statusCode == 200) {
        setState(() => _purchases = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Purchases Error: $e');
    }
  }

  Future<void> _fetchMenuData() async {
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/menu'));
      if (res.statusCode == 200) {
        setState(() => _menuData = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Menu Data Error: $e');
    }
  }

  Future<void> _fetchExpenses() async {
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/expenses'));
      if (res.statusCode == 200) {
        setState(() => _expenses = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Expenses Error: $e');
    }
  }

  Future<void> _fetchSuppliers() async {
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/purchases/suppliers'));
      if (res.statusCode == 200) {
        setState(() => _suppliers = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Suppliers Error: $e');
    }
  }

  Future<void> _fetchInventory() async {
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/inventory'));
      if (res.statusCode == 200) {
        setState(() => _inventoryItems = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Inventory Error: $e');
    }
  }

  Future<void> _fetchAvailableDates() async {
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/orders/data-range'))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(res.body);
        if (mounted) {
          setState(() {
            final List<dynamic> dates = data['availableDates'] ?? [];
            _availableDates = dates.map((d) => d.toString().split('T')[0]).toSet();
            
            if (data['minDate'] != null) {
              DateTime min = DateTime.parse(data['minDate'].toString());
              _firstDate = min.year < 2020 ? DateTime(2023) : min;
            }
          });
        }
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Dates Error: $e');
    }
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header & Sub-nav
              Container(
                padding: const EdgeInsets.fromLTRB(32, 32, 32, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          LocalizationService().translate('business_intelligence'), 
                          style: TextStyle(color: themeText, fontSize: 28, fontWeight: FontWeight.bold)
                        ),
                        _buildSubNav(themeText, themeCard, themeBorder, themePrimary, themeHint),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Divider(color: themeBorder),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: widget.isLoading 
                  ? Center(child: CircularProgressIndicator(color: themePrimary))
                  : _getContent(themeText, themeCard, themeBorder, themePrimary, themeHint),
              ),
            ],
          ),
        );
      }
    );
  }


  Widget _buildSubNav(Color text, Color card, Color border, Color primary, Color hint) {
    final tabs = [
      {'label': LocalizationService().translate('summary_tab'), 'icon': Icons.summarize_outlined},
      {'label': LocalizationService().translate('sales_log_tab'), 'icon': Icons.receipt_long_outlined},
      {'label': LocalizationService().translate('detailed_orders_report'), 'icon': Icons.history_edu_outlined},
      {'label': LocalizationService().translate('product_mix_tab'), 'icon': Icons.pie_chart_outline_rounded},
      {'label': 'Inventory Status', 'icon': Icons.inventory_2_outlined},
      {'label': 'Financials', 'icon': Icons.account_balance_outlined},
      {'label': LocalizationService().translate('staff_tab'), 'icon': Icons.people_outline_rounded},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: _selectedTab,
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: primary),
          dropdownColor: card,
          borderRadius: BorderRadius.circular(16),
          items: List.generate(tabs.length, (i) {
            return DropdownMenuItem<int>(
              value: i,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(tabs[i]['icon'] as IconData, size: 20, color: _selectedTab == i ? primary : hint),
                  const SizedBox(width: 12),
                  Text(
                    tabs[i]['label'] as String,
                    style: TextStyle(
                      color: _selectedTab == i ? primary : text,
                      fontWeight: _selectedTab == i ? FontWeight.bold : FontWeight.normal,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            );
          }),
          onChanged: (val) {
            if (val != null) setState(() => _selectedTab = val);
          },
        ),
      ),
    );
  }

  Widget _getContent(Color text, Color card, Color border, Color primary, Color hint) {
    switch (_selectedTab) {
      case 0: return _buildSummary(text, card, border, primary, hint);
      case 1: return _buildSalesLog(text, card, border, primary, hint);
      case 2: return _buildDetailedOrdersReport(text, card, border, primary, hint);
      case 3: return _buildProductMix(text, card, border, primary, hint);
      case 4: return _buildInventoryReport(text, card, border, primary, hint);
      case 5: return _buildFinancialReport(text, card, border, primary, hint);
      case 6: return _buildStaffReport(text, card, border, primary, hint);
      default: return _buildSummary(text, card, border, primary, hint);
    }
  }

  Widget _buildSummary(Color text, Color card, Color border, Color primary, Color hint) {
    final today = widget.summaryData['today'] ?? {'total': 0.0, 'count': 0};
    final financials = widget.financialData;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _buildKPI(LocalizationService().translate('net_sales'), '\$${(double.tryParse(today['total']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', Icons.payments_outlined, Colors.green, card, text, border, hint)),
              const SizedBox(width: 20),
              Expanded(child: _buildKPI(LocalizationService().translate('total_orders'), '${today['count'] ?? 0}', Icons.receipt_long_outlined, primary, card, text, border, hint)),
              const SizedBox(width: 12),
              Expanded(
                child: _buildKPI(
                  LocalizationService().translate('avg_order'), 
                  '\$${((double.tryParse(today['count']?.toString() ?? '0') ?? 0) > 0 ? (double.tryParse(today['total']?.toString() ?? '0') ?? 0.0) / (double.tryParse(today['count']?.toString() ?? '1') ?? 1) : 0.0).toStringAsFixed(2)}', 
                  Icons.calculate_outlined, 
                  primary, card, text, border, hint
                )
              ),
              const SizedBox(width: 20),
              Expanded(child: _buildKPI(LocalizationService().translate('est_profit'), '\$${(double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', Icons.trending_up_rounded, Colors.purple, card, text, border, hint)),
            ],
          ),
          const SizedBox(height: 12),
          _buildReconciliationCard(text, card, border, primary, hint),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: _buildCard(
                  LocalizationService().translate('operational_status'),
                  Column(
                    children: [
                      _buildOperationalPieChart(primary),
                      const SizedBox(height: 24),
                      Divider(color: border),
                      const SizedBox(height: 16),
                      ...(widget.summaryData['types'] as List? ?? []).map((t) {
                        final type = t['order_type']?.toString() ?? 'Unknown';
                        final color = type == 'Dine-In' ? primary : (type == 'Takeaway' ? primary : Colors.purple);
                        final count = double.tryParse(t['count']?.toString() ?? '0') ?? 0.0;
                        final totalCount = (today['count'] as num?)?.toDouble() ?? 1.0;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: _buildStatusProgress(type, count, totalCount > 0 ? totalCount : 1.0, color, text, border),
                        );
                      }),
                    ],
                  ),
                  card, text, border
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 3,
                child: _buildCard(
                  'Top Selling Items (30 Days)',
                  _buildTopItemsBarChart(primary, hint),
                  card, text, border
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSalesLog(Color text, Color card, Color border, Color primary, Color hint) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: _buildCard(
        LocalizationService().translate('recent_transactions'),
        SizedBox(
          width: double.infinity,
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(primary.withValues(alpha: 0.05)),
            columns: [
              DataColumn(label: Text(LocalizationService().translate('id_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
              DataColumn(label: Text(LocalizationService().translate('time_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
              DataColumn(label: Text(LocalizationService().translate('type_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
              DataColumn(label: Text(LocalizationService().translate('total_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
              DataColumn(label: Text(LocalizationService().translate('status_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
            ],
            rows: widget.placedOrders.take(15).map((o) {
              return DataRow(cells: [
                DataCell(Text('#${o['id']}', style: TextStyle(color: text))),
                DataCell(Text(_safeTime(o['order_time']), style: TextStyle(color: hint))),
                DataCell(Text('${o['order_type']}', style: TextStyle(color: text))),
                DataCell(Text('\$${(double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                    style: TextStyle(color: primary, fontWeight: FontWeight.bold))),
                DataCell(Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (o['status'] == 'completed' ? Colors.green : primary).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(o['status'].toString().toUpperCase(), 
                      style: TextStyle(color: o['status'] == 'completed' ? Colors.green : primary, fontSize: 10, fontWeight: FontWeight.bold)),
                )),
              ]);
            }).toList(),
          ),
        ),
        card, text, border
      ),
    );
  }

  Widget _buildProductMix(Color text, Color card, Color border, Color primary, Color hint) {
    final topItems = widget.summaryData['topItems'] as List? ?? [];
    final customizations = widget.summaryData['customizations'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: _buildCard(
              'Top Selling Items (30 Days)',
              topItems.isEmpty 
                ? Center(child: Padding(padding: const EdgeInsets.all(20), child: Text(LocalizationService().translate('no_sales_data'), style: TextStyle(color: hint))))
                : Column(
                    children: topItems.map((item) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item['name'] ?? 'Unknown', style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 13)),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                        child: Text('${item['sold']} sold', style: TextStyle(color: primary, fontWeight: FontWeight.bold, fontSize: 11)),
                      ),
                    )).toList(),
                  ),
              card, text, border
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: _buildCard(
              'Customization Popularity',
              customizations.isEmpty
                ? Center(child: Padding(padding: const EdgeInsets.all(20), child: Text(LocalizationService().translate('no_data'), style: TextStyle(color: hint))))
                : Column(
                    children: customizations.map((c) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(c['name'] ?? 'Unknown', style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 13)),
                      subtitle: Text(c['type']?.toString().toUpperCase() ?? '', style: TextStyle(color: hint, fontSize: 10)),
                      trailing: Text('${c['count']} uses', style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 12)),
                    )).toList(),
                  ),
              card, text, border
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailedOrdersReport(Color text, Color card, Color border, Color primary, Color hint) {
    // Calculate Summary Metrics
    double totalRevenue = 0;
    for (var o in _reportOrders) {
      totalRevenue += double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0;
    }
    double avgValue = _reportOrders.isEmpty ? 0 : totalRevenue / _reportOrders.length;

    return Column(
      children: [
        // Top KPI Boxes (Matching Inventory Report style)
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 220),
                  child: _buildKPI(
                    LocalizationService().translate('total_orders'), 
                    '${_reportOrders.length}', 
                    Icons.receipt_long_outlined, 
                    primary, card, text, border, hint
                  ),
                ),
                const SizedBox(width: 20),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 220),
                  child: _buildKPI(
                    'Net Sales', 
                    '\$${totalRevenue.toStringAsFixed(2)}', 
                    Icons.attach_money_rounded, 
                    Colors.green, card, text, border, hint
                  ),
                ),
                const SizedBox(width: 20),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 220),
                  child: _buildKPI(
                    'Avg. Order Value', 
                    '\$${avgValue.toStringAsFixed(2)}', 
                    Icons.analytics_outlined, 
                    Colors.blue, card, text, border, hint
                  ),
                ),
              ],
            ),
          ),
        ),

        // Filter Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: card,
            border: Border(bottom: BorderSide(color: border)),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
              // Date Range Picker (Two-Step Selection)
              OutlinedButton.icon(
                onPressed: () async {
                  try {
                    // Fallback if not loaded
                    if (_availableDates.isEmpty) {
                      await _fetchAvailableDates().timeout(const Duration(seconds: 3));
                    }
                    
                    DateTime now = DateUtils.dateOnly(DateTime.now());
                    DateTime startBound = DateUtils.dateOnly(_firstDate);
                    
                    // CRITICAL: Align startBound with the actual first available date to avoid predicate conflicts
                    if (_availableDates.isNotEmpty) {
                      List<String> sorted = _availableDates.toList()..sort();
                      DateTime firstDataDate = DateTime.parse(sorted.first);
                      if (firstDataDate.isBefore(startBound)) {
                        startBound = firstDataDate;
                      }
                    }
                    
                    DateTime endBound = now.add(const Duration(days: 1));
                    
                    // Safety check: ensure firstDate is before lastDate
                    if (startBound.isAfter(endBound)) {
                      startBound = endBound.subtract(const Duration(days: 30));
                    }
                    
                    // Step 1: Select From Date
                    DateTime initialStart = _reportDateRange != null 
                        ? DateUtils.dateOnly(_reportDateRange!.start) 
                        : now;
                        
                    // Ensure initialStart is selectable if possible
                    if (_availableDates.isNotEmpty && !_availableDates.contains(initialStart.toIso8601String().split('T')[0])) {
                      List<String> sorted = _availableDates.toList()..sort();
                      initialStart = DateTime.parse(sorted.first);
                    }
                    
                    // Ensure initialStart is NOT before startBound
                    if (initialStart.isBefore(startBound)) initialStart = startBound;
                    
                    // Clamp initialStart to a safe absolute range for the picker
                    DateTime safeMin = DateTime(2025, 1, 1);
                    if (initialStart.isBefore(safeMin)) initialStart = safeMin;
                    if (initialStart.isAfter(endBound)) initialStart = endBound;

                    if (!mounted) return;
                    final fromDate = await showDatePicker(
                      context: context,
                      initialDate: initialStart,
                      firstDate: DateTime(2023),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                      helpText: LocalizationService().translate('select_start_date'),
                      builder: (context, child) => _buildDatePickerTheme(context, child, primary, card, text),
                    );
                    
                    if (fromDate != null) {
                      // Step 2: Select To Date
                      DateTime initialEnd = _reportDateRange != null 
                          ? DateUtils.dateOnly(_reportDateRange!.end) 
                          : fromDate;
                      
                      if (initialEnd.isBefore(fromDate)) initialEnd = fromDate;

                      if (!mounted) return;
                      final toDate = await showDatePicker(
                        context: context,
                        initialDate: initialEnd,
                        firstDate: fromDate,
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        helpText: LocalizationService().translate('select_end_date'),
                        builder: (context, child) => _buildDatePickerTheme(context, child, primary, card, text),
                      );
                      
                      if (toDate != null) {
                        setState(() {
                          _reportDateRange = DateTimeRange(start: fromDate, end: toDate);
                        });
                        _fetchFilteredReport();
                      }
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Picker Error: $e')),
                      );
                    }
                  }
                },
                icon: Icon(Icons.calendar_month_outlined, size: 20, color: primary),
                label: Text(
                  _reportDateRange == null 
                    ? LocalizationService().translate('select_date_range')
                    : '${_reportDateRange!.start.toString().split(' ')[0]} to ${_reportDateRange!.end.toString().split(' ')[0]}',
                  style: TextStyle(color: text, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                  side: BorderSide(color: border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  backgroundColor: card,
                ),
              ),
              const SizedBox(width: 16),
              // Search Input
              Container(
                width: 220,
                height: 44,
                decoration: BoxDecoration(
                  color: card,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: border),
                ),
                child: TextField(
                  onChanged: (val) => setState(() => _orderSearchQuery = val),
                  style: TextStyle(color: text, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Search Order #, Customer, Table...',
                    hintStyle: TextStyle(color: hint, fontSize: 12),
                    prefixIcon: Icon(Icons.search_rounded, size: 20, color: hint),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Item Filter
              _buildFilterDropdown(
                'Food Item',
                _orderItemFilter,
                ['ALL', ..._menuData.expand((c) => (c['items'] as List)).map((i) => i['name'].toString()).toSet().toList()..sort()],
                (val) => setState(() => _orderItemFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Type Filter
              _buildFilterDropdown(
                LocalizationService().translate('filter_by_type'),
                _reportTypeFilter,
                ['ALL', 'Dine-In', 'Takeaway', 'Website', 'QR Menu'],
                (val) {
                  setState(() => _reportTypeFilter = val!);
                  _fetchFilteredReport();
                },
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Status Filter
              _buildFilterDropdown(
                LocalizationService().translate('filter_by_status'),
                _reportStatusFilter,
                ['ALL', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Rejected', 'Paid'],
                (val) {
                  setState(() => _reportStatusFilter = val!);
                  _fetchFilteredReport();
                },
                text, card, border, primary
              ),
              const SizedBox(width: 32),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _reportTypeFilter = 'ALL';
                    _reportStatusFilter = 'ALL';
                    _orderSearchQuery = '';
                    _orderItemFilter = 'ALL';
                    _reportOrders = widget.placedOrders;
                  });
                },
                icon: Icon(Icons.refresh_outlined, size: 18, color: hint),
                label: Text(LocalizationService().translate('clear_filters'), style: TextStyle(color: hint)),
              ),
            ],
          ),
        ),
      ),
        // Results Table
        Expanded(
          child: _isReportLoading 
            ? Center(child: CircularProgressIndicator(color: primary))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _buildCard(
                  LocalizationService().translate('orders_in_view'),
                  _reportOrders.isEmpty
                    ? Center(child: Padding(padding: const EdgeInsets.all(40), child: Text(LocalizationService().translate('no_results_found'), style: TextStyle(color: hint))))
                    : SizedBox(
                        width: double.infinity,
                        child: DataTable(
                          headingRowColor: WidgetStateProperty.all(primary.withValues(alpha: 0.05)),
                          columns: [
                            DataColumn(label: Text(LocalizationService().translate('id_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(LocalizationService().translate('time_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(LocalizationService().translate('type_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(LocalizationService().translate('total_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                            DataColumn(label: Text(LocalizationService().translate('status_col'), style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                          ],
                          rows: _reportOrders.where((o) {
                            // Search Query Filter
                            if (_orderSearchQuery.isNotEmpty) {
                              final query = _orderSearchQuery.toLowerCase().replaceAll('#', '');
                              final orderNo = (o['order_number'] ?? '').toString().toLowerCase();
                              final orderId = (o['id'] ?? '').toString().toLowerCase();
                              final table = (o['table_number'] ?? '').toString().toLowerCase();
                              
                              if (!orderNo.contains(query) && !orderId.contains(query) && !table.contains(query)) return false;
                            }
                            // Item Filter
                            if (_orderItemFilter != 'ALL') {
                              final items = o['items'] as List? ?? [];
                              if (!items.any((i) => i['name'].toString() == _orderItemFilter)) return false;
                            }
                            return true;
                          }).map((o) {
                            return DataRow(cells: [
                              DataCell(Text('#${o['order_number'] ?? o['id']}', style: TextStyle(color: text))),
                              DataCell(Text(o['order_time']?.toString() ?? '', style: TextStyle(color: hint, fontSize: 12))),
                              DataCell(Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('${o['order_type']}', style: TextStyle(color: text, fontSize: 13)),
                                  if (o['origin'] != 'In-Store') 
                                    Text('${o['origin']}', style: TextStyle(color: primary, fontSize: 10, fontWeight: FontWeight.bold)),
                                ],
                              )),
                              DataCell(Text('\$${(double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}', 
                                  style: TextStyle(color: primary, fontWeight: FontWeight.bold))),
                              DataCell(Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(o['status']).withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(o['status'].toString().toUpperCase(), 
                                    style: TextStyle(color: _getStatusColor(o['status']), fontSize: 10, fontWeight: FontWeight.bold)),
                              )),
                            ]);
                          }).toList(),
                        ),
                      ),
                  card, text, border
                ),
              ),
        ),
      ],
    );
  }

  Color _getStatusColor(dynamic status) {
    String st = status.toString().toLowerCase();
    if (st == 'completed' || st == 'paid') return Colors.green;
    if (st == 'cancelled' || st == 'rejected') return Colors.red;
    if (st == 'ready') return Colors.blue;
    if (st == 'preparing') return Colors.orange;
    return Colors.grey;
  }

  Widget _buildDatePickerTheme(BuildContext context, Widget? child, Color primary, Color card, Color text) {
    bool isDark = Theme.of(context).brightness == Brightness.dark;
    return Theme(
      data: isDark 
        ? ThemeData.dark().copyWith(
            colorScheme: ColorScheme.dark(
              primary: primary,
              onPrimary: Colors.white,
              surface: const Color(0xFF1E1E1E),
              onSurface: Colors.white,
            ),
          )
        : ThemeData.light().copyWith(
            colorScheme: ColorScheme.light(
              primary: primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black87,
            ),
          ),
      child: child!,
    );
  }

  Widget _buildFilterDropdown(String label, String value, List<String> items, Function(String?) onChanged, Color text, Color card, Color border, Color primary) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          dropdownColor: card,
          style: TextStyle(color: text, fontSize: 13, fontWeight: FontWeight.w500),
          items: items.map((i) => DropdownMenuItem(
            value: i, 
            child: Text(i, style: TextStyle(color: text))
          )).toList(),
          onChanged: onChanged,
          icon: Icon(Icons.arrow_drop_down, color: primary),
        ),
      ),
    );
  }

  Future<void> _fetchFilteredReport() async {
    setState(() => _isReportLoading = true);
    try {
      final baseUrl = ThemeService.apiBaseUrl;
      final queryParams = {
        'status': _reportStatusFilter,
        'type': _reportTypeFilter,
      };
      
      if (_reportDateRange != null) {
        queryParams['startDate'] = _reportDateRange!.start.toIso8601String().split('T')[0];
        queryParams['endDate'] = _reportDateRange!.end.toIso8601String().split('T')[0];
      }

      final uri = Uri.parse(baseUrl).replace(
        path: '/api/orders',
        queryParameters: queryParams,
      );
      
      final response = await http.get(uri).timeout(const Duration(seconds: 15));
      if (response.statusCode == 200) {
        if (mounted) {
          setState(() {
            _reportOrders = json.decode(response.body);
          });
        }
      } else {
        if (mounted) {
          setState(() => _reportOrders = []);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: ${response.statusCode} - Failed to load report')),
          );
        }
      }
    } catch (e) {
      if (kDebugMode) print('Report Fetch Error: $e');
      if (mounted) {
        setState(() => _reportOrders = []);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Network Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isReportLoading = false);
    }
  }

  Widget _buildStaffReport(Color text, Color card, Color border, Color primary, Color hint) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: _buildCard(
        'Staff Performance (Today)',
        widget.shifts.isEmpty 
          ? Center(child: Padding(
              padding: const EdgeInsets.all(40),
              child: Text(LocalizationService().translate('no_shift_data'), style: TextStyle(color: hint)),
            ))
          : Column(
              children: widget.shifts.take(10).map((s) => ListTile(
                leading: CircleAvatar(backgroundColor: primary, child: Text(s['user_name']?[0] ?? 'U', style: const TextStyle(color: Colors.white))),
                title: Text(s['user_name'] ?? 'Unknown Staff', style: TextStyle(color: text, fontWeight: FontWeight.bold)),
                subtitle: Text('${LocalizationService().translate('shift_label')}: ${_safeTime(s['clock_in'])} - ${_safeTime(s['clock_out'], defaultVal: 'Active')}', 
                    style: TextStyle(color: hint)),
                trailing: Icon(Icons.chevron_right, color: hint),
              )).toList(),
            ),
        card, text, border
      ),
    );
  }

  Widget _buildInventoryReport(Color text, Color card, Color border, Color primary, Color hint) {
    // 1. Calculate KPIs (Global)
    double totalValue = 0;
    int lowStockCount = 0;
    for (var item in _inventoryItems) {
      double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
      double cost = double.tryParse(item['cost_per_unit']?.toString() ?? '0') ?? 0;
      double min = double.tryParse(item['min_stock_level']?.toString() ?? '0') ?? 0;
      totalValue += (qty * cost);
      if (qty <= min) lowStockCount++;
    }

    // 2. Apply Filters to the list
    List<dynamic> filteredItems = _inventoryItems.where((item) {
      // Item Filter
      if (_invItemFilter != 'ALL' && item['name'] != _invItemFilter) return false;
      
      // Supplier Filter
      if (_invSupplierFilter != 'ALL' && (item['supplier_name'] ?? 'N/A') != _invSupplierFilter) return false;
      
      // Status Filter
      double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
      double min = double.tryParse(item['min_stock_level']?.toString() ?? '0') ?? 0;
      if (_invStatusFilter == 'LOW STOCK' && qty > min) return false;
      if (_invStatusFilter == 'HEALTHY' && qty <= min) return false;

      return true;
    }).toList();

    return Column(
      children: [
        // Top KPIs
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 180),
                  child: _buildKPI('Total Items', '${_inventoryItems.length}', Icons.category_outlined, primary, card, text, border, hint),
                ),
                const SizedBox(width: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 220),
                  child: _buildKPI('Low Stock Alerts', '$lowStockCount', Icons.warning_amber_rounded, Colors.orange, card, text, border, hint),
                ),
                const SizedBox(width: 20),
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: 180),
                  child: _buildKPI('Inventory Value', '\$${totalValue.toStringAsFixed(2)}', Icons.account_balance_wallet_outlined, Colors.green, card, text, border, hint),
                ),
              ],
            ),
          ),
        ),

        // Filter Bar (Replicating Detailed Orders Report pattern)
        Container(
          margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
              // Date Range (Two-Step Selection like Detailed Orders Report)
              OutlinedButton.icon(
                onPressed: () async {
                  try {
                    DateTime now = DateTime.now();
                    
                    // Step 1: Select From Date
                    final fromDate = await showDatePicker(
                      context: context,
                      initialDate: _invDateRange?.start ?? now,
                      firstDate: DateTime(2023),
                      lastDate: now.add(const Duration(days: 365)),
                      helpText: LocalizationService().translate('select_start_date'),
                      builder: (context, child) => _buildDatePickerTheme(context, child, primary, card, text),
                    );
                    
                    if (fromDate != null) {
                      // Step 2: Select To Date
                      DateTime initialEnd = _invDateRange?.end ?? fromDate;
                      if (initialEnd.isBefore(fromDate)) initialEnd = fromDate;

                      if (!mounted) return;
                      final toDate = await showDatePicker(
                        context: context,
                        initialDate: initialEnd,
                        firstDate: fromDate,
                        lastDate: now.add(const Duration(days: 365)),
                        helpText: LocalizationService().translate('select_end_date'),
                        builder: (context, child) => _buildDatePickerTheme(context, child, primary, card, text),
                      );
                      
                      if (toDate != null) {
                        setState(() {
                          _invDateRange = DateTimeRange(start: fromDate, end: toDate);
                        });
                      }
                    }
                  } catch (e) {
                    if (kDebugMode) print('Inventory Date Picker Error: $e');
                  }
                },
                icon: Icon(Icons.calendar_month_outlined, size: 18, color: primary),
                label: Text(
                  _invDateRange == null 
                    ? 'Current Snapshot' 
                    : '${_invDateRange!.start.toString().split(' ')[0]} to ${_invDateRange!.end.toString().split(' ')[0]}',
                  style: TextStyle(color: text, fontSize: 13, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  side: BorderSide(color: border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  backgroundColor: card,
                ),
              ),
              const SizedBox(width: 12),
              // Item Filter
              _buildFilterDropdown(
                'All Items',
                _invItemFilter,
                ['ALL', ..._inventoryItems.map((e) => e['name'].toString()).toSet()],
                (val) => setState(() => _invItemFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 12),
              // Supplier Filter
              _buildFilterDropdown(
                'All Suppliers',
                _invSupplierFilter,
                ['ALL', ..._suppliers.map((e) => e['name'].toString()).toSet()],
                (val) => setState(() => _invSupplierFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 12),
              // Status Filter
              _buildFilterDropdown(
                'Status',
                _invStatusFilter,
                ['ALL', 'LOW STOCK', 'HEALTHY'],
                (val) => setState(() => _invStatusFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: () {
                  setState(() {
                    _invItemFilter = 'ALL';
                    _invSupplierFilter = 'ALL';
                    _invStatusFilter = 'ALL';
                    _invDateRange = null;
                  });
                },
                icon: Icon(Icons.refresh_rounded, color: hint, size: 20),
                tooltip: 'Reset Filters',
              ),
            ],
          ),
        ),
      ),

        // Main Table
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: _buildCard(
              'Inventory Breakdown',
              SizedBox(
                width: double.infinity,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(primary.withValues(alpha: 0.05)),
                  columns: [
                    DataColumn(label: Text('Item Name', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Supplier', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Stock Level', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Cost/Unit', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Total Value', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Status', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                  ],
                  rows: filteredItems.map((item) {
                    double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
                    double min = double.tryParse(item['min_stock_level']?.toString() ?? '0') ?? 0;
                    double cost = double.tryParse(item['cost_per_unit']?.toString() ?? '0') ?? 0;
                    bool isLow = qty <= min;

                    return DataRow(cells: [
                      DataCell(Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(item['name'] ?? 'N/A', style: TextStyle(color: text, fontWeight: FontWeight.bold)),
                          Text(item['sku'] ?? '', style: TextStyle(color: hint, fontSize: 10)),
                        ],
                      )),
                      DataCell(Text(item['supplier_name'] ?? 'Not Set', style: TextStyle(color: text))),
                      DataCell(Text('$qty ${item['unit'] ?? ''}', style: TextStyle(color: text))),
                      DataCell(Text('\$${cost.toStringAsFixed(2)}', style: TextStyle(color: text))),
                      DataCell(Text('\$${(qty * cost).toStringAsFixed(2)}', style: TextStyle(color: primary, fontWeight: FontWeight.bold))),
                      DataCell(Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (isLow ? Colors.red : Colors.green).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(isLow ? 'LOW STOCK' : 'HEALTHY', 
                            style: TextStyle(color: isLow ? Colors.red : Colors.green, fontSize: 10, fontWeight: FontWeight.bold)),
                      )),
                    ]);
                  }).toList(),
                ),
              ),
              card, text, border
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFinancialReport(Color text, Color card, Color border, Color primary, Color hint) {
    // 1. Prepare Data (Combine Orders as Income and Expenses as Expense)
    List<Map<String, dynamic>> ledger = [];
    
    for (var o in _reportOrders) {
      List<dynamic> items = o['items'] ?? [];
      List<String> itemNames = items.map((i) => (i['name'] ?? '').toString()).toList();
      List<String> categories = items.map((i) => (i['category'] ?? 'Uncategorized').toString()).toList();
      
      String channel = 'DINE-IN';
      String origin = (o['origin'] ?? '').toString().toUpperCase();
      if (origin == 'WEBSITE') {
        channel = 'ONLINE';
      } else if (origin == 'QR-MENU') {
        channel = 'QR-MENU';
      } else if ((o['order_type'] ?? '').toString().toUpperCase() == 'TAKEAWAY') {
        channel = 'TAKEAWAY';
      }

      ledger.add({
        'date': DateTime.tryParse(o['order_time']?.toString() ?? '') ?? DateTime.now(),
        'desc': 'Order #${o['order_number'] ?? o['id']}',
        'type': 'INCOME',
        'category': o['order_type'] ?? 'Sales',
        'amount': double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0,
        'payment': o['payment']?['payment_method'] ?? 'N/A',
        'channel': channel,
        'customer': o['customer_name'] ?? 'Guest',
        'itemNames': itemNames,
        'categories': categories,
      });
    }

    for (var e in _expenses) {
      ledger.add({
        'date': DateTime.tryParse(e['date']?.toString() ?? '') ?? DateTime.now(),
        'desc': e['notes'] ?? 'General Expense',
        'type': 'EXPENSE',
        'category': e['category'] ?? 'Operational',
        'amount': double.tryParse(e['amount']?.toString() ?? '0') ?? 0.0,
        'payment': 'Cash', 
        'channel': 'N/A',
        'customer': 'N/A',
        'itemNames': [],
        'categories': [],
      });
    }

    for (var p in _purchases) {
      List<dynamic> pItems = p['items'] ?? [];
      List<String> pItemNames = pItems.map((i) => (i['item_name'] ?? '').toString()).toList();
      
      ledger.add({
        'date': DateTime.tryParse(p['order_date']?.toString() ?? '') ?? DateTime.now(),
        'desc': 'Purchase: ${p['invoice_number'] != null ? 'Inv #${p['invoice_number']}' : 'PO #${p['id']}'}',
        'type': 'EXPENSE',
        'category': 'Inventory',
        'amount': double.tryParse(p['total_amount']?.toString() ?? '0') ?? 0.0,
        'payment': 'Cash', 
        'channel': 'N/A',
        'customer': p['supplier_name'] ?? 'Supplier',
        'itemNames': pItemNames,
        'categories': ['Inventory'],
      });
    }

    // 2. Filter Ledger
    List<Map<String, dynamic>> filteredLedger = ledger.where((item) {
      // Date Filter
      if (_finDateRange != null) {
        if (item['date'].isBefore(_finDateRange!.start) || item['date'].isAfter(_finDateRange!.end.add(const Duration(days: 1)))) return false;
      }
      // Type Filter
      if (_finTypeFilter != 'ALL' && item['type'] != _finTypeFilter) return false;
      // Payment Filter
      if (_finPayFilter != 'ALL' && item['payment']?.toString().toUpperCase() != _finPayFilter) return false;
      // Channel Filter
      if (_finChannelFilter != 'ALL' && item['channel'] != _finChannelFilter) return false;
      // Customer Filter
      if (_finCustomerFilter != 'ALL' && item['customer'] != _finCustomerFilter) return false;
      // Item Filter
      if (_finItemFilter != 'ALL' && !(item['itemNames'] as List).contains(_finItemFilter)) return false;
      // Category Filter
      if (_finCategoryFilter != 'ALL' && !(item['categories'] as List).contains(_finCategoryFilter)) return false;
      
      return true;
    }).toList();

    filteredLedger.sort((a, b) => b['date'].compareTo(a['date']));

    // Extract filter lists from full menu and ledger
    final allItems = _menuData.expand((c) => (c['items'] as List)).map((i) => (i['name'] ?? '').toString()).toSet().toList()..sort();
    final allCats = _menuData.map((c) => (c['name'] ?? '').toString()).toSet().toList()..sort();
    final allCustomers = ledger.map((l) => l['customer'].toString()).toSet().toList()..sort();

    // 3. Calculate KPIs
    double totalIncome = 0;
    double totalExpense = 0;
    for (var item in filteredLedger) {
      if (item['type'] == 'INCOME') {
        totalIncome += item['amount'];
      } else {
        totalExpense += item['amount'];
      }
    }
    double netProfit = totalIncome - totalExpense;

    return Column(
      children: [
        // 4. Visual Financial Overview (Real-time from Endpoint)
        _buildFinancialVisuals(text, card, border, primary, hint),

        // Filter Bar
        Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
              // Date Picker
              OutlinedButton.icon(
                onPressed: () async {
                  DateTime now = DateTime.now();
                  final fromDate = await showDatePicker(
                    context: context,
                    initialDate: _finDateRange?.start ?? now,
                    firstDate: DateTime(2023),
                    lastDate: now.add(const Duration(days: 365)),
                    builder: (context, child) => _buildDatePickerTheme(context, child, primary, card, text),
                  );
                  if (fromDate != null) {
                    // Step 2: Select To Date
                    DateTime initialEnd = _finDateRange?.end ?? fromDate;
                    if (initialEnd.isBefore(fromDate)) initialEnd = fromDate;

                    if (!mounted) return;
                    final toDate = await showDatePicker(
                      context: context,
                      initialDate: initialEnd,
                      firstDate: fromDate,
                      lastDate: now.add(const Duration(days: 365)),
                      helpText: LocalizationService().translate('select_end_date'),
                      builder: (context, child) => _buildDatePickerTheme(context, child, primary, card, text),
                    );
                    if (toDate != null) {
                      setState(() => _finDateRange = DateTimeRange(start: fromDate, end: toDate));
                    }
                  }
                },
                icon: Icon(Icons.calendar_month_outlined, size: 20, color: primary),
                label: Text(
                  _finDateRange == null ? 'All Time' : '${_finDateRange!.start.toString().split(' ')[0]} to ${_finDateRange!.end.toString().split(' ')[0]}',
                  style: TextStyle(color: text, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  side: BorderSide(color: border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(width: 16),
              // Type Filter
              _buildFilterDropdown(
                'Transaction Type',
                _finTypeFilter,
                ['ALL', 'INCOME', 'EXPENSE'],
                (val) => setState(() => _finTypeFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Payment Filter
              _buildFilterDropdown(
                'Payment Method',
                _finPayFilter,
                ['ALL', 'CASH', 'CARD'],
                (val) => setState(() => _finPayFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Channel Filter
              _buildFilterDropdown(
                'Channel',
                _finChannelFilter,
                ['ALL', 'DINE-IN', 'TAKEAWAY', 'ONLINE', 'QR-MENU'],
                (val) => setState(() => _finChannelFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Customer Filter
              _buildFilterDropdown(
                'Customer',
                _finCustomerFilter,
                ['ALL', ...allCustomers],
                (val) => setState(() => _finCustomerFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Item Filter
              _buildFilterDropdown(
                'Food Item',
                _finItemFilter,
                ['ALL', ...allItems],
                (val) => setState(() => _finItemFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 16),
              // Category Filter
              _buildFilterDropdown(
                'Category',
                _finCategoryFilter,
                ['ALL', ...allCats],
                (val) => setState(() => _finCategoryFilter = val!),
                text, card, border, primary
              ),
              const SizedBox(width: 32),
              IconButton(
                onPressed: () {
                  setState(() {
                    _finDateRange = null;
                    _finTypeFilter = 'ALL';
                    _finPayFilter = 'ALL';
                    _finChannelFilter = 'ALL';
                    _finCustomerFilter = 'ALL';
                    _finItemFilter = 'ALL';
                    _finCategoryFilter = 'ALL';
                  });
                },
                icon: Icon(Icons.refresh_rounded, color: hint),
              ),
            ],
          ),
        ),
      ),

        // Ledger Table
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: _buildCard(
              'Financial Ledger',
              SizedBox(
                width: double.infinity,
                child: DataTable(
                  headingRowColor: WidgetStateProperty.all(primary.withValues(alpha: 0.05)),
                  columns: [
                    DataColumn(label: Text('Date', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Description', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Category', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Type', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                    DataColumn(label: Text('Amount', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                  ],
                  rows: filteredLedger.map((item) {
                    bool isIncome = item['type'] == 'INCOME';
                    return DataRow(cells: [
                      DataCell(Text(item['date'].toString().split(' ')[0], style: TextStyle(color: hint))),
                      DataCell(Text(item['desc'], style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                      DataCell(Text(item['category'], style: TextStyle(color: text))),
                      DataCell(Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (isIncome ? Colors.green : Colors.red).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(item['type'], style: TextStyle(color: isIncome ? Colors.green : Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                      )),
                      DataCell(Text('\$${item['amount'].toStringAsFixed(2)}', 
                          style: TextStyle(color: isIncome ? Colors.green : Colors.red, fontWeight: FontWeight.bold))),
                    ]);
                  }).toList(),
                ),
              ),
              card, text, border
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildKPI(String label, String value, IconData icon, Color color, Color card, Color text, Color border, Color hint) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(color: hint, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(color: text, fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildCard(String title, Widget content, Color card, Color text, Color border) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: text, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          content,
        ],
      ),
    );
  }

  Widget _buildStatusProgress(String label, double value, double max, Color color, Color text, Color border) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: text, fontWeight: FontWeight.w600, fontSize: 13)),
            Text('${value.toInt()}', style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 13)),
          ],
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: max > 0 ? value / max : 0,
          backgroundColor: border,
          valueColor: AlwaysStoppedAnimation<Color>(color),
          borderRadius: BorderRadius.circular(4),
          minHeight: 6,
        ),
      ],
    );
  }

  Widget _buildOperationalPieChart(Color primary) {
    final types = (widget.summaryData['types'] as List? ?? []);
    if (types.isEmpty) return Center(child: Text(LocalizationService().translate('no_data')));
    
    return SizedBox(
      height: 200,
      child: PieChart(
        PieChartData(
          sectionsSpace: 0,
          centerSpaceRadius: 40,
          sections: types.map((t) {
            final color = t['order_type'] == 'Dine-In' ? primary : (t['order_type'] == 'Takeaway' ? primary : Colors.purple);
            return PieChartSectionData(
              color: color,
              value: double.tryParse(t['count']?.toString() ?? '0') ?? 0.0,
              title: '${t['count'] ?? 0}',
              radius: 50,
              titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTopItemsBarChart(Color primary, Color hint) {
    final items = (widget.summaryData['topItems'] as List? ?? []);
    if (items.isEmpty) return Center(child: Text(LocalizationService().translate('no_data')));
    
    return SizedBox(
      height: 300,
      child: BarChart(
        BarChartData(
          barGroups: items.take(5).toList().asMap().entries.map((e) {
            final val = e.value['count'] ?? e.value['sold'] ?? 0;
            return BarChartGroupData(
              x: e.key,
              barRods: [
                BarChartRodData(
                  toY: double.tryParse(val.toString()) ?? 0.0,
                  color: primary,
                  width: 20,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                )
              ],
            );
          }).toList(),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  int idx = value.toInt();
                  if (idx >= 0 && idx < items.length) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Text(items[idx]['name'].toString().split(' ')[0], 
                          style: TextStyle(color: hint, fontSize: 10)),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
        ),
      ),
    );
  }

  String _safeTime(dynamic dateTimeStr, {String defaultVal = '--:--'}) {
    if (dateTimeStr == null) return defaultVal;
    String s = dateTimeStr.toString();
    if (s.contains(' ')) {
      List<String> parts = s.split(' ');
      if (parts.length > 1) {
        String timePart = parts[1];
        if (timePart.length >= 5) return timePart.substring(0, 5);
        return timePart;
      }
    }
    if (s.contains(':')) {
      if (s.length >= 5) return s.substring(0, 5);
      return s;
    }
    return s.length > 10 ? s : defaultVal;
  }

  Widget _buildReconciliationCard(Color text, Color card, Color border, Color primary, Color hint) {
    final financials = widget.financialData;
    final gross = double.tryParse(financials['gross_sales']?.toString() ?? '0') ?? 0.0;
    final cogs = double.tryParse(financials['cogs']?.toString() ?? '0') ?? 0.0;
    final expenses = double.tryParse(financials['expenses']?.toString() ?? '0') ?? 0.0;
    final net = double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0;

    return _buildCard(
      LocalizationService().translate('financial_reconciliation_summary'),
      Column(
        children: [
          _buildReconciliationRow(LocalizationService().translate('gross_sales'), '\$${gross.toStringAsFixed(2)}', Colors.blue, text),
          const SizedBox(height: 12),
          _buildReconciliationRow(LocalizationService().translate('estimated_cogs'), '-\$${cogs.toStringAsFixed(2)}', Colors.orange, text),
          const SizedBox(height: 12),
          _buildReconciliationRow(LocalizationService().translate('operational_expenses'), '-\$${expenses.toStringAsFixed(2)}', Colors.red, text),
          const Divider(height: 32),
          _buildReconciliationRow(
            LocalizationService().translate('net_profit'), 
            '\$${net.toStringAsFixed(2)}', 
            net >= 0 ? Colors.green : Colors.red, 
            text,
            isBold: true
          ),
        ],
      ),
      card, text, border
    );
  }

  Widget _buildReconciliationRow(String label, String value, Color color, Color text, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(color: text, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: isBold ? 18 : 14)),
      ],
    );
  }

  Widget _buildFinancialVisuals(Color text, Color card, Color border, Color primary, Color hint) {
    final financials = widget.financialData;
    final grossSales = double.tryParse(financials['gross_sales']?.toString() ?? '0') ?? 0.0;
    final cogs = double.tryParse(financials['cogs']?.toString() ?? '0') ?? 0.0;
    final expenses = double.tryParse(financials['expenses']?.toString() ?? '0') ?? 0.0;
    final netProfit = double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0;
    final grossProfit = grossSales - cogs;
    
    final grossMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0.0;
    final netMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0.0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 24, 32, 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                flex: 3,
                child: Row(
                  children: [
                    Expanded(
                      child: _buildVisualMetricCard(
                        'Gross Profit',
                        '\$${grossProfit.toStringAsFixed(2)}',
                        '${grossMargin.toStringAsFixed(1)}% Margin',
                        Icons.account_balance_rounded,
                        Colors.blue,
                        card, text, border, hint
                      ),
                    ),
                    const SizedBox(width: 20),
                    Expanded(
                      child: _buildVisualMetricCard(
                        'Net Profit',
                        '\$${netProfit.toStringAsFixed(2)}',
                        '${netMargin.toStringAsFixed(1)}% Margin',
                        Icons.monetization_on_rounded,
                        Colors.green,
                        card, text, border, hint
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              Expanded(
                flex: 2,
                child: _buildProfitBreakdownCard(grossSales, cogs, expenses, netProfit, card, text, border, primary, hint),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVisualMetricCard(String label, String value, String subtitle, IconData icon, Color color, Color card, Color text, Color border, Color hint) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(icon, color: color, size: 32),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: hint, fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(color: text, fontSize: 26, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(subtitle, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfitBreakdownCard(double gross, double cogs, double exp, double net, Color card, Color text, Color border, Color primary, Color hint) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Profitability Waterfall', style: TextStyle(color: text, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          _buildWaterfallBar('Revenue', gross, gross, Colors.blue, text, border),
          const SizedBox(height: 12),
          _buildWaterfallBar('COGS', cogs, gross, Colors.orange, text, border),
          const SizedBox(height: 12),
          _buildWaterfallBar('Expenses', exp, gross, Colors.red, text, border),
          const SizedBox(height: 12),
          _buildWaterfallBar('Net Profit', net, gross, Colors.green, text, border),
        ],
      ),
    );
  }

  Widget _buildWaterfallBar(String label, double value, double max, Color color, Color text, Color border) {
    final percent = max > 0 ? (value / max) : 0.0;
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: text, fontSize: 12, fontWeight: FontWeight.w500)),
            Text('\$${value.toStringAsFixed(2)}', style: TextStyle(color: text, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: percent.clamp(0.0, 1.0),
            backgroundColor: border,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 6,
          ),
        ),
      ],
    );
  }
}
