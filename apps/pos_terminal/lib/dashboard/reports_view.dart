import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../theme_service.dart';
import '../localization_service.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

class ReportsView extends StatefulWidget {
  final Map<String, dynamic> summaryData;
  final Map<String, dynamic> financialData;
  final Map<String, dynamic> operationalData;
  final List<dynamic> placedOrders;
  final List<dynamic> shifts;
  final bool isLoading;
  final int? resetToken;

  const ReportsView({
    super.key,
    required this.summaryData,
    required this.financialData,
    required this.operationalData,
    required this.placedOrders,
    required this.shifts,
    required this.isLoading,
    this.resetToken,
  });

  @override
  State<ReportsView> createState() => _ReportsViewState();
}

class _ReportsViewState extends State<ReportsView> {
  int _selectedTab = 0;

  @override
  void didUpdateWidget(ReportsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.resetToken != null && widget.resetToken != oldWidget.resetToken) {
      setState(() {
        _selectedTab = 0;
      });
    }
  }
  DateTimeRange? _reportDateRange;
  String _reportTypeFilter = 'ALL';
  String _reportStatusFilter = 'ALL';
  List<dynamic> _reportOrders = [];
  bool _isReportLoading = false;
  Set<String> _availableDates = {};
  DateTime _firstDate = DateTime(
    2023,
  ); // Reset to 2023 to allow navigation while loading
  List<dynamic> _inventoryItems = [];
  List<dynamic> _expenses = [];
  List<dynamic> _menuData = [];
  List<dynamic> _purchases = [];
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
  String _finSearchQuery = '';
  String _invSearchQuery = '';
  String _orderItemFilter = 'ALL';
  String _orderCategoryFilter = 'ALL';
  String _reportOriginFilter = 'ALL';
  String _reportStaffFilter = 'ALL';
  String _invCategoryFilter = 'ALL';
  List<dynamic> _inventoryCategories = [];

  @override
  void initState() {
    super.initState();
    _reportOrders = widget.placedOrders;
    _fetchAvailableDates();
    _fetchInventory();
    _fetchExpenses();
    _fetchMenuData();
    _fetchPurchases();
    _fetchInventoryCategories();
  }

  Future<void> _fetchInventoryCategories() async {
    try {
      final res = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/inventory/categories'),
      );
      if (res.statusCode == 200) {
        setState(() => _inventoryCategories = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Inventory Categories Error: $e');
    }
  }

  Future<void> _fetchPurchases() async {
    try {
      final res = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases'),
      );
      if (res.statusCode == 200) {
        setState(() => _purchases = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Purchases Error: $e');
    }
  }

  Future<void> _fetchMenuData() async {
    try {
      final res = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/menu'),
      );
      if (res.statusCode == 200) {
        setState(() => _menuData = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Menu Data Error: $e');
    }
  }

  Future<void> _fetchExpenses() async {
    try {
      final res = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/expenses'),
      );
      if (res.statusCode == 200) {
        setState(() => _expenses = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Expenses Error: $e');
    }
  }


  Future<void> _fetchInventory() async {
    try {
      String url = '${ThemeService.apiBaseUrl}/api/inventory';
      if (_invDateRange != null) {
        final start = _invDateRange!.start.toIso8601String().split('T')[0];
        final end = _invDateRange!.end.toIso8601String().split('T')[0];
        url = '${ThemeService.apiBaseUrl}/api/reports/inventory-log?startDate=$start&endDate=$end';
      }

      final res = await http.get(Uri.parse(url));
      if (res.statusCode == 200) {
        setState(() => _inventoryItems = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Inventory Error: $e');
    }
  }

  Future<void> _fetchAvailableDates() async {
    try {
      final res = await http
          .get(Uri.parse('${ThemeService.apiBaseUrl}/api/orders/data-range'))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(res.body);
        if (mounted) {
          setState(() {
            final List<dynamic> dates = data['availableDates'] ?? [];
            _availableDates = dates
                .map((d) => d.toString().split('T')[0])
                .toSet();

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
        final themeBorder = themeText.withOpacity(0.15);
        final themePrimary = theme.primaryColor;
        final themeHint = themeText.withOpacity(0.6);

        return Container(
          color: themeBg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header & Sub-nav
              Container(
                padding: const EdgeInsets.fromLTRB(32, 24, 32, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    LocalizationService().translate(
                                      'business_intelligence',
                                    ),
                                    style: TextStyle(
                                      color: themeText,
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (_selectedTab != 0 &&
                                      _selectedTab != 5) ...[
                                    const SizedBox(width: 48),
                                    _buildHeaderMetrics(
                                      _selectedTab,
                                      themeText,
                                      themeCard,
                                      themeBorder,
                                      themePrimary,
                                      themeHint,
                                    ),
                                  ],
                                  if (_selectedTab == 5) ...[
                                    const SizedBox(width: 24),
                                    Expanded(
                                      child: _buildFinancialHeaderSection(
                                        themeText,
                                        themeCard,
                                        themeBorder,
                                        themePrimary,
                                        themeHint,
                                      ),
                                    ),
                                  ],
                                  if (_selectedTab == 0) ...[
                                    const SizedBox(width: 24),
                                    SizedBox(
                                      width: 280,
                                      child: _buildCondensedSummaryVisuals(
                                        themePrimary,
                                        themeHint,
                                        themeText,
                                        themeBorder,
                                        themeCard,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 24),
                        _buildSubNav(
                          themeText,
                          themeCard,
                          themeBorder,
                          themePrimary,
                          themeHint,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Divider(color: themeBorder),
                  ],
                ),
              ),
              // Global Filter Bar (for other tabs)
              if (_selectedTab == 4)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      _buildInventoryFilters(
                        themeText,
                        themeCard,
                        themeBorder,
                        themePrimary,
                        themeHint,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildSearchBar(
                          themeText,
                          themeCard,
                          themeBorder,
                          themeHint,
                          _invSearchQuery,
                          (val) => setState(() => _invSearchQuery = val),
                        ),
                      ),
                    ],
                  ),
                ),
              // Content
              Expanded(
                child: widget.isLoading
                    ? Center(
                        child: CircularProgressIndicator(color: themePrimary),
                      )
                    : _getContent(
                        themeText,
                        themeCard,
                        themeBorder,
                        themePrimary,
                        themeHint,
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSubNav(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final tabs = [
      {
        'label': LocalizationService().translate('summary_tab'),
        'icon': Icons.summarize_outlined,
      },
      {
        'label': LocalizationService().translate('sales_log_tab'),
        'icon': Icons.receipt_long_outlined,
      },
      {
        'label': LocalizationService().translate('detailed_orders_report'),
        'icon': Icons.history_edu_outlined,
      },
      {
        'label': LocalizationService().translate('product_mix_tab'),
        'icon': Icons.pie_chart_outline_rounded,
      },
      {'label': 'Inventory Status', 'icon': Icons.inventory_2_outlined},
      {'label': 'Financials', 'icon': Icons.account_balance_outlined},
      {
        'label': LocalizationService().translate('staff_tab'),
        'icon': Icons.people_outline_rounded,
      },
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
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
                  Icon(
                    tabs[i]['icon'] as IconData,
                    size: 20,
                    color: _selectedTab == i ? primary : hint,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    tabs[i]['label'] as String,
                    style: TextStyle(
                      color: _selectedTab == i ? primary : text,
                      fontWeight: _selectedTab == i
                          ? FontWeight.bold
                          : FontWeight.normal,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            );
          }),
          onChanged: (val) {
            if (val != null) {
              setState(() {
                _selectedTab = val;
                if (val == 1 || val == 2) _fetchFilteredReport();
              });
            }
          },
        ),
      ),
    );
  }

  Widget _getContent(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    switch (_selectedTab) {
      case 0:
        return _buildSummary(text, card, border, primary, hint);
      case 1:
        return _buildSalesLog(text, card, border, primary, hint);
      case 2:
        return _buildDetailedOrdersReport(text, card, border, primary, hint);
      case 3:
        return _buildProductMix(text, card, border, primary, hint);
      case 4:
        return _buildInventoryReport(text, card, border, primary, hint);
      case 5:
        return _buildFinancialReport(text, card, border, primary, hint);
      case 6:
        return _buildStaffReport(text, card, border, primary, hint);
      default:
        return _buildSummary(text, card, border, primary, hint);
    }
  }

  Widget _buildSummary(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final today = widget.summaryData['today'] ?? {'total': 0.0, 'count': 0};

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                        final color = type == 'Dine-In'
                            ? primary
                            : (type == 'Takeaway' ? primary : Colors.purple);
                        final count =
                            double.tryParse(t['count']?.toString() ?? '0') ??
                            0.0;
                        final totalCount =
                            (today['count'] as num?)?.toDouble() ?? 1.0;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: _buildStatusProgress(
                            type,
                            count,
                            totalCount > 0 ? totalCount : 1.0,
                            color,
                            text,
                            border,
                          ),
                        );
                      }),
                    ],
                  ),
                  card,
                  text,
                  border,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 3,
                child: _buildCard(
                  'Top Selling Items (30 Days)',
                  _buildTopItemsBarChart(primary, hint),
                  card,
                  text,
                  border,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSalesLog(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    // Calculate Summaries for the Bar
    double totalSales = 0;
    int ordersCount = _reportOrders.length;
    int totalItems = 0;

    for (var order in _reportOrders) {
      totalSales += double.tryParse(order['total_amount'].toString()) ?? 0;
      if (order['items'] != null) {
        for (var item in (order['items'] as List)) {
          totalItems += (int.tryParse(item['quantity'].toString()) ?? 1);
        }
      }
    }

    double avgValue = ordersCount > 0 ? totalSales / ordersCount : 0;

    return Column(
      children: [
        // --- SUMMARY BAR ---
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: card,
            border: Border(bottom: BorderSide(color: border)),
          ),
          child: Row(
            children: [
              _buildSmallMetric(
                'Report Sales',
                '\$${totalSales.toStringAsFixed(2)}',
                Icons.account_balance_wallet_outlined,
                Colors.green,
                text,
                hint,
              ),
              _buildMetricDivider(border),
              _buildSmallMetric(
                'Orders Count',
                ordersCount.toString(),
                Icons.shopping_bag_outlined,
                Colors.amber,
                text,
                hint,
              ),
              _buildMetricDivider(border),
              _buildSmallMetric(
                'Avg Value',
                '\$${avgValue.toStringAsFixed(2)}',
                Icons.analytics_outlined,
                Colors.indigo,
                text,
                hint,
              ),
              _buildMetricDivider(border),
              _buildSmallMetric(
                'Items Sold',
                totalItems.toString(),
                Icons.shopping_cart_outlined,
                Colors.purple,
                text,
                hint,
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    backgroundColor: card,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    builder: (ctx) => SafeArea(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ListTile(
                            leading: Icon(Icons.table_chart_outlined, color: primary),
                            title: const Text('Export as CSV Spreadsheet'),
                            onTap: () {
                              Navigator.pop(ctx);
                              _exportToCSV();
                            },
                          ),
                          ListTile(
                            leading: Icon(Icons.picture_as_pdf_outlined, color: Colors.red),
                            title: const Text('Export as PDF Document'),
                            onTap: () {
                              Navigator.pop(ctx);
                              _exportToPDF();
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.download_outlined, size: 18),
                label: const Text('EXPORT'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(width: 16),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _orderSearchQuery = '';
                    _reportDateRange = null;
                    _orderItemFilter = 'ALL';
                    _orderCategoryFilter = 'ALL';
                    _reportOriginFilter = 'ALL';
                    _reportTypeFilter = 'ALL';
                    _reportStatusFilter = 'ALL';
                    _reportStaffFilter = 'ALL';
                  });
                  _fetchFilteredReport();
                },
                icon: Icon(Icons.refresh_outlined, size: 18, color: hint),
                label: Text(
                  LocalizationService().translate('clear_filters'),
                  style: TextStyle(color: hint),
                ),
              ),
            ],
          ),
        ),

        // Filter Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
          decoration: BoxDecoration(
            color: card.withOpacity(0.3),
            border: Border(bottom: BorderSide(color: border)),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildReportDatePicker(text, card, border, primary),
                const SizedBox(width: 16),
                SizedBox(
                  width: 300,
                  child: _buildSearchBar(
                    text,
                    card,
                    border,
                    hint,
                    _orderSearchQuery,
                    (val) => setState(() => _orderSearchQuery = val),
                  ),
                ),
                const SizedBox(width: 16),
                _buildFilterDropdown(
                  'CATEGORIES',
                  _orderCategoryFilter,
                  [
                    'ALL',
                    ..._menuData.map((c) => c['name'].toString()).toList()
                      ..sort(),
                  ],
                  (val) => setState(() => _orderCategoryFilter = val!),
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 32),
                TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _orderSearchQuery = '';
                      _reportDateRange = null;
                      _orderItemFilter = 'ALL';
                      _orderCategoryFilter = 'ALL';
                      _reportOriginFilter = 'ALL';
                      _reportTypeFilter = 'ALL';
                      _reportStatusFilter = 'ALL';
                      _reportStaffFilter = 'ALL';
                    });
                    _fetchFilteredReport();
                  },
                  icon: Icon(Icons.refresh_outlined, size: 18, color: hint),
                  label: Text(
                    LocalizationService().translate('clear_filters'),
                    style: TextStyle(color: hint),
                  ),
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
                    LocalizationService().translate('recent_transactions'),
                    _reportOrders.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(40),
                              child: Text(
                                LocalizationService().translate(
                                  'no_results_found',
                                ),
                                style: TextStyle(color: hint),
                              ),
                            ),
                          )
                        : SizedBox(
                            width: double.infinity,
                            child: DataTable(
                              headingRowColor: WidgetStateProperty.all(
                                primary.withOpacity(0.05),
                              ),
                              columns: [
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate('id_col'),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate('time_col'),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    'Items',
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate('type_col'),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate(
                                      'total_col',
                                    ),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate(
                                      'status_col',
                                    ),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                              rows: _reportOrders
                                  .where((o) {
                                    if (_orderSearchQuery.isNotEmpty) {
                                      final query = _orderSearchQuery
                                          .toLowerCase()
                                          .replaceAll('#', '');
                                      final orderNo = (o['order_number'] ?? '')
                                          .toString()
                                          .toLowerCase();
                                      final orderId = (o['id'] ?? '')
                                          .toString()
                                          .toLowerCase();
                                      if (!orderNo.contains(query) &&
                                          !orderId.contains(query))
                                        return false;
                                    }
                                    // 3. Category Filter
                                    if (_orderCategoryFilter != 'ALL') {
                                      bool hasCategory = (o['items'] as List?)
                                              ?.any((item) {
                                            final cat = _menuData.firstWhere(
                                              (c) =>
                                                  c['name'] ==
                                                  _orderCategoryFilter,
                                              orElse: () => null,
                                            );
                                            if (cat == null) return false;
                                            return (cat['items'] as List).any(
                                              (mi) =>
                                                  mi['id'] == item['product_id'],
                                            );
                                          }) ??
                                          false;
                                      if (!hasCategory) return false;
                                    }
                                    return true;
                                  })
                                  .map((o) {
                                    return DataRow(
                                      cells: [
                                        DataCell(
                                          Text(
                                            '#${o['order_number'] ?? o['id']}',
                                            style: TextStyle(color: text),
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            _safeTime(o['order_time']),
                                            style: TextStyle(color: hint),
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            '${o['order_type']}',
                                            style: TextStyle(color: text),
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            '\$${(double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                                            style: TextStyle(
                                              color: primary,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        DataCell(
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color:
                                                  (o['status'] == 'completed'
                                                          ? Colors.green
                                                          : primary)
                                                      .withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              o['status']
                                                  .toString()
                                                  .toUpperCase(),
                                              style: TextStyle(
                                                color:
                                                    o['status'] == 'completed'
                                                    ? Colors.green
                                                    : primary,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    );
                                  })
                                  .toList(),
                            ),
                          ),
                    card,
                    text,
                    border,
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildProductMix(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
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
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(
                          LocalizationService().translate('no_sales_data'),
                          style: TextStyle(color: hint),
                        ),
                      ),
                    )
                  : Column(
                      children: topItems
                          .map(
                            (item) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                item['name'] ?? 'Unknown',
                                style: TextStyle(
                                  color: text,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: primary.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '${item['sold']} sold',
                                  style: TextStyle(
                                    color: primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
              card,
              text,
              border,
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: _buildCard(
              'Customization Popularity',
              customizations.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(
                          LocalizationService().translate('no_data'),
                          style: TextStyle(color: hint),
                        ),
                      ),
                    )
                  : Column(
                      children: customizations
                          .map(
                            (c) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                c['name'] ?? 'Unknown',
                                style: TextStyle(
                                  color: text,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              subtitle: Text(
                                c['type']?.toString().toUpperCase() ?? '',
                                style: TextStyle(color: hint, fontSize: 10),
                              ),
                              trailing: Text(
                                '${c['count']} uses',
                                style: TextStyle(
                                  color: text,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
              card,
              text,
              border,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailedOrdersReport(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    // Calculate Summaries for the Bar
    double totalSales = 0;
    int ordersCount = _reportOrders.length;
    int totalItems = 0;

    for (var order in _reportOrders) {
      totalSales += double.tryParse(order['total_amount'].toString()) ?? 0;
      if (order['items'] != null) {
        for (var item in (order['items'] as List)) {
          totalItems += (int.tryParse(item['quantity'].toString()) ?? 1);
        }
      }
    }

    double avgValue = ordersCount > 0 ? totalSales / ordersCount : 0;

    return Column(
      children: [
        // --- SUMMARY BAR ---
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: card,
            border: Border(bottom: BorderSide(color: border)),
          ),
          child: Row(
            children: [
              _buildSmallMetric(
                'Report Sales',
                '\$${totalSales.toStringAsFixed(2)}',
                Icons.account_balance_wallet_outlined,
                Colors.green,
                text,
                hint,
              ),
              _buildMetricDivider(border),
              _buildSmallMetric(
                'Orders Count',
                ordersCount.toString(),
                Icons.shopping_bag_outlined,
                Colors.amber,
                text,
                hint,
              ),
              _buildMetricDivider(border),
              _buildSmallMetric(
                'Avg Value',
                '\$${avgValue.toStringAsFixed(2)}',
                Icons.analytics_outlined,
                Colors.indigo,
                text,
                hint,
              ),
              _buildMetricDivider(border),
              _buildSmallMetric(
                'Items Sold',
                totalItems.toString(),
                Icons.shopping_cart_outlined,
                Colors.purple,
                text,
                hint,
              ),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    backgroundColor: card,
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    ),
                    builder: (ctx) => SafeArea(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ListTile(
                            leading: Icon(Icons.table_chart_outlined, color: primary),
                            title: const Text('Export as CSV Spreadsheet'),
                            onTap: () {
                              Navigator.pop(ctx);
                              _exportToCSV();
                            },
                          ),
                          ListTile(
                            leading: Icon(Icons.picture_as_pdf_outlined, color: Colors.red),
                            title: const Text('Export as PDF Document'),
                            onTap: () {
                              Navigator.pop(ctx);
                              _exportToPDF();
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.download_outlined, size: 18),
                label: const Text('EXPORT'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(width: 16),
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _orderSearchQuery = '';
                    _reportDateRange = null;
                    _orderItemFilter = 'ALL';
                    _orderCategoryFilter = 'ALL';
                    _reportOriginFilter = 'ALL';
                    _reportTypeFilter = 'ALL';
                    _reportStatusFilter = 'ALL';
                    _reportStaffFilter = 'ALL';
                  });
                  _fetchFilteredReport();
                },
                icon: Icon(Icons.refresh_outlined, size: 18, color: hint),
                label: Text(
                  LocalizationService().translate('clear_filters'),
                  style: TextStyle(color: hint),
                ),
              ),
            ],
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
                _buildReportDatePicker(text, card, border, primary),
                const SizedBox(width: 16),
                SizedBox(
                  width: 180,
                  child: _buildSearchBar(
                    text,
                    card,
                    border,
                    hint,
                    _orderSearchQuery,
                    (val) => setState(() => _orderSearchQuery = val),
                  ),
                ),
                const SizedBox(width: 16),
                // Category Filter
                _buildFilterDropdown(
                  'CATEGORIES',
                  _orderCategoryFilter,
                  [
                    'ALL',
                    ..._menuData.map((c) => c['name'].toString()).toList()
                      ..sort(),
                  ],
                  (val) => setState(() => _orderCategoryFilter = val!),
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 16),
                // Item Filter
                _buildFilterDropdown(
                  'ITEMS',
                  _orderItemFilter,
                  [
                    'ALL',
                    ..._menuData
                        .where((c) =>
                            _orderCategoryFilter == 'ALL' ||
                            c['name'] == _orderCategoryFilter)
                        .expand((c) => (c['items'] as List))
                        .map((i) => i['name'].toString())
                        .toSet()
                        .toList()
                      ..sort(),
                  ],
                  (val) => setState(() => _orderItemFilter = val!),
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 16),
                // Staff Filter
                _buildFilterDropdown(
                  'STAFF',
                  _reportStaffFilter,
                  [
                    'ALL',
                    ..._reportOrders
                        .map((o) => (o['waiter_name'] ?? o['user_name'] ?? 'System').toString())
                        .where((name) => name.isNotEmpty)
                        .toSet()
                        .toList()
                      ..sort(),
                  ],
                  (val) => setState(() => _reportStaffFilter = val!),
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 16),
                // Origin Filter
                _buildFilterDropdown(
                  'ORIGINS',
                  _reportOriginFilter,
                  ['ALL', 'Counter', 'Website', 'QR Menu'],
                  (val) {
                    setState(() => _reportOriginFilter = val!);
                  },
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 16),
                // Type Filter
                _buildFilterDropdown(
                  'TYPES',
                  _reportTypeFilter,
                  ['ALL', 'Dine-In', 'Takeaway', 'Delivery'],
                  (val) {
                    setState(() => _reportTypeFilter = val!);
                    _fetchFilteredReport();
                  },
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 16),
                // Status Filter
                _buildFilterDropdown(
                  'STATUS',
                  _reportStatusFilter,
                  [
                    'ALL',
                    'Pending',
                    'Preparing',
                    'Ready',
                    'Completed',
                    'Cancelled',
                    'Rejected',
                    'Paid',
                  ],
                  (val) {
                    setState(() => _reportStatusFilter = val!);
                    _fetchFilteredReport();
                  },
                  text,
                  card,
                  border,
                  primary,
                ),
                const SizedBox(width: 32),
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
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(40),
                              child: Text(
                                LocalizationService().translate(
                                  'no_results_found',
                                ),
                                style: TextStyle(color: hint),
                              ),
                            ),
                          )
                        : SizedBox(
                            width: double.infinity,
                            child: DataTable(
                              headingRowColor: WidgetStateProperty.all(
                                primary.withOpacity(0.05),
                              ),
                              columns: [
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate('id_col'),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate('time_col'),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    'Items',
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate('type_col'),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate(
                                      'total_col',
                                    ),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                DataColumn(
                                  label: Text(
                                    LocalizationService().translate(
                                      'status_col',
                                    ),
                                    style: TextStyle(
                                      color: text,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                              rows: _reportOrders
                                  .where((o) {
                                    // Search Query Filter
                                    if (_orderSearchQuery.isNotEmpty) {
                                      final query = _orderSearchQuery
                                          .toLowerCase()
                                          .replaceAll('#', '');
                                      final orderNo = (o['order_number'] ?? '')
                                          .toString()
                                          .toLowerCase();
                                      final orderId = (o['id'] ?? '')
                                          .toString()
                                          .toLowerCase();
                                      final table = (o['table_number'] ?? '')
                                          .toString()
                                          .toLowerCase();

                                      if (!orderNo.contains(query) &&
                                          !orderId.contains(query) &&
                                          !table.contains(query))
                                        return false;
                                    }
                                    
                                    // Category Filter
                                    if (_orderCategoryFilter != 'ALL') {
                                      bool hasCategory = (o['items'] as List?)
                                              ?.any((item) {
                                            final cat = _menuData.firstWhere(
                                              (c) =>
                                                  c['name'] ==
                                                  _orderCategoryFilter,
                                              orElse: () => null,
                                            );
                                            if (cat == null) return false;
                                            return (cat['items'] as List).any(
                                              (mi) =>
                                                  mi['id'] == item['product_id'],
                                            );
                                          }) ??
                                          false;
                                      if (!hasCategory) return false;
                                    }

                                    // Item Filter
                                    if (_orderItemFilter != 'ALL') {
                                      bool hasItem = (o['items'] as List?)?.any(
                                            (item) =>
                                                item['name'] == _orderItemFilter,
                                          ) ??
                                          false;
                                      if (!hasItem) return false;
                                    }

                                    // Origin Filter
                                    if (_reportOriginFilter != 'ALL' &&
                                        (o['origin'] ?? 'Counter') !=
                                            _reportOriginFilter)
                                      return false;

                                    // Staff Filter
                                    if (_reportStaffFilter != 'ALL') {
                                      final staff = (o['waiter_name'] ??
                                              o['user_name'] ??
                                              'System')
                                          .toString();
                                      if (staff != _reportStaffFilter) return false;
                                    }

                                    // Type Filter
                                    if (_reportTypeFilter != 'ALL' &&
                                        o['order_type'] != _reportTypeFilter)
                                      return false;

                                    // Status Filter
                                    if (_reportStatusFilter != 'ALL' &&
                                        o['status'].toString().toLowerCase() !=
                                            _reportStatusFilter.toLowerCase())
                                      return false;

                                    return true;
                                  })
                                  .map((o) {
                                    return DataRow(
                                      cells: [
                                        DataCell(
                                          Text(
                                            '#${o['order_number'] ?? o['id']}',
                                            style: TextStyle(color: text),
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            o['order_time']?.toString() ?? '',
                                            style: TextStyle(
                                              color: hint,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                        DataCell(
                                          Builder(
                                            builder: (context) {
                                              final items =
                                                  o['items'] as List? ?? [];
                                              if (items.isEmpty) {
                                                return Text(
                                                  'No items',
                                                  style: TextStyle(
                                                    color: hint,
                                                    fontStyle: FontStyle.italic,
                                                    fontSize: 11,
                                                  ),
                                                );
                                              }
                                              return Wrap(
                                                spacing: 4,
                                                runSpacing: 4,
                                                children: [
                                                  if (_orderItemFilter != 'ALL')
                                                    ...items
                                                        .where((i) =>
                                                            i['name']
                                                                .toString()
                                                                .toUpperCase() ==
                                                            _orderItemFilter
                                                                .toUpperCase())
                                                        .take(1)
                                                        .map((i) => Container(
                                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                              decoration: BoxDecoration(
                                                                color: primary.withOpacity(0.1),
                                                                borderRadius: BorderRadius.circular(4),
                                                                border: Border.all(color: primary.withOpacity(0.2)),
                                                              ),
                                                              child: Text('${i['quantity']}x ${i['name']}', style: TextStyle(color: primary, fontSize: 10, fontWeight: FontWeight.bold)),
                                                            ))
                                                  else if (_orderCategoryFilter != 'ALL')
                                                    ...(() {
                                                      final menuCategory = _menuData.firstWhere((c) => c['name'].toString().toUpperCase() == _orderCategoryFilter.toUpperCase(), orElse: () => null);
                                                      if (menuCategory != null) {
                                                        final catItems = items.where((i) {
                                                          final catProducts = (menuCategory['items'] as List?) ?? [];
                                                          return catProducts.any((cp) => cp['id'] == i['product_id']);
                                                        }).toList();
                                                        final totalQty = catItems.fold<int>(0, (sum, item) => sum + (item['quantity'] as int? ?? 1));
                                                        if (totalQty > 0) {
                                                          return [
                                                            Container(
                                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                              decoration: BoxDecoration(
                                                                color: Colors.blue.withOpacity(0.1),
                                                                borderRadius: BorderRadius.circular(4),
                                                                border: Border.all(color: Colors.blue.withOpacity(0.2)),
                                                              ),
                                                              child: Text('${_orderCategoryFilter.toUpperCase()}: $totalQty ITEMS', style: const TextStyle(color: Colors.blue, fontSize: 10, fontWeight: FontWeight.bold)),
                                                            )
                                                          ];
                                                        }
                                                      }
                                                      return <Widget>[];
                                                    })()
                                                  else ...[
                                                    if (items.isNotEmpty)
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                        decoration: BoxDecoration(
                                                          color: primary.withOpacity(0.05),
                                                          borderRadius: BorderRadius.circular(4),
                                                          border: Border.all(color: primary.withOpacity(0.1)),
                                                        ),
                                                        child: Text('${items[0]['quantity']}x ${items[0]['name']}', style: TextStyle(color: primary, fontSize: 10, fontWeight: FontWeight.bold)),
                                                      ),
                                                    if (items.length > 1)
                                                      Padding(
                                                        padding: const EdgeInsets.only(top: 4),
                                                        child: Text('+${items.length - 1} more', style: const TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold)),
                                                      ),
                                                  ],
                                                ],
                                              );
                                            },
                                          ),
                                        ),
                                        DataCell(
                                          Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                '${o['order_type']}',
                                                style: TextStyle(
                                                  color: text,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              if (o['origin'] != 'In-Store')
                                                Text(
                                                  '${o['origin']}',
                                                  style: TextStyle(
                                                    color: primary,
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                        DataCell(
                                          Text(
                                            '\$${(double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                                            style: TextStyle(
                                              color: primary,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        DataCell(
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 4,
                                            ),
                                            decoration: BoxDecoration(
                                              color: _getStatusColor(
                                                o['status'],
                                              ).withOpacity(0.1),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              o['status']
                                                  .toString()
                                                  .toUpperCase(),
                                              style: TextStyle(
                                                color: _getStatusColor(
                                                  o['status'],
                                                ),
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    );
                                  })
                                  .toList(),
                            ),
                          ),
                    card,
                    text,
                    border,
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

  Widget _buildDatePickerTheme(
    BuildContext context,
    Widget? child,
    Color primary,
    Color card,
    Color text,
  ) {
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

  Widget _buildFilterDropdown(
    String label,
    String value,
    List<String> items,
    Function(String?) onChanged,
    Color text,
    Color card,
    Color border,
    Color primary,
  ) {
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
          style: TextStyle(
            color: text,
            fontSize: 9,
            fontWeight: FontWeight.w500,
          ),
          items: items
              .map(
                (i) => DropdownMenuItem(
                  value: i,
                  child: Text(i, style: TextStyle(color: text)),
                ),
              )
              .toList(),
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
        queryParams['startDate'] = _reportDateRange!.start
            .toIso8601String()
            .split('T')[0];
        queryParams['endDate'] = _reportDateRange!.end.toIso8601String().split(
          'T',
        )[0];
      }

      final uri = Uri.parse(
        baseUrl,
      ).replace(path: '/api/orders', queryParameters: queryParams);

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
            SnackBar(
              content: Text(
                'Error: ${response.statusCode} - Failed to load report',
              ),
            ),
          );
        }
      }
    } catch (e) {
      if (kDebugMode) print('Report Fetch Error: $e');
      if (mounted) {
        setState(() => _reportOrders = []);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Network Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isReportLoading = false);
    }
  }

  Widget _buildStaffReport(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: _buildCard(
        'Staff Performance (Today)',
        widget.shifts.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Text(
                    LocalizationService().translate('no_shift_data'),
                    style: TextStyle(color: hint),
                  ),
                ),
              )
            : Column(
                children: widget.shifts
                    .take(10)
                    .map(
                      (s) => ListTile(
                        leading: CircleAvatar(
                          backgroundColor: primary,
                          child: Text(
                            s['user_name']?[0] ?? 'U',
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(
                          s['user_name'] ?? 'Unknown Staff',
                          style: TextStyle(
                            color: text,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Text(
                          '${LocalizationService().translate('shift_label')}: ${_safeTime(s['clock_in'])} - ${_safeTime(s['clock_out'], defaultVal: 'Active')}',
                          style: TextStyle(color: hint),
                        ),
                        trailing: Icon(Icons.chevron_right, color: hint),
                      ),
                    )
                    .toList(),
              ),
        card,
        text,
        border,
      ),
    );
  }

  Widget _buildInventoryReport(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    // Determine if we are in History Mode (Date Range Selected)
    final bool isHistoryMode = _invDateRange != null;

    // Apply Search/Filters locally
    List<dynamic> displayItems = _inventoryItems.where((item) {
      if (_invSearchQuery.isNotEmpty) {
        final name = (item['name'] ?? item['items'] ?? '').toString().toLowerCase();
        if (!name.contains(_invSearchQuery.toLowerCase())) return false;
      }
      
      if (!isHistoryMode) {
        if (_invSupplierFilter != 'ALL' && (item['supplier_name'] ?? 'N/A') != _invSupplierFilter) return false;
        if (_invCategoryFilter != 'ALL' && (item['category_name'] ?? 'Uncategorized') != _invCategoryFilter) return false;
        
        double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
        double min = double.tryParse(item['min_stock_level']?.toString() ?? '0') ?? 0;
        if (_invStatusFilter == 'LOW STOCK' && qty > min) return false;
        if (_invStatusFilter == 'OUT OF STOCK' && qty > 0) return false;
        if (_invStatusFilter == 'IN STOCK' && qty <= 0) return false;
      }
      
      return true;
    }).toList();

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              _buildCard(
                isHistoryMode ? 'PURCHASE LOG' : 'INVENTORY BREAKDOWN',
                SizedBox(
                  width: double.infinity,
                  child: DataTable(
                    horizontalMargin: 0,
                    columnSpacing: 24,
                    headingRowHeight: 56,
                    dataRowMinHeight: 64,
                    dataRowMaxHeight: 72,
                    headingRowColor: WidgetStateProperty.all(primary.withOpacity(0.04)),
                    columns: isHistoryMode 
                      ? [
                          DataColumn(label: _headerText('ID', text)),
                          DataColumn(label: _headerText('TIME', text)),
                          DataColumn(label: _headerText('ITEMS', text)),
                          DataColumn(label: _headerText('SUPPLIER', text)),
                          DataColumn(label: _headerText('TOTAL', text)),
                          DataColumn(label: _headerText('STATUS', text)),
                        ]
                      : [
                          DataColumn(label: _headerText('ITEM NAME', text)),
                          DataColumn(label: _headerText('SUPPLIER', text)),
                          DataColumn(label: _headerText('STOCK', text)),
                          DataColumn(label: _headerText('COST', text)),
                          DataColumn(label: _headerText('VALUE', text)),
                          DataColumn(label: _headerText('STATUS', text)),
                        ],
                    rows: displayItems.map((item) {
                      if (isHistoryMode) {
                        return DataRow(cells: [
                          DataCell(Text('#${item['id']}', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                          DataCell(Text(_formatDate(item['time']), style: TextStyle(color: text.withOpacity(0.8)))),
                          DataCell(SizedBox(
                            width: 200,
                            child: Text(item['items'] ?? 'N/A', 
                              style: TextStyle(color: text, fontSize: 13),
                              overflow: TextOverflow.ellipsis,
                            ),
                          )),
                          DataCell(Text(item['supplier'] ?? 'N/A', style: TextStyle(color: text))),
                          DataCell(Text('\$${item['total']}', style: TextStyle(color: primary, fontWeight: FontWeight.bold))),
                          DataCell(_buildStatusBadge(item['status'] ?? 'N/A')),
                        ]);
                      } else {
                        double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
                        double min = double.tryParse(item['min_stock_level']?.toString() ?? '0') ?? 0;
                        double cost = double.tryParse(item['cost_per_unit']?.toString() ?? '0') ?? 0;
                        bool isLow = qty <= min && qty > 0;
                        bool isOut = qty <= 0;

                        return DataRow(cells: [
                          DataCell(Text(item['name'] ?? 'N/A', style: TextStyle(color: text, fontWeight: FontWeight.bold))),
                          DataCell(Text(item['supplier_name'] ?? 'N/A', style: TextStyle(color: text.withOpacity(0.7)))),
                          DataCell(Text('$qty ${item['unit'] ?? ''}', style: TextStyle(color: text, fontWeight: FontWeight.w600))),
                          DataCell(Text('\$${cost.toStringAsFixed(2)}', style: TextStyle(color: text))),
                          DataCell(Text('\$${(qty * cost).toStringAsFixed(2)}', style: TextStyle(color: primary, fontWeight: FontWeight.bold))),
                          DataCell(_buildStatusBadge(isOut ? 'OUT' : (isLow ? 'LOW' : 'OK'))),
                        ]);
                      }
                    }).toList(),
                  ),
                ),
                card,
                text,
                border,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _headerText(String label, Color color) {
    return Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.1));
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'N/A';
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.day}/${dt.month} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return date.toString();
    }
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toUpperCase()) {
      case 'RECEIVED':
      case 'OK':
        color = Colors.green;
        break;
      case 'LOW':
      case 'PENDING':
        color = Colors.orange;
        break;
      case 'OUT':
      case 'CANCELLED':
        color = Colors.red;
        break;
      default:
        color = Colors.blue;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }



  Widget _buildFinancialReport(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    // 1. Prepare Data (Combine Orders as Income and Expenses as Expense)
    List<Map<String, dynamic>> ledger = [];

    for (var o in _reportOrders) {
      List<dynamic> items = o['items'] ?? [];
      List<String> itemNames = items
          .map((i) => (i['name'] ?? '').toString())
          .toList();
      List<String> categories = items
          .map((i) => (i['category'] ?? 'Uncategorized').toString())
          .toList();

      String channel = 'DINE-IN';
      String origin = (o['origin'] ?? '').toString().toUpperCase();
      if (origin == 'WEBSITE') {
        channel = 'ONLINE';
      } else if (origin == 'QR-MENU') {
        channel = 'QR-MENU';
      } else if ((o['order_type'] ?? '').toString().toUpperCase() ==
          'TAKEAWAY') {
        channel = 'TAKEAWAY';
      }

      String payMethod = 'UNPAID';
      if (o['payment'] != null) {
        if (o['payment'] is Map) {
          payMethod = o['payment']['payment_method']?.toString() ?? 'CASH';
        } else {
          payMethod = o['payment'].toString();
        }
      } else if ((o['status'] ?? '').toString().toUpperCase() == 'PAID') {
        payMethod = 'CASH';
      }

      ledger.add({
        'id': o['id'],
        'originalType': 'ORDER',
        'date':
            DateTime.tryParse(o['order_time']?.toString() ?? '') ??
            DateTime.now(),
        'desc': 'Order #${o['order_number'] ?? o['id']}',
        'type': 'INCOME',
        'category': o['order_type'] ?? 'Sales',
        'amount': double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0,
        'payment': payMethod,
        'channel': channel,
        'customer': o['customer_name'] ?? 'Guest',
        'itemNames': itemNames,
        'categories': categories,
      });
    }

    for (var e in _expenses) {
      ledger.add({
        'id': e['id'],
        'originalType': 'EXPENSE',
        'date':
            DateTime.tryParse(e['date']?.toString() ?? '') ?? DateTime.now(),
        'desc': e['notes'] ?? 'General Expense',
        'type': 'EXPENSE',
        'category': e['category'] ?? 'Operational',
        'amount': double.tryParse(e['amount']?.toString() ?? '0') ?? 0.0,
        'payment': e['payment_method'] ?? 'Cash',
        'channel': 'N/A',
        'customer': 'N/A',
        'itemNames': [],
        'categories': [],
      });
    }

    for (var p in _purchases) {
      List<dynamic> pItems = p['items'] ?? [];
      List<String> pItemNames = pItems
          .map((i) => (i['item_name'] ?? '').toString())
          .toList();

      ledger.add({
        'id': p['id'],
        'originalType': 'PURCHASE',
        'date':
            DateTime.tryParse(p['order_date']?.toString() ?? '') ??
            DateTime.now(),
        'desc':
            'Purchase: ${p['invoice_number'] != null ? 'Inv #${p['invoice_number']}' : 'PO #${p['id']}'}',
        'type': 'EXPENSE',
        'category': 'Inventory',
        'amount': double.tryParse(p['total_amount']?.toString() ?? '0') ?? 0.0,
        'payment': p['payment_method'] ?? 'Cash',
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
        if (item['date'].isBefore(_finDateRange!.start) ||
            item['date'].isAfter(
              _finDateRange!.end.add(const Duration(days: 1)),
            ))
          return false;
      }
      // Type Filter
      if (_finTypeFilter != 'ALL' && item['type'] != _finTypeFilter)
        return false;
      // Payment Filter
      if (_finPayFilter != 'ALL') {
        final payStr = (item['payment']?.toString() ?? '').toUpperCase().trim();
        if (payStr != _finPayFilter && !payStr.contains(_finPayFilter))
          return false;
      }
      // Channel Filter
      if (_finChannelFilter != 'ALL' && item['channel'] != _finChannelFilter)
        return false;
      // Customer Filter
      if (_finCustomerFilter != 'ALL' && item['customer'] != _finCustomerFilter)
        return false;
      // Item Filter
      if (_finItemFilter != 'ALL' &&
          !(item['itemNames'] as List).contains(_finItemFilter))
        return false;
      // Category Filter
      if (_finCategoryFilter != 'ALL' &&
          !(item['categories'] as List).contains(_finCategoryFilter))
        return false;

      return true;
    }).toList();

    filteredLedger.sort((a, b) => b['date'].compareTo(a['date']));

    // Extract filter lists from full menu and ledger
    final allItems =
        _menuData
            .expand((c) => (c['items'] as List))
            .map((i) => (i['name'] ?? '').toString())
            .toSet()
            .toList()
          ..sort();
    final allCats =
        _menuData.map((c) => (c['name'] ?? '').toString()).toSet().toList()
          ..sort();
    final allCustomers =
        ledger.map((l) => l['customer'].toString()).toSet().toList()..sort();

    // 3. Calculate KPIs

    return Column(
      children: [
        // Filter Bar (Secondary filters)
        // Filter Bar (Restructured: Date/Search on Left, Filters on Right)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
          decoration: BoxDecoration(
            color: card,
            border: Border(bottom: BorderSide(color: border)),
          ),
          child: Row(
            children: [
              // Left side: Primary Controls
              _buildFinancialDatePicker(text, card, border, primary),
              const SizedBox(width: 8),
              SizedBox(
                width: 180,
                child: _buildSearchBar(
                  text,
                  card,
                  border,
                  hint,
                  _finSearchQuery,
                  (val) => setState(() => _finSearchQuery = val),
                ),
              ),

              const SizedBox(width: 16), // Gap
              // Right side: Specialized Filters
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterDropdown(
                        'Transaction Type',
                        _finTypeFilter,
                        ['ALL', 'INCOME', 'EXPENSE'],
                        (val) => setState(() => _finTypeFilter = val!),
                        text,
                        card,
                        border,
                        primary,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterDropdown(
                        'Payment Method',
                        _finPayFilter,
                        ['ALL', 'CASH', 'CARD', 'UNPAID'],
                        (val) => setState(() => _finPayFilter = val!),
                        text,
                        card,
                        border,
                        primary,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterDropdown(
                        'Channel',
                        _finChannelFilter,
                        ['ALL', 'DINE-IN', 'TAKEAWAY', 'ONLINE', 'QR-MENU'],
                        (val) => setState(() => _finChannelFilter = val!),
                        text,
                        card,
                        border,
                        primary,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterDropdown(
                        'Customer',
                        _finCustomerFilter,
                        ['ALL', ...allCustomers],
                        (val) => setState(() => _finCustomerFilter = val!),
                        text,
                        card,
                        border,
                        primary,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterDropdown(
                        'Food Item',
                        _finItemFilter,
                        ['ALL', ...allItems],
                        (val) => setState(() => _finItemFilter = val!),
                        text,
                        card,
                        border,
                        primary,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterDropdown(
                        'CATEGORIES',
                        _finCategoryFilter,
                        ['ALL', ...allCats],
                        (val) => setState(() => _finCategoryFilter = val!),
                        text,
                        card,
                        border,
                        primary,
                      ),
                      const SizedBox(width: 24),
                      IconButton(
                        onPressed: () => setState(() {
                          _finDateRange = null;
                          _finTypeFilter = 'ALL';
                          _finPayFilter = 'ALL';
                          _finChannelFilter = 'ALL';
                          _finCustomerFilter = 'ALL';
                          _finItemFilter = 'ALL';
                          _finCategoryFilter = 'ALL';
                          _finSearchQuery = '';
                        }),
                        tooltip: LocalizationService().translate(
                          'clear_filters',
                        ),
                        icon: Icon(Icons.refresh_rounded, color: hint),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Redesigned Ledger Table
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 8),
          child: Row(
            children: [
              Text(
                'Financial Ledger',
                style: TextStyle(
                  color: text,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Text(
                '${filteredLedger.length} Transactions',
                style: TextStyle(color: hint, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(32, 0, 32, 32),
            itemCount: filteredLedger.length,
            itemBuilder: (context, index) {
              final item = filteredLedger[index];
              return _buildLedgerItem(item, text, hint, card, border, primary);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildLedgerItem(
    Map<String, dynamic> item,
    Color text,
    Color hint,
    Color card,
    Color border,
    Color primary,
  ) {
    bool isIncome = item['type'] == 'INCOME';
    IconData categoryIcon;
    Color categoryColor;
    switch (item['category']?.toString().toUpperCase()) {
      case 'SALES':
        categoryIcon = Icons.point_of_sale_rounded;
        categoryColor = Colors.green;
        break;
      case 'OPERATIONAL':
      case 'EXPENSE':
        categoryIcon = Icons.account_balance_wallet_rounded;
        categoryColor = Colors.red;
        break;
      case 'RENT':
        categoryIcon = Icons.home_work_rounded;
        categoryColor = Colors.orange;
        break;
      case 'UTILITIES':
        categoryIcon = Icons.electrical_services_rounded;
        categoryColor = Colors.amber;
        break;
      case 'INVENTORY':
        categoryIcon = Icons.inventory_2_rounded;
        categoryColor = Colors.blue;
        break;
      case 'TAX':
        categoryIcon = Icons.receipt_long_rounded;
        categoryColor = Colors.purple;
        break;
      default:
        categoryIcon = Icons.payment_rounded;
        categoryColor = primary;
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.01),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: categoryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(categoryIcon, color: categoryColor, size: 18),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    item['desc'],
                    style: TextStyle(
                      color: text,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 24),
                Text(
                  item['date'].toString().split(' ')[0],
                  style: TextStyle(color: hint, fontSize: 12),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 3,
                  height: 3,
                  decoration: BoxDecoration(
                    color: border,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  item['category'],
                  style: TextStyle(color: hint, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: (isIncome ? Colors.green : Colors.red).withOpacity(0.08),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              item['type'],
              style: TextStyle(
                color: isIncome ? Colors.green : Colors.red,
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 24),
          SizedBox(
            width: 110,
            child: Text(
              '${isIncome ? "+" : "-"}\$${item['amount'].toStringAsFixed(2)}',
              textAlign: TextAlign.right,
              style: TextStyle(
                color: isIncome ? Colors.green : Colors.red,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
              Icons.delete_outline_rounded,
              color: Colors.red.withOpacity(0.4),
              size: 18,
            ),
            onPressed: () => _confirmDeleteLedgerItem(item),
            tooltip: 'Delete Record',
            splashRadius: 20,
          ),
        ],
      ),
    );
  }

  void _confirmDeleteLedgerItem(Map<String, dynamic> item) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Theme.of(context).cardColor,
        title: Text(
          'Delete Record?',
          style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color),
        ),
        content: Text(
          'Are you sure you want to delete "${item['desc']}"? This action cannot be undone.',
          style: TextStyle(color: Theme.of(context).hintColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _deleteLedgerRecord(item);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteLedgerRecord(Map<String, dynamic> item) async {
    final id = item['id'];
    final type = item['originalType'];
    String endpoint = '';

    if (type == 'ORDER')
      endpoint = '/api/orders/$id';
    else if (type == 'EXPENSE')
      endpoint = '/api/expenses/$id';
    else if (type == 'PURCHASE')
      endpoint = '/api/purchases/$id';

    if (endpoint.isEmpty) return;

    try {
      final res = await http.delete(
        Uri.parse('${ThemeService.apiBaseUrl}$endpoint'),
      );
      if (res.statusCode == 200 || res.statusCode == 204) {
        if (mounted)
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Record deleted successfully')),
          );
        // Refresh data
        if (type == 'ORDER')
          _fetchFilteredReport();
        else if (type == 'EXPENSE')
          _fetchExpenses();
        else if (type == 'PURCHASE')
          _fetchPurchases();
      } else {
        throw Exception('Failed to delete: ${res.body}');
      }
    } catch (e) {
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Delete Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
    }
  }

  Widget _buildCard(
    String title,
    Widget content,
    Color card,
    Color text,
    Color border,
  ) {
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
          Text(
            title,
            style: TextStyle(
              color: text,
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          content,
        ],
      ),
    );
  }

  Widget _buildStatusProgress(
    String label,
    double value,
    double max,
    Color color,
    Color text,
    Color border,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                color: text,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
            Text(
              '${value.toInt()}',
              style: TextStyle(
                color: text,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
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
    if (types.isEmpty)
      return Center(child: Text(LocalizationService().translate('no_data')));

    return SizedBox(
      height: 200,
      child: PieChart(
        PieChartData(
          sectionsSpace: 0,
          centerSpaceRadius: 40,
          sections: types.map((t) {
            final color = t['order_type'] == 'Dine-In'
                ? primary
                : (t['order_type'] == 'Takeaway' ? primary : Colors.purple);
            return PieChartSectionData(
              color: color,
              value: double.tryParse(t['count']?.toString() ?? '0') ?? 0.0,
              title: '${t['count'] ?? 0}',
              radius: 50,
              titleStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildTopItemsBarChart(Color primary, Color hint) {
    final items = (widget.summaryData['topItems'] as List? ?? []);
    if (items.isEmpty)
      return Center(child: Text(LocalizationService().translate('no_data')));

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
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(4),
                  ),
                ),
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
                      child: Text(
                        items[idx]['name'].toString().split(' ')[0],
                        style: TextStyle(color: hint, fontSize: 10),
                      ),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
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

  Widget _buildReconciliationCard(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final financials = widget.financialData;
    final gross =
        double.tryParse(financials['gross_sales']?.toString() ?? '0') ?? 0.0;
    final cogs = double.tryParse(financials['cogs']?.toString() ?? '0') ?? 0.0;
    final expenses =
        double.tryParse(financials['expenses']?.toString() ?? '0') ?? 0.0;
    final net =
        double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0;

    return _buildCard(
      LocalizationService().translate('financial_reconciliation_summary'),
      Column(
        children: [
          _buildReconciliationRow(
            LocalizationService().translate('gross_sales'),
            '\$${gross.toStringAsFixed(2)}',
            Colors.blue,
            text,
          ),
          const SizedBox(height: 12),
          _buildReconciliationRow(
            LocalizationService().translate('estimated_cogs'),
            '-\$${cogs.toStringAsFixed(2)}',
            Colors.orange,
            text,
          ),
          const SizedBox(height: 12),
          _buildReconciliationRow(
            LocalizationService().translate('operational_expenses'),
            '-\$${expenses.toStringAsFixed(2)}',
            Colors.red,
            text,
          ),
          const Divider(height: 32),
          _buildReconciliationRow(
            LocalizationService().translate('net_profit'),
            '\$${net.toStringAsFixed(2)}',
            net >= 0 ? Colors.green : Colors.red,
            text,
            isBold: true,
          ),
        ],
      ),
      card,
      text,
      border,
    );
  }

  Widget _buildReconciliationRow(
    String label,
    String value,
    Color color,
    Color text, {
    bool isBold = false,
  }) {
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
            Text(
              label,
              style: TextStyle(
                color: text,
                fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
        Text(
          value,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: isBold ? 18 : 14,
          ),
        ),
      ],
    );
  }

  Widget _buildHeaderMetrics(
    int tab,
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    switch (tab) {
      case 0:
        return _buildCondensedSummaryMetrics(text, card, border, primary, hint);
      case 1:
        return _buildCondensedSalesMetrics(text, card, border, primary, hint);
      case 2:
        return _buildCondensedDetailedMetrics(
          text,
          card,
          border,
          primary,
          hint,
        );
      case 3:
        return _buildCondensedSalesMetrics(text, card, border, primary, hint);
      case 4:
        return _buildCondensedInventoryMetrics(
          text,
          card,
          border,
          primary,
          hint,
        );
      case 5:
        return _buildFinancialHeaderSection(text, card, border, primary, hint);
      case 6:
        return _buildCondensedStaffMetrics(text, card, border, primary, hint);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildCondensedSummaryMetrics(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final today = widget.summaryData['today'] ?? {'total': 0.0, 'count': 0};
    final financials = widget.financialData;
    final total = double.tryParse(today['total']?.toString() ?? '0') ?? 0.0;
    final count = (today['count'] as num?)?.toDouble() ?? 0.0;
    final avg = count > 0 ? total / count : 0.0;
    final profit =
        double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0;

    return Row(
      children: [
        _buildSmallMetric(
          'Net Sales',
          '\$${total.toStringAsFixed(2)}',
          Icons.payments_outlined,
          Colors.green,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Orders',
          '${count.toInt()}',
          Icons.receipt_long_outlined,
          primary,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Avg Order',
          '\$${avg.toStringAsFixed(2)}',
          Icons.calculate_outlined,
          Colors.blue,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Est Profit',
          '\$${profit.toStringAsFixed(2)}',
          Icons.trending_up_rounded,
          Colors.purple,
          text,
          hint,
        ),
      ],
    );
  }

  Widget _buildCondensedSalesMetrics(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final today = widget.summaryData['today'] ?? {'total': 0.0, 'count': 0};
    final total = double.tryParse(today['total']?.toString() ?? '0') ?? 0.0;
    final count = (today['count'] as num?)?.toDouble() ?? 0.0;

    return Row(
      children: [
        _buildSmallMetric(
          'Today\'s Sales',
          '\$${total.toStringAsFixed(2)}',
          Icons.payments_outlined,
          Colors.green,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Total Orders',
          '${count.toInt()}',
          Icons.receipt_long_outlined,
          primary,
          text,
          hint,
        ),
      ],
    );
  }

  Widget _buildCondensedDetailedMetrics(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    double totalSales = 0;
    for (var o in _reportOrders) {
      totalSales +=
          double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0.0;
    }
    double avgValue = _reportOrders.isNotEmpty
        ? totalSales / _reportOrders.length
        : 0.0;

    return Row(
      children: [
        _buildSmallMetric(
          'Report Sales',
          '\$${totalSales.toStringAsFixed(2)}',
          Icons.payments_outlined,
          Colors.green,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Orders Count',
          '${_reportOrders.length}',
          Icons.receipt_long_outlined,
          primary,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Avg Value',
          '\$${avgValue.toStringAsFixed(2)}',
          Icons.analytics_outlined,
          Colors.blue,
          text,
          hint,
        ),
      ],
    );
  }

  Widget _buildCondensedInventoryMetrics(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    double totalValue = 0;
    int lowStockCount = 0;
    for (var item in _inventoryItems) {
      double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
      double cost =
          double.tryParse(item['cost_per_unit']?.toString() ?? '0') ?? 0;
      double min =
          double.tryParse(item['min_stock_level']?.toString() ?? '0') ?? 0;
      totalValue += (qty * cost);
      if (qty <= min) lowStockCount++;
    }

    return Row(
      children: [
        _buildSmallMetric(
          'Total Items',
          '${_inventoryItems.length}',
          Icons.category_outlined,
          primary,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Low Stock',
          '$lowStockCount',
          Icons.warning_amber_rounded,
          Colors.orange,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Inv. Value',
          '\$${totalValue.toStringAsFixed(2)}',
          Icons.account_balance_wallet_outlined,
          Colors.green,
          text,
          hint,
        ),
      ],
    );
  }

  Widget _buildCondensedStaffMetrics(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final activeShifts = widget.shifts
        .where((s) => s['clock_out'] == null)
        .length;
    return Row(
      children: [
        _buildSmallMetric(
          'Total Shifts',
          '${widget.shifts.length}',
          Icons.assignment_ind_outlined,
          primary,
          text,
          hint,
        ),
        _buildMetricDivider(border),
        _buildSmallMetric(
          'Active Staff',
          '$activeShifts',
          Icons.person_pin_circle_outlined,
          Colors.green,
          text,
          hint,
        ),
      ],
    );
  }

  Widget _buildSmallMetric(
    String label,
    String value,
    IconData icon,
    Color color,
    Color text,
    Color hint,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: hint,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                color: text,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricDivider(Color border) {
    return Container(
      height: 24,
      width: 1,
      margin: const EdgeInsets.symmetric(horizontal: 20),
      color: border,
    );
  }

  Widget _buildCondensedSummaryVisuals(
    Color primary,
    Color hint,
    Color text,
    Color border,
    Color card,
  ) {
    final types = (widget.summaryData['types'] as List? ?? []);
    if (types.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: types.take(3).map((t) {
          final type = t['order_type']?.toString() ?? '???';
          final count = t['count']?.toString() ?? '0';
          final icon = type == 'Dine-In'
              ? Icons.restaurant
              : (type == 'Takeaway'
                    ? Icons.shopping_bag
                    : Icons.delivery_dining);
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: primary, size: 14),
              const SizedBox(height: 2),
              Text(
                count,
                style: TextStyle(
                  color: text,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                type.toUpperCase(),
                style: TextStyle(
                  color: hint,
                  fontSize: 7,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFinancialHeaderSection(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final financials = widget.financialData;
    final grossSales =
        double.tryParse(financials['gross_sales']?.toString() ?? '0') ?? 0.0;
    final cogs = double.tryParse(financials['cogs']?.toString() ?? '0') ?? 0.0;
    final expenses =
        double.tryParse(financials['expenses']?.toString() ?? '0') ?? 0.0;
    final netProfit =
        double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0;
    final grossProfit = grossSales - cogs;

    final grossMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0.0;
    final netMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0.0;

    return Container(
      height: 90,
      decoration: BoxDecoration(
        color: card.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          // Left Side: Gross Profit KPI
          _buildCompactMetricSide(
            'Gross Profit',
            grossProfit,
            grossMargin,
            Colors.blue,
            Icons.account_balance_rounded,
            text,
            hint,
            border,
          ),

          // Middle: 2x2 Waterfall Grid
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildWaterfallGridItem(
                            'COGS',
                            cogs,
                            grossSales,
                            Colors.orange,
                            text,
                            border,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildWaterfallGridItem(
                            'Expenses',
                            expenses,
                            grossSales,
                            Colors.red,
                            text,
                            border,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildWaterfallGridItem(
                            'Gross Sales',
                            grossSales,
                            grossSales,
                            primary,
                            text,
                            border,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: _buildWaterfallGridItem(
                            'Net Profit',
                            netProfit,
                            grossSales,
                            Colors.green,
                            text,
                            border,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Right Side: Net Profit KPI
          _buildCompactMetricSide(
            'Net Profit',
            netProfit,
            netMargin,
            Colors.green,
            Icons.monetization_on_rounded,
            text,
            hint,
            border,
            isRight: true,
          ),
        ],
      ),
    );
  }

  Widget _buildCompactMetricSide(
    String label,
    double value,
    double margin,
    Color color,
    IconData icon,
    Color text,
    Color hint,
    Color border, {
    bool isRight = false,
  }) {
    return Container(
      width: 160,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        border: Border(
          left: isRight ? BorderSide(color: border) : BorderSide.none,
          right: !isRight ? BorderSide(color: border) : BorderSide.none,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: isRight
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isRight) Icon(icon, color: color, size: 14),
              if (!isRight) const SizedBox(width: 6),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: hint,
                  fontSize: 8,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              if (isRight) const SizedBox(width: 6),
              if (isRight) Icon(icon, color: color, size: 14),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            '\$${value.toStringAsFixed(2)}',
            style: TextStyle(
              color: text,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            '${margin.toStringAsFixed(1)}% Margin',
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaterfallGridItem(
    String label,
    double value,
    double total,
    Color color,
    Color text,
    Color border,
  ) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                color: text.withOpacity(0.6),
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '\$${value.toStringAsFixed(0)}',
              style: TextStyle(
                color: text,
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        _buildWaterfallProgressBar(value, total, color, border),
      ],
    );
  }

  Widget _buildCondensedFinancialMetrics(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    final financials = widget.financialData;
    final grossSales =
        double.tryParse(financials['gross_sales']?.toString() ?? '0') ?? 0.0;
    final cogs = double.tryParse(financials['cogs']?.toString() ?? '0') ?? 0.0;
    final netProfit =
        double.tryParse(financials['net_profit']?.toString() ?? '0') ?? 0.0;
    final grossProfit = grossSales - cogs;

    final grossMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0.0;
    final netMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0.0;

    return Container(
      decoration: BoxDecoration(
        color: card.withOpacity(0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Expanded(
            child: _buildCompactMetricSide(
              'Gross Profit',
              grossProfit,
              grossMargin,
              Colors.blue,
              Icons.account_balance_rounded,
              text,
              hint,
              border,
            ),
          ),
          Expanded(
            child: _buildCompactMetricSide(
              'Net Profit',
              netProfit,
              netMargin,
              Colors.green,
              Icons.monetization_on_rounded,
              text,
              hint,
              border,
              isRight: true,
            ),
          ),
        ],
      ),
    );
  }

  // Helper for actual progress bar in waterfall
  Widget _buildWaterfallProgressBar(
    double value,
    double total,
    Color color,
    Color border,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final percent = total > 0 ? (value / total).clamp(0.0, 1.0) : 0.0;
        return Stack(
          children: [
            Container(
              height: 4,
              width: constraints.maxWidth,
              decoration: BoxDecoration(
                color: border.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Container(
              height: 4,
              width: constraints.maxWidth * percent,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildReportDatePicker(
    Color text,
    Color card,
    Color border,
    Color primary,
  ) {
    return OutlinedButton.icon(
      onPressed: () async {
        try {
          if (_availableDates.isEmpty) {
            await _fetchAvailableDates().timeout(const Duration(seconds: 3));
          }

          DateTime now = DateUtils.dateOnly(DateTime.now());
          DateTime startBound = DateUtils.dateOnly(_firstDate);

          if (_availableDates.isNotEmpty) {
            List<String> sorted = _availableDates.toList()..sort();
            DateTime firstDataDate = DateTime.parse(sorted.first);
            if (firstDataDate.isBefore(startBound)) startBound = firstDataDate;
          }

          DateTime endBound = now.add(const Duration(days: 1));
          if (startBound.isAfter(endBound))
            startBound = endBound.subtract(const Duration(days: 30));

          DateTime initialStart = _reportDateRange != null
              ? DateUtils.dateOnly(_reportDateRange!.start)
              : now;

          if (_availableDates.isNotEmpty &&
              !_availableDates.contains(
                initialStart.toIso8601String().split('T')[0],
              )) {
            List<String> sorted = _availableDates.toList()..sort();
            initialStart = DateTime.parse(sorted.first);
          }

          if (initialStart.isBefore(startBound)) initialStart = startBound;

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
            builder: (context, child) =>
                _buildDatePickerTheme(context, child, primary, card, text),
          );

          if (fromDate != null) {
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
              builder: (context, child) =>
                  _buildDatePickerTheme(context, child, primary, card, text),
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
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text('Picker Error: $e')));
          }
        }
      },
      icon: Icon(Icons.calendar_month_outlined, size: 20, color: primary),
      label: Text(
        _reportDateRange == null
            ? 'DATE'
            : '${_reportDateRange!.start.toString().split(' ')[0]} to ${_reportDateRange!.end.toString().split(' ')[0]}',
        style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 10),
      ),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        backgroundColor: card,
      ),
    );
  }

  Widget _buildFinancialDatePicker(
    Color text,
    Color card,
    Color border,
    Color primary,
  ) {
    return OutlinedButton.icon(
      onPressed: () async {
        try {
          if (_availableDates.isEmpty) {
            await _fetchAvailableDates().timeout(const Duration(seconds: 3));
          }

          DateTime now = DateUtils.dateOnly(DateTime.now());
          DateTime startBound = DateUtils.dateOnly(_firstDate);

          if (_availableDates.isNotEmpty) {
            List<String> sorted = _availableDates.toList()..sort();
            DateTime firstDataDate = DateTime.parse(sorted.first);
            if (firstDataDate.isBefore(startBound)) startBound = firstDataDate;
          }

          DateTime endBound = now.add(const Duration(days: 1));
          if (startBound.isAfter(endBound))
            startBound = endBound.subtract(const Duration(days: 30));

          DateTime initialStart = _finDateRange != null
              ? DateUtils.dateOnly(_finDateRange!.start)
              : now;
          if (_availableDates.isNotEmpty &&
              !_availableDates.contains(
                initialStart.toIso8601String().split('T')[0],
              )) {
            List<String> sorted = _availableDates.toList()..sort();
            initialStart = DateTime.parse(sorted.first);
          }
          if (initialStart.isBefore(startBound)) initialStart = startBound;

          if (!mounted) return;
          final fromDate = await showDatePicker(
            context: context,
            initialDate: initialStart,
            firstDate: DateTime(2023),
            lastDate: DateTime.now().add(const Duration(days: 365)),
            helpText: 'Select Start Date',
            builder: (context, child) =>
                _buildDatePickerTheme(context, child, primary, card, text),
          );

          if (fromDate != null) {
            DateTime initialEnd = _finDateRange != null
                ? DateUtils.dateOnly(_finDateRange!.end)
                : fromDate;
            if (initialEnd.isBefore(fromDate)) initialEnd = fromDate;

            if (!mounted) return;
            final toDate = await showDatePicker(
              context: context,
              initialDate: initialEnd,
              firstDate: fromDate,
              lastDate: DateTime.now().add(const Duration(days: 365)),
              helpText: 'Select End Date',
              builder: (context, child) =>
                  _buildDatePickerTheme(context, child, primary, card, text),
            );

            if (toDate != null) {
              setState(() {
                _finDateRange = DateTimeRange(start: fromDate, end: toDate);
                // Also update the global report range so refetch works correctly
                _reportDateRange = _finDateRange;
              });
              _fetchFilteredReport();
            }
          }
        } catch (e) {
          if (mounted)
            ScaffoldMessenger.of(
              context,
            ).showSnackBar(SnackBar(content: Text('Picker Error: $e')));
        }
      },
      icon: Icon(Icons.calendar_month_outlined, size: 20, color: primary),
      label: Text(
        _finDateRange == null
            ? 'DATE'
            : '${_finDateRange!.start.toString().split(' ')[0]} to ${_finDateRange!.end.toString().split(' ')[0]}',
        style: TextStyle(color: text, fontWeight: FontWeight.bold, fontSize: 10),
      ),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Widget _buildInventoryDatePicker(
    Color text,
    Color card,
    Color border,
    Color primary,
  ) {
    return InkWell(
      onTap: () async {
        final picked = await showDateRangePicker(
          context: context,
          initialDateRange: _invDateRange,
          firstDate: DateTime(2023),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (context, child) {
            return Theme(
              data: Theme.of(context).copyWith(
                colorScheme: ColorScheme.light(
                  primary: primary,
                  onPrimary: Colors.white,
                  surface: card,
                  onSurface: text,
                ),
              ),
              child: child!,
            );
          },
        );
        if (picked != null) {
          setState(() {
            _invDateRange = picked;
          });
          _fetchInventory();
        }
      },
      child: Container(
        height: 45,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.calendar_today_rounded, size: 18, color: primary),
            const SizedBox(width: 10),
            Text(
              'DATE',
              style: TextStyle(
                color: text,
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
              ),
            ),
            if (_invDateRange != null) ...[
              const SizedBox(width: 8),
              Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: primary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar(
    Color text,
    Color card,
    Color border,
    Color hint,
    String value,
    Function(String) onChanged,
  ) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: TextField(
        controller: TextEditingController(text: value)
          ..selection = TextSelection.collapsed(offset: value.length),
        onChanged: onChanged,
        style: TextStyle(color: text, fontSize: 14),
        decoration: InputDecoration(
          hintText: LocalizationService().translate('search_records'),
          hintStyle: TextStyle(color: hint, fontSize: 14),
          prefixIcon: Icon(Icons.search, color: hint, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
        ),
      ),
    );
  }

  Widget _buildInventoryFilters(
    Color text,
    Color card,
    Color border,
    Color primary,
    Color hint,
  ) {
    return Container(
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
            _buildInventoryDatePicker(text, card, border, primary),
            const SizedBox(width: 12),
            Container(
              width: 250,
              height: 45,
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: border),
              ),
              child: TextField(
                onChanged: (v) => setState(() => _invSearchQuery = v),
                style: TextStyle(color: text, fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'SEARCH...',
                  hintStyle: TextStyle(
                    color: hint,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                  ),
                  prefixIcon: Icon(Icons.search, color: hint, size: 18),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
            const SizedBox(width: 12),
            _buildFilterDropdown(
              'SUPPLIERS',
              _invSupplierFilter,
              ['ALL', ..._inventoryItems.map((e) => e['supplier_name'] as String?).where((e) => e != null).toSet().cast<String>()],
              (v) => setState(() => _invSupplierFilter = v!),
              text,
              card,
              border,
              primary,
            ),
            const SizedBox(width: 12),
            _buildFilterDropdown(
              'STATUS',
              _invStatusFilter,
              ['ALL', 'IN STOCK', 'LOW STOCK', 'OUT OF STOCK'],
              (v) => setState(() => _invStatusFilter = v!),
              text,
              card,
              border,
              primary,
            ),
            if (_invDateRange == null) ...[
              const SizedBox(width: 12),
              _buildFilterDropdown(
                'CATEGORIES',
                _invCategoryFilter,
                ['ALL', ..._inventoryCategories.map((e) => (e['name'] ?? '').toString()).toSet().toList()],
                (v) => setState(() => _invCategoryFilter = v!),
                text,
                card,
                border,
                primary,
              ),
            ],
            const SizedBox(width: 16),
            TextButton.icon(
              onPressed: () => setState(() {
                _invSupplierFilter = 'ALL';
                _invStatusFilter = 'ALL';
                _invCategoryFilter = 'ALL';
                _invSearchQuery = '';
                _invDateRange = null;
              }),
              icon: Icon(Icons.refresh_rounded, size: 18, color: hint),
              label: Text('RESET', style: TextStyle(color: hint, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _exportToCSV() async {
    if (_reportOrders.isEmpty) return;

    final headers = ['Order ID', 'Date', 'Items', 'Type', 'Total', 'Status'];
    final rows = _reportOrders.map((o) {
      final items = (o['items'] as List?)?.map((i) => '${i['quantity']}x ${i['name']}').join('; ') ?? '';
      return [
        '#${o['order_number'] ?? o['id']}',
        o['order_time'] ?? '',
        items,
        o['order_type'] ?? '',
        o['total_amount']?.toString() ?? '0',
        o['status'] ?? ''
      ];
    }).toList();

    String csvData = headers.join(',') + '\n';
    for (var row in rows) {
      csvData += row.map((c) => '"$c"').join(',') + '\n';
    }

    try {
      if (kIsWeb) {
        final bytes = utf8.encode(csvData);
        final blob = html.Blob([bytes], 'text/csv');
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.AnchorElement(href: url)
          ..setAttribute('download', 'orders_report_${DateTime.now().millisecondsSinceEpoch}.csv')
          ..click();
        html.Url.revokeObjectUrl(url);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Report generated and download started.')),
          );
        }
      } else {
        // Non-web platforms are not supported in this version, but we keep the block for structure
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Export not supported on this platform.')),
          );
        }
      }
    } catch (e) {
      if (kDebugMode) print('CSV Export Error: $e');
    }
  }

  Future<void> _exportToPDF() async {
    final pdf = pw.Document();
    
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Header(level: 0, child: pw.Text('Orders Report')),
            pw.TableHelper.fromTextArray(
              headers: ['ID', 'Time', 'Type', 'Total', 'Status'],
              data: _reportOrders.map((o) => [
                '#${o['order_number'] ?? o['id']}',
                o['order_time']?.toString() ?? '',
                o['order_type']?.toString() ?? '',
                '\$${o['total_amount']}',
                o['status']?.toString().toUpperCase() ?? '',
              ]).toList(),
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(onLayout: (PdfPageFormat format) async => pdf.save());
  }
}

