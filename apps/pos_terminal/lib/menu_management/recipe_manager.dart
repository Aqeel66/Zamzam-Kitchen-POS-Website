import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:pos_terminal/theme_service.dart';

class RecipeManager extends StatefulWidget {
  final Map<String, dynamic> menuItem;
  final bool isDarkMode;
  final Function() onRecipeChanged;

  const RecipeManager({
    super.key,
    required this.menuItem,
    required this.isDarkMode,
    required this.onRecipeChanged,
  });

  @override
  State<RecipeManager> createState() => _RecipeManagerState();
}

class _RecipeManagerState extends State<RecipeManager> {
  bool _isLoading = false;
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

  Future<void> _addIngredient() async {
    if (_selectedInventoryItem == null) return;

    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('http://localhost:5000/api/menu/recipe'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'menu_item_id': widget.menuItem['id'],
          'inventory_item_id': _selectedInventoryItem?['id'],
          'quantity_required': double.tryParse(_qtyController.text) ?? 1.0,
        }),
      );

      if (response.statusCode == 201) {
        _qtyController.clear();
        setState(() => _selectedInventoryItem = null);
        widget.onRecipeChanged();
      } else {
        _showError('Failed to add ingredient');
      }
    } catch (e) {
      _showError(e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteIngredient(dynamic ingredient) async {
    setState(() => _isLoading = true);
    try {
      final response = await http.delete(
        Uri.parse('http://localhost:5000/api/menu/recipe/${ingredient['id']}'),
      );

      if (response.statusCode == 200) {
        widget.onRecipeChanged();
      } else {
        _showError('Failed to delete ingredient');
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
    final recipe = widget.menuItem['recipe'] as List<dynamic>? ?? [];

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
              Text('Recipe (Auto-Deduct Inventory)', style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              if (recipe.isEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text('No recipe ingredients defined.', style: TextStyle(color: themeHint)),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: recipe.length,
                  itemBuilder: (context, index) {
                    final r = recipe[index];
                    final invItem = _inventoryItems.firstWhere((i) => i['id'] == r['inventory_item_id'], orElse: () => null);
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(invItem?['name'] ?? 'Unknown Item', style: TextStyle(color: themeText)),
                      subtitle: Text('Deducts: ${r['quantity_required']} ${invItem?['unit'] ?? ''}', style: TextStyle(color: themeHint, fontSize: 12)),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () => _deleteIngredient(r),
                      ),
                    );
                  },
                ),
              const Divider(),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: DropdownButtonFormField<dynamic>(
                      initialValue: _selectedInventoryItem,
                      dropdownColor: themeCard,
                      items: _inventoryItems.map((item) {
                        return DropdownMenuItem(
                          value: item,
                          child: Text('${item['name']} (${item['unit']})', style: TextStyle(color: themeText, fontSize: 13)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() => _selectedInventoryItem = val);
                      },
                      decoration: InputDecoration(
                        hintText: 'Select Item',
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
                    onPressed: _isLoading ? null : _addIngredient,
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
        );
      }
    );
  }
}
