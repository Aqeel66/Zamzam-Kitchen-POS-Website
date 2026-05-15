import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'package:pos_terminal/theme_service.dart';
import 'package:pos_terminal/localization_service.dart';
import 'package:pos_terminal/dashboard/pos_mission_control.dart';

class PurchaseManagementView extends StatefulWidget {
  final bool isDarkMode;

  const PurchaseManagementView({super.key, required this.isDarkMode});

  @override
  State<PurchaseManagementView> createState() => _PurchaseManagementViewState();
}

class _PurchaseManagementViewState extends State<PurchaseManagementView> {
  bool _isLoading = false;
  List<dynamic> _purchases = [];
  List<dynamic> _inventoryItems = [];
  List<dynamic> _suppliers = [];
  Map<String, dynamic> _trendData = {};

  // Order Form Controllers
  final TextEditingController _invoiceController = TextEditingController();
  dynamic _selectedSupplier;
  final TextEditingController _totalAmountController = TextEditingController();
  dynamic _selectedItem;
  final TextEditingController _qtyController = TextEditingController();
  final TextEditingController _costController = TextEditingController();
  List<Map<String, dynamic>> _currentOrderItems = [];
  bool _isBuyingBulk = false;
  bool _markAsReceived = true; // Default to true for convenience

  // Supplier Form Controllers
  final TextEditingController _supNameController = TextEditingController();
  final TextEditingController _supEmailController = TextEditingController();
  final TextEditingController _supPhoneController = TextEditingController();
  int _supReliability = 100;
  dynamic _editingSupplier;

