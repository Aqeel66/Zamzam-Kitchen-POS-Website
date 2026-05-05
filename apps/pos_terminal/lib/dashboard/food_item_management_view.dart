import 'package:flutter/material.dart';
import '../theme_service.dart';
import '../components/form_card.dart';
import '../menu_management/variant_manager.dart';
import '../menu_management/extra_manager.dart';
import '../menu_management/recipe_manager.dart';

class FoodItemManagementView extends StatefulWidget {
  final bool isDarkMode;
  final List<dynamic> categories;
  final List<dynamic> items;
  final Function(Map<String, dynamic>) onCreateMenuItem;
  final Function(dynamic, Map<String, dynamic>) onUpdateMenuItem;
  final Function(dynamic) onDeleteMenuItem;
  final Future<String?> Function() onPickImage;
  final VoidCallback onRefreshMenu;


  const FoodItemManagementView({
    super.key,
    required this.isDarkMode,
    required this.categories,
    required this.items,
    required this.onCreateMenuItem,
    required this.onUpdateMenuItem,
    required this.onDeleteMenuItem,
    required this.onPickImage,
    required this.onRefreshMenu,
  });

  @override
  State<FoodItemManagementView> createState() => _FoodItemManagementViewState();
}

class _FoodItemManagementViewState extends State<FoodItemManagementView> {
  final _itemNameController = TextEditingController();
  final _itemDescController = TextEditingController();
  final _itemPriceController = TextEditingController();
  final _itemDietaryController = TextEditingController();
  final _itemImageController = TextEditingController();
  final _badgeController = TextEditingController();
  
  bool _isAvailable = true;
  bool _isFeatured = false;
  String? _selectedCategoryId;
  String _selectedPrepStation = 'General';
  final List<String> _prepStations = ['Bar', 'Grill', 'Fryer', 'Salad', 'Dessert', 'General'];
  dynamic _editingId;
  String _searchQuery = '';

  @override
  void dispose() {
    _itemNameController.dispose();
    _itemDescController.dispose();
    _itemPriceController.dispose();
    _itemDietaryController.dispose();
    _itemImageController.dispose();
    _badgeController.dispose();
    super.dispose();
  }

  void _edit(dynamic item) {
    setState(() {
      _editingId = item['id'];
      _itemNameController.text = item['name'] ?? '';
      _itemDescController.text = item['description'] ?? '';
      _itemPriceController.text = item['price'].toString();
      _itemDietaryController.text = item['dietary_info'] ?? '';
      _itemImageController.text = item['image'] ?? '';
      _badgeController.text = item['badge'] ?? '';
      _selectedCategoryId = item['category_id']?.toString();
      _selectedPrepStation = item['prep_station'] ?? 'General';
      final av = item['is_available'];
      _isAvailable = av == true || av == 1 || av == null;
      final ft = item['is_featured'];
      _isFeatured = ft == true || ft == 1;
    });
  }

