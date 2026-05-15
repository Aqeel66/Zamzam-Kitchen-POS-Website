import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:pos_terminal/theme_service.dart';
import 'package:pos_terminal/localization_service.dart';
import 'package:pos_terminal/dashboard/purchase_management_view.dart';
import 'package:pos_terminal/inventory_management/inventory_dashboard.dart';

class PurchaseInventoryHub extends StatefulWidget {
  final bool isDarkMode;
  final int initialTab;

  const PurchaseInventoryHub({
    super.key, 
    required this.isDarkMode,
    this.initialTab = 0,
  });

  @override
  State<PurchaseInventoryHub> createState() => _PurchaseInventoryHubState();
}

class _PurchaseInventoryHubState extends State<PurchaseInventoryHub> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  ThemeData get _theme => ThemeService().themeData;
  Color get themeBg => _theme.scaffoldBackgroundColor;
  Color get themeCard => _theme.cardColor;
  Color get themeText =>
      _theme.textTheme.bodyLarge?.color ??
      (widget.isDarkMode ? Colors.white : const Color(0xFF1E293B));
  Color get themeHint => themeText.withOpacity(0.6);
  Color get themeBorder => themeText.withOpacity(0.12);
  Color get themePrimary => _theme.primaryColor;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this, initialIndex: widget.initialTab);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final loc = LocalizationService();
    
    return Container(
      color: themeBg,
      child: Column(
        children: [
          // Header Section
          Container(
            padding: const EdgeInsets.fromLTRB(32, 32, 32, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          loc.translate('purchase_inventory_hub'),
                          style: TextStyle(
                            color: themeText,
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Manage your procurement lifecycle and stock levels',
                          style: TextStyle(
                            color: themeHint,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    _buildTabBar(),
                  ],
                ),
                const SizedBox(height: 24),
                Divider(color: themeBorder, height: 1),
              ],
            ),
          ),
          
          // Main Content Area
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                InventoryDashboard(isDarkMode: widget.isDarkMode, hideHeader: true),
                _PurchasesTabWrapper(isDarkMode: widget.isDarkMode),
                _SuppliersTabWrapper(isDarkMode: widget.isDarkMode),
                _LinkageTabWrapper(isDarkMode: widget.isDarkMode),
                _TrendsTabWrapper(isDarkMode: widget.isDarkMode),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      width: 600,
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: themeBorder),
      ),
      padding: const EdgeInsets.all(4),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: themePrimary,
          borderRadius: BorderRadius.circular(8),
        ),
        labelColor: Colors.white,
        unselectedLabelColor: themeHint,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        tabs: const [
          Tab(text: 'Inventory'),
          Tab(text: 'Purchases'),
          Tab(text: 'Suppliers'),
          Tab(text: 'Linkage'),
          Tab(text: 'Trends'),
        ],
      ),
    );
  }
}

// These wrappers will help us reuse the existing views or specific parts of them
class _PurchasesTabWrapper extends StatelessWidget {
  final bool isDarkMode;
  const _PurchasesTabWrapper({required this.isDarkMode});

  @override
  Widget build(BuildContext context) {
    return PurchaseManagementView(isDarkMode: isDarkMode, onlyShowTab: 0);
  }
}

class _SuppliersTabWrapper extends StatelessWidget {
  final bool isDarkMode;
  const _SuppliersTabWrapper({required this.isDarkMode});

  @override
  Widget build(BuildContext context) {
    return PurchaseManagementView(isDarkMode: isDarkMode, onlyShowTab: 1);
  }
}

class _LinkageTabWrapper extends StatelessWidget {
  final bool isDarkMode;
  const _LinkageTabWrapper({required this.isDarkMode});

  @override
  Widget build(BuildContext context) {
    return PurchaseManagementView(isDarkMode: isDarkMode, onlyShowTab: 2);
  }
}

class _TrendsTabWrapper extends StatelessWidget {
  final bool isDarkMode;
  const _TrendsTabWrapper({required this.isDarkMode});

  @override
  Widget build(BuildContext context) {
    return PurchaseManagementView(isDarkMode: isDarkMode, onlyShowTab: 3);
  }
}