  ThemeData get _theme => ThemeService().themeData;
  Color get themeBg => _theme.scaffoldBackgroundColor;
  Color get themeCard => _theme.cardColor;
  Color get themeText =>
      _theme.textTheme.bodyLarge?.color ??
      (widget.isDarkMode ? Colors.white : const Color(0xFF1E293B));
  Color get themeHint => themeText.withValues(alpha: 0.6);
  Color get themeBorder => themeText.withValues(alpha: 0.12);
  Color get themePrimary => _theme.primaryColor;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchAllData();
    });
  }

  void _fetchAllData() {
    _fetchPurchases();
    _fetchInventory();
    _fetchSuppliers();
    _fetchTrends();
  }

  Future<void> _fetchTrends() async {
    try {
      final response = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/reports/inventory-trends'),
      );
      if (response.statusCode == 200) {
        setState(() => _trendData = jsonDecode(response.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Trends Error: $e');
    }
  }

  Future<void> _fetchSuppliers() async {
    try {
      final response = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases/suppliers'),
      );
      if (response.statusCode == 200) {
        setState(() => _suppliers = jsonDecode(response.body));
      } else {
        _showError('Failed to load suppliers: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Suppliers Error: $e');
      _showError('Connection Error: $e');
    }
  }

  Future<void> _fetchInventory() async {
    try {
      final response = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/inventory'),
      );
      if (response.statusCode == 200) {
        setState(() => _inventoryItems = jsonDecode(response.body));
      } else {
        _showError('Failed to load inventory: ${response.statusCode}');
      }
    } catch (e) {
      _showError('Failed to load inventory: $e');
    }
  }

  Future<void> _fetchPurchases() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases'),
      );
      if (response.statusCode == 200) {
        setState(() => _purchases = jsonDecode(response.body));
      } else {
        _showError('Failed to load purchases: ${response.statusCode}');
      }
    } catch (e) {
      _showError('Failed to load purchases: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // --- Purchase Logic ---
  void _addItemToOrder() {
    if (_selectedItem == null) {
      _showWarningDialog('Please select an inventory item first.');
      return;
    }
    if (_qtyController.text.trim().isEmpty) {
      _showWarningDialog('Please enter a quantity.');
      return;
    }
    if (_costController.text.trim().isEmpty) {
      _showWarningDialog('Please enter a unit cost.');
      return;
    }

    double qty = double.tryParse(_qtyController.text) ?? 0;
    double price = double.tryParse(_costController.text) ?? 0;

    if (qty <= 0 || price <= 0) {
      _showError('Quantity and price must be greater than zero');
      return;
    }

    double packSize =
        double.tryParse(_selectedItem['pack_size']?.toString() ?? '1.0') ?? 1.0;
    double finalStockQty = _isBuyingBulk ? (qty * packSize) : qty;
    String displayUnit = _isBuyingBulk
        ? (_selectedItem['pack_unit'] ?? 'pack')
        : (_selectedItem['unit'] ?? 'unit');

    setState(() {
      _currentOrderItems.add({
        'inventory_item_id': _selectedItem['id'],
        'name': _selectedItem['name'],
        'display_name': '${_selectedItem['name']} ($qty $displayUnit)',
        'quantity': finalStockQty, // Stock quantity to add
        'purchase_qty': qty, // Quantity entered in form
        'unit_price': price,
        'subtotal': qty * price,
        'is_bulk': _isBuyingBulk,
        'pack_unit': _selectedItem['pack_unit'],
      });
      _qtyController.clear();
      _costController.clear();
      _selectedItem = null;
      _isBuyingBulk = false;
      _calculateTotal();
    });
  }

  void _calculateTotal() {
    double total = 0;
    for (var item in _currentOrderItems) {
      total += item['subtotal'] as double;
    }
    _totalAmountController.text = total.toStringAsFixed(2);
  }

  Future<void> _savePurchase() async {
    if (_selectedSupplier == null) {
      _showWarningDialog('Please select a supplier for this purchase.');
      return;
    }
    if (_currentOrderItems.isEmpty) {
      _showWarningDialog('Please add at least one item to the purchase order.');
      return;
    }
    if (_invoiceController.text.trim().isEmpty) {
      _showWarningDialog('Please enter an invoice or reference number.');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'invoice_number': _invoiceController.text,
          'supplier_id': _selectedSupplier?['id'],
          'total_amount': double.tryParse(_totalAmountController.text) ?? 0,
          'items': _currentOrderItems,
          'status': _markAsReceived ? 'Received' : 'Pending',
        }),
      );

      if (response.statusCode == 201) {
        _resetOrderForm();
        _fetchPurchases();
        _fetchInventory();
        _showSuccess('Purchase recorded successfully');
      } else {
        _showError(
          'Failed to save purchase: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _resetOrderForm() {
    setState(() {
      _invoiceController.clear();
      _selectedSupplier = null;
      _totalAmountController.clear();
      _currentOrderItems = [];
      _selectedItem = null;
    });
  }

  // --- Supplier Logic ---
  Future<void> _saveSupplier() async {
    if (_supNameController.text.trim().isEmpty) {
      _showWarningDialog('Please enter the vendor name.');
      return;
    }

    final data = {
      'name': _supNameController.text,
      'contact_email': _supEmailController.text,
      'contact_phone': _supPhoneController.text,
      'reliability_score': _supReliability,
    };

    try {
      http.Response response;
      if (_editingSupplier == null) {
        response = await http.post(
          Uri.parse('${ThemeService.apiBaseUrl}/api/purchases/suppliers'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        );
      } else {
        response = await http.put(
          Uri.parse(
            '${ThemeService.apiBaseUrl}/api/purchases/suppliers/${_editingSupplier['id']}',
          ),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(data),
        );
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        _resetSupplierForm();
        _fetchSuppliers();
        _showSuccess('Supplier saved successfully');
      } else {
        _showError(
          'Failed to save supplier: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      _showError('Error saving supplier: $e');
    }
  }

  void _resetSupplierForm() {
    setState(() {
      _supNameController.clear();
      _supEmailController.clear();
      _supPhoneController.clear();
      _supReliability = 100;
      _editingSupplier = null;
    });
  }

  void _editSupplier(dynamic s) {
    setState(() {
      _editingSupplier = s;
      _supNameController.text = s['name'] ?? '';
      _supEmailController.text = s['contact_email'] ?? '';
      _supPhoneController.text = s['contact_phone'] ?? '';
      _supReliability = s['reliability_score'] ?? 100;
    });
  }

  Future<void> _deleteSupplier(int id) async {
    try {
      final response = await http.delete(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases/suppliers/$id'),
      );
      if (response.statusCode == 200) {
        _fetchSuppliers();
        _showSuccess('Supplier deleted');
      } else {
        _showError('Failed to delete supplier: ${response.statusCode}');
      }
    } catch (e) {
      _showError('Error deleting supplier: $e');
    }
  }

  // --- Inventory Linkage Logic ---
  Future<void> _linkItemToSupplier(int itemId, int? supplierId) async {
    try {
      final response = await http.put(
        Uri.parse(
          '${ThemeService.apiBaseUrl}/api/purchases/inventory/$itemId/supplier',
        ),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'supplier_id': supplierId}),
      );
      if (response.statusCode == 200) {
        _fetchInventory();
        _showSuccess('Inventory linkage updated');
      } else {
        _showError('Failed to update linkage: ${response.statusCode}');
      }
    } catch (e) {
      _showError('Error updating linkage: $e');
    }
  }

  Future<void> _updateMinStock(int itemId, double threshold) async {
    if (threshold < 0) return;
    try {
      final response = await http.put(
        Uri.parse('${ThemeService.apiBaseUrl}/api/inventory/$itemId'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'low_stock_threshold': threshold}),
      );
      if (response.statusCode == 200) {
        _fetchInventory();
        _showSuccess('Minimum stock level updated');
      }
    } catch (e) {
      _showError('Error updating threshold');
    }
  }

  // --- UI Helpers ---
  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Colors.red.shade800,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Container(
        color: themeBg,
        child: Column(
          children: [
            // Tab Bar Header
            Container(
              padding: const EdgeInsets.fromLTRB(32, 32, 32, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        LocalizationService().translate('purchase_management'),
                        style: TextStyle(
                          color: themeText,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      _buildTabBar(),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Divider(color: themeBorder, height: 1),
                ],
              ),
            ),
            // Tab Content
            Expanded(
              child: TabBarView(
                children: [
                  _buildPurchasesTab(),
                  _buildSuppliersTab(),
                  _buildLinkageTab(),
                  _buildTrendsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      width: 450,
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: themeBorder),
      ),
      padding: const EdgeInsets.all(4),
      child: TabBar(
        indicator: BoxDecoration(
          color: themePrimary,
          borderRadius: BorderRadius.circular(8),
        ),
        labelColor: Colors.white,
        unselectedLabelColor: themeHint,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        tabs: const [
          Tab(text: 'Purchases'),
          Tab(text: 'Suppliers'),
          Tab(text: 'Linkage'),
          Tab(text: 'Trends'),
        ],
      ),
    );
  }

  // --- Tab 1: Purchases ---
  Widget _buildPurchasesTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // History
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Purchase History',
                  style: TextStyle(
                    color: themeText,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: _purchases.isEmpty
                      ? Center(
                          child: Text(
                            'No records',
                            style: TextStyle(color: themeHint),
                          ),
                        )
                      : ListView.builder(
                          itemCount: _purchases.length,
                          itemBuilder: (context, index) {
                            final p = _purchases[index];
                            return _buildOrderCard(p);
                          },
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 32),
          // Form
          Expanded(flex: 1, child: _buildNewOrderForm()),
        ],
      ),
    );
  }

  Widget _buildOrderCard(dynamic p) {
    final status = p['status'] ?? 'Pending';
    final isPending = status == 'Pending';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(16),
        border: isPending
            ? Border.all(color: themePrimary.withValues(alpha: 0.3), width: 1)
            : null,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: (isPending ? themePrimary : Colors.green).withValues(
                alpha: 0.1,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isPending
                  ? Icons.shopping_cart_outlined
                  : Icons.check_circle_outline,
              color: isPending ? themePrimary : Colors.green,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      p['supplier_name'] ?? 'General Supplier',
                      style: TextStyle(
                        color: themeText,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: (isPending ? Colors.orange : Colors.green)
                            .withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        status.toUpperCase(),
                        style: TextStyle(
                          color: isPending ? Colors.orange : Colors.green,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  'Invoice: ${p['invoice_number'] ?? 'N/A'} • ${DateFormat('MMM dd').format(DateTime.parse(p['order_date']))}',
                  style: TextStyle(color: themeHint, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '\$${p['total_amount']}',
                    style: TextStyle(
                      color: themePrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(
                      Icons.delete_outline,
                      color: Colors.red,
                      size: 18,
                    ),
                    onPressed: () => _deletePurchase(p['id']),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              if (isPending)
                TextButton(
                  onPressed: () => _updateOrderStatus(p['id'], 'Received'),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(50, 24),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text(
                    'Mark Received',
                    style: TextStyle(
                      color: Colors.green,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _updateOrderStatus(int id, String status) async {
    setState(() => _isLoading = true);
    try {
      final response = await http.put(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases/$id/status'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'status': status}),
      );
      if (response.statusCode == 200) {
        _fetchAllData();
        _showSuccess('Order updated to $status');
      }
    } catch (e) {
      _showError('Error updating order');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deletePurchase(int id) async {
    bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Purchase?'),
        content: const Text(
          'Are you sure you want to remove this purchase record?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('DELETE', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final response = await http.delete(
        Uri.parse('${ThemeService.apiBaseUrl}/api/purchases/$id'),
      );
      if (response.statusCode == 200) {
        _fetchAllData();
        _showSuccess('Purchase deleted');
      }
    } catch (e) {
      _showError('Error deleting purchase');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Widget _buildNewOrderForm() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(20),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'New Purchase',
              style: TextStyle(
                color: themeText,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            _buildField('Invoice #', _invoiceController),
            const SizedBox(height: 12),
            _buildSupplierDropdown(),
            const SizedBox(height: 12),
            SwitchListTile(
              title: Text(
                'Mark as Received',
                style: TextStyle(
                  color: themeText,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
              subtitle: Text(
                'Instantly update inventory levels',
                style: TextStyle(color: themeHint, fontSize: 11),
              ),
              value: _markAsReceived,
              onChanged: (val) => setState(() => _markAsReceived = val),
              activeThumbColor: themePrimary,
              contentPadding: EdgeInsets.zero,
            ),
            const Divider(height: 40),
            Text(
              'Add Items',
              style: TextStyle(
                color: themeText,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            _buildItemDropdown(),

            // AUTOMATIC STOCK PICK (Observation 2)
            if (_selectedItem != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.inventory_2_outlined, size: 14, color: themeHint),
                  const SizedBox(width: 4),
                  Text(
                    'Stock: ${_selectedItem['quantity']} ${_selectedItem['unit']}',
                    style: TextStyle(
                      color: themeHint,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const Spacer(),
                  if (_selectedItem['pack_unit'] != null) ...[
                    Text(
                      'Buy Bulk?',
                      style: TextStyle(color: themeHint, fontSize: 11),
                    ),
                    SizedBox(
                      height: 24,
                      child: Switch(
                        value: _isBuyingBulk,
                        onChanged: (v) => setState(() => _isBuyingBulk = v),
                        activeThumbColor: themePrimary,
                      ),
                    ),
                  ],
                ],
              ),
              if (_isBuyingBulk) ...[
                const SizedBox(height: 4),
                Text(
                  'Converting: 1 ${_selectedItem['pack_unit']} = ${_selectedItem['pack_size']} ${_selectedItem['unit']}',
                  style: TextStyle(
                    color: themePrimary,
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],

            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildField('Qty', _qtyController, isNum: true),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildField('Price', _costController, isNum: true),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _addItemToOrder,
                  icon: const Icon(Icons.add),
                  style: IconButton.styleFrom(
                    backgroundColor: themePrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ],
            ),
            if (_currentOrderItems.isNotEmpty) ...[
              const SizedBox(height: 16),
              ..._currentOrderItems.asMap().entries.map(
                (e) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    e.value['display_name'] ?? e.value['name'],
                    style: TextStyle(color: themeText, fontSize: 13),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '\$${e.value['subtotal']}',
                        style: TextStyle(color: themeHint, fontSize: 12),
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.close,
                          size: 14,
                          color: Colors.red,
                        ),
                        onPressed: () => setState(() {
                          _currentOrderItems.removeAt(e.key);
                          _calculateTotal();
                        }),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const Divider(height: 32),
            _buildField('Total', _totalAmountController, isNum: true),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _savePurchase,
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Confirm Purchase',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Tab 2: Suppliers ---
  Widget _buildSuppliersTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Active Vendors',
                  style: TextStyle(
                    color: themeText,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: GridView.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 2.5,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                        ),
                    itemCount: _suppliers.length,
                    itemBuilder: (context, i) {
                      final s = _suppliers[i];
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: themeCard,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: themePrimary.withValues(
                                alpha: 0.1,
                              ),
                              child: Text(
                                s['name']?[0] ?? 'V',
                                style: TextStyle(color: themePrimary),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    s['name'] ?? '',
                                    style: TextStyle(
                                      color: themeText,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    s['contact_phone'] ?? 'No phone',
                                    style: TextStyle(
                                      color: themeHint,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: Icon(
                                Icons.edit_outlined,
                                color: themePrimary,
                                size: 18,
                              ),
                              onPressed: () => _editSupplier(s),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.delete_outline,
                                color: Colors.red,
                                size: 18,
                              ),
                              onPressed: () => _deleteSupplier(s['id']),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 32),
          Expanded(flex: 1, child: _buildSupplierForm()),
        ],
      ),
    );
  }

  Widget _buildSupplierForm() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _editingSupplier == null ? 'Add Supplier' : 'Edit Supplier',
            style: TextStyle(
              color: themeText,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          _buildField('Vendor Name', _supNameController),
          const SizedBox(height: 12),
          _buildField('Email', _supEmailController),
          const SizedBox(height: 12),
          _buildField('Phone', _supPhoneController),
          const SizedBox(height: 20),
          Text(
            'Reliability Score: $_supReliability%',
            style: TextStyle(color: themeHint, fontSize: 12),
          ),
          Slider(
            value: _supReliability.toDouble(),
            min: 0,
            max: 100,
            activeColor: themePrimary,
            onChanged: (v) => setState(() => _supReliability = v.toInt()),
          ),
          const Spacer(),
          Row(
            children: [
              if (_editingSupplier != null)
                Expanded(
                  child: OutlinedButton(
                    onPressed: _resetSupplierForm,
                    child: const Text('Cancel'),
                  ),
                ),
              if (_editingSupplier != null) const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _saveSupplier,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: themePrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    'Save Vendor',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Tab 3: Linkage ---
  Widget _buildLinkageTab() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Inventory - Supplier Mapping & Stock Thresholds',
            style: TextStyle(
              color: themeText,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 2.2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: _inventoryItems.length,
              itemBuilder: (context, i) {
                final item = _inventoryItems[i];
                double qty =
                    double.tryParse(item['quantity']?.toString() ?? '0') ?? 0;
                double threshold =
                    double.tryParse(
                      item['low_stock_threshold']?.toString() ?? '0',
                    ) ??
                    0;
                bool isLow = qty <= threshold;

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: themeCard,
                    borderRadius: BorderRadius.circular(16),
                    border: isLow
                        ? Border.all(
                            color: Colors.red.withValues(alpha: 0.3),
                            width: 1,
                          )
                        : null,
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['name'],
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                // VISUAL STOCK POSITION (Observation 1)
                                Row(
                                  children: [
                                    Text(
                                      'Stock: ${qty.toStringAsFixed(1)} ${item['unit']}',
                                      style: TextStyle(
                                        color: isLow
                                            ? Colors.red
                                            : themePrimary,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (isLow) ...[
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.warning_amber_rounded,
                                        color: Colors.red,
                                        size: 14,
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Min Stock Input (Observation 3)
                          SizedBox(
                            width: 60,
                            child: TextField(
                              decoration: InputDecoration(
                                labelText: 'Min',
                                labelStyle: TextStyle(
                                  color: themeHint,
                                  fontSize: 10,
                                ),
                                isDense: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              style: TextStyle(color: themeText, fontSize: 11),
                              keyboardType: TextInputType.number,
                              onSubmitted: (val) => _updateMinStock(
                                item['id'],
                                double.tryParse(val) ?? 0,
                              ),
                              controller: TextEditingController(
                                text: threshold.toStringAsFixed(0),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Supplier:',
                            style: TextStyle(color: themeHint, fontSize: 11),
                          ),
                          SizedBox(
                            width: 140,
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<int>(
                                value: item['supplier_id'],
                                hint: Text(
                                  'Link Supplier',
                                  style: TextStyle(
                                    color: themeHint,
                                    fontSize: 11,
                                  ),
                                ),
                                dropdownColor: themeCard,
                                isExpanded: true,
                                style: TextStyle(
                                  color: themeText,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                                items: _suppliers
                                    .map(
                                      (s) => DropdownMenuItem<int>(
                                        value: s['id'],
                                        child: Text(s['name'] ?? 'Vendor'),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (val) =>
                                    _linkItemToSupplier(item['id'], val),
                              ),
                            ),
                          ),
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

  // --- Reusable UI ---
  Widget _buildField(
    String label,
    TextEditingController controller, {
    bool isNum = false,
  }) {
    return TextField(
      controller: controller,
      keyboardType: isNum ? TextInputType.number : TextInputType.text,
      style: TextStyle(color: themeText, fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: themeHint, fontSize: 12),
        filled: true,
        fillColor: themeBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 12,
        ),
      ),
    );
  }

  Widget _buildSupplierDropdown() {
    return DropdownButtonFormField<dynamic>(
      initialValue: _selectedSupplier,
      dropdownColor: themeCard,
      decoration: InputDecoration(
        labelText: 'Supplier',
        labelStyle: TextStyle(color: themeHint, fontSize: 12),
        filled: true,
        fillColor: themeBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      items: _suppliers
          .map(
            (s) => DropdownMenuItem(
              value: s,
              child: Text(
                s['name'] ?? '',
                style: TextStyle(color: themeText, fontSize: 14),
              ),
            ),
          )
          .toList(),
      onChanged: (val) => setState(() => _selectedSupplier = val),
    );
  }

  Widget _buildItemDropdown() {
    return DropdownButtonFormField<dynamic>(
      initialValue: _selectedItem,
      dropdownColor: themeCard,
      decoration: InputDecoration(
        labelText: 'Select Inventory Item',
        labelStyle: TextStyle(color: themeHint, fontSize: 12),
        filled: true,
        fillColor: themeBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      items: _inventoryItems
          .map(
            (item) => DropdownMenuItem(
              value: item,
              child: Text(
                item['name'],
                style: TextStyle(color: themeText, fontSize: 14),
              ),
            ),
          )
          .toList(),
      onChanged: (val) => setState(() => _selectedItem = val),
    );
  }

  void _showWarningDialog(String message) {
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
            SizedBox(width: 12),
            Text('Action Required'),
          ],
        ),
        content: Text(message, style: const TextStyle(fontSize: 16)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'OK',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // --- Tab 4: Trends ---
  Widget _buildTrendsTab() {
    final vendors = _trendData['vendorSpend'] as List? ?? [];
    final fluctuations = _trendData['costFluctuations'] as List? ?? [];

    return Padding(
      padding: const EdgeInsets.all(32),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Vendor Performance
          Expanded(
            flex: 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Vendor Spend Distribution',
                  style: TextStyle(
                    color: themeText,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: vendors.isEmpty
                      ? Center(
                          child: Text(
                            'Insufficient data for trends',
                            style: TextStyle(color: themeHint),
                          ),
                        )
                      : ListView.builder(
                          itemCount: vendors.length,
                          itemBuilder: (context, i) {
                            final v = vendors[i];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: themeCard,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: themePrimary.withValues(
                                      alpha: 0.1,
                                    ),
                                    child: Icon(
                                      Icons.business_rounded,
                                      color: themePrimary,
                                      size: 18,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          v['vendor_name'],
                                          style: TextStyle(
                                            color: themeText,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        Text(
                                          '${v['order_count']} successful orders',
                                          style: TextStyle(
                                            color: themeHint,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '${ThemeService.currency}${v['total_spend']}',
                                    style: TextStyle(
                                      color: themePrimary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 32),
          // Cost Fluctuations
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cost Fluctuations (Purchase History)',
                  style: TextStyle(
                    color: themeText,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: fluctuations.isEmpty
                      ? Center(
                          child: Text(
                            'No item history available',
                            style: TextStyle(color: themeHint),
                          ),
                        )
                      : ListView.builder(
                          itemCount: fluctuations.length,
                          itemBuilder: (context, i) {
                            final f = fluctuations[i];
                            final date = DateFormat(
                              'MMM dd, yyyy',
                            ).format(DateTime.parse(f['order_date']));

                            // Check if price changed from previous record (simple heuristic)
                            bool priceChanged = false;
                            if (i < fluctuations.length - 1) {
                              if (fluctuations[i + 1]['item_name'] ==
                                      f['item_name'] &&
                                  fluctuations[i + 1]['unit_price'] !=
                                      f['unit_price']) {
                                priceChanged = true;
                              }
                            }

                            return Container(
                              margin: const EdgeInsets.only(bottom: 1),
                              decoration: BoxDecoration(
                                color: themeCard,
                                border: Border(
                                  bottom: BorderSide(color: themeBorder),
                                ),
                              ),
                              child: ListTile(
                                leading: Icon(
                                  priceChanged
                                      ? Icons.trending_up_rounded
                                      : Icons.horizontal_rule_rounded,
                                  color: priceChanged
                                      ? Colors.orange
                                      : themeHint,
                                  size: 20,
                                ),
                                title: Text(
                                  f['item_name'],
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                subtitle: Text(
                                  'Vendor: ${f['supplier_name']} • $date',
                                  style: TextStyle(
                                    color: themeHint,
                                    fontSize: 12,
                                  ),
                                ),
                                trailing: Text(
                                  '${ThemeService.currency}${f['unit_price']}',
                                  style: TextStyle(
                                    color: priceChanged
                                        ? Colors.orange
                                        : themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
