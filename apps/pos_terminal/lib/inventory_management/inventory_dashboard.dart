import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pos_terminal/theme_service.dart';
import 'package:pos_terminal/localization_service.dart';
import 'package:pos_terminal/dashboard/pos_mission_control.dart';

class InventoryDashboard extends StatefulWidget {
  final bool isDarkMode;
  final bool hideHeader;

  const InventoryDashboard({
    super.key, 
    required this.isDarkMode,
    this.hideHeader = false,
  });

  @override
  State<InventoryDashboard> createState() => _InventoryDashboardState();
}

class _InventoryDashboardState extends State<InventoryDashboard> {
  bool _isLoading = false;
  List<dynamic> _inventoryItems = [];

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _unitController = TextEditingController();
  final TextEditingController _currentStockController = TextEditingController();
  final TextEditingController _minStockController = TextEditingController();
  final TextEditingController _costController = TextEditingController();

  // Bulk Item Fields
  bool _isBulkItem = false;
  final TextEditingController _packUnitController = TextEditingController();
  final TextEditingController _packSizeController = TextEditingController();

  int? _editingId;

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
    _fetchInventory();
  }

  Future<void> _fetchInventory() async {
    // Only show loader if we have no items to prevent flickering on tab switch
    if (_inventoryItems.isEmpty) {
      setState(() => _isLoading = true);
    }
    
    try {
      final response = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/inventory'),
      );
      if (response.statusCode == 200) {
        setState(() {
          _inventoryItems = jsonDecode(response.body);
        });
      } else {
        _showError(
          "${LocalizationService().translate('failed_to_load_inventory')} (Status: ${response.statusCode})",
        );
      }
    } catch (e) {
      _showError(LocalizationService().translate('failed_to_load_inventory'));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveItem() async {
    if (_nameController.text.trim().isEmpty) {
      _showError('Item name is required');
      return;
    }

    if (_minStockController.text.trim().isEmpty) {
      _showError('Minimum stock level is required');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final body = {
        'name': _nameController.text.trim(),
        'unit': _unitController.text.trim().isEmpty
            ? 'unit'
            : _unitController.text.trim(),
        'current_stock': double.tryParse(_currentStockController.text) ?? 0.0,
        'minimum_stock_level': double.tryParse(_minStockController.text) ?? 0.0,
        'cost_per_unit': double.tryParse(_costController.text) ?? 0.0,
        'pack_unit': _isBulkItem
            ? (_packUnitController.text.trim().isEmpty
                  ? 'pack'
                  : _packUnitController.text.trim())
            : null,
        'pack_size': _isBulkItem
            ? (double.tryParse(_packSizeController.text) ?? 1.0)
            : 1.0,
      };

      http.Response response;
      if (_editingId == null) {
        response = await http.post(
          Uri.parse('${ThemeService.apiBaseUrl}/api/inventory'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        );
      } else {
        response = await http.put(
          Uri.parse('${ThemeService.apiBaseUrl}/api/inventory/$_editingId'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        );
      }

      if (response.statusCode == 201 || response.statusCode == 200) {
        _resetForm();
        _fetchInventory();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(LocalizationService().translate('save_success')),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        String errorMsg =
            "${LocalizationService().translate('failed_to_save')} (Status: ${response.statusCode})";
        try {
          final errorData = jsonDecode(response.body);
          if (errorData['message'] != null) {
            errorMsg = errorData['message'];
          }
        } catch (_) {}
        _showError(errorMsg);
      }
    } catch (e) {
      _showError("Connection Error: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteItem(int id) async {
    setState(() => _isLoading = true);
    try {
      final response = await http.delete(
        Uri.parse('${ThemeService.apiBaseUrl}/api/inventory/$id'),
      );
      if (response.statusCode == 200) {
        if (_editingId == id) _resetForm();
        _fetchInventory();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(LocalizationService().translate('delete_success')),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        String errorMsg =
            "${LocalizationService().translate('failed_to_delete')} (Status: ${response.statusCode})";
        try {
          final errorData = jsonDecode(response.body);
          if (errorData['message'] != null) {
            errorMsg = errorData['message'];
          }
        } catch (_) {}
        _showError(errorMsg);
      }
    } catch (e) {
      _showError("Connection Error: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _editItem(dynamic item) {
    setState(() {
      _editingId = item['id'];
      _nameController.text = item['name'] ?? '';
      _unitController.text = item['unit'] ?? 'unit';
      _currentStockController.text = item['quantity']?.toString() ?? '0';
      _minStockController.text =
          (item['low_stock_threshold'] ?? item['min_stock_level'])
              ?.toString() ??
          '0';
      _costController.text = item['cost_per_unit']?.toString() ?? '0';

      _isBulkItem = item['pack_unit'] != null;
      _packUnitController.text = item['pack_unit'] ?? '';
      _packSizeController.text = item['pack_size']?.toString() ?? '1';
    });
  }

  void _resetForm() {
    setState(() {
      _editingId = null;
      _nameController.clear();
      _unitController.clear();
      _currentStockController.clear();
      _minStockController.clear();
      _costController.clear();
      _isBulkItem = false;
      _packUnitController.clear();
      _packSizeController.clear();
    });
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final themeBg = this.themeBg;
        final themeCard = this.themeCard;
        final themeText = this.themeText;
        final themeHint = this.themeHint;
        final themeBorder = this.themeBorder;
        final themePrimary = this.themePrimary;
        final loc = LocalizationService();

        return Container(
          color: themeBg,
          padding: EdgeInsets.all(widget.hideHeader ? 0 : 32),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left: Inventory List
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (!widget.hideHeader) ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            loc.translate('inventory_management'),
                            style: TextStyle(
                              color: themeText,
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (_isLoading)
                            CircularProgressIndicator(color: themePrimary),
                        ],
                      ),
                      const SizedBox(height: 24),
                    ],
                    Expanded(
                      child: ListView.builder(
                        itemCount: _inventoryItems.length,
                        itemBuilder: (context, index) {
                          final item = _inventoryItems[index];
                          final currentStock =
                              double.tryParse(
                                (item['quantity'] ?? item['current_stock'])
                                        ?.toString() ??
                                    '0',
                              ) ??
                              0;
                          final minStock =
                              double.tryParse(
                                (item['low_stock_threshold'] ??
                                            item['minimum_stock_level'])
                                        ?.toString() ??
                                    '0',
                              ) ??
                              0;
                          final isLowStock = currentStock <= minStock;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: themeCard,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _editingId == item['id']
                                    ? themePrimary
                                    : (isLowStock
                                          ? Colors.red.withOpacity(0.5)
                                          : themeBorder),
                                width: _editingId == item['id'] ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isLowStock
                                        ? Colors.red.withOpacity(0.1)
                                        : Colors.green.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    isLowStock
                                        ? Icons.warning_amber_rounded
                                        : Icons.inventory_2_outlined,
                                    color: isLowStock
                                        ? Colors.red
                                        : Colors.green,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item['name'],
                                        style: TextStyle(
                                          color: themeText,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Text(
                                            '${loc.translate('stock')}: $currentStock ${item['unit']} (${loc.translate('min')}: $minStock)',
                                            style: TextStyle(
                                              color: isLowStock
                                                  ? Colors.red
                                                  : themeHint,
                                              fontSize: 13,
                                              fontWeight: isLowStock
                                                  ? FontWeight.bold
                                                  : FontWeight.normal,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Container(
                                            width: 4,
                                            height: 4,
                                            decoration: BoxDecoration(
                                              color: themeHint,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'Cost: ${ThemeService.currency}${item['cost_per_unit'] ?? 0}',
                                            style: TextStyle(
                                              color: themeHint,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.edit_outlined,
                                    color: themePrimary,
                                  ),
                                  onPressed: () => _editItem(item),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    color: Colors.red,
                                  ),
                                  onPressed: () => _deleteItem(item['id']),
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
              // Right: Form
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: themeCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: themeBorder),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _editingId == null
                              ? loc.translate('add_new_item')
                              : loc.translate('edit_item'),
                          style: TextStyle(
                            color: themeText,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 24),
                        _buildTextField(
                          '${loc.translate('item_name')} *',
                          _nameController,
                          themeText,
                          themeHint,
                          themeBg,
                        ),
                        const SizedBox(height: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              loc.translate('unit'),
                              style: TextStyle(color: themeHint, fontSize: 12),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: themeBg,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: DropdownButtonHideUnderline(
                                child: Builder(
                                  builder: (context) {
                                    final List<String> singleUnits = [
                                      'kg',
                                      'gram',
                                      'liter',
                                      'ml',
                                      'piece',
                                      'unit',
                                      'portion',
                                    ];
                                    final List<String> bulkUnits = [
                                      'Crate',
                                      'Bag',
                                      'Box',
                                      'Carton',
                                      'Pack',
                                      'Dozen',
                                    ];

                                    final List<String> activeUnits = _isBulkItem
                                        ? bulkUnits
                                        : singleUnits;

                                    String current = _unitController.text
                                        .trim();
                                    if (current.isEmpty ||
                                        !activeUnits.contains(current)) {
                                      current = activeUnits.first;
                                      // Note: Don't call setState here, it's inside build.
                                      // We handle the actual update in the Switch onChanged.
                                    }

                                    return DropdownButton<String>(
                                      value: current,
                                      items: activeUnits
                                          .map(
                                            (u) => DropdownMenuItem(
                                              value: u,
                                              child: Text(
                                                u,
                                                style: TextStyle(
                                                  color: themeText,
                                                ),
                                              ),
                                            ),
                                          )
                                          .toList(),
                                      onChanged: (val) => setState(
                                        () => _unitController.text =
                                            val ?? activeUnits.first,
                                      ),
                                      dropdownColor: themeCard,
                                      isExpanded: true,
                                    );
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildTextField(
                          loc.translate('current_stock'),
                          _currentStockController,
                          themeText,
                          themeHint,
                          themeBg,
                          isNumber: true,
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _buildTextField(
                                '${loc.translate('min_stock_level')} *',
                                _minStockController,
                                themeText,
                                themeHint,
                                themeBg,
                                isNumber: true,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _buildTextField(
                                'Unit Cost (${ThemeService.currency})',
                                _costController,
                                themeText,
                                themeHint,
                                themeBg,
                                isNumber: true,
                              ),
                            ),
                          ],
                        ),

                        const Divider(height: 48),

                        // Bulk Configuration Toggle
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Bulk Purchase Item?',
                                    style: TextStyle(
                                      color: themeText,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  Text(
                                    'Enable for items bought in crates/bags',
                                    style: TextStyle(
                                      color: themeHint,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: _isBulkItem,
                              onChanged: (val) {
                                setState(() {
                                  _isBulkItem = val;
                                  // Update unit to first valid option in new list
                                  if (_isBulkItem) {
                                    _unitController.text = 'Crate';
                                  } else {
                                    _unitController.text = 'unit';
                                  }
                                });
                              },
                              activeThumbColor: themePrimary,
                            ),
                          ],
                        ),

                        if (_isBulkItem) ...[
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: _buildTextField(
                                  'Pack Unit',
                                  _packUnitController,
                                  themeText,
                                  themeHint,
                                  themeBg,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _buildTextField(
                                  'Qty/Pack',
                                  _packSizeController,
                                  themeText,
                                  themeHint,
                                  themeBg,
                                  isNumber: true,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Example: 1 Crate = 24 Bottles',
                            style: TextStyle(
                              color: themeHint,
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _saveItem,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: themePrimary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Text(
                              loc.translate('save_item'),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                        if (_editingId != null) ...[
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: TextButton(
                              onPressed: _resetForm,
                              child: Text(
                                loc.translate('cancel'),
                                style: const TextStyle(color: Colors.red),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller,
    Color themeText,
    Color themeHint,
    Color themeBg, {
    bool isNumber = false,
  }) {
    return TextField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: TextStyle(color: themeText),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: themeHint),
        filled: true,
        fillColor: themeBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

