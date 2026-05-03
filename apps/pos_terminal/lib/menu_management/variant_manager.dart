import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pos_terminal/theme_service.dart';

class VariantManager extends StatefulWidget {
  final Map<String, dynamic> menuItem;
  final bool isDarkMode;
  final Function() onVariantsChanged;

  const VariantManager({
    super.key,
    required this.menuItem,
    required this.isDarkMode,
    required this.onVariantsChanged,
  });

  @override
  State<VariantManager> createState() => _VariantManagerState();
}

class _VariantManagerState extends State<VariantManager> {
  bool _isLoading = false;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _qtyController = TextEditingController();
  List<dynamic> _inventoryItems = [];
  dynamic _selectedInventoryItem;

  ThemeData get _theme => ThemeService().themeData;
  Color get themeBg => _theme.scaffoldBackgroundColor;
  Color get themeCard => _theme.cardColor;
  Color get themeText => _theme.textTheme.bodyMedium?.color ?? Colors.white;
  Color get themeHint => themeText.withValues(alpha: 0.6);
  Color get themeBorder => themeText.withValues(alpha: 0.15);
  Color get themePrimary => _theme.primaryColor;

  @override
  void initState() {
    super.initState();
    _fetchInventory();
  }

  Future<void> _fetchInventory() async {
    try {
      final response = await http.get(Uri.parse('http://localhost:5000/api/inventory'));
      if (response.statusCode == 200) {
        setState(() {
          _inventoryItems = jsonDecode(response.body);
        });
      }
    } catch (e) {
      _showError('Failed to load inventory');
    }
  }

  Future<void> _addVariant() async {
    if (_nameController.text.trim().isEmpty) return;

    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('http://localhost:5000/api/menu/variants'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'menu_item_id': widget.menuItem['id'],
          'name': _nameController.text.trim(),
          'price_adjustment': double.tryParse(_priceController.text) ?? 0.0,
          'inventory_item_id': _selectedInventoryItem?['id'],
          'quantity_required': double.tryParse(_qtyController.text) ?? 0.0,
        }),
      );

      if (response.statusCode == 201) {
        _nameController.clear();
        _priceController.clear();
        _qtyController.clear();
        setState(() => _selectedInventoryItem = null);
        widget.onVariantsChanged();
      } else {
        _showError('Failed to add variant');
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteVariant(dynamic variant) async {
    setState(() => _isLoading = true);
    try {
      final response = await http.delete(
        Uri.parse('http://localhost:5000/api/menu/variants/${variant['id']}'),
      );

      if (response.statusCode == 200) {
        widget.onVariantsChanged();
      } else {
        _showError('Failed to delete variant');
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    final variants = widget.menuItem['variants'] as List<dynamic>? ?? [];

    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final themeBg = this.themeBg;
        final themeCard = this.themeCard;
        final themeText = this.themeText;
        final themeHint = this.themeHint;
        final themeBorder = this.themeBorder;
        final themePrimary = this.themePrimary;

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: themeCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: themeBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Variants (e.g. Size, Type)', style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              if (variants.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text('No variants added yet.', style: TextStyle(color: themeHint)),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: variants.length,
                  itemBuilder: (context, index) {
                    final v = variants[index];
                    String invInfo = '';
                    if (v['inventory_item_id'] != null) {
                       final invItem = _inventoryItems.firstWhere((i) => i['id'] == v['inventory_item_id'], orElse: () => null);
                       invInfo = ' | Deducts: ${v['quantity_required']} ${invItem?['unit'] ?? ''}';
                    }
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(v['name'], style: TextStyle(color: themeText)),
                      subtitle: Text('Price: \$${v['price_adjustment']}$invInfo', style: TextStyle(color: themeHint, fontSize: 11)),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () => _deleteVariant(v),
                      ),
                    );
                  },
                ),
              const Divider(),
              Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: _nameController,
                          style: TextStyle(color: themeText),
                          decoration: InputDecoration(
                            hintText: 'Variant Name',
                            hintStyle: TextStyle(color: themeHint),
                            filled: true,
                            fillColor: themeBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 1,
                        child: TextField(
                          controller: _priceController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: themeText),
                          decoration: InputDecoration(
                            hintText: '+\$0.00',
                            hintStyle: TextStyle(color: themeHint),
                            filled: true,
                            fillColor: themeBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: DropdownButtonFormField<dynamic>(
                          initialValue: _selectedInventoryItem,
                          dropdownColor: themeCard,
                          items: [
                            const DropdownMenuItem(value: null, child: Text('No Inventory Link', style: TextStyle(color: Colors.grey))),
                            ..._inventoryItems.map((item) {
                              return DropdownMenuItem(
                                value: item,
                                child: Text('${item['name']} (${item['unit']})', style: TextStyle(color: themeText, fontSize: 13)),
                              );
                            }),
                          ],
                          onChanged: (val) {
                            setState(() => _selectedInventoryItem = val);
                          },
                          decoration: InputDecoration(
                            hintText: 'Link Inventory Item',
                            hintStyle: TextStyle(color: themeHint),
                            filled: true,
                            fillColor: themeBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 1,
                        child: TextField(
                          controller: _qtyController,
                          keyboardType: TextInputType.number,
                          style: TextStyle(color: themeText),
                          decoration: InputDecoration(
                            hintText: 'Qty',
                            hintStyle: TextStyle(color: themeHint),
                            filled: true,
                            fillColor: themeBg,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _isLoading ? null : _addVariant,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: themePrimary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.add),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        );
      }
    );
  }
}
