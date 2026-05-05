import 'package:flutter/material.dart';
import 'package:pos_terminal/theme_service.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math' as math;

class PromotionsView extends StatefulWidget {
  final bool isDarkMode;
  const PromotionsView({super.key, required this.isDarkMode});

  @override
  State<PromotionsView> createState() => _PromotionsViewState();
}

class _PromotionsViewState extends State<PromotionsView> {
  List<dynamic> _promoCodes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPromoCodes();
  }

  Future<void> _fetchPromoCodes() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/promotions'));
      if (response.statusCode == 200) {
        setState(() => _promoCodes = json.decode(response.body));
      }
    } catch (e) {
      debugPrint('Error fetching promos: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _togglePromoStatus(int id, bool isActive) async {
    try {
      final response = await http.patch(
        Uri.parse('${ThemeService.apiBaseUrl}/api/promotions/$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'is_active': isActive ? 1 : 0}),
      );
      if (response.statusCode == 200) {
        _fetchPromoCodes();
      }
    } catch (e) {
      debugPrint('Error toggling promo: $e');
    }
  }

  Future<void> _deletePromo(int id) async {
    try {
      final response = await http.delete(Uri.parse('${ThemeService.apiBaseUrl}/api/promotions/$id'));
      if (response.statusCode == 200) {
        _fetchPromoCodes();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Promo code deleted')));
        }
      }
    } catch (e) {
      debugPrint('Error deleting promo: $e');
    }
  }

  void _showCreatePromoDialog() {
    final codeController = TextEditingController(text: 'ZK-${_generateRandomCode(4)}');
    final valueController = TextEditingController();
    final minSpendController = TextEditingController();
    String discountType = 'Percentage';
    DateTime? selectedDate;
    const themePrimary = Color(0xFFF25C05);

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: widget.isDarkMode ? const Color(0xFF1E293B) : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Create New Promo Code', style: TextStyle(color: widget.isDarkMode ? Colors.white : Colors.black87)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(child: _buildTextField('Promo Code', codeController)),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: Icon(Icons.refresh_rounded, color: themePrimary),
                      onPressed: () => setDialogState(() {
                        codeController.text = 'ZK-${_generateRandomCode(6)}';
                      }),
                      tooltip: 'Generate New Code',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Type', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: discountType,
                            dropdownColor: widget.isDarkMode ? const Color(0xFF1E293B) : Colors.white,
                            style: TextStyle(color: widget.isDarkMode ? Colors.white : Colors.black87),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: widget.isDarkMode ? Colors.white.withValues(alpha: 0.05) : Colors.grey.withValues(alpha: 0.1),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            ),
                            items: ['Percentage', 'Fixed'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                            onChanged: (val) => setDialogState(() => discountType = val!),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildTextField('Value', valueController, isNumber: true),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField('Min Spend (Optional)', minSpendController, isNumber: true),
                const SizedBox(height: 16),
                const Text('Expiry Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now().add(const Duration(days: 30)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null) setDialogState(() => selectedDate = date);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: widget.isDarkMode ? Colors.white.withValues(alpha: 0.05) : Colors.grey.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.calendar_today, size: 18, color: widget.isDarkMode ? Colors.white70 : Colors.black54),
                        const SizedBox(width: 12),
                        Text(
                          selectedDate == null ? 'Select Expiry Date' : DateFormat('MMM dd, yyyy').format(selectedDate!),
                          style: TextStyle(color: widget.isDarkMode ? Colors.white : Colors.black87),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () async {
                if (codeController.text.isEmpty || valueController.text.isEmpty) return;
                
                final response = await http.post(
                  Uri.parse('${ThemeService.apiBaseUrl}/api/promotions'),
                  headers: {'Content-Type': 'application/json'},
                  body: json.encode({
                    'code': codeController.text,
                    'discount_type': discountType,
                    'discount_value': double.tryParse(valueController.text) ?? 0,
                    'min_spend': double.tryParse(minSpendController.text) ?? 0,
                    'valid_until': selectedDate?.toIso8601String(),
                  }),
                );

                if (response.statusCode == 201) {
                  Navigator.pop(context);
                  _fetchPromoCodes();
                } else {
                   final err = json.decode(response.body);
                   ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err['message'] ?? 'Error creating promo')));
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF25C05),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Create Promo', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  String _generateRandomCode(int length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final rnd = math.Random();
    return List.generate(length, (index) => chars[rnd.nextInt(chars.length)]).join();
  }

  Widget _buildTextField(String label, TextEditingController controller, {bool isNumber = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.split('(').first.trim(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: isNumber ? TextInputType.number : TextInputType.text,
          style: TextStyle(color: widget.isDarkMode ? Colors.white : Colors.black87),
          decoration: InputDecoration(
            hintText: label.contains('(') ? label.split('(').last.replaceAll(')', '').trim() : '',
            hintStyle: TextStyle(color: widget.isDarkMode ? Colors.white24 : Colors.black26),
            filled: true,
            fillColor: widget.isDarkMode ? Colors.white.withValues(alpha: 0.05) : Colors.grey.withValues(alpha: 0.1),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeBg = widget.isDarkMode ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final themeCard = widget.isDarkMode ? const Color(0xFF1E293B) : Colors.white;
    final themeText = widget.isDarkMode ? Colors.white : const Color(0xFF1E293B);
    final themePrimary = const Color(0xFFF25C05);
    final themeHint = widget.isDarkMode ? Colors.white70 : Colors.black54;

    return Container(
      color: themeBg,
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PROMOTIONS & COUPONS', style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, letterSpacing: 1.2, fontSize: 12)),
                  const SizedBox(height: 8),
                  Text('Campaign Management', style: TextStyle(color: themeText, fontSize: 28, fontWeight: FontWeight.bold)),
                ],
              ),
              ElevatedButton.icon(
                onPressed: _showCreatePromoDialog,
                icon: const Icon(Icons.add, color: Colors.white),
                label: const Text('New Promo Code', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Expanded(
            child: _isLoading 
              ? Center(child: CircularProgressIndicator(color: themePrimary))
              : _promoCodes.isEmpty 
                ? _buildEmptyState(themeText, themeHint)
                : GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 24,
                      mainAxisSpacing: 24,
                      childAspectRatio: 1.4,
                    ),
                    itemCount: _promoCodes.length,
                    itemBuilder: (context, index) => _buildPromoCard(_promoCodes[index], themeCard, themeText, themePrimary, themeHint),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Color themeText, Color themeHint) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.confirmation_number_outlined, size: 80, color: themeHint.withValues(alpha: 0.3)),
          const SizedBox(height: 24),
          Text('No Promo Codes Found', style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Create your first discount code to boost sales.', style: TextStyle(color: themeHint)),
        ],
      ),
    );
  }

  Widget _buildPromoCard(Map<String, dynamic> promo, Color cardColor, Color textColor, Color primaryColor, Color hintColor) {
    final bool isActive = promo['is_active'] == 1 || promo['is_active'] == true;
    final String discountStr = promo['discount_type'] == 'Percentage' 
      ? '${promo['discount_value']}%' 
      : '\$${promo['discount_value']}';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      promo['code'].toString().toUpperCase(),
                      style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isActive ? Colors.green : Colors.red,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                          color: isActive ? Colors.green : Colors.red,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  Switch(
                    value: isActive,
                    onChanged: (val) => _togglePromoStatus(promo['id'], val),
                    activeColor: primaryColor,
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: cardColor,
                          title: const Text('Delete Promo?'),
                          content: const Text('This action cannot be undone.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                            TextButton(onPressed: () {
                                Navigator.pop(ctx);
                                _deletePromo(promo['id']);
                            }, child: const Text('Delete', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          const Spacer(),
          Text(
            discountStr,
            style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.bold),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Discount Value',
                style: TextStyle(color: hintColor, fontSize: 12),
              ),
              if (double.tryParse(promo['min_spend']?.toString() ?? '0')! > 0)
                Text(
                  'Min Spend: \$${promo['min_spend']}',
                  style: TextStyle(color: primaryColor.withValues(alpha: 0.7), fontSize: 11, fontWeight: FontWeight.bold),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.calendar_today, size: 14, color: hintColor),
              const SizedBox(width: 8),
              Text(
                'Expires: ${promo['valid_until'] != null ? DateFormat('MMM dd, yyyy').format(DateTime.parse(promo['valid_until'])) : 'Never'}',
                style: TextStyle(color: hintColor, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
