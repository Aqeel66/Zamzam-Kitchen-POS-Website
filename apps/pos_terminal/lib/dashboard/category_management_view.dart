import 'package:flutter/material.dart';
import '../theme_service.dart';
import '../components/form_card.dart';

class CategoryManagementView extends StatefulWidget {
  final List<dynamic> categories;
  final Function(String, String, String) onCreateCategory;
  final Function(dynamic, String, String, String) onUpdateCategory;
  final Function(dynamic) onDeleteCategory;
  final Future<String?> Function({String? target}) onPickImage;

  final bool isDarkMode;

  const CategoryManagementView({
    super.key,
    required this.categories,
    required this.onCreateCategory,
    required this.onUpdateCategory,
    required this.onDeleteCategory,
    required this.onPickImage,
    required this.isDarkMode,
  });

  @override
  State<CategoryManagementView> createState() => _CategoryManagementViewState();
}

class _CategoryManagementViewState extends State<CategoryManagementView> {
  final _catNameController = TextEditingController();
  final _catDescController = TextEditingController();
  final _catImageController = TextEditingController();
  dynamic _editingId;

  @override
  void dispose() {
    _catNameController.dispose();
    _catDescController.dispose();
    _catImageController.dispose();
    super.dispose();
  }

  void _edit(dynamic category) {
    setState(() {
      _editingId = category['id'];
      _catNameController.text = category['name'] ?? '';
      _catDescController.text = category['description'] ?? '';
      _catImageController.text = category['image'] ?? '';
    });
  }

  void _reset() {
    setState(() {
      _editingId = null;
      _catNameController.clear();
      _catDescController.clear();
      _catImageController.clear();
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

        return Container(
          color: themeBg,
          padding: const EdgeInsets.all(32),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Left Side: List
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Category Management',
                          style: TextStyle(
                            color: themeText,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: _reset,
                          icon: const Icon(Icons.add_rounded),
                          label: const Text('Add New Category'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: themePrimary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Expanded(
                      child: ListView.builder(
                        itemCount: widget.categories.length,
                        itemBuilder: (context, index) {
                          final cat = widget.categories[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: themeCard,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _editingId == cat['id']
                                    ? themePrimary
                                    : themeBorder,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 50,
                                  height: 50,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(8),
                                    image: DecorationImage(
                                      image: ThemeService.getImage(
                                        cat['image'],
                                      ),
                                      fit: BoxFit.cover,
                                    ),
                                    color: themePrimary.withValues(alpha: 0.1),
                                  ),
                                  child:
                                      cat['image'] == null ||
                                          cat['image'].toString().isEmpty
                                      ? Icon(
                                          Icons.category_rounded,
                                          color: themePrimary,
                                          size: 20,
                                        )
                                      : null,
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        cat['name'],
                                        style: TextStyle(
                                          color: themeText,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                      if (cat['description'] != null)
                                        Text(
                                          cat['description'],
                                          style: TextStyle(
                                            color: themeHint,
                                            fontSize: 12,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => _edit(cat),
                                  icon: Icon(
                                    Icons.edit_outlined,
                                    color: themePrimary,
                                  ),
                                ),
                                IconButton(
                                  onPressed: () => _showDeleteConfirm(
                                    cat,
                                    themeCard,
                                    themeText,
                                    themeBorder,
                                  ),
                                  icon: const Icon(
                                    Icons.delete_outline_rounded,
                                    color: Colors.red,
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
              const SizedBox(width: 40),
              // Right Side: Form
              Expanded(
                flex: 2,
                child: FormCard(
                  title: _editingId == null
                      ? 'Add New Category'
                      : 'Edit Category',
                  subtitle: _editingId == null
                      ? 'Create a new category'
                      : 'Update existing category details',
                  icon: _editingId == null
                      ? Icons.add_circle_outline
                      : Icons.edit_note_rounded,
                  children: [
                    FormTextField(
                      label: 'Category Name',
                      controller: _catNameController,
                    ),
                    const SizedBox(height: 20),
                    FormTextField(
                      label: 'Description (Optional)',
                      controller: _catDescController,
                      maxLines: 2,
                    ),
                    const SizedBox(height: 20),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Expanded(
                          child: FormTextField(
                            label: 'Image Path',
                            controller: _catImageController,
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () async {
                            final path = await widget.onPickImage();
                            if (path != null) {
                              setState(() => _catImageController.text = path);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: themePrimary.withValues(
                              alpha: 0.1,
                            ),
                            foregroundColor: themePrimary,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Icon(Icons.folder_open_rounded),
                        ),
                        const SizedBox(width: 16),
                        Container(
                          width: 54,
                          height: 54,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: themeBorder),
                          ),
                          child: _catImageController.text.isNotEmpty
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image(
                                    image: ThemeService.getImage(
                                      _catImageController.text,
                                    ),
                                    fit: BoxFit.cover,
                                  ),
                                )
                              : const Icon(
                                  Icons.image_search_rounded,
                                  color: Colors.grey,
                                ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    FormActionButton(
                      label: _editingId == null
                          ? 'Create Category'
                          : 'Save Changes',
                      onPressed: () {
                        if (_catNameController.text.trim().isEmpty) {
                          _showWarningDialog(
                            'Please enter a name for the category.',
                          );
                          return;
                        }

                        if (_editingId == null) {
                          widget.onCreateCategory(
                            _catNameController.text,
                            _catDescController.text,
                            _catImageController.text,
                          );
                        } else {
                          widget.onUpdateCategory(
                            _editingId,
                            _catNameController.text,
                            _catDescController.text,
                            _catImageController.text,
                          );
                        }
                        _reset();
                      },
                    ),
                    if (_editingId != null) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: _reset,
                          child: const Text(
                            'Cancel Edit',
                            style: TextStyle(color: Colors.red),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDeleteConfirm(
    dynamic cat,
    Color themeCard,
    Color themeText,
    Color themeBorder,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        title: Text('Delete Category?', style: TextStyle(color: themeText)),
        content: Text(
          'Are you sure you want to delete "${cat['name']}"? This will not delete items but they will be un-categorized.',
          style: TextStyle(color: themeText.withValues(alpha: 0.7)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              widget.onDeleteCategory(cat['id']);
              Navigator.pop(ctx);
              if (_editingId == cat['id']) _reset();
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
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
            child: const Text(
              'OK',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