  void _reset() {
    setState(() {
      _editingId = null;
      _itemNameController.clear();
      _itemDescController.clear();
      _itemPriceController.clear();
      _itemDietaryController.clear();
      _itemImageController.clear();
      _badgeController.clear();
      _selectedCategoryId = null;
      _selectedPrepStation = 'General';
      _isAvailable = true;
      _isFeatured = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: ThemeService(),
      builder: (context, _) {
        final theme = ThemeService().themeData;
        final themeBg = theme.scaffoldBackgroundColor;
        final themeCard = theme.cardColor;
        final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
        final themeHint = themeText.withValues(alpha: 0.6);
        final themeBorder = themeText.withValues(alpha: 0.15);
        final themePrimary = theme.primaryColor;

        final filteredItems = widget.items.where((i) => i['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase())).toList();

        return Container(
          color: themeBg,
          padding: const EdgeInsets.all(32),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left: Item List
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Food Item Management', style: TextStyle(color: themeText, fontSize: 28, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    Container(
                      width: 400,
                      height: 42,
                      decoration: BoxDecoration(
                        color: themeCard,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: themeBorder),
                      ),
                      child: TextField(
                        onChanged: (val) => setState(() => _searchQuery = val),
                        style: TextStyle(color: themeText, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Search items...',
                          hintStyle: TextStyle(color: themeHint, fontSize: 13),
                          prefixIcon: Icon(Icons.search, color: themeHint, size: 18),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 11),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                    Expanded(
                      child: ListView.builder(
                        itemCount: filteredItems.length,
                        itemBuilder: (context, index) {
                          final item = filteredItems[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: themeCard,
                              borderRadius: BorderRadius.circular(12),
                              border: _editingId == item['id'] 
                                ? Border.all(color: themePrimary, width: 1.5) 
                                : null,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 60, height: 60,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(8),
                                    image: DecorationImage(
                                      image: ThemeService.getImage(item['image']),
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item['name'], style: TextStyle(color: themeText, fontWeight: FontWeight.bold)),
                                      Row(
                                        children: [
                                          Text('\$${item['price']}', style: const TextStyle(color: Colors.green, fontSize: 13)),
                                          if (item['is_available'] == 0 || item['is_available'] == false || item['is_available'] == "0") ...[
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(4), border: Border.all(color: Colors.red, width: 0.5)),
                                              child: const Text('OUT OF STOCK', style: TextStyle(color: Colors.red, fontSize: 8, fontWeight: FontWeight.bold)),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(onPressed: () => _edit(item), icon: Icon(Icons.edit_outlined, color: themePrimary)),
                                IconButton(onPressed: () => _showDeleteConfirm(item, themeCard, themeText), icon: const Icon(Icons.delete_outline_rounded, color: Colors.red)),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 40),
              // Right: Form
              Expanded(
                flex: 3,
                child: FormCard(
                  title: _editingId == null ? 'Add Food Item' : 'Edit Food Item',
                  subtitle: _editingId == null ? 'Create new menu entry' : 'Update existing item details',
                  icon: _editingId == null ? Icons.restaurant_menu_rounded : Icons.edit_rounded,
                  children: [
                    Row(
                      children: [
                        Expanded(child: FormTextField(label: 'Item Name', controller: _itemNameController)),
                        const SizedBox(width: 20),
                        Expanded(child: FormTextField(label: 'Price (\$)', controller: _itemPriceController, keyboardType: TextInputType.number)),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Category', style: TextStyle(color: themeText.withValues(alpha: 0.7), fontSize: 14, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: themeBorder),
                                  color: Colors.black.withValues(alpha: 0.02),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _selectedCategoryId,
                                    items: widget.categories.map((c) => DropdownMenuItem(
                                      value: c['id'].toString(),
                                      child: Text(c['name']),
                                    )).toList(),
                                    onChanged: (val) => setState(() => _selectedCategoryId = val),
                                    isExpanded: true,
                                    dropdownColor: themeCard,
                                    style: TextStyle(color: themeText),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Prep Station', style: TextStyle(color: themeText.withValues(alpha: 0.7), fontSize: 14, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: themeBorder),
                                  color: Colors.black.withValues(alpha: 0.02),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _selectedPrepStation,
                                    items: _prepStations.map((s) => DropdownMenuItem(
                                      value: s,
                                      child: Text(s),
                                    )).toList(),
                                    onChanged: (val) => setState(() => _selectedPrepStation = val ?? 'General'),
                                    isExpanded: true,
                                    dropdownColor: themeCard,
                                    style: TextStyle(color: themeText),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    FormTextField(label: 'Description', controller: _itemDescController, maxLines: 2),
                    const SizedBox(height: 20),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(child: FormTextField(label: 'Image Path', controller: _itemImageController)),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () async {
                            final path = await widget.onPickImage();
                            if (path != null) {
                              setState(() => _itemImageController.text = path);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: themePrimary.withValues(alpha: 0.1),
                            foregroundColor: themePrimary,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Icon(Icons.folder_open_rounded),
                        ),
                        const SizedBox(width: 16),
                        Container(
                          width: 54, height: 54,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: themeBorder),
                          ),
                          child: _itemImageController.text.isNotEmpty 
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: Image(
                                  image: ThemeService.getImage(_itemImageController.text),
                                  fit: BoxFit.cover,
                                ),
                              )
                            : const Icon(Icons.image_search_rounded, color: Colors.grey),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SwitchListTile(
                      title: Text('Is Item Available?', style: TextStyle(color: themeText, fontWeight: FontWeight.w600)),
                      subtitle: Text('Uncheck to mark as Out of Stock / Unavailable', style: TextStyle(color: themeHint, fontSize: 12)),
                      value: _isAvailable,
                      onChanged: (val) => setState(() => _isAvailable = val),
                      activeThumbColor: themePrimary,
                      contentPadding: EdgeInsets.zero,
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      title: Text('Feature on Website?', style: TextStyle(color: themeText, fontWeight: FontWeight.w600)),
                      subtitle: Text('Show this item in the "Chef\'s Specials" carousel', style: TextStyle(color: themeHint, fontSize: 12)),
                      value: _isFeatured,
                      onChanged: (val) => setState(() => _isFeatured = val),
                      activeThumbColor: Colors.amber,
                      contentPadding: EdgeInsets.zero,
                    ),
                    const SizedBox(height: 20),
                    FormTextField(label: 'Badge Label (e.g., NEW, POPULAR)', controller: _badgeController),
                    if (_editingId != null) ...[
                      const SizedBox(height: 24),
                      const Divider(),
                      const SizedBox(height: 24),
                      VariantManager(
                        menuItem: widget.items.firstWhere((i) => i['id'] == _editingId, orElse: () => {'id': _editingId}),
                        isDarkMode: widget.isDarkMode,
                        onVariantsChanged: widget.onRefreshMenu,
                      ),
                      const SizedBox(height: 16),
                      ExtraManager(
                        menuItem: widget.items.firstWhere((i) => i['id'] == _editingId, orElse: () => {'id': _editingId}),
                        isDarkMode: widget.isDarkMode,
                        onExtrasChanged: widget.onRefreshMenu,
                      ),
                      const SizedBox(height: 16),
                      RecipeManager(
                        menuItem: widget.items.firstWhere((i) => i['id'] == _editingId, orElse: () => {'id': _editingId}),
                        isDarkMode: widget.isDarkMode,
                        onRecipeChanged: widget.onRefreshMenu,
                      ),
                    ],
                    const SizedBox(height: 32),
                    FormActionButton(
                      label: _editingId == null ? 'Create Food Item' : 'Save Changes', 
                      onPressed: () {
                        if (_itemNameController.text.trim().isEmpty) {
                          _showWarningDialog('Please enter a name for the food item.');
                          return;
                        }
                        if (_itemPriceController.text.trim().isEmpty) {
                          _showWarningDialog('Please enter a price for the food item.');
                          return;
                        }
                        if (_selectedCategoryId == null) {
                          _showWarningDialog('Please select a category for this item.');
                          return;
                        }

                        final itemData = {
                          'category_id': int.tryParse(_selectedCategoryId ?? '') ?? 1,
                          'name': _itemNameController.text,
                          'description': _itemDescController.text,
                          'price': double.tryParse(_itemPriceController.text) ?? 0.0,
                          'dietary_info': _itemDietaryController.text,
                          'prep_station': _selectedPrepStation,
                          'image': _itemImageController.text,
                          'is_available': _isAvailable ? 1 : 0,
                          'is_featured': _isFeatured ? 1 : 0,
                          'badge': _badgeController.text,
                        };
                        if (_editingId == null) {
                          widget.onCreateMenuItem(itemData);
                          _reset();
                        } else {
                          widget.onUpdateMenuItem(_editingId, itemData);
                        }
                      }
                    ),
                    if (_editingId != null) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(onPressed: _reset, child: const Text('Cancel Edit', style: TextStyle(color: Colors.red))),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      }
    );
  }

  void _showDeleteConfirm(dynamic item, Color themeCard, Color themeText) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        title: Text('Delete Item?', style: TextStyle(color: themeText)),
        content: Text('Delete "${item['name']}" from menu permanently?', 
          style: TextStyle(color: themeText.withValues(alpha: 0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              widget.onDeleteMenuItem(item['id']);
              Navigator.pop(ctx);
              if (_editingId == item['id']) _reset();
            }, 
            child: const Text('Delete', style: TextStyle(color: Colors.red))
          ),
        ],
      ),
    );
  }
  void _showWarningDialog(String message) {
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
            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
