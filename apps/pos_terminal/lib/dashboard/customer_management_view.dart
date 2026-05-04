import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../theme_service.dart';

class CustomerManagementView extends StatefulWidget {


  const CustomerManagementView({
    super.key,
  });

  @override
  State<CustomerManagementView> createState() => _CustomerManagementViewState();
}

class _CustomerManagementViewState extends State<CustomerManagementView> {
  List<dynamic> _customers = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchCustomers();
  }

  Future<void> _fetchCustomers() async {
    setState(() => _isLoading = true);
    try {
      final res = await http.get(Uri.parse('${ThemeService.apiBaseUrl}/api/customers'));
      if (res.statusCode == 200) {
        setState(() => _customers = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Fetch Customers Error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveCustomer(Map<String, dynamic> customer, {int? id}) async {
    try {
      final url = id == null 
        ? '${ThemeService.apiBaseUrl}/api/customers'
        : '${ThemeService.apiBaseUrl}/api/customers/$id';
      
      final res = id == null 
        ? await http.post(Uri.parse(url), headers: {'Content-Type': 'application/json'}, body: json.encode(customer))
        : await http.put(Uri.parse(url), headers: {'Content-Type': 'application/json'}, body: json.encode(customer));

      if (res.statusCode == 200 || res.statusCode == 201) {
        _fetchCustomers();
      } else {
        final error = json.decode(res.body)['error'] ?? 'Failed to save customer';
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
      }
    } catch (e) {
      if (kDebugMode) print('Save Customer Error: $e');
    }
  }

  Future<void> _deleteCustomer(int id) async {
    try {
      final res = await http.delete(Uri.parse('${ThemeService.apiBaseUrl}/api/customers/$id'));
      if (res.statusCode == 200) {
        _fetchCustomers();
      }
    } catch (e) {
      if (kDebugMode) print('Delete Customer Error: $e');
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
        final themePrimary = theme.primaryColor;
        final themeCard = theme.cardColor;
        final themeBorder = themeText.withValues(alpha: 0.15);
        final themeHint = themeText.withValues(alpha: 0.6);

        final filteredCustomers = _customers.where((c) {
          final query = _searchQuery.toLowerCase();
          final name = '${c['first_name']} ${c['last_name']}'.toLowerCase();
          final email = (c['email'] ?? '').toString().toLowerCase();
          final phone = (c['phone'] ?? '').toString().toLowerCase();
          return name.contains(query) || email.contains(query) || phone.contains(query);
        }).toList();

        return Container(
          color: themeBg,
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Customer Directory', style: TextStyle(color: themeText, fontSize: 32, fontWeight: FontWeight.bold)),
                      Text('Manage your loyal customers and their preferences.', style: TextStyle(color: themeHint, fontSize: 14)),
                    ],
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _showCustomerDialog(null, theme),
                    icon: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white, size: 20),
                    label: const Text('Add New Customer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: themePrimary,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              
              // Search Bar
              Container(
                width: 400,
                decoration: BoxDecoration(
                  color: themeCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: themeBorder),
                ),
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  style: TextStyle(color: themeText),
                  decoration: InputDecoration(
                    hintText: 'Search by name, email or phone...',
                    hintStyle: TextStyle(color: themeHint, fontSize: 14),
                    prefixIcon: Icon(Icons.search_rounded, color: themeHint),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Customer List
              Expanded(
                child: _isLoading 
                  ? Center(child: CircularProgressIndicator(color: themePrimary))
                  : filteredCustomers.isEmpty
                    ? Center(child: Text('No customers found', style: TextStyle(color: themeHint)))
                    : ListView.builder(
                        itemCount: filteredCustomers.length,
                        itemBuilder: (context, index) {
                          final c = filteredCustomers[index];
                          return _buildCustomerCard(c, theme, themeText, themeHint, themeCard, themeBorder, themePrimary);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCustomerCard(dynamic c, ThemeData theme, Color text, Color hint, Color card, Color border, Color primary) {
    final origin = c['origin'] ?? 'In-Store';
    final originColor = _getOriginColor(origin);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 28,
            backgroundColor: primary.withValues(alpha: 0.1),
            child: Text(
              '${c['first_name']?[0] ?? 'C'}'.toUpperCase(),
              style: TextStyle(color: primary, fontWeight: FontWeight.bold, fontSize: 20),
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('${c['first_name']} ${c['last_name']}', style: TextStyle(color: text, fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: originColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: originColor.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        origin.toUpperCase(),
                        style: TextStyle(color: originColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.email_outlined, size: 14, color: hint),
                    const SizedBox(width: 6),
                    Text(c['email'] ?? 'No email', style: TextStyle(color: hint, fontSize: 13)),
                    const SizedBox(width: 20),
                    Icon(Icons.phone_outlined, size: 14, color: hint),
                    const SizedBox(width: 6),
                    Text(c['phone'] ?? 'No phone', style: TextStyle(color: hint, fontSize: 13)),
                  ],
                ),
              ],
            ),
          ),
          if (c['dietary_profile'] != null && c['dietary_profile'].toString().isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.restaurant_menu_rounded, size: 12, color: Colors.green),
                  const SizedBox(width: 6),
                  Text(c['dietary_profile'], style: const TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          const SizedBox(width: 40),
          IconButton(
            icon: Icon(Icons.edit_outlined, color: hint),
            onPressed: () => _showCustomerDialog(c, theme),
            tooltip: 'Edit Customer',
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
            onPressed: () => _showDeleteConfirm(c, card, text),
            tooltip: 'Delete Customer',
          ),
        ],
      ),
    );
  }

  Color _getOriginColor(String origin) {
    switch (origin.toLowerCase()) {
      case 'website': return Colors.blueAccent;
      case 'qr-menu': return Colors.orangeAccent;
      case 'pos':
      case 'in-store': return Colors.tealAccent;
      default: return Colors.grey;
    }
  }

  void _showCustomerDialog(dynamic customer, ThemeData theme) {
    final themeText = theme.textTheme.bodyLarge?.color ?? Colors.black87;
    final themeHint = themeText.withValues(alpha: 0.6);
    final themeCard = theme.cardColor;
    final themePrimary = theme.primaryColor;

    final fnController = TextEditingController(text: customer?['first_name'] ?? '');
    final lnController = TextEditingController(text: customer?['last_name'] ?? '');
    final emailController = TextEditingController(text: customer?['email'] ?? '');
    final phoneController = TextEditingController(text: customer?['phone'] ?? '');
    final dpController = TextEditingController(text: customer?['dietary_profile'] ?? '');
    String selectedOrigin = customer?['origin'] ?? 'In-Store';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(customer == null ? 'Add Customer' : 'Edit Customer', style: TextStyle(color: themeText, fontWeight: FontWeight.bold)),
          content: SizedBox(
            width: 500,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField('First Name', fnController, themeText, themeHint, themePrimary),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildTextField('Last Name', lnController, themeText, themeHint, themePrimary),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField('Email Address', emailController, themeText, themeHint, themePrimary, icon: Icons.email_outlined),
                const SizedBox(height: 16),
                _buildTextField('Phone Number', phoneController, themeText, themeHint, themePrimary, icon: Icons.phone_outlined),
                const SizedBox(height: 16),
                _buildTextField('Dietary Preferences / Notes', dpController, themeText, themeHint, themePrimary, icon: Icons.restaurant_menu_rounded),
                const SizedBox(height: 24),
                DropdownButtonFormField<String>(
                  initialValue: selectedOrigin,
                  dropdownColor: themeCard,
                  decoration: InputDecoration(
                    labelText: 'Lead Source / Origin',
                    labelStyle: TextStyle(color: themeHint),
                    enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: themeText.withValues(alpha: 0.1))),
                  ),
                  style: TextStyle(color: themeText),
                  items: ['In-Store', 'Website', 'QR-Menu'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                  onChanged: (val) => setDialogState(() => selectedOrigin = val!),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text('CANCEL', style: TextStyle(color: themeHint))),
            ElevatedButton(
              onPressed: () {
                if (fnController.text.trim().isEmpty) {
                  _showWarningDialog('Please enter the customer\'s first name.');
                  return;
                }
                if (lnController.text.trim().isEmpty) {
                  _showWarningDialog('Please enter the customer\'s last name.');
                  return;
                }
                
                final data = {
                  'first_name': fnController.text,
                  'last_name': lnController.text,
                  'email': emailController.text,
                  'phone': phoneController.text,
                  'dietary_profile': dpController.text,
                  'origin': selectedOrigin,
                };
                _saveCustomer(data, id: customer?['id']);
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: themePrimary,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('SAVE CUSTOMER', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, Color text, Color hint, Color primary, {IconData? icon}) {
    return TextField(
      controller: controller,
      style: TextStyle(color: text),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: hint, fontSize: 13),
        prefixIcon: icon != null ? Icon(icon, size: 18, color: hint) : null,
        enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: text.withValues(alpha: 0.1))),
        focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: primary)),
      ),
    );
  }

  void _showDeleteConfirm(dynamic customer, Color card, Color text) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: card,
        title: Text('Delete Customer?', style: TextStyle(color: text)),
        content: Text('Are you sure you want to remove ${customer['first_name']}? this will delete their history from the directory.', style: TextStyle(color: text.withValues(alpha: 0.7))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
          TextButton(
            onPressed: () {
              _deleteCustomer(customer['id']);
              Navigator.pop(ctx);
            }, 
            child: const Text('DELETE', style: TextStyle(color: Colors.red))
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
