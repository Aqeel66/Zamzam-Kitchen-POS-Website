import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:ui_kit/ui_kit.dart' as ui_kit;
import '../theme_service.dart';
import '../localization_service.dart';

class OrderEntryView extends StatefulWidget {
  final ui_kit.RestaurantTable table;
  final VoidCallback onCancel;
  final Function(Map<String, dynamic>) onOrderSubmit;

  const OrderEntryView({
    super.key,
    required this.table,
    required this.onCancel,
    required this.onOrderSubmit,
  });

  @override
  State<OrderEntryView> createState() => _OrderEntryViewState();
}

class _OrderEntryViewState extends State<OrderEntryView> {
  List<dynamic> _categories = [];
  List<dynamic> _menuItems = [];
  List<dynamic> _cartItems = [];
  int? _selectedCategoryId;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchMenu();
  }

  Future<void> _fetchMenu() async {
    try {
      final response = await http
          .get(Uri.parse('${ThemeService.apiBaseUrl}/api/menu?t=${DateTime.now().millisecondsSinceEpoch}'))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final List<dynamic> categories = json.decode(response.body);
        final List<dynamic> flatMenu = [];
        for (var cat in categories) {
          if (cat['items'] != null) {
            for (var item in cat['items']) {
              flatMenu.add({
                ...item,
                'category_name': cat['name'],
              });
            }
          }
        }
        if (mounted) {
          setState(() {
            _categories = categories;
            _menuItems = flatMenu;
            if (_categories.isNotEmpty) {
              _selectedCategoryId = _categories[0]['id'];
            }
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching menu: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _addToCart(dynamic item) {
    final variants = item['variants'] as List<dynamic>? ?? [];
    final extras = item['extras'] as List<dynamic>? ?? [];

    if (variants.isNotEmpty || extras.isNotEmpty) {
      _showCustomizationDialog(item, variants, extras);
    } else {
      _finalizeAddToCart(item, null, []);
    }
  }

  void _showCustomizationDialog(dynamic item, List<dynamic> variants, List<dynamic> extras) {
    dynamic selectedVariant = variants.isNotEmpty ? variants[0] : null;
    List<dynamic> selectedExtras = [];
    final theme = Theme.of(context);
    final themePrimary = theme.primaryColor;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Customize ${item['name']}'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (variants.isNotEmpty) ...[
                  const Text('Select Variant', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  ...variants.map((v) => RadioListTile<dynamic>(
                    title: Text('${v['name']} (+${ThemeService.currency}${v['price_adjustment']})'),
                    value: v,
                    groupValue: selectedVariant,
                    activeColor: themePrimary,
                    onChanged: (val) => setDialogState(() => selectedVariant = val),
                  )),
                  const Divider(),
                ],
                if (extras.isNotEmpty) ...[
                  const Text('Select Extras', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  ...extras.map((e) {
                    final isSelected = selectedExtras.contains(e);
                    return CheckboxListTile(
                      title: Text('${e['name']} (+${ThemeService.currency}${e['price_adjustment']})'),
                      value: isSelected,
                      activeColor: themePrimary,
                      onChanged: (val) {
                        setDialogState(() {
                          if (val == true) {
                            selectedExtras.add(e);
                          } else {
                            selectedExtras.remove(e);
                          }
                        });
                      },
                    );
                  }),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.red)),
            ),
            ElevatedButton(
              onPressed: () {
                _finalizeAddToCart(item, selectedVariant, selectedExtras);
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
              child: const Text('Add to Cart', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _finalizeAddToCart(dynamic item, dynamic variant, List<dynamic> extras) {
    setState(() {
      final existingIndex = _cartItems.indexWhere((i) {
        if (i['id'] != item['id']) return false;
        if (i['variant']?['id'] != variant?['id']) return false;
        
        final existingExtras = (i['extras'] as List? ?? []).map((e) => e['id']).toSet();
        final newExtras = extras.map((e) => e['id']).toSet();
        return existingExtras.length == newExtras.length && existingExtras.containsAll(newExtras);
      });

      if (existingIndex >= 0) {
        _cartItems[existingIndex]['quantity']++;
      } else {
        _cartItems.add({
          ...item,
          'quantity': 1,
          'variant': variant,
          'extras': extras,
        });
      }
    });
  }

  double get _totalAmount {
    return _cartItems.fold(0.0, (sum, item) {
      double itemBasePrice = double.tryParse(item['price'].toString()) ?? 0.0;
      double variantAdjustment = 0.0;
      if (item['variant'] != null) {
        variantAdjustment = double.tryParse(item['variant']['price_adjustment'].toString()) ?? 0.0;
      }
      double extrasTotal = 0.0;
      if (item['extras'] != null) {
        for (var e in item['extras']) {
          extrasTotal += double.tryParse(e['price_adjustment'].toString()) ?? 0.0;
        }
      }
      return sum + (itemBasePrice + variantAdjustment + extrasTotal) * item['quantity'];
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themePrimary = theme.primaryColor;

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final filteredItems = _selectedCategoryId == null
        ? _menuItems
        : _menuItems.where((i) => i['category_id'] == _selectedCategoryId).toList();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onCancel,
        ),
        title: Text('Table ${widget.table.label} - New Order'),
        actions: [
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined),
                onPressed: () => _showCartBottomSheet(context),
              ),
              if (_cartItems.isNotEmpty)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${_cartItems.length}',
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Categories Header
          SizedBox(
            height: 60,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _categories.length,
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategoryId == cat['id'];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                  child: ChoiceChip(
                    label: Text(cat['name']),
                    selected: isSelected,
                    onSelected: (val) {
                      setState(() => _selectedCategoryId = val ? cat['id'] : null);
                    },
                    selectedColor: themePrimary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : theme.textTheme.bodyLarge?.color,
                    ),
                  ),
                );
              },
            ),
          ),
          // Items Grid
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.8,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: filteredItems.length,
              itemBuilder: (context, index) {
                final item = filteredItems[index];
                return _buildItemCard(item, themePrimary);
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: _cartItems.isEmpty
          ? null
          : Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.cardColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Amount', style: TextStyle(fontSize: 12)),
                      Text(
                        '${ThemeService.currency}${_totalAmount.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: themePrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _showCartBottomSheet(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: themePrimary,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text(
                        'REVIEW ORDER',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildItemCard(dynamic item, Color primaryColor) {
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _addToCart(item),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: item['image'] != null
                  ? Image.network(
                      ThemeService.resolveImageUrl(item['image']),
                      fit: BoxFit.cover,
                      width: double.infinity,
                      errorBuilder: (context, error, stackTrace) =>
                          const Center(child: Icon(Icons.fastfood, size: 40)),
                    )
                  : const Center(child: Icon(Icons.fastfood, size: 40)),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item['name'],
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${ThemeService.currency}${double.tryParse(item['price'].toString())?.toStringAsFixed(2) ?? '0.00'}',
                    style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCartBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CartSheet(
        items: _cartItems,
        total: _totalAmount,
        onUpdateQuantity: (index, delta) {
          setState(() {
            _cartItems[index]['quantity'] += delta;
            if (_cartItems[index]['quantity'] <= 0) {
              _cartItems.removeAt(index);
            }
          });
          // Redraw the bottom sheet if still open
          (ctx as Element).markNeedsBuild();
        },
        onSubmit: () {
          Navigator.pop(ctx);
          widget.onOrderSubmit({
            'table_id': widget.table.id,
            'items': _cartItems,
            'total': _totalAmount,
          });
        },
      ),
    );
  }
}

class _CartSheet extends StatelessWidget {
  final List<dynamic> items;
  final double total;
  final Function(int, int) onUpdateQuantity;
  final VoidCallback onSubmit;

  const _CartSheet({
    required this.items,
    required this.total,
    required this.onUpdateQuantity,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Order Summary',
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: items.isEmpty
                ? const Center(child: Text('Your cart is empty'))
                  : ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final variantName = item['variant'] != null ? ' (${item['variant']['name']})' : '';
                      final extras = (item['extras'] as List? ?? []);
                      final extrasText = extras.isNotEmpty 
                          ? '\nExtras: ${extras.map((e) => e['name']).join(', ')}' 
                          : '';

                      double itemBasePrice = double.tryParse(item['price'].toString()) ?? 0.0;
                      double variantAdjustment = 0.0;
                      if (item['variant'] != null) {
                        variantAdjustment = double.tryParse(item['variant']['price_adjustment'].toString()) ?? 0.0;
                      }
                      double extrasTotal = 0.0;
                      for (var e in extras) {
                        extrasTotal += double.tryParse(e['price_adjustment'].toString()) ?? 0.0;
                      }
                      double unitPrice = itemBasePrice + variantAdjustment + extrasTotal;

                      return ListTile(
                        title: Text('${item['name']}$variantName'),
                        subtitle: Text(
                          '${ThemeService.currency}${unitPrice.toStringAsFixed(2)} x ${item['quantity']}$extrasText',
                          style: TextStyle(color: theme.primaryColor, fontSize: 13),
                        ),
                        isThreeLine: extras.isNotEmpty,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline),
                              onPressed: () => onUpdateQuantity(index, -1),
                            ),
                            Text('${item['quantity']}'),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: () => onUpdateQuantity(index, 1),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(fontSize: 18)),
                    Text(
                      '${ThemeService.currency}${total.toStringAsFixed(2)}',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: theme.primaryColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    onPressed: items.isEmpty ? null : onSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text(
                      'SUBMIT ORDER TO KITCHEN',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
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
