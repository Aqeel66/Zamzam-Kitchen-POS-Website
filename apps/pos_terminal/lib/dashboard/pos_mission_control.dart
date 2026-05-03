import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:async';
// ignore_for_file: deprecated_member_use
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:ui_kit/ui_kit.dart' as ui_kit;
import 'package:qr_flutter/qr_flutter.dart';
import 'package:pos_terminal/theme_service.dart';
import 'package:pos_terminal/sound_service.dart';
import 'package:pos_terminal/localization_service.dart';
import '../services/receipt_service.dart';
import 'purchase_management_view.dart';
import 'category_management_view.dart';
import 'food_item_management_view.dart';
import 'user_management_view.dart';
import 'human_resource_view.dart';
import 'reports_view.dart';
import 'settings_view.dart';
import '../inventory_management/inventory_dashboard.dart';
import 'customer_management_view.dart';

 // Dynamic theme colors are accessed via ThemeService().themeData in _AdminDashboardState


enum TableStatus { available, occupied, reserved, cleaning }

const String apiBaseUrl = 'http://localhost:5000';

String resolveImageUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http')) return path;
  
  // The backend serves the 'pos_terminal/assets' folder under the '/assets' route.
  // We need to ensure the final URL is: apiBaseUrl/assets/rest/of/path
  String cleanPath = path;
  if (cleanPath.startsWith('assets/')) {
    cleanPath = cleanPath.substring(7);
  } else if (cleanPath.startsWith('/assets/')) {
    cleanPath = cleanPath.substring(8);
  } else if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  
  final resolved = '$apiBaseUrl/assets/$cleanPath';
  // debugPrint('Resolved Image URL: $resolved');
  return resolved;
}

class TableModel {
  final String id;
  final String name;
  TableStatus status;
  final int capacity;

  TableModel({
    required this.id,
    required this.name,
    required this.status,
    required this.capacity,
  });
}

class POSMissionControl extends StatefulWidget {
  final Map<String, dynamic>? user;
  final Function(BuildContext context)? onLogout;
  const POSMissionControl({super.key, this.user, this.onLogout});

  @override
  State<POSMissionControl> createState() => _POSMissionControlState();
}

class _POSMissionControlState extends State<POSMissionControl> with SingleTickerProviderStateMixin {
  late AnimationController _loadingLogoController;
  late Animation<double> _loadingLogoAnimation;

  int _selectedTabIndex = 0; // Default to POS
  int _selectedDashboardTab = 0; // Dashboard sub-navigation
  bool _isFoodManagementExpanded = false;
  bool _isSecurityExpanded = false;
  bool _isLoading = true;
  Timer? _refreshTimer;
  Timer? _clockTimer;
  Timer? _inactivityTimer;
  String _timeString = '';
  String _dateString = '';
  Map<String, dynamic> _summaryData = {};

  List<dynamic> _placedOrders = [];
  List<dynamic> _reservations = [];
  List<dynamic> _menuItems = [];
  List<dynamic> _categories = [];
  List<Map<String, dynamic>> _cartItems = [];
  String _selectedCategory = 'All Items';
  double _discount = 0.0;
  double _tip = 0.0;
  double _reservationFee = 0.0;
  String _paymentMethod = 'Cash';
  String _orderType = 'Dine-In';
  String _menuSearchQuery = '';
  int? _editingOrderId;
  Map<String, dynamic>? _selectedWaiter;
  final List<Map<String, dynamic>> _waiters = [
    {'id': 1, 'name': 'John Staff'},
    {'id': 2, 'name': 'Sarah Waiter'},
    {'id': 3, 'name': 'Mike Server'},
    {'id': 4, 'name': 'Amy Floor'},
  ];

  // Customer State for Checkout
  List<dynamic> _allCustomers = [];
  Map<String, dynamic>? _selectedCustomer;
  String _customerSearchQuery = '';
  final _customerFirstNameController = TextEditingController();
  final _customerPhoneController = TextEditingController();
  final _customerEmailController = TextEditingController();
  bool _isNewGuestMode = false;

  Map<String, dynamic>? _selectedOrderDetails;
  String _orderStatusFilter = 'ALL';
  String _waitingTab = 'Active'; // New: Sub-tab for Waiting analytics

  Map<String, dynamic>? _selectedReservationDetails;
  String _reservationStatusFilter = 'Upcoming';

  List<ui_kit.RestaurantTable>? _restaurantTables;
  ui_kit.RestaurantTable? _selectedTable;

  // User Management State
  List<dynamic> _users = [];
  List<dynamic> _roles = [];
  List<dynamic> _permissions = [];
  bool _isUsersLoading = false;
  bool _isRolesLoading = false;

  // HR & Messages State
  List<dynamic> _shifts = [];
  Map<String, dynamic> _hrStats = {};
  List<dynamic> _lowStockItems = [];
  Map<String, dynamic> _financialData = {};
  Map<String, dynamic> _operationalData = {};
  bool _isHRLoading = false;
  String _paymentPolicy = 'Pay Last'; // Options: 'Pay First', 'Pay Last'

  // Settings State
  double _splitMultiplier = 1.0;
  bool _isSplitActive = false;
  Map<String, dynamic> _settings = {};
  bool _isSettingsLoading = false;
  final Map<String, TextEditingController> _settingControllers = {};

  bool _hasPermission(String permission) {
    if (widget.user == null) return true; // Default to allow if no user (dev mode)
    final permissions = widget.user!['permissions'] as List<dynamic>? ?? [];
    return permissions.contains(permission);
  }

  bool _isOrderFromToday(dynamic orderTime) {
    if (orderTime == null) return false;
    try {
      DateTime dt = DateTime.parse(orderTime.toString()).toLocal();
      DateTime now = DateTime.now();
      return dt.year == now.year && dt.month == now.month && dt.day == now.day;
    } catch (_) {
      return false;
    }
  }

  // Theme constants - using ThemeService directly for instant reactivity
  bool get _isDarkMode => ThemeService().isDarkMode;
  ThemeData get _theme => ThemeService().themeData;
  Color get themePrimary => _theme.primaryColor;
  Color get themePrimaryAccent => _theme.primaryColor.withValues(alpha: 0.8);
  Color get themeBg => _theme.scaffoldBackgroundColor;
  Color get themeCard => _theme.cardColor;
  Color get themeText => _theme.textTheme.bodyLarge?.color ?? (_isDarkMode ? Colors.white : const Color(0xFF0F172A));
  Color get themeHint => themeText.withValues(alpha: 0.6);
  Color get themeBorder => _theme.dividerColor.withValues(alpha: 0.15);
  Color get themeSecondary => _theme.colorScheme.secondary;



  @override
  void initState() {
    super.initState();
    _fetchMenu();
    _fetchReservations();
    _fetchOrders();
    _fetchSummary();
    _fetchUsers();
    _fetchRoles();
    _fetchPermissions();
    _fetchShifts();
    _fetchHRStats();
    _fetchSettings();
    _fetchGlobalCustomers();
    _fetchTables();

    _loadingLogoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _loadingLogoAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _loadingLogoController, curve: Curves.easeInOut),
    );

    _updateTime();
    _clockTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _updateTime(),
    );

    _fetchTables();
    
    // Fallback: Ensure loading screen clears eventually
    Future.delayed(const Duration(seconds: 15), () {
      if (mounted && _isLoading) {
        setState(() => _isLoading = false);
      }
    });

    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _fetchReservations();
      _fetchOrders();
      _fetchSummary();
      _fetchTables();
      _fetchUsers();
      _fetchRoles();
      _fetchPermissions();
      _fetchShifts();
      _fetchHRStats();
      _fetchSettings();
      _fetchTables();
      _fetchGlobalCustomers();
    });

    _resetInactivityTimer();
  }

  Future<void> _fetchGlobalCustomers() async {
    try {
      final res = await http.get(Uri.parse('$apiBaseUrl/api/customers'));
      if (res.statusCode == 200) {
        setState(() => _allCustomers = json.decode(res.body));
      }
    } catch (e) {
      if (kDebugMode) print('Error fetching global customers: $e');
    }
  }

  void _resetInactivityTimer() {
    _inactivityTimer?.cancel();
    
    final autoLogout = _settings['tenant']?['auto_logout'] ?? 'Never';
    if (autoLogout == 'Never') return;

    int minutes = 0;
    if (autoLogout == '5 Minutes') { minutes = 5; }
    else if (autoLogout == '15 Minutes') { minutes = 15; }
    else if (autoLogout == '30 Minutes') { minutes = 30; }
    else if (autoLogout == '1 Hour') { minutes = 60; }

    if (minutes > 0) {
      _inactivityTimer = Timer(Duration(minutes: minutes), () {
        if (mounted && widget.onLogout != null) {
          widget.onLogout!(context);
        }
      });
    }
  }

  void _updateTime() {
    final now = DateTime.now();
    final hour = now.hour > 12
        ? now.hour - 12
        : (now.hour == 0 ? 12 : now.hour);
    final amPm = now.hour >= 12 ? 'PM' : 'AM';
    final minute = now.minute.toString().padLeft(2, '0');
    final month = now.month.toString().padLeft(2, '0');
    final day = now.day.toString().padLeft(2, '0');
    final year = now.year;
    if (mounted) {
      setState(() {
        _timeString = '$hour:$minute $amPm';
        _dateString = '$month/$day/$year';
      });
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _clockTimer?.cancel();
    _inactivityTimer?.cancel();
    _loadingLogoController.dispose();
    for (var controller in _settingControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  // Use 10.0.2.2 for Android Emulator, localhost for Windows/Web
  DateTime _dashboardDate = DateTime.now();

  Future<void> _fetchSummary({DateTime? date}) async {
    final targetDate = date ?? _dashboardDate;
    final dateStr = "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";
    
    try {
      final summaryRes = await http.get(Uri.parse('$apiBaseUrl/api/orders/summary?startDate=$dateStr')).timeout(const Duration(seconds: 10));
      final reportsRes = await http.get(Uri.parse('$apiBaseUrl/api/reports/financial?startDate=$dateStr&endDate=$dateStr')).timeout(const Duration(seconds: 10));
      final opRes = await http.get(Uri.parse('$apiBaseUrl/api/reports/operational?startDate=$dateStr')).timeout(const Duration(seconds: 10));
      
      if (summaryRes.statusCode == 200) {
        final data = json.decode(summaryRes.body);
        if (mounted && data is Map) {
          setState(() {
            _summaryData = Map<String, dynamic>.from(data);
          });
        }
      }

      if (reportsRes.statusCode == 200) {
        final data = json.decode(reportsRes.body);
        if (mounted && data is Map) {
          setState(() {
            _financialData = Map<String, dynamic>.from(data);
          });
        }
      }

      if (opRes.statusCode == 200) {
        final data = json.decode(opRes.body);
        if (mounted && data is Map) {
          setState(() {
            _operationalData = Map<String, dynamic>.from(data);
          });
        }
      }

      await _fetchHRStats();
      await _fetchInventory();
    } catch (e) {
      if (kDebugMode) debugPrint('Error summary: $e');
    }
  }

  Future<void> _showExpenseLoggingModal(BuildContext context) async {
    final GlobalKey<FormState> formKey = GlobalKey<FormState>();
    String selectedCategory = 'Supplies';
    double amount = 0.0;
    String notes = '';

    final List<String> categories = ['Supplies', 'Maintenance', 'Utilities', 'Operations', 'Miscellaneous'];

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(LocalizationService().translate('log_expense')),
        content: SizedBox(
          width: 400,
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: selectedCategory,
                  decoration: InputDecoration(
                    labelText: LocalizationService().translate('category'),
                    border: const OutlineInputBorder(),
                  ),
                  items: categories.map((cat) => DropdownMenuItem(value: cat, child: Text(cat))).toList(),
                  onChanged: (val) => selectedCategory = val!,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  decoration: InputDecoration(
                    labelText: LocalizationService().translate('amount'),
                    prefixText: '\$ ',
                    border: const OutlineInputBorder(),
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Required';
                    if (double.tryParse(val) == null) return 'Invalid number';
                    return null;
                  },
                  onSaved: (val) => amount = double.parse(val!),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  decoration: InputDecoration(
                    labelText: LocalizationService().translate('notes'),
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 2,
                  onSaved: (val) => notes = val ?? '',
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(LocalizationService().translate('cancel')),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState!.validate()) {
                formKey.currentState!.save();
                try {
                  final response = await http.post(
                    Uri.parse('$apiBaseUrl/api/expenses'),
                    headers: {'Content-Type': 'application/json'},
                    body: json.encode({
                      'category': selectedCategory,
                      'amount': amount,
                      'notes': notes,
                    }),
                  ).timeout(const Duration(seconds: 10));

                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);

                  if (response.statusCode == 201) {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('expense_logged'))));
                    _fetchSummary(); // Refresh dashboard data immediately
                  } else {
                    if (!mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to log expense.')));
                  }
                } catch (e) {
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Network error logging expense.')));
                }
              }
            },
            child: Text(LocalizationService().translate('submit')),
          ),
        ],
      ),
    );
  }

  Future<void> _fetchInventory() async {
    try {
      final response = await http.get(Uri.parse('$apiBaseUrl/api/inventory')).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final List items = json.decode(response.body);
        if (mounted) {
          setState(() {
            _lowStockItems = items.where((item) {
              double qty = double.tryParse(item['quantity']?.toString() ?? '0') ?? 0.0;
              double threshold = double.tryParse(item['low_stock_threshold']?.toString() ?? '10') ?? 10.0;
              return qty <= threshold;
            }).toList();
          });
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error inventory: $e');
    }
  }


  Future<void> _updateOrderStatus(dynamic orderId, String newStatus, {String? reason}) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl/api/orders/$orderId'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'status': newStatus,
          'rejection_reason': ?reason,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${LocalizationService().translate('order_marked_status')} $newStatus'),
              backgroundColor: themePrimary,
            ),
          );
          // Sync local selection if applicable
          if (_selectedOrderDetails != null && _selectedOrderDetails!['id'] == orderId) {
            setState(() => _selectedOrderDetails!['status'] = newStatus);
          }
        }
        await _fetchOrders(); // Refresh lists
        await _fetchSummary(); // Refresh dashboard stats
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${LocalizationService().translate('failed_update_status')}: ${response.statusCode}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Update Status Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connection Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _showRejectionDialog(dynamic orderId) async {
    String selectedReason = '';

    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final List<String> reasons = [
            'Too Busy',
            'Out Stock',
            'Shift Time Ends'
          ];

          return AlertDialog(
            backgroundColor: themeCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.red),
                const SizedBox(width: 12),
                Text(
                  LocalizationService().translate('reject_order'),
                  style: TextStyle(color: themeText, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${LocalizationService().translate('provide_rejection_reason')} #$orderId:',
                  style: TextStyle(color: themeHint, fontSize: 13),
                ),
                const SizedBox(height: 20),
                Column(
                  children: reasons.map((reason) {
                    final bool isSelected = selectedReason == reason;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: SizedBox(
                        width: double.infinity,
                        child: InkWell(
                          onTap: () => setDialogState(() => selectedReason = reason),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.red.withValues(alpha: 0.08) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected ? Colors.red : themeBorder,
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isSelected ? Icons.check_circle : Icons.radio_button_off,
                                  color: isSelected ? Colors.red : themeHint,
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  reason,
                                  style: TextStyle(
                                    color: isSelected ? Colors.red : themeText,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(LocalizationService().translate('cancel'), style: TextStyle(color: themeHint)),
              ),
              ElevatedButton(
                onPressed: selectedReason.isEmpty ? null : () {
                  Navigator.pop(context);
                  _updateOrderStatus(orderId, 'Rejected', reason: selectedReason);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  disabledBackgroundColor: Colors.red.withValues(alpha: 0.1),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(
                  LocalizationService().translate('confirm_rejection'), 
                  style: TextStyle(
                    color: selectedReason.isEmpty ? themeHint : Colors.white, 
                    fontWeight: FontWeight.bold
                  )
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _removeOrderItem(dynamic orderId, dynamic itemId) async {
    try {
      final response = await http.delete(
        Uri.parse('$apiBaseUrl/api/orders/$orderId/items/$itemId'),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(LocalizationService().translate('item_removed_order')),
              backgroundColor: Colors.green,
            ),
          );
          // Sync local selection if applicable
          if (_selectedOrderDetails != null && _selectedOrderDetails!['id'] == orderId) {
             _selectedOrderDetails!['items'].removeWhere((item) => item['id'] == itemId);
             if (_selectedOrderDetails!['items'].isEmpty) {
                _selectedOrderDetails!['status'] = 'Cancelled';
             } else {
                // Re-calculate local total approximation
                double newTotal = 0;
                for(var i in _selectedOrderDetails!['items']) {
                   newTotal += double.tryParse(i['subtotal'].toString()) ?? 0.0;
                }
                _selectedOrderDetails!['total_amount'] = newTotal.toStringAsFixed(2);
             }
             setState(() {});
          }
        }
        await _fetchOrders(); // Refresh lists
        await _fetchSummary(); // Refresh dashboard stats
      }
    } catch (e) {
      debugPrint('Remove Item Error: $e');
    }
  }

  Future<String?> _pickImage() async {
    try {
      final completer = Completer<String?>();

      final uploadInput = html.FileUploadInputElement()
        ..accept = 'image/*'
        ..style.display = 'none';

      // Must be appended to the DOM or some browsers won't fire onChange
      html.document.body!.append(uploadInput);

      bool isFileSelected = false;
      StreamSubscription<html.Event>? focusSubscription;

      uploadInput.onChange.listen((event) async {
        isFileSelected = true;
        focusSubscription?.cancel();

        final files = uploadInput.files;
        if (files == null || files.isEmpty) {
          uploadInput.remove();
          if (!completer.isCompleted) completer.complete(null);
          return;
        }

        final file = files[0];
        final reader = html.FileReader();
        reader.readAsArrayBuffer(file);

        reader.onLoadEnd.listen((_) async {
          final bytes = reader.result as List<int>;
          final fileName = file.name;
          final ext = fileName.contains('.')
              ? fileName.split('.').last.toLowerCase()
              : 'jpg';

          uploadInput.remove();

          var request = http.MultipartRequest(
            'POST',
            Uri.parse('$apiBaseUrl/api/upload'),
          );
          request.files.add(http.MultipartFile.fromBytes(
            'image',
            bytes,
            filename: fileName,
            contentType: MediaType('image', ext),
          ));

          try {
            final response = await request.send();
            final responseData = await http.Response.fromStream(response);
            if (response.statusCode == 200) {
              final data = json.decode(responseData.body);
              if (!completer.isCompleted) {
                completer.complete(data['path'] as String?);
              }
            } else {
              debugPrint('Upload failed: ${response.statusCode} ${responseData.body}');
              if (!completer.isCompleted) completer.complete(null);
            }
          } catch (e) {
            debugPrint('Upload Error: $e');
            if (!completer.isCompleted) completer.complete(null);
          }
        });
      });

      // If user cancels (closes dialog without picking), resolve after a focus event
      focusSubscription = html.window.onFocus.listen((event) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (!isFileSelected && !completer.isCompleted) {
            uploadInput.remove();
            completer.complete(null);
          }
          focusSubscription?.cancel();
        });
      });

      uploadInput.click();

      return completer.future;
    } catch (e) {
      debugPrint('Pick Error: \$e');
      return null;
    }
  }

  Future<void> _createCategory(String name, String description, String image) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/menu/categories'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'name': name, 'description': description, 'image': image}),
      );
      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(LocalizationService().translate('category_created_success')), backgroundColor: Colors.green),
          );
        }
        await _fetchMenu();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${LocalizationService().translate('category_failed_create')}: ${response.body}'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateCategory(dynamic id, String name, String description, String image) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl/api/menu/categories/$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'name': name, 'description': description, 'image': image}),
      );
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(LocalizationService().translate('category_updated_success')), backgroundColor: Colors.green),
          );
        }
        await _fetchMenu();
      }
    } catch (e) {
      debugPrint('Update Category Error: $e');
    }
  }

  Future<void> _deleteCategory(dynamic id) async {
    try {
      final response = await http.delete(Uri.parse('$apiBaseUrl/api/menu/categories/$id'));
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(LocalizationService().translate('category_deleted_success')), backgroundColor: Colors.orange),
          );
        }
        await _fetchMenu();
      }
    } catch (e) {
      debugPrint('Delete Category Error: $e');
    }
  }

  Future<void> _createMenuItem(Map<String, dynamic> itemData) async {
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/menu/items'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(itemData),
      );
      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(LocalizationService().translate('menu_item_created_success')), backgroundColor: Colors.green),
          );
        }
        await _fetchMenu();
      }
    } catch (e) {
       debugPrint('Create Item Error: $e');
    }
  }

  Future<void> _updateMenuItem(dynamic id, Map<String, dynamic> itemData) async {
    try {
      final response = await http.patch(
        Uri.parse('$apiBaseUrl/api/menu/items/$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(itemData),
      );
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(LocalizationService().translate('menu_item_updated_success')), backgroundColor: Colors.green),
          );
        }
        await _fetchMenu();
      }
    } catch (e) {
      debugPrint('Update Item Error: $e');
    }
  }

  Future<void> _deleteMenuItem(dynamic id) async {
    debugPrint('Attempting to delete menu item with ID: $id');
    try {
      final response = await http.delete(Uri.parse('$apiBaseUrl/api/menu/items/$id'));
      debugPrint('Delete response status: ${response.statusCode}');
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(LocalizationService().translate('menu_item_deleted_success')), backgroundColor: Colors.orange),
          );
        }
        await _fetchMenu();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${LocalizationService().translate('failed_update_status')}: ${response.statusCode}'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      debugPrint('Delete Item Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }


  Future<void> _fetchReservations({DateTime? date}) async {
    final targetDate = date ?? _dashboardDate;
    final dateStr = "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/reservations?startDate=$dateStr&endDate=$dateStr'),
      );
      if (response.statusCode == 200) {
        if (mounted) {
          setState(() => _reservations = json.decode(response.body));
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error reservations: $e');
      if (mounted) setState(() => _reservations = []);
    }
  }

  Future<void> _fetchOrders({DateTime? date}) async {
    final targetDate = date ?? _dashboardDate;
    final dateStr = "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";
    try {
      final response = await http.get(Uri.parse('$apiBaseUrl/api/orders?startDate=$dateStr&endDate=$dateStr&kds=true'))
          .timeout(const Duration(seconds: 10));
          
      if (response.statusCode == 200) {
        if (mounted) {
          setState(() {
            _placedOrders = json.decode(response.body);
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error fetching orders: $e');
    }
  }

  Future<void> _fetchMenu() async {
    try {
      final response = await http.get(
        Uri.parse('$apiBaseUrl/api/menu'),
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        final List<dynamic> categories = json.decode(response.body);
        final List<dynamic> flatMenu = [];
        for (var cat in categories) {
          if (cat['items'] != null) {
            for (var item in cat['items']) {
              flatMenu.add({
                'id': item['id'],
                'category_id': item['category_id'],
                'name': item['name'],
                'price': double.tryParse(item['price'].toString()) ?? 0.0,
                'category': cat['name'],
                'description': item['description'],
                'image': item['image'],
                'is_available': item['is_available'],
                'variants': item['variants'],
                'extras': item['extras'],
                'ingredients': item['ingredients'],
              });
            }
          }
        }
        if (mounted) {
          setState(() {
            _menuItems = flatMenu.isEmpty ? _getSampleMenu() : flatMenu;
            _categories = categories;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _menuItems = _getSampleMenu();
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error fetching menu: $e');
      if (mounted) {
        setState(() {
          _menuItems = _getSampleMenu();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  List<dynamic> _getSampleMenu() {
    return [
      {'id': 's1', 'name': 'Supreme Zamzam Pizza', 'price': 18.50, 'category': 'PIZZA', 'description': 'Double pepperoni, olives, bell peppers and special sauce', 'image': null},
      {'id': 's2', 'name': 'Classic Margherita', 'price': 14.00, 'category': 'PIZZA', 'description': 'Fresh mozzarella and basil', 'image': null},
      {'id': 's3', 'name': 'Double Smash Burger', 'price': 12.50, 'category': 'BURGERS', 'description': 'Two wagyu patties with caramelized onions', 'image': null},
      {'id': 's4', 'name': 'Truffle Fries', 'price': 6.50, 'category': 'APPETIZERS', 'description': 'Thick cut fries with parmesan and truffle oil', 'image': null},
      {'id': 's5', 'name': 'Signature Lamb Platter', 'price': 24.99, 'category': 'PLATTERS', 'description': 'Slow-roasted lamb with saffron rice', 'image': null},
      {'id': 's6', 'name': 'Mango Smoothie', 'price': 5.50, 'category': 'BEVERAGES', 'description': 'Fresh alphonso mangoes', 'image': null},
    ];
  }

  // --- USER MANAGEMENT API ---
  Future<void> _fetchUsers() async {
    setState(() => _isUsersLoading = true);
    try {
      final resp = await http.get(Uri.parse('$apiBaseUrl/api/users'));
      if (resp.statusCode == 200) {
        setState(() => _users = json.decode(resp.body));
      }
    } catch (e) {
      debugPrint('Error users: $e');
    } finally {
      setState(() => _isUsersLoading = false);
    }
  }

  Future<void> _fetchRoles() async {
    setState(() => _isRolesLoading = true);
    try {
      final resp = await http.get(Uri.parse('$apiBaseUrl/api/roles'));
      if (resp.statusCode == 200) {
        setState(() => _roles = json.decode(resp.body));
      }
    } catch (e) {
      debugPrint('Error roles: $e');
    } finally {
      setState(() => _isRolesLoading = false);
    }
  }

  Future<void> _createRole(Map<String, dynamic> roleData) async {
    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/roles'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(roleData),
      );
      if (resp.statusCode == 200) {
        _fetchRoles();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Role created successfully'), backgroundColor: Colors.green));
      }
    } catch (e) {
      debugPrint('Error creating role: $e');
    }
  }

  Future<void> _updateRole(dynamic id, Map<String, dynamic> roleData) async {
    try {
      final resp = await http.put(
        Uri.parse('$apiBaseUrl/api/roles/$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(roleData),
      );
      if (resp.statusCode == 200) {
        _fetchRoles();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Role updated successfully'), backgroundColor: Colors.green));
      }
    } catch (e) {
      debugPrint('Error updating role: $e');
    }
  }

  Future<void> _deleteRole(dynamic id) async {
    try {
      final resp = await http.delete(Uri.parse('$apiBaseUrl/api/roles/$id'));
      if (resp.statusCode == 200) {
        _fetchRoles();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Role deleted successfully'), backgroundColor: Colors.orange));
      }
    } catch (e) {
      debugPrint('Error deleting role: $e');
    }
  }

  Future<void> _fetchPermissions() async {
    try {
      final resp = await http.get(Uri.parse('$apiBaseUrl/api/permissions'));
      if (resp.statusCode == 200) {
        setState(() => _permissions = json.decode(resp.body));
      }
    } catch (e) {
      debugPrint('Error permissions: $e');
    }
  }

  Future<void> _fetchShifts() async {
    setState(() => _isHRLoading = true);
    try {
      final resp = await http.get(Uri.parse('$apiBaseUrl/api/hr/shifts'));
      if (resp.statusCode == 200) {
        setState(() => _shifts = json.decode(resp.body));
      }
    } catch (e) {
      debugPrint('Error shifts: $e');
    } finally {
      setState(() => _isHRLoading = false);
    }
  }

  Future<void> _fetchHRStats() async {
    try {
      final resp = await http.get(Uri.parse('$apiBaseUrl/api/hr/stats'))
          .timeout(const Duration(seconds: 10));
          
      if (resp.statusCode == 200) {
        final data = json.decode(resp.body);
        if (mounted) {
          setState(() {
            if (data is Map) {
              _hrStats = Map<String, dynamic>.from(data);
            } else if (data is List) {
              double hours = 0;
              double pay = 0;
              for (var row in data) {
                hours += double.tryParse(row['total_hours']?.toString() ?? '0') ?? 0;
                pay += double.tryParse(row['estimated_pay']?.toString() ?? '0') ?? 0;
              }
              _hrStats = {
                'total_hours': hours,
                'estimated_pay': pay,
                'staff': data
              };
            }
          });
        }
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Error hr stats: $e');
    }
  }


  Future<void> _fetchSettings() async {
    setState(() => _isSettingsLoading = true);
    try {
      final url = '$apiBaseUrl/api/settings';
      debugPrint('Fetching settings from: $url');
      final resp = await http.get(Uri.parse(url))
          .timeout(const Duration(seconds: 10));
      
      debugPrint('Settings status: ${resp.statusCode}');
      debugPrint('Settings body: ${resp.body}');

      if (resp.statusCode == 200) {
        final decoded = json.decode(resp.body);
        if (mounted && decoded is Map) {
          setState(() {
            _settings = _deepCastMap(decoded);
            
            // Sync ThemeService with backend setting
            if (_settings['tenant'] != null && _settings['tenant']['theme_mode'] != null) {
              final mode = _settings['tenant']['theme_mode'];
              debugPrint('POSMissionControl: Backend returned theme mode $mode');
              ThemeService().setFlavorFromString(mode);
            }

            // Sync SoundService
            if (_settings['tenant'] != null) {
              SoundService().initialize(_settings['tenant']);
            }

            // Sync LocalizationService
            if (_settings['tenant'] != null && _settings['tenant']['language'] != null) {
              LocalizationService().setLanguage(_settings['tenant']['language']);
            }
            // Sync Payment Policy
            if (_settings['branch'] != null && _settings['branch']['payment_policy'] != null) {
              _paymentPolicy = _settings['branch']['payment_policy'];
            }
            _resetInactivityTimer();
          });
        }
      }
    } catch (e) {
      debugPrint('Error settings exception: $e');
    } finally {
      if (mounted) setState(() => _isSettingsLoading = false);
    }
  }

  Future<void> _updateSetting(String type, Map<String, dynamic> data) async {
    // Optimistic Update
    if (mounted) {
      setState(() {
        final Map<String, dynamic> currentType = Map<String, dynamic>.from(_settings[type] ?? {});
        currentType.addAll(data);
        _settings[type] = currentType;
      });
    }

    try {
      final resp = await http.patch(
        Uri.parse('$apiBaseUrl/api/settings/$type'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(data),
      );
      if (resp.statusCode == 200) {
        _fetchSettings();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(LocalizationService().translate('setting_updated_success')),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 1),
            ),
          );
        }
      } else {
        debugPrint('Setting update failed: ${resp.body}');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to save: ${resp.statusCode}. Please restart the backend.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        _fetchSettings(); // Rollback
      }
    } catch (e) {
      debugPrint('Error updating setting: $e');
      _fetchSettings(); // Rollback
    }
  }

  Future<void> _resetTransactionalData() async {
    setState(() => _isSettingsLoading = true);
    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/settings/reset-transactions'),
        headers: {'Content-Type': 'application/json'},
      );
      if (resp.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(LocalizationService().translate('transactional_reset_success')),
              backgroundColor: Colors.green,
            ),
          );
        }
        // Refresh everything to reflect empty states
        _fetchSummary();
        _fetchOrders();
        _fetchReservations();
      } else {
        throw Exception('Failed to reset: ${resp.body}');
      }
    } catch (e) {
      debugPrint('Error resetting data: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to reset data: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSettingsLoading = false);
    }
  }

  Future<void> _createUser(Map<String, dynamic> userData) async {
    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/users'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(userData),
      );
      if (resp.statusCode == 201) {
        _fetchUsers();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('user_created_success')), backgroundColor: Colors.green));
      }
    } catch (e) {
      debugPrint('Create User Error: $e');
    }
  }

  Future<void> _updateUser(dynamic id, Map<String, dynamic> userData) async {
    try {
      final resp = await http.put(
        Uri.parse('$apiBaseUrl/api/users/$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(userData),
      );
      if (resp.statusCode == 200) {
        _fetchUsers();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('user_updated_success')), backgroundColor: Colors.green));
      }
    } catch (e) {
      debugPrint('Update User Error: $e');
    }
  }

  Future<void> _deleteUser(dynamic id) async {
    try {
      final resp = await http.delete(Uri.parse('$apiBaseUrl/api/users/$id'));
      if (resp.statusCode == 200) {
        _fetchUsers();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('user_deleted_success')), backgroundColor: Colors.orange));
      }
    } catch (e) {
      debugPrint('Delete User Error: $e');
    }
  }

  Future<void> _updateRolePermissions(dynamic roleId, List<int> permissionIds) async {
    try {
      final resp = await http.put(
        Uri.parse('$apiBaseUrl/api/roles/$roleId/permissions'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'permission_ids': permissionIds}),
      );
      if (resp.statusCode == 200) {
        _fetchRoles();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('permissions_updated')), backgroundColor: Colors.green));
      }
    } catch (e) {
      debugPrint('Update Role Permissions Error: $e');
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

  void _finalizeAddToCart(dynamic item, dynamic variant, List<dynamic> extras) {
    setState(() {
      final index = _cartItems.indexWhere((i) {
        if (i['id'] != item['id']) return false;
        final vId = i['variant']?['id'];
        final currentVId = variant?['id'];
        if (vId != currentVId) return false;

        final eIds = (i['extras'] as List<dynamic>? ?? []).map((e) => e['id']).toSet();
        final currentEIds = extras.map((e) => e['id']).toSet();
        if (eIds.length != currentEIds.length || !eIds.containsAll(currentEIds)) return false;

        return true;
      });

      if (index >= 0) {
        _cartItems[index]['quantity'] = (_cartItems[index]['quantity'] ?? 1) + 1;
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

  void _showCustomizationDialog(dynamic item, List<dynamic> variants, List<dynamic> extras) {
    dynamic selectedVariant = variants.isNotEmpty ? variants.first : null;
    final List<dynamic> selectedExtras = [];

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final themeCard = this.themeCard;
            final themeText = this.themeText;

            return AlertDialog(
              backgroundColor: themeCard,
              title: Text('${LocalizationService().translate('customize_item')}: ${item['name']}', style: TextStyle(color: themeText)),
              content: SizedBox(
                width: 400,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (variants.isNotEmpty) ...[
                        Text(LocalizationService().translate('variant'), style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 8),
                        ...variants.map((v) {
                          return RadioListTile<dynamic>(
                            title: Text('${v['name']} (+\$${v['price_adjustment']})', style: TextStyle(color: themeText)),
                            value: v,
                            groupValue: selectedVariant,
                            activeColor: themePrimary,
                            onChanged: (val) => setDialogState(() => selectedVariant = val),
                          );
                        }),
                        const Divider(),
                      ],
                      if (extras.isNotEmpty) ...[
                        Text(LocalizationService().translate('extras_label'), style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 8),
                        ...extras.map((e) {
                          final isSelected = selectedExtras.contains(e);
                          return CheckboxListTile(
                            title: Text('${e['name']} (+\$${e['price_adjustment']})', style: TextStyle(color: themeText)),
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
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text(LocalizationService().translate('cancel'), style: const TextStyle(color: Colors.red)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
                  onPressed: () {
                    Navigator.pop(ctx);
                    _finalizeAddToCart(item, selectedVariant, selectedExtras);
                  },
                  child: Text(LocalizationService().translate('add_to_cart'), style: const TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _removeFromCart(int index) {
    setState(() {
      if (_cartItems[index]['quantity'] > 1) {
        _cartItems[index]['quantity']--;
      } else {
        _cartItems.removeAt(index);
      }
    });
  }

  void _clearCart() => setState(() {
    _cartItems = [];
    _discount = 0.0;
    _tip = 0.0;
    _reservationFee = 0.0;
    _selectedTable = null; // Reset table selection
    _editingOrderId = null; // Reset editing state
    _selectedCustomer = null;
    _isNewGuestMode = false;
    _customerFirstNameController.clear();
    _customerPhoneController.clear();
    _customerEmailController.clear();
  });

  double get _subtotal => _cartItems.fold(
    0,
    (sum, item) {
      double basePrice = double.tryParse(item['price'].toString()) ?? 0;
      if (item['variant'] != null) {
        basePrice += double.tryParse(item['variant']['price_adjustment'].toString()) ?? 0;
      }
      if (item['extras'] != null) {
        for (var e in item['extras']) {
          basePrice += double.tryParse(e['price_adjustment'].toString()) ?? 0;
        }
      }
      return sum + (basePrice * (item['quantity'] ?? 1));
    },
  );
  bool get _isTaxEnabled {
    final branch = _settings['branch'] ?? {};
    return branch['is_tax_enabled'] == true || branch['is_tax_enabled'] == 1;
  }
  double get _taxRate {
    final branch = _settings['branch'] ?? {};
    return double.tryParse(branch['tax_rate']?.toString() ?? '0') ?? 0.0;
  }
  double get _tax => _isTaxEnabled ? (_subtotal - _discount) * (_taxRate / 100) : 0.0;
  double get _total => (_subtotal - _discount) + _tax + _tip - _reservationFee;
  double get _payableAmount => _total * _splitMultiplier;

  void _showWarningDialog(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 24),
            ),
            const SizedBox(width: 12),
            Text(
              LocalizationService().translate('attention'),
              style: TextStyle(color: themeText, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          message,
          style: TextStyle(color: themeText, fontSize: 15, height: 1.5),
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              style: ElevatedButton.styleFrom(
                backgroundColor: themePrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: Text(
                LocalizationService().translate('ok').toUpperCase(),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _placeOrder() async {

    if (_cartItems.isEmpty) return;

    setState(() => _isLoading = true);
    try {
      // Sanitize items for the backend
      final sanitizedItems = _cartItems.map((item) {
        final id = item['id'].toString();
        final qty = item['quantity'] ?? 1;
        
        double basePrice = double.tryParse(item['price'].toString()) ?? 0.0;
        if (item['variant'] != null) {
          basePrice += double.tryParse(item['variant']['price_adjustment'].toString()) ?? 0.0;
        }
        if (item['extras'] != null) {
          for (var e in item['extras']) {
            basePrice += double.tryParse(e['price_adjustment'].toString()) ?? 0.0;
          }
        }
        
        return {
          ...item,
          'id': id.startsWith('s') ? null : id, // Convert demo IDs to null for DB
          'subtotal': basePrice * qty,
          'variant': item['variant'],
          'extras': item['extras'],
        };
      }).toList();

      final body = {
        'items': sanitizedItems,
        'total': _total,
        'payment_amount': _payableAmount,
        'order_type': _orderType,
        'table_id': _selectedTable != null ? int.tryParse(_selectedTable!.id) : null,
        'status': _editingOrderId != null ? null : (_paymentPolicy == 'Pay First' ? (_isSplitActive ? 'Partially Paid' : 'Paid') : 'Ordered'),
        'payment_method': _paymentPolicy == 'Pay First' ? _paymentMethod : null,
        'tip_amount': _tip,
        'discount_amount': _discount,
        'user_id': _selectedWaiter?['id'],
        'customer_id': _selectedCustomer?['id'],
        'customer_details': _isNewGuestMode ? {
          'first_name': _customerFirstNameController.text,
          'phone': _customerPhoneController.text,
          'email': _customerEmailController.text,
        } : null,
        'origin': 'In-Store',
      };

      final response = _editingOrderId != null
        ? await http.put(
            Uri.parse('$apiBaseUrl/api/orders/$_editingOrderId'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode(body),
          )
        : await http.post(
            Uri.parse('$apiBaseUrl/api/orders'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode(body),
          );

      if (response.statusCode == 201 || response.statusCode == 200) {
        _clearCart();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_editingOrderId != null ? LocalizationService().translate('order_updated_success') : LocalizationService().translate('order_placed_success')),
              backgroundColor: Colors.green,
            ),
          );
        }
        // Force refresh matching the KDS list
        // Wait a moment for the DB to stabilize before fetching
        Future.delayed(const Duration(milliseconds: 500), () {
          _fetchOrders();
          _fetchSummary();
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${LocalizationService().translate('server_error_retry')} (${response.statusCode})'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Place Order Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connection Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _processCheckout(dynamic orderId, double totalAmount, String paymentMethod, double tipAmount) async {
    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/orders/$orderId/checkout'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'payment_method': paymentMethod,
          'amount': totalAmount,
          'tip_amount': tipAmount,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(LocalizationService().translate('payment_success_message')),
              backgroundColor: Colors.green,
            ),
          );
        }
        _fetchOrders();
        _fetchSummary();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Payment Failed: ${response.body}'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Checkout Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connection Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showExistingOrderCheckoutDialog(Map<String, dynamic> order) {
    final double total = double.tryParse(order['total_amount'].toString()) ?? 0.0;
    String localPaymentMethod = 'Cash';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: themeCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            title: Row(
              children: [
                Icon(Icons.payment_rounded, color: themePrimary, size: 28),
                const SizedBox(width: 12),
                Text(
                  LocalizationService().translate('order_payment'),
                  style: TextStyle(color: themeText, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close, color: themeHint),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: themePrimary.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      Text(LocalizationService().translate('amount_due'), style: TextStyle(color: themeHint, fontSize: 14)),
                      Text('\$${total.toStringAsFixed(2)}', style: TextStyle(color: themePrimary, fontSize: 32, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    _buildPaymentOptionSmall('Cash', Icons.money_rounded, localPaymentMethod == 'Cash', () => setDialogState(() => localPaymentMethod = 'Cash')),
                    const SizedBox(width: 12),
                    _buildPaymentOptionSmall('Card', Icons.credit_card_rounded, localPaymentMethod == 'Card', () => setDialogState(() => localPaymentMethod = 'Card')),
                  ],
                ),
              ],
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _processCheckout(order['id'], total, localPaymentMethod, 0.0);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: themePrimary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(LocalizationService().translate('confirm_payment'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          );
        }
      ),
    );
  }

  Widget _buildPaymentOptionSmall(String label, IconData icon, bool isSelected, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? themePrimary : themeBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? themePrimary : themeBorder, width: 2),
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : themeHint, size: 24),
              const SizedBox(height: 4),
              Text(label, style: TextStyle(color: isSelected ? Colors.white : themeText, fontSize: 14, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
            ],
          ),
        ),
      ),
    );
  }

  void _showCheckoutDialog() {
    if (!_isSplitActive) {
      _splitMultiplier = 1.0;
    }
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return AlertDialog(
            backgroundColor: themeCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            titlePadding: const EdgeInsets.all(24),
            contentPadding: const EdgeInsets.symmetric(horizontal: 24),
            title: Row(
              children: [
                Icon(Icons.payments_outlined, color: themePrimary, size: 28),
                const SizedBox(width: 12),
                Text(
                  LocalizationService().translate('checkout_payment'),
                  style: TextStyle(color: themeText, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: Icon(Icons.close, color: themeHint),
                ),
              ],
            ),
            content: SizedBox(
              width: 450,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: themePrimary.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: themePrimary.withValues(alpha: 0.1)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(LocalizationService().translate('subtotal'), style: TextStyle(color: themeHint, fontSize: 16)),
                            Text('\$${(_total + _discount).toStringAsFixed(2)}', style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        if (_discount > 0) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(LocalizationService().translate('discount'), style: const TextStyle(color: Colors.red, fontSize: 16)),
                              Text('-\$${_discount.toStringAsFixed(2)}', style: const TextStyle(color: Colors.red, fontSize: 16, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                        const Divider(height: 32),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _isSplitActive 
                                ? '${LocalizationService().translate('split_amount')} (${(_splitMultiplier * 100).toInt()}%)' 
                                : LocalizationService().translate('total_payable'), 
                              style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold)
                            ),
                            Text('\$${_payableAmount.toStringAsFixed(2)}', style: TextStyle(color: themePrimary, fontSize: 24, fontWeight: FontWeight.w900)),
                          ],
                        ),
                        if (_isSplitActive) ...[
                          const SizedBox(height: 4),
                          Text(
                            '${LocalizationService().translate('total_order_was')}: \$${_total.toStringAsFixed(2)}',
                            style: TextStyle(color: themeHint, fontSize: 12, fontStyle: FontStyle.italic),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      LocalizationService().translate('select_payment_method'),
                      style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildPaymentMethodOption('Cash', Icons.money_rounded, setDialogState),
                      const SizedBox(width: 12),
                      _buildPaymentMethodOption('Card', Icons.credit_card_rounded, setDialogState),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(bottom: 16, right: 8),
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _placeOrder();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: themePrimary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: Text(
                    LocalizationService().translate('complete_payment'),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPaymentMethodOption(String method, IconData icon, StateSetter setDialogState) {
    final isSelected = _paymentMethod == method;
    return Expanded(
      child: InkWell(
        onTap: () {
          setDialogState(() => _paymentMethod = method);
          setState(() {}); // Sync with main state if needed
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: isSelected ? themePrimary : themeBg,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isSelected ? themePrimary : themeBorder, width: 2),
            boxShadow: isSelected ? [BoxShadow(color: themePrimary.withValues(alpha: 0.2), blurRadius: 8, offset: const Offset(0, 4))] : null,
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : themeHint, size: 32),
              const SizedBox(height: 8),
              Text(
                method,
                style: TextStyle(
                  color: isSelected ? Colors.white : themeText,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showNewReservationDialog() {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final emailController = TextEditingController();
    final notesController = TextEditingController();
    final guestsController = TextEditingController(text: '2');
    DateTime selectedDate = DateTime.now();
    TimeOfDay selectedTime = TimeOfDay(hour: DateTime.now().hour + 1, minute: 0);
    int currentStep = 1;
    List<dynamic> availableTables = [];
    dynamic selectedTable;
    bool loadingTables = false;
    String feePaymentMethod = 'Cash'; // Default payment method for booking fee
    final cardNumberController = TextEditingController();
    final cardExpiryController = TextEditingController();
    final cardCvcController = TextEditingController();

    // Get booking fee from settings
    final branch = _settings['branch'] ?? {};
    final bool feeEnabled = (branch['is_booking_fee_enabled'] ?? 1) == 1;
    final double feeAmount = double.tryParse(branch['booking_fee_amount']?.toString() ?? '10.00') ?? 10.00;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          contentPadding: EdgeInsets.zero,
          content: SizedBox(
            width: 500,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: themePrimary.withValues(alpha: 0.05),
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: themePrimary,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: themePrimary.withValues(alpha: 0.3), blurRadius: 8)],
                        ),
                        child: Icon(
                          currentStep == 1 ? Icons.schedule : (currentStep == 2 ? Icons.table_bar : (currentStep == 3 ? Icons.person : Icons.receipt_long)),
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              currentStep == 1 ? LocalizationService().translate('select_slot') : (currentStep == 2 ? LocalizationService().translate('choose_table') : (currentStep == 3 ? LocalizationService().translate('guest_details') : LocalizationService().translate('review_confirm'))),
                              style: TextStyle(color: themeText, fontSize: 22, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${LocalizationService().translate('step_label')} $currentStep ${LocalizationService().translate('of_label')} 4',
                              style: TextStyle(color: themeHint, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close, color: themeHint),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),

                // Content
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        if (currentStep == 1) ...[
                          // Step 1: Slot Selection
                          _buildReservationStepTitle(LocalizationService().translate('visit_time_prompt')),
                          const SizedBox(height: 16),
                          _buildReservationDatePicker(selectedDate, (date) => setDialogState(() => selectedDate = date)),
                          const SizedBox(height: 16),
                          _buildReservationTimePicker(selectedTime, (time) => setDialogState(() => selectedTime = time)),
                          const SizedBox(height: 16),
                          _buildReservationGuestInput(guestsController),
                        ] else if (currentStep == 2) ...[
                          // Step 2: Table Selection
                          _buildReservationStepTitle(LocalizationService().translate('select_available_table')),
                          const SizedBox(height: 16),
                          if (loadingTables)
                            Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: themePrimary)))
                          else if (availableTables.isEmpty)
                            _buildNoTablesAvailable()
                          else
                            _buildTableGrid(availableTables, selectedTable, (t) => setDialogState(() => selectedTable = t)),
                        ] else if (currentStep == 3) ...[
                          // Step 3: Guest Details
                          _buildReservationStepTitle(LocalizationService().translate('guest_prompt')),
                          const SizedBox(height: 16),
                          _buildReservationInput(nameController, LocalizationService().translate('full_name'), Icons.person_outline),
                          const SizedBox(height: 12),
                          _buildReservationInput(phoneController, LocalizationService().translate('whatsapp_phone'), Icons.phone_android, color: Colors.green),
                          const SizedBox(height: 12),
                          _buildReservationInput(emailController, LocalizationService().translate('email_address'), Icons.email_outlined, color: themePrimary),
                          const SizedBox(height: 12),
                          _buildReservationInput(notesController, LocalizationService().translate('special_requests'), Icons.notes, maxLines: 2),
                        ] else if (currentStep == 4) ...[
                          // Step 4: Summary & Payment
                          _buildReservationStepTitle(LocalizationService().translate('reservation_summary')),
                          const SizedBox(height: 16),
                          _buildReservationSummaryCard(selectedDate, selectedTime, guestsController.text, selectedTable),
                          const SizedBox(height: 16),
                          if (feeEnabled)
                            _buildBookingFeeCard(
                              feeAmount, 
                              feePaymentMethod, 
                              (method) => setDialogState(() => feePaymentMethod = method),
                            ),
                          // Card fields — visible only when Card is selected
                          if (feeEnabled && feePaymentMethod == 'Card') ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: themePrimary.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: themePrimary.withValues(alpha: 0.2)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.lock_outline, size: 14, color: themePrimary),
                                      const SizedBox(width: 6),
                                      Text(LocalizationService().translate('card_details'), style: TextStyle(color: themePrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                                      const Spacer(),
                                      Text(LocalizationService().translate('powered_by_stripe'), style: TextStyle(color: themeHint, fontSize: 10)),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  TextField(
                                    controller: cardNumberController,
                                    style: TextStyle(color: themeText, fontSize: 14),
                                    keyboardType: TextInputType.number,
                                    maxLength: 19,
                                    decoration: InputDecoration(
                                      counterText: '',
                                      labelText: LocalizationService().translate('card_number'),
                                      labelStyle: TextStyle(color: themeHint, fontSize: 12),
                                      hintText: '0000  0000  0000  0000',
                                      hintStyle: TextStyle(color: themeHint, fontSize: 13),
                                      prefixIcon: Icon(Icons.credit_card, color: themePrimary, size: 18),
                                      filled: true,
                                      fillColor: themeBg,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: TextField(
                                          controller: cardExpiryController,
                                          style: TextStyle(color: themeText, fontSize: 14),
                                          keyboardType: TextInputType.number,
                                          maxLength: 5,
                                          decoration: InputDecoration(
                                            counterText: '',
                                            labelText: LocalizationService().translate('expiry_date'),
                                            labelStyle: TextStyle(color: themeHint, fontSize: 12),
                                            hintText: 'MM / YY',
                                            hintStyle: TextStyle(color: themeHint, fontSize: 13),
                                            prefixIcon: Icon(Icons.calendar_today, color: themePrimary, size: 16),
                                            filled: true,
                                            fillColor: themeBg,
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: TextField(
                                          controller: cardCvcController,
                                          style: TextStyle(color: themeText, fontSize: 14),
                                          keyboardType: TextInputType.number,
                                          maxLength: 4,
                                          obscureText: true,
                                          decoration: InputDecoration(
                                            counterText: '',
                                            labelText: LocalizationService().translate('cvc'),
                                            labelStyle: TextStyle(color: themeHint, fontSize: 12),
                                            hintText: '•••',
                                            hintStyle: TextStyle(color: themeHint, fontSize: 13),
                                            prefixIcon: Icon(Icons.shield_outlined, color: themePrimary, size: 16),
                                            filled: true,
                                            fillColor: themeBg,
                                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ],
                    ),
                  ),
                ),

                // Footer
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: themeBorder)),
                  ),
                  child: Row(
                    children: [
                      if (currentStep > 1)
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: BorderSide(color: themeBorder),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () => setDialogState(() => currentStep--),
                            child: Text(LocalizationService().translate('back_btn'), style: TextStyle(color: themeText, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      if (currentStep > 1) const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: themePrimary,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          onPressed: () async {
                            if (currentStep == 1) {
                              setDialogState(() {
                                loadingTables = true;
                                currentStep = 2;
                              });
                              try {
                                final dateStr = '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
                                final timeStr = '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}:00';
                                final resp = await http.get(Uri.parse('$apiBaseUrl/api/reservations/available-tables?date=$dateStr&time=$timeStr'));
                                if (resp.statusCode == 200) {
                                  final data = json.decode(resp.body);
                                  setDialogState(() {
                                    availableTables = data['tables'] ?? [];
                                    loadingTables = false;
                                  });
                                }
                              } catch (e) {
                                setDialogState(() => loadingTables = false);
                              }
                            } else if (currentStep == 2) {
                              if (selectedTable == null) {
                                _showWarningDialog(LocalizationService().translate('please_select_table'));
                                return;
                              }
                              setDialogState(() => currentStep = 3);
                            } else if (currentStep == 3) {
                              if (nameController.text.trim().isEmpty || phoneController.text.trim().isEmpty) {
                                _showWarningDialog(LocalizationService().translate('fill_guest_details_warning'));
                                return;
                              }
                              setDialogState(() => currentStep = 4);
                            } else {
                              // Final Submit
                              final resBody = {
                                'name': nameController.text,
                                'phone': phoneController.text,
                                'email': emailController.text,
                                'date': '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}',
                                'time': '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}:00',
                                'guests': int.tryParse(guestsController.text) ?? 2,
                                'notes': notesController.text,
                                'tableId': selectedTable['id'],
                                'branchId': 1,
                                'bookingFee': feeEnabled ? feeAmount : 0,
                                'paymentMethod': feeEnabled ? feePaymentMethod : 'Counter',
                                'origin': 'In-Store',
                              };

                              try {
                                final resp = await http.post(
                                  Uri.parse('$apiBaseUrl/api/reservations'),
                                  headers: {'Content-Type': 'application/json'},
                                  body: json.encode(resBody),
                                );
                                if (resp.statusCode == 201) {
                                  if (!ctx.mounted) return;
                                  Navigator.pop(ctx);
                                  if (!mounted) return;
                                  _fetchReservations();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(LocalizationService().translate('reservation_success')), backgroundColor: Colors.green),
                                  );
                                }
                              } catch (e) {
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('${LocalizationService().translate('reservation_failed')}: $e'), backgroundColor: Colors.red),
                                );
                              }
                            }
                          },
                          child: Text(
                            currentStep < 4 ? LocalizationService().translate('next_btn') : LocalizationService().translate('confirm_reservation'),
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReservationStepTitle(String title) {
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Text(
        title,
        style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildReservationDatePicker(DateTime selectedDate, Function(DateTime) onPicked) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: selectedDate,
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );
        if (picked != null) onPicked(picked);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: themeBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: themeBorder),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today, color: themePrimary, size: 20),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(LocalizationService().translate('date_btn'), style: TextStyle(color: themeHint, fontSize: 10, fontWeight: FontWeight.bold)),
                Text(
                  '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}',
                  style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReservationTimePicker(TimeOfDay selectedTime, Function(TimeOfDay) onPicked) {
    return InkWell(
      onTap: () async {
        final picked = await showTimePicker(context: context, initialTime: selectedTime);
        if (picked != null) onPicked(picked);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: themeBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: themeBorder),
        ),
        child: Row(
          children: [
            Icon(Icons.access_time, color: themePrimary, size: 20),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(LocalizationService().translate('time_btn'), style: TextStyle(color: themeHint, fontSize: 10, fontWeight: FontWeight.bold)),
                Text(
                  selectedTime.format(context),
                  style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReservationGuestInput(TextEditingController controller) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: themeBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: themeBorder),
      ),
      child: Row(
        children: [
          Icon(Icons.group_outlined, color: themeHint, size: 20),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(LocalizationService().translate('guests_btn'), style: TextStyle(color: themeHint, fontSize: 10, fontWeight: FontWeight.bold)),
                TextField(
                  controller: controller,
                  keyboardType: TextInputType.number,
                  style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold),
                  decoration: const InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(vertical: 4),
                    border: InputBorder.none,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReservationInput(TextEditingController controller, String label, IconData icon, {Color? color, int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      style: TextStyle(color: themeText),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: themeHint, fontSize: 14),
        prefixIcon: Icon(icon, color: color ?? themeHint, size: 20),
        filled: true,
        fillColor: themeBg,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: themeBorder)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: themeBorder)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: themePrimary)),
      ),
    );
  }

  Widget _buildNoTablesAvailable() {
    return Container(
      padding: const EdgeInsets.all(32),
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Icon(Icons.event_busy, size: 48, color: Colors.red[300]),
          const SizedBox(height: 16),
          Text(LocalizationService().translate('no_tables_available'), style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 4),
          Text(LocalizationService().translate('try_different_date'), style: TextStyle(color: themeHint, fontSize: 14), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'Square': return Icons.crop_square;
      case 'Round': return Icons.circle_outlined;
      case 'Rectangular': return Icons.rectangle_outlined;
      default: return Icons.table_bar_outlined;
    }
  }

  Widget _buildTableGrid(List<dynamic> tables, dynamic selected, Function(dynamic) onSelected) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.95, // Adjusted for more content
      ),
      itemCount: tables.length,
      itemBuilder: (context, index) {
        final t = tables[index];
        final isSel = selected != null && selected['id'] == t['id'];
        return InkWell(
          onTap: () => onSelected(t),
          child: Container(
            decoration: BoxDecoration(
              color: isSel ? themePrimary : themeCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isSel ? themePrimary : themeBorder, width: 2),
              boxShadow: isSel ? [BoxShadow(color: themePrimary.withValues(alpha: 0.3), blurRadius: 8)] : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(_getIconForType(t['table_type']), size: 22, color: isSel ? Colors.white.withValues(alpha: 0.7) : themeHint),
                const SizedBox(height: 8),
                Text(
                  '${LocalizationService().translate('table')} ${t['table_number']}',
                  style: TextStyle(color: isSel ? Colors.white : themeText, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.chair_outlined, size: 14, color: isSel ? Colors.white.withValues(alpha: 0.7) : themeHint),
                    const SizedBox(width: 4),
                    Text('${t['capacity']}', style: TextStyle(color: isSel ? Colors.white.withValues(alpha: 0.7) : themeHint, fontSize: 12)),
                    if (t['table_size'] != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: (isSel ? Colors.white : themePrimary).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: (isSel ? Colors.white : themePrimary).withValues(alpha: 0.2)),
                        ),
                        child: Text(
                          t['table_size'].toString().substring(0, 1).toUpperCase(),
                          style: TextStyle(color: isSel ? Colors.white : themePrimary, fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReservationSummaryCard(DateTime date, TimeOfDay time, String guests, dynamic table) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: themeBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: themeBorder),
      ),
      child: Column(
        children: [
          _buildSummaryRow(Icons.calendar_today, LocalizationService().translate('date_label'), '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}'),
          const Divider(height: 24),
          _buildSummaryRow(Icons.access_time, LocalizationService().translate('time_label'), time.format(context)),
          const Divider(height: 24),
          _buildSummaryRow(Icons.group_outlined, LocalizationService().translate('guests_label'), '$guests ${LocalizationService().translate('people_label')}'),
          const Divider(height: 24),
          _buildSummaryRow(Icons.table_bar_outlined, LocalizationService().translate('table_label'), '${LocalizationService().translate('table')} ${table['table_number']} (${table['capacity']} ${LocalizationService().translate('seats_label')})'),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: themeHint),
        const SizedBox(width: 12),
        Text(label, style: TextStyle(color: themeHint, fontSize: 14)),
        const Spacer(),
        Text(value, style: TextStyle(color: themeText, fontSize: 14, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildBookingFeeCard(
    double amount, 
    String selectedMethod, 
    Function(String) onMethodChanged,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: themePrimary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: themePrimary.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: themePrimary, borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.payments_outlined, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(LocalizationService().translate('advance_booking_fee'), style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 14)),
                    Text(LocalizationService().translate('collect_at_counter'), style: TextStyle(color: themeHint, fontSize: 12)),
                  ],
                ),
              ),
              Text('\$${amount.toStringAsFixed(2)}', style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 22)),
            ],
          ),
          const SizedBox(height: 16),
          // Payment Method Selector
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => onMethodChanged('Cash'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: selectedMethod == 'Cash' ? themePrimary : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: selectedMethod == 'Cash' ? themePrimary : themeBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.money, size: 18, color: selectedMethod == 'Cash' ? Colors.white : themeHint),
                        const SizedBox(width: 8),
                        Text(LocalizationService().translate('cash'), style: TextStyle(color: selectedMethod == 'Cash' ? Colors.white : themeHint, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => onMethodChanged('Card'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: selectedMethod == 'Card' ? themePrimary : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: selectedMethod == 'Card' ? themePrimary : themeBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.credit_card, size: 18, color: selectedMethod == 'Card' ? Colors.white : themeHint),
                        const SizedBox(width: 8),
                        Text(LocalizationService().translate('card'), style: TextStyle(color: selectedMethod == 'Card' ? Colors.white : themeHint, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 14, color: themePrimary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    LocalizationService().translate('fee_policy_desc'),
                    style: TextStyle(color: themeHint, fontSize: 10, fontStyle: FontStyle.italic),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showSplitBillDialog() {
    int splitCount = 2;
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          title: Text(LocalizationService().translate('split_bill_dialog'), style: TextStyle(color: themeText)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${LocalizationService().translate('split_by')}: $splitCount ${LocalizationService().translate('people')}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: themeText,
                ),
              ),
              Slider(
                value: splitCount.toDouble(),
                min: 2,
                max: 10,
                divisions: 8,
                activeColor: themePrimary,
                onChanged: (v) => setDialogState(() => splitCount = v.toInt()),
              ),
              const Divider(),
              _buildPriceRow(LocalizationService().translate('total_bill'), '\$${_total.toStringAsFixed(2)}'),
              _buildPriceRow(
                LocalizationService().translate('each_person'),
                '\$${(_total / splitCount).toStringAsFixed(2)}',
                isTotal: true,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(LocalizationService().translate('close')),
            ),
            OutlinedButton.icon(
              onPressed: () async {
                setState(() => _isLoading = true);
                try {
                  for (int i = 1; i <= splitCount; i++) {
                    final splitOrder = {
                      'order_number': 'BILL',
                      'items': List.from(_cartItems),
                      'total_amount': _total / splitCount,
                      'full_total': _total,
                      'order_time': DateTime.now().toIso8601String(),
                      'order_type': _orderType,
                      'customer_name': _isNewGuestMode ? _customerFirstNameController.text.trim() : (_selectedCustomer != null ? '${_selectedCustomer!['first_name']} ${_selectedCustomer!['last_name']}' : 'Counter Customer'),
                      'split_info': {
                        'index': i,
                        'total_splits': splitCount,
                      }
                    };
                    await ReceiptService.printReceipt(order: splitOrder, settings: _settings);
                  }
                } finally {
                  if (mounted) setState(() => _isLoading = false);
                }
              },
              icon: const Icon(Icons.print_rounded),
              label: Text(LocalizationService().translate('print_all_receipts')),
            ),
            if (_paymentPolicy == 'Pay Last') ...[
              const Spacer(),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _splitMultiplier = 1.0 / splitCount;
                    _isSplitActive = true;
                  });
                  Navigator.pop(context);
                  _showCheckoutDialog();
                },
                style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
                child: Text(
                  '${LocalizationService().translate('pay_for')} 1 ${LocalizationService().translate('person')}',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showMergeBillDialog() {
    dynamic targetTable;
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          title: Row(
            children: [
              Icon(Icons.merge_type_rounded, color: themePrimary),
              const SizedBox(width: 12),
              Text(LocalizationService().translate('merge_bill'), style: TextStyle(color: themeText)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                LocalizationService().translate('select_table_to_merge'),
                style: TextStyle(color: themeHint, fontSize: 14),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: themeBorder),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<dynamic>(
                    value: targetTable,
                    isExpanded: true,
                    dropdownColor: themeCard,
                    hint: Text(LocalizationService().translate('select_target_table'), style: TextStyle(color: themeHint)),
                    items: _restaurantTables?.where((t) => t.id != _selectedTable?.id).map((t) {
                      return DropdownMenuItem(
                        value: t,
                        child: Text('${LocalizationService().translate('table')} ${t.label}'),
                      );
                    }).toList(),
                    onChanged: (val) => setDialogState(() => targetTable = val),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                '${LocalizationService().translate('merge_warning')}',
                style: TextStyle(color: Colors.orange, fontSize: 11, fontStyle: FontStyle.italic),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(LocalizationService().translate('cancel')),
            ),
            ElevatedButton(
              onPressed: targetTable == null ? null : () {
                // Logic to merge cart into another table
                // For simplicity, we just set the selected table and let the user add more items or place it
                setState(() {
                  _selectedTable = targetTable;
                  _orderType = 'Dine-In';
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Items merged to Table ${targetTable.label}'))
                );
              },
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
              child: Text(LocalizationService().translate('confirm_merge'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  void _showPrintPreview() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        contentPadding: EdgeInsets.zero,
        content: Container(
          width: 400,
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Image.asset(
                  'packages/pos_terminal/assets/images/logo.png',
                  height: 60,
                  errorBuilder: (context, error, stackTrace) =>
                      const SizedBox.shrink(),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'ZAMZAM KITCHEN',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
              ),
              Text(
                LocalizationService().translate('official_receipt'),
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
              const Divider(height: 32),
              ..._cartItems.map(
                (item) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${item['name']} x${item['quantity']}',
                        style: const TextStyle(fontSize: 14),
                      ),
                      Text(
                        '\$${(item['price'] * item['quantity']).toStringAsFixed(2)}',
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(height: 32),
              _buildPriceRow('Subtotal', '\$${_subtotal.toStringAsFixed(2)}'),
              if (_discount > 0)
                _buildPriceRow(
                  'Discount',
                  '-\$${_discount.toStringAsFixed(2)}',
                ),
              _buildPriceRow('Tax (10%)', '\$${_tax.toStringAsFixed(2)}'),
              if (_reservationFee > 0)
                _buildPriceRow(
                  'Advance Paid',
                  '-\$${_reservationFee.toStringAsFixed(2)}',
                  color: themePrimary,
                ),
              _buildPriceRow(
                'Total',
                '\$${_total.toStringAsFixed(2)}',
                isTotal: true,
              ),
              const SizedBox(height: 32),
              Text(
                LocalizationService().translate('thank_you_visiting'),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const Text(
                'Rate us at www.zamzamkitchen.com',
                style: TextStyle(color: Colors.grey, fontSize: 10),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocalizationService().translate('cancel')),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              final tempOrder = {
                'id': 'PROFORMA',
                'order_number': 'BILL',
                'items': List.from(_cartItems),
                'total_amount': _payableAmount,
                'full_total': _total,
                'order_time': DateTime.now().toIso8601String(),
                'order_type': _orderType,
                'customer_name': _isNewGuestMode 
                    ? _customerFirstNameController.text.trim()
                    : (_selectedCustomer != null ? '${_selectedCustomer!['first_name']} ${_selectedCustomer!['last_name']}' : 'Counter Customer'),
                'split_info': _isSplitActive ? {
                  'index': 1,
                  'total_splits': (1.0 / _splitMultiplier).toInt(),
                } : null,
              };
              ReceiptService.printReceipt(order: tempOrder, settings: _settings);
            },
            style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
            child: Text(
              LocalizationService().translate('print_now'),
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }


  String _formatDateTime(String? raw) {
    if (raw == null || raw.isEmpty) return '--:--';
    try {
      final dt = DateTime.parse(raw).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = dt.month.toString().padLeft(2, '0');
      final year = dt.year.toString().substring(2);
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$day/$month/$year $hour:$minute';
    } catch (_) {
      return raw.toString().substring(0, raw.toString().length > 16 ? 16 : raw.toString().length);
    }
  }



  void _updateReservationStatus(int id, String status, [int? tableId]) async {
    try {
      final body = <String, dynamic>{'status': status};
      if (tableId != null) body['table_id'] = tableId;

      await http.patch(
        Uri.parse('$apiBaseUrl/api/reservations/$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(body),
      );

      // If seating a guest, update the table status to Occupied
      if (status == 'Seated' && tableId != null) {
        final table = _restaurantTables?.firstWhere(
          (t) => t.id == tableId.toString(),
          orElse: () => ui_kit.RestaurantTable(id: tableId.toString(), label: tableId.toString(), status: ui_kit.TableStatus.available, capacity: 4, x: 0, y: 0),
        );
        if (table != null) {
          _updateTableStatus(table, 'Occupied');
        }
      }

      // If marking as Confirmed and table is assigned, mark table as Reserved
      if (status == 'Confirmed' && tableId != null) {
        final table = _restaurantTables?.firstWhere((t) => t.id == tableId.toString(), orElse: () => ui_kit.RestaurantTable(id: '', label: '', status: ui_kit.TableStatus.available, capacity: 0, x: 0, y: 0));
        if (table != null && table.id.isNotEmpty) {
           _updateTableStatus(table, 'Reserved');
        }
      }

      _fetchReservations();
      if (_selectedReservationDetails != null && _selectedReservationDetails!['id'] == id) {
        setState(() {
          _selectedReservationDetails!['status'] = status;
          if (tableId != null) _selectedReservationDetails!['table_id'] = tableId;
        });
      }
    } catch (e) {
      debugPrint('Reservation update error: $e');
    }
  }

  void _showTableSelectDialog() {
    if (_restaurantTables == null) {
      _fetchTables();
    }

    showDialog(
      context: context,
      builder: (ctx) {
        ui_kit.RestaurantTable? localSelected = _selectedTable;
        
        return StatefulBuilder(
          builder: (context, setDialogState) {
            final tables = _restaurantTables ?? [];

            return AlertDialog(
              backgroundColor: themeCard,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              contentPadding: EdgeInsets.zero,
              content: SizedBox(
                width: 550,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: themePrimary.withValues(alpha: 0.05),
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: themePrimary,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [BoxShadow(color: themePrimary.withValues(alpha: 0.3), blurRadius: 8)],
                            ),
                            child: const Icon(Icons.table_bar, color: Colors.white, size: 24),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  LocalizationService().translate('choose_table'),
                                  style: TextStyle(color: themeText, fontSize: 22, fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  LocalizationService().translate('select_available_table'),
                                  style: TextStyle(color: themeHint, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Icon(Icons.close, color: themeHint),
                            onPressed: () => Navigator.pop(ctx),
                          ),
                        ],
                      ),
                    ),

                    // Grid
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 0.85,
                          ),
                          itemCount: tables.length,
                          itemBuilder: (context, index) {
                            final t = tables[index];
                            final isSel = localSelected?.id == t.id;
                            
                            return InkWell(
                              onTap: () => setDialogState(() => localSelected = t),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: isSel ? themePrimary : themeBg,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSel ? themePrimary : themeBorder,
                                    width: 2,
                                  ),
                                  boxShadow: isSel ? [BoxShadow(color: themePrimary.withValues(alpha: 0.3), blurRadius: 8)] : null,
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      _getIconForType(t.type),
                                      size: 28,
                                      color: isSel ? Colors.white : themeHint,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      '${LocalizationService().translate('table')} ${t.label}',
                                      style: TextStyle(
                                        color: isSel ? Colors.white : themeText,
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.people_outline,
                                          size: 14,
                                          color: isSel ? Colors.white.withValues(alpha: 0.7) : themeHint,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${t.capacity}',
                                          style: TextStyle(
                                            color: isSel ? Colors.white.withValues(alpha: 0.7) : themeHint,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                    // Actions
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                setState(() => _selectedTable = null);
                                Navigator.pop(ctx);
                              },
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                side: BorderSide(color: themeBorder),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: Text(
                                LocalizationService().translate('clear_takeaway').toUpperCase(),
                                style: TextStyle(color: themeText, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: localSelected == null ? null : () {
                                _startOrderFromTable(localSelected!);
                                Navigator.pop(ctx);
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: themePrimary,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 0,
                              ),
                              child: Text(
                                LocalizationService().translate('confirm_label').toUpperCase(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }



  void _showAddTableDialog() {
    final numberController = TextEditingController();
    final capacityController = TextEditingController(text: '4');
    String selectedType = 'Square';
    String selectedSize = 'Medium';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            backgroundColor: themeCard,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: [
                Icon(Icons.table_restaurant, color: themePrimary),
                const SizedBox(width: 12),
                Text(LocalizationService().translate('add_new_table'), style: TextStyle(color: themeText, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: numberController,
                    style: TextStyle(color: themeText),
                    decoration: InputDecoration(
                      labelText: LocalizationService().translate('table_number_hint'),
                      labelStyle: TextStyle(color: themeHint),
                      prefixIcon: Icon(Icons.tag, color: themePrimary, size: 20),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: themeBorder)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Table Type
                  Text(LocalizationService().translate('table_type'), style: TextStyle(color: themeHint, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSelectableOption(
                        label: 'Square',
                        icon: Icons.crop_square,
                        isSelected: selectedType == 'Square',
                        onTap: () => setState(() => selectedType = 'Square'),
                      ),
                      _buildSelectableOption(
                        label: 'Round',
                        icon: Icons.circle_outlined,
                        isSelected: selectedType == 'Round',
                        onTap: () => setState(() => selectedType = 'Round'),
                      ),
                      _buildSelectableOption(
                        label: 'Rectangular',
                        icon: Icons.rectangle_outlined,
                        isSelected: selectedType == 'Rectangular',
                        onTap: () => setState(() => selectedType = 'Rectangular'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Table Size
                  Text(LocalizationService().translate('table_size'), style: TextStyle(color: themeHint, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildSelectableOption(
                        label: 'Small',
                        icon: Icons.photo_size_select_small,
                        isSelected: selectedSize == 'Small',
                        onTap: () => setState(() => selectedSize = 'Small'),
                      ),
                      _buildSelectableOption(
                        label: 'Medium',
                        icon: Icons.photo_size_select_large,
                        isSelected: selectedSize == 'Medium',
                        onTap: () => setState(() => selectedSize = 'Medium'),
                      ),
                      _buildSelectableOption(
                        label: 'Large',
                        icon: Icons.photo_size_select_actual,
                        isSelected: selectedSize == 'Large',
                        onTap: () => setState(() => selectedSize = 'Large'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  TextField(
                    controller: capacityController,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: themeText),
                    decoration: InputDecoration(
                      labelText: LocalizationService().translate('chairs_count'),
                      labelStyle: TextStyle(color: themeHint),
                      prefixIcon: Icon(Icons.chair_outlined, color: themePrimary, size: 20),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: themeBorder)),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(LocalizationService().translate('cancel').toUpperCase(), style: TextStyle(color: themeHint)),
              ),
              ElevatedButton(
                onPressed: () async {
                  if (numberController.text.trim().isEmpty) {
                    _showWarningDialog(LocalizationService().translate('enter_table_number_warning'));
                    return;
                  }
                  if (capacityController.text.trim().isEmpty) {
                    _showWarningDialog(LocalizationService().translate('enter_capacity_warning'));
                    return;
                  }
                  
                  final tableBody = {
                    'table_number': numberController.text,
                    'capacity': int.tryParse(capacityController.text) ?? 4,
                    'table_type': selectedType,
                    'table_size': selectedSize,
                    'status': 'Available',
                    'pos_x': 50,
                    'pos_y': 50,
                    'branch_id': 1,
                  };

                  try {
                    final resp = await http.post(
                      Uri.parse('$apiBaseUrl/api/tables'),
                      headers: {'Content-Type': 'application/json'},
                      body: json.encode(tableBody),
                    );
                    
                    if (resp.statusCode == 201) {
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      if (!mounted) return;
                      _fetchTables();
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('table_added_floor')), backgroundColor: Colors.green));
                    }
                  } catch (e) {
                     debugPrint('Error adding table: $e');
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: Text(LocalizationService().translate('add_table'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSelectableOption({
    required String label,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 100,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? themePrimary.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? themePrimary : themeBorder, width: 1.5),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? themePrimary : themeHint, size: 24),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: isSelected ? themePrimary : themeHint, fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }

  void _showProfileDialog() {
    final logoutCallback = widget.onLogout;
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: themeCard,
        title: Text(LocalizationService().translate('user_profile'), style: TextStyle(color: themeText)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: themePrimary,
              child: const Text(
                'A',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Aqeel Admin',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: themeText),
            ),
            const SizedBox(height: 8),
            Text(
              '${LocalizationService().translate('terminal_id')}01',
              style: const TextStyle(
                color: Colors.green,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              LocalizationService().translate('role_admin'),
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocalizationService().translate('close')),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              if (logoutCallback != null) {
                logoutCallback(context);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(LocalizationService().translate('logout_not_connected')),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text(LocalizationService().translate('logout'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          title: Text(LocalizationService().translate('settings'), style: TextStyle(color: themeText)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Dark Mode Toggle
              SwitchListTile(
                title: Text(LocalizationService().translate('dark_mode'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('dark_mode_desc'), style: TextStyle(color: themeHint)),
                value: _isDarkMode,
                onChanged: (value) async {
                  final newFlavor = value ? AppThemeFlavor.dark : AppThemeFlavor.light;
                  ThemeService().setFlavor(newFlavor);
                  setDialogState(() {});
                  setState(() {}); // Update the main UI
                  
                  // Persist to backend without blocking UI
                  try {
                    await _updateSetting('tenant', {'theme_mode': value ? 'Dark' : 'Light'});
                  } catch (e) {
                    debugPrint('Failed to persist theme setting: $e');
                  }
                },
                activeThumbColor: themePrimary,
              ),
              const Divider(),
              ListTile(
                title: Text(LocalizationService().translate('printer_settings'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('printer_desc'), style: TextStyle(color: themeHint)),
                trailing: Icon(Icons.arrow_forward_ios, size: 16, color: themeHint),
                onTap: () => _showPrinterSettings(),
              ),
              ListTile(
                title: Text(LocalizationService().translate('sound_settings'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('sound_desc'), style: TextStyle(color: themeHint)),
                trailing: Icon(Icons.arrow_forward_ios, size: 16, color: themeHint),
                onTap: () => _showSoundSettings(),
              ),
              ListTile(
                title: Text(LocalizationService().translate('auto_logout'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('logout_desc'), style: TextStyle(color: themeHint)),
                trailing: Icon(Icons.arrow_forward_ios, size: 16, color: themeHint),
                onTap: () => _showAutoLogoutSettings(),
              ),
              ListTile(
                title: Text(LocalizationService().translate('language'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('lang_desc'), style: TextStyle(color: themeHint)),
                trailing: Icon(Icons.arrow_forward_ios, size: 16, color: themeHint),
                onTap: () => _showLanguageSettings(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(LocalizationService().translate('close')),
            ),
          ],
        ),
      ),
    );
  }

  void _showPrinterSettings() {
    String connectionType = _settings['branch']?['printer_connection_type'] ?? 'Network';
    final ipController = TextEditingController(text: _settings['branch']?['printer_ip'] ?? '');
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          title: Text(LocalizationService().translate('printer_settings'), style: TextStyle(color: themeText)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                decoration: InputDecoration(
                  labelText: LocalizationService().translate('conn_type'),
                  labelStyle: TextStyle(color: themeHint),
                ),
                dropdownColor: themeCard,
                initialValue: connectionType,
                items: ['Network', 'Bluetooth', 'USB'].map((type) => DropdownMenuItem(
                  value: type, 
                  child: Text(LocalizationService().translate(type.toLowerCase()), style: TextStyle(color: themeText))
                )).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() => connectionType = val);
                  }
                },
              ),
              if (connectionType == 'Network') ...[
                const SizedBox(height: 16),
                TextField(
                  controller: ipController,
                  style: TextStyle(color: themeText),
                  decoration: InputDecoration(
                    labelText: LocalizationService().translate('printer_ip'),
                    labelStyle: TextStyle(color: themeHint),
                    hintText: '192.168.1.100',
                    hintStyle: TextStyle(color: themeHint.withValues(alpha: 0.5)),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('test_print_sent')))),
                style: ElevatedButton.styleFrom(backgroundColor: themePrimary, foregroundColor: Colors.white),
                child: Text(LocalizationService().translate('send_test_print')),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text(LocalizationService().translate('close'))),
            ElevatedButton(
              onPressed: () {
                if (connectionType == 'Network') {
                  final ip = ipController.text.trim();
                  final ipRegex = RegExp(r'^(\d{1,3}\.){3}\d{1,3}$');
                  if (!ipRegex.hasMatch(ip)) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(LocalizationService().translate('invalid_ip_format'))),
                    );
                    return;
                  }
                }
                
                _updateSetting('branch', {
                  'printer_connection_type': connectionType,
                  'printer_ip': connectionType == 'Network' ? ipController.text.trim() : '',
                });
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary, foregroundColor: Colors.white),
              child: Text(LocalizationService().translate('save_settings')),
            ),
          ],
        ),
      ),
    );
  }

  void _showSoundSettings() {
    final sound = SoundService();
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          title: Text(LocalizationService().translate('sound_settings'), style: TextStyle(color: themeText)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SwitchListTile(
                title: Text(LocalizationService().translate('order_notifications'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('order_notifications_desc'), style: TextStyle(color: themeHint)),
                value: sound.enabled,
                activeThumbColor: themePrimary,
                onChanged: (val) {
                  setDialogState(() => sound.setEnabled(val));
                  _updateSetting('tenant', {'notification_sound': val});
                },
              ),
              const Divider(),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(LocalizationService().translate('notification_volume'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: themeText)),
              ),
              Slider(
                value: sound.volume,
                onChanged: (val) {
                  setDialogState(() => sound.setVolume(val));
                },
                onChangeEnd: (val) {
                  _updateSetting('tenant', {'notification_volume': val});
                },
                activeColor: themePrimary,
              ),
              const Divider(),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(LocalizationService().translate('select_sound'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: themeText)),
              ),
              ...sound.availableSounds.map((s) => RadioListTile<String>(
                title: Text(s, style: TextStyle(color: themeText)),
                value: s,
                groupValue: sound.selectedSound,
                activeColor: themePrimary,
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() => sound.setSound(val));
                    _updateSetting('tenant', {'notification_sound_name': val});
                    sound.play(val); // Preview sound
                  }
                },
              )),
              const SizedBox(height: 16),
              Center(
                child: ElevatedButton.icon(
                  onPressed: () => SoundService().playNotification(),
                  icon: const Icon(Icons.play_arrow),
                  label: Text(LocalizationService().translate('test_sound')),
                  style: ElevatedButton.styleFrom(backgroundColor: themePrimary, foregroundColor: Colors.white),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text(LocalizationService().translate('close'))),
          ],
        ),
      ),
    );
  }

  void _showAutoLogoutSettings() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          String selectedTime = _settings['tenant']?['auto_logout'] ?? 'Never';
          return AlertDialog(
            backgroundColor: themeCard,
            title: Text(LocalizationService().translate('auto_logout'), style: TextStyle(color: themeText)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                {'key': 'never', 'label': 'Never'},
                {'key': '5_mins', 'label': '5 Minutes'},
                {'key': '15_mins', 'label': '15 Minutes'},
                {'key': '30_mins', 'label': '30 Minutes'},
                {'key': '1_hour', 'label': '1 Hour'},
              ].map((time) {
                return RadioListTile<String>(
                  title: Text(LocalizationService().translate(time['key']!), style: TextStyle(color: themeText)),
                  value: time['label']!,
                  groupValue: selectedTime,
                  activeColor: themePrimary,
                  onChanged: (val) {
                    if (val != null) {
                      setDialogState(() {
                      selectedTime = val;
                      _updateSetting('tenant', {'auto_logout': val});
                    });
                    }
                  },
                );
              }).toList(),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: Text(LocalizationService().translate('close'))),
            ],
          );
        },
      ),
    );
  }

  void _showLanguageSettings() {
    final loc = LocalizationService();
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: themeCard,
          title: Text(loc.translate('lang_settings'), style: TextStyle(color: themeText)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              { 'name': 'English', 'flag': '🇺🇸' },
              { 'name': 'Arabic', 'flag': '🇸🇦' },
              { 'name': 'Urdu', 'flag': '🇵🇰' },
            ].map((lang) {
              return RadioListTile<String>(
                title: Text('${lang['flag']} ${lang['name']}', style: TextStyle(color: themeText)),
                value: lang['name']!,
                groupValue: loc.currentLanguage,
                activeColor: themePrimary,
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() {});
                    loc.setLanguage(val);
                    _updateSetting('tenant', {'language': val});
                  }
                },
              );
            }).toList(),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text(loc.translate('close'))),
          ],
        ),
      ),
    );
  }

  void _showNotificationsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: themeCard,
        title: Text(LocalizationService().translate('notifications'), style: TextStyle(color: themeText)),
        content: SizedBox(
          width: 400,
          height: 300,
          child: ListView(
            children: [
              ListTile(
                leading: const Icon(Icons.receipt, color: Colors.green),
                title: Text(LocalizationService().translate('new_order_received'), style: TextStyle(color: themeText)),
                subtitle: Text('${LocalizationService().translate('order_id')}1234 - ${LocalizationService().translate('table_label')} 5', style: TextStyle(color: themeHint)),
                trailing: Text(LocalizationService().translate('2_min_ago'), style: TextStyle(color: themeHint, fontSize: 12)),
                onTap: () => Navigator.pop(context),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.warning, color: Colors.orange),
                title: Text(LocalizationService().translate('low_stock_alert'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('burger_patties_low'), style: TextStyle(color: themeHint)),
                trailing: Text(LocalizationService().translate('15_min_ago'), style: TextStyle(color: themeHint, fontSize: 12)),
                onTap: () => Navigator.pop(context),
              ),
              const Divider(),
              ListTile(
                leading: Icon(Icons.payment, color: themePrimary),
                title: Text(LocalizationService().translate('payment_processed'), style: TextStyle(color: themeText)),
                subtitle: Text('${LocalizationService().translate('order_id')}1233 - \$45.67', style: TextStyle(color: themeHint)),
                trailing: Text(LocalizationService().translate('1_hour_ago'), style: TextStyle(color: themeHint, fontSize: 12)),
                onTap: () => Navigator.pop(context),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.kitchen, color: Colors.red),
                title: Text(LocalizationService().translate('kitchen_alert'), style: TextStyle(color: themeText)),
                subtitle: Text('${LocalizationService().translate('order_id')}1232 ${LocalizationService().translate('order_ready_pickup')}', style: TextStyle(color: themeHint)),
                trailing: Text(LocalizationService().translate('2_hours_ago'), style: TextStyle(color: themeHint, fontSize: 12)),
                onTap: () => Navigator.pop(context),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.info, color: Colors.purple),
                title: Text(LocalizationService().translate('system_update'), style: TextStyle(color: themeText)),
                subtitle: Text(LocalizationService().translate('pos_system_updated'), style: TextStyle(color: themeHint)),
                trailing: Text(LocalizationService().translate('1_day_ago'), style: TextStyle(color: themeHint, fontSize: 12)),
                onTap: () => Navigator.pop(context),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocalizationService().translate('mark_all_read')),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
            child: Text(LocalizationService().translate('close'), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loc = LocalizationService();
    return ListenableBuilder(
      listenable: Listenable.merge([loc, ThemeService()]),
      builder: (context, _) {
        return Theme(
          data: ThemeService().themeData,
          child: Directionality(
            textDirection: (loc.currentLanguage == 'Arabic' || loc.currentLanguage == 'Urdu')
                ? TextDirection.rtl
                : TextDirection.ltr,
            child: Listener(
              onPointerDown: (_) => _resetInactivityTimer(),
              onPointerMove: (_) => _resetInactivityTimer(),
              child: Scaffold(
                backgroundColor: themeBg,
                body: Column(
                  children: [
                    _buildFixedHeader(),
                    Expanded(child: _buildMainContent()),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFixedHeader() {
    return Container(
      height: 100,
      padding: const EdgeInsets.only(left: 0, right: 24),
      decoration: BoxDecoration(
        color: themeBg.withValues(alpha: 0.95),
        border: Border(bottom: BorderSide(color: themeBorder)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Logo Section (Official Branding)
          
          // Tenant Branding (Custom Logos from Server)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Builder(
                builder: (_) {
                  final logoUrl = (_settings['tenant']?['logo_url'] ?? '').toString();
                  if (logoUrl.isNotEmpty) {
                    return Image.network(
                      resolveImageUrl(logoUrl),
                      height: 55,
                      fit: BoxFit.contain,
                      errorBuilder: (c, e, s) => const SizedBox.shrink(),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
              const SizedBox(width: 12),
              Builder(
                builder: (_) {
                  final secondaryLogoUrl = (_settings['tenant']?['secondary_logo_url'] ?? '').toString();
                  if (secondaryLogoUrl.isNotEmpty) {
                    return Image.network(
                      resolveImageUrl(secondaryLogoUrl),
                      height: 55,
                      fit: BoxFit.contain,
                      errorBuilder: (c, e, s) => const SizedBox.shrink(),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ],
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                (_settings['tenant']?['restaurant_name'] ?? 'ZAMZAM KITCHEN').toString(),
                style: TextStyle(
                  color: themeText,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                ),
              ),
              Text(
                LocalizationService().translate('mission_control'),
                style: TextStyle(
                  color: themeHint,
                  fontSize: 10,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(width: 32),

          // Navigation Tabs (Centered)
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildHeaderTab(0, LocalizationService().translate('pos'), Icons.point_of_sale_rounded),
                  _buildHeaderTab(1, LocalizationService().translate('dashboard'), Icons.dashboard_customize_rounded),
                  _buildHeaderTab(
                    2, 
                    LocalizationService().translate('kds'), 
                    Icons.kitchen_rounded,
                    count: _placedOrders.where((o) {
                      final s = o['status']?.toString().toLowerCase();
                      return ['pending', 'ordered', 'preparing', 'ready', 'paid', 'partially paid'].contains(s);
                    }).length
                  ),
                  _buildHeaderTab(
                    3, 
                    LocalizationService().translate('reservation'), 
                    Icons.event_available_rounded,
                    count: _reservations.where((r) {
                      if (r['status'] == 'Cancelled' || r['status'] == 'Completed') return false;
                      try {
                        DateTime resDate = DateTime.parse(r['reservation_date']).toLocal();
                        DateTime today = DateTime.now();
                        DateTime startOfToday = DateTime(today.year, today.month, today.day);
                        return !resDate.isBefore(startOfToday);
                      } catch (_) { return true; }
                    }).length
                  ),
                  _buildHeaderTab(
                    4, 
                    LocalizationService().translate('orders'), 
                    Icons.receipt_long_rounded,
                    count: _placedOrders.where((o) {
                      final s = o['status'].toString().toLowerCase();
                      return ['pending', 'ordered', 'preparing', 'ready', 'paid', 'partially paid'].contains(s);
                    }).length
                  ),
                  _buildHeaderTab(
                    5, 
                    LocalizationService().translate('tables'), 
                    Icons.grid_view_rounded,
                    count: _restaurantTables?.length ?? 0
                  ),
                  _buildHeaderTab(
                    6, 
                    LocalizationService().translate('waiting'), 
                    Icons.watch_later_outlined,
                    count: _placedOrders.where((o) {
                      final s = o['status']?.toString().toLowerCase();
                      return ['pending', 'ordered', 'preparing', 'ready', 'paid', 'partially paid'].contains(s);
                    }).length
                  ),
                ],
              ),
            ),
          ),

          // Utility Icons (Right)
          Row(
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _dateString,
                    style: TextStyle(
                      color: themeText,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    _timeString,
                    style: TextStyle(
                      color: themeText,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 24),
              _buildHeaderIcon(
                Icons.notifications_none_rounded,
                onTap: _showNotificationsDialog,
              ),
              const SizedBox(width: 12),
              _buildHeaderIcon(
                Icons.refresh_rounded,
                onTap: () {
                  _fetchOrders();
                  _fetchSummary();
                  _fetchReservations();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(LocalizationService().translate('data_refreshed')),
                      backgroundColor: themePrimary,
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
              ),
              const SizedBox(width: 12),
              _buildHeaderIcon(
                Icons.settings_rounded,
                onTap: _showSettingsDialog,
              ), // Open settings dialog
              const SizedBox(width: 24),

              // Profile Section
              GestureDetector(
                onTap: _showProfileDialog,
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: themePrimary,
                      child: const Text(
                        'A',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Aqeel Admin',
                          style: TextStyle(
                            color: themeText,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        Text(
                          'Terminal #01',
                          style: TextStyle(
                            color: Colors.green,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderTab(int index, String label, IconData icon, {int count = 0}) {
    bool isSelected = _selectedTabIndex == index;
    return GestureDetector(
      onTap: () => setState(() {
        _selectedTabIndex = index;
        if (index == 1) _selectedDashboardTab = 0; // Reset to Overview when clicking Dashboard tab
      }),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected
                    ? themePrimary.withValues(alpha: 0.15)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    icon,
                    size: 20,
                    color: isSelected ? themePrimary : themeHint,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: TextStyle(
                      color: isSelected ? themeText : themeHint,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            if (count > 0)
              Positioned(
                right: -4,
                top: -4,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: themePrimary,
                    shape: BoxShape.circle,
                    border: Border.all(color: themeBg, width: 2),
                  ),
                  constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
                  child: Center(
                    child: Text(
                      count.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }


  Widget _buildHeaderIcon(IconData icon, {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: themeCard,
        ),
        child: Icon(icon, color: themeText, size: 20),
      ),
    );
  }

  Widget _buildMainContent() {
    if (_isLoading) {
      return Container(
        color: themeBg,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ScaleTransition(
                scale: _loadingLogoAnimation,
                child: Container(
                  height: 150,
                  width: 150,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: themePrimary.withValues(alpha: 0.2),
                        blurRadius: 40,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: Image.asset('packages/pos_terminal/assets/images/logo.png'),
                ),
              ),
              const SizedBox(height: 32),
              CircularProgressIndicator(color: themePrimary, strokeWidth: 3),
              const SizedBox(height: 16),
              Text(
                'Initializing Mission Control...',
                style: TextStyle(
                  color: themeText.withValues(alpha: 0.5),
                  fontSize: 14,
                  letterSpacing: 1.2,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    switch (_selectedTabIndex) {
      case 0:
        return _buildPOSView();
      case 1:
        return _buildDashboardView();
      case 2:
        return _buildKDSView();
      case 3:
        return _buildReservationsView();
      case 4:
        return _buildOrdersView();
      case 5:
        return _buildTablesView();
      case 6:
        return _buildWaitingView();
      default:
        return const Center(child: Text('Coming Soon'));
    }
  }

  Widget _buildDashboardView() {
    return Row(
      children: [
        _buildDashboardSidebar(),
        Expanded(
          child: _getDashboardContent(),
        ),
      ],
    );
  }

  Widget _getDashboardContent() {
    if (kDebugMode) debugPrint('Dashboard switching to tab: $_selectedDashboardTab');
    
    try {
      switch (_selectedDashboardTab) {
        case 0: return _buildDashboardContent();
        case 1: return _buildOrdersView();
        case 2: return PurchaseManagementView(isDarkMode: _isDarkMode);
        case 3: return _buildReservationsView();
        case 4: 
        case 13: return CategoryManagementView(
            isDarkMode: _isDarkMode,
            categories: _categories,
            onCreateCategory: _createCategory,
            onUpdateCategory: _updateCategory,
            onDeleteCategory: _deleteCategory,
            onPickImage: _pickImage,
            resolveImageUrl: resolveImageUrl,
          );
        case 14: return FoodItemManagementView(
            isDarkMode: _isDarkMode,
            categories: _categories,
            items: _menuItems,
            onCreateMenuItem: _createMenuItem,
            onUpdateMenuItem: _updateMenuItem,
            onDeleteMenuItem: _deleteMenuItem,
            onPickImage: _pickImage,
            onRefreshMenu: _fetchMenu,
            resolveImageUrl: resolveImageUrl,
          );
        case 5: return _buildKDSView();
        case 6: return HumanResourceView(
            shifts: _shifts,
            users: _users,
            hrStats: _hrStats,
            isLoading: _isHRLoading,
            onClockIn: _showClockInDialog,
            onRefresh: _fetchShifts,
          );
        case 7: return ReportsView(
            summaryData: _summaryData,
            financialData: _financialData,
            operationalData: _operationalData,
            placedOrders: _placedOrders,
            shifts: _shifts,
            isLoading: _isLoading,
            apiBaseUrl: apiBaseUrl,
          );
        case 8: return _buildTableQRCodeView();
        case 9: return UserManagementView(
            users: _users,
            roles: _roles,
            permissions: _permissions,
            isUsersLoading: _isUsersLoading,
            isRolesLoading: _isRolesLoading,
            onCreateUser: _createUser,
            onUpdateUser: _updateUser,
            onDeleteUser: _deleteUser,
            onCreateRole: _createRole,
            onUpdateRole: _updateRole,
            onDeleteRole: _deleteRole,
            onUpdateRolePermissions: _updateRolePermissions,
            initialSubTab: 0,
          );
        case 10: return UserManagementView(
            users: _users,
            roles: _roles,
            permissions: _permissions,
            isUsersLoading: _isUsersLoading,
            isRolesLoading: _isRolesLoading,
            onCreateUser: _createUser,
            onUpdateUser: _updateUser,
            onDeleteUser: _deleteUser,
            onCreateRole: _createRole,
            onUpdateRole: _updateRole,
            onDeleteRole: _deleteRole,
            onUpdateRolePermissions: _updateRolePermissions,
            initialSubTab: 1,
          );
        case 11: return SettingsView(
            settings: _settings,
            isLoading: _isSettingsLoading,
            userPermissions: widget.user?['permissions'] ?? [],
            onUpdateSetting: _updateSetting,
            onSaveGatewaySettings: _saveGatewaySettings,
            onSaveMessagingSettings: _saveMessagingSettings,
            onSaveEmailSettings: _saveEmailSettings,
            onTestMessagingConnection: _testMessagingConnection,
            onTestEmailConnection: _testEmailConnection,
            onFetchSettings: _fetchSettings,
            onPickImage: _pickImage,
            onResetTransactions: _resetTransactionalData,
            initialCategory: 4,
          );
        case 12: 
        case 15:
        case 16: // Settings UI extracted to settings_view.dart
        case 17: return SettingsView(
            settings: _settings,
            isLoading: _isSettingsLoading,
            userPermissions: widget.user?['permissions'] ?? [],
            onUpdateSetting: _updateSetting,
            onSaveGatewaySettings: _saveGatewaySettings,
            onSaveMessagingSettings: _saveMessagingSettings,
            onSaveEmailSettings: _saveEmailSettings,
            onTestMessagingConnection: _testMessagingConnection,
            onTestEmailConnection: _testEmailConnection,
            onFetchSettings: _fetchSettings,
            onPickImage: _pickImage,
            onResetTransactions: _resetTransactionalData,
          );
        case 18: return InventoryDashboard(isDarkMode: _isDarkMode);
        case 19: return const CustomerManagementView(apiBaseUrl: apiBaseUrl);
        default: return _buildDashboardContent();
      }
    } catch (e, stack) {
      if (kDebugMode) {
        debugPrint('CRITICAL UI ERROR in Tab $_selectedDashboardTab: $e');
        debugPrint(stack.toString());
      }
      return Container(
        padding: const EdgeInsets.all(32),
        color: themeBg,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.red, size: 64),
              const SizedBox(height: 24),
              Text(
                LocalizationService().translate('error_loading_page'),
                style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                'Error: ${e.toString().split('\n').first}',
                textAlign: TextAlign.center,
                style: TextStyle(color: themeHint),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () => setState(() => _selectedDashboardTab = 0),
                icon: const Icon(Icons.home_rounded),
                label: Text(LocalizationService().translate('back_to_dashboard')),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: themeCard,
                      title: Text(LocalizationService().translate('error_details'), style: TextStyle(color: themeText)),
                      content: SingleChildScrollView(child: Text('$e\n\n$stack', style: TextStyle(color: themeText.withValues(alpha: 0.8)))),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(LocalizationService().translate('close_btn'))),
                      ],
                    ),
                  );
                },
                child: Text(LocalizationService().translate('show_details'), style: TextStyle(color: themePrimary)),
              ),
            ],
          ),
        ),
      );
    }
  }


  Widget _buildDashboardSidebar() {
    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: themeCard,
        border: Border(right: BorderSide(color: themeBorder)),
      ),
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        children: [
          Text(
            LocalizationService().translate('manager_dashboard').toUpperCase(),
            style: TextStyle(
              color: themeHint,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(height: 20),
          if (_hasPermission('view_dashboard') || _hasPermission('view_analytics'))
            _buildSidebarNav(0, LocalizationService().translate('analytics_overview'), Icons.analytics_outlined),
          if (_hasPermission('manage_purchase'))
            _buildSidebarNav(2, LocalizationService().translate('purchase_management'), Icons.shopping_cart_outlined),
          if (_hasPermission('manage_inventory'))
            _buildSidebarNav(18, LocalizationService().translate('inventory_management'), Icons.inventory_2_outlined),
          if (_hasPermission('manage_menu'))
            _buildSidebarNav(
            4, 
            LocalizationService().translate('food_management'), 
            Icons.fastfood_outlined, 
            onTap: () => setState(() {
              _isFoodManagementExpanded = !_isFoodManagementExpanded;
              _isSecurityExpanded = false; // Close other submenus
            }),
            isExpanded: _isFoodManagementExpanded,
            hasSubmenu: true,
          ),
          if (_isFoodManagementExpanded) ...[
            _buildSidebarSubNav(13, LocalizationService().translate('categories')),
            _buildSidebarSubNav(14, LocalizationService().translate('food_items')),
          ],
          if (_hasPermission('manage_hr'))
            _buildSidebarNav(6, LocalizationService().translate('human_resource'), Icons.people_outline_rounded),
          if (_hasPermission('manage_customers'))
            _buildSidebarNav(19, LocalizationService().translate('customer_directory'), Icons.person_search_outlined),
          if (_hasPermission('view_reports'))
            _buildSidebarNav(7, LocalizationService().translate('reports'), Icons.bar_chart_rounded),
          if (_hasPermission('manage_menu')) // Assuming QR codes are menu related
            _buildSidebarNav(8, LocalizationService().translate('table_qr_codes'), Icons.qr_code_2_rounded),
          if (_hasPermission('manage_users') || _hasPermission('manage_roles'))
            _buildSidebarNav(
            9, 
            LocalizationService().translate('security_access'), 
            Icons.admin_panel_settings_outlined,
            onTap: () => setState(() {
              _isSecurityExpanded = !_isSecurityExpanded;
              _isFoodManagementExpanded = false; // Close other submenus
            }),
            isExpanded: _isSecurityExpanded,
            hasSubmenu: true,
          ),
          if (_isSecurityExpanded) ...[
            _buildSidebarSubNav(9, LocalizationService().translate('user_management')),
            _buildSidebarSubNav(10, LocalizationService().translate('role_permissions')),
          ],
          if (_hasPermission('manage_settings_communications'))
            _buildSidebarNav(11, LocalizationService().translate('communications'), Icons.contact_mail_outlined),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Divider(height: 1, color: themeBorder),
          ),
          if (_hasPermission('manage_settings_general') || _hasPermission('manage_settings_operations') || 
              _hasPermission('manage_settings_branding') || _hasPermission('manage_settings_payments'))
            _buildSidebarNav(
              12, 
              LocalizationService().translate('system_settings'), 
              Icons.settings_suggest_rounded,
              onTap: () {
                setState(() {
                  _selectedDashboardTab = 12;
                  _isFoodManagementExpanded = false; 
                  _isSecurityExpanded = false; // Close submenus
                });
                _fetchSettings();
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSidebarNav(int index, String title, IconData icon, {VoidCallback? onTap, bool isExpanded = false, bool hasSubmenu = false}) {
    bool isSelected = _selectedDashboardTab == index;
    return GestureDetector(
      onTap: onTap ?? () => setState(() {
        _selectedDashboardTab = index;
        _isFoodManagementExpanded = false; 
        _isSecurityExpanded = false; // Automatically close all submenus on navigation
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? themePrimary.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 20, color: isSelected ? themePrimary : themeHint),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title.split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}' : w).join(' '),
                style: TextStyle(
                  color: isSelected ? themePrimary : themeText,
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
            if (hasSubmenu)
              Icon(
                isExpanded ? Icons.expand_more : Icons.chevron_right,
                size: 16,
                color: themeText.withValues(alpha: 0.3),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSidebarSubNav(int index, String title) {
    bool isSelected = _selectedDashboardTab == index;
    return GestureDetector(
      onTap: () => setState(() {
        _selectedDashboardTab = index;
        _isFoodManagementExpanded = false;
        _isSecurityExpanded = false; // Automatically close after selection
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 2, left: 40),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? themePrimary.withValues(alpha: 0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          title,
          style: TextStyle(
            color: isSelected ? themePrimary : themeText.withValues(alpha: 0.7),
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  // Menu Management UI extracted to separate views

  // HR UI extracted to human_resource_view.dart

  // Settings UI sub-methods extracted to settings_view.dart

  Future<void> _showClockInDialog() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: themeCard,
        title: Text(LocalizationService().translate('shift_label'), style: TextStyle(color: themeText)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(LocalizationService().translate('quick_clock_in_test'), style: TextStyle(color: themeHint)),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () async {
                final resp = await http.post(
                  Uri.parse('$apiBaseUrl/api/hr/clock-in'),
                  headers: {'Content-Type': 'application/json'},
                  body: json.encode({'user_id': 1, 'branch_id': 1, 'hourly_rate': 25.0}),
                );
                if (resp.statusCode == 201) {
                  if (!mounted) return;
                  _fetchShifts();
                  if (!context.mounted) return;
                  Navigator.pop(context);
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green, minimumSize: const Size(double.infinity, 45)),
              child: Text(LocalizationService().translate('clock_in_test'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }



  Widget _buildTableQRCodeView() {
    final tables = _restaurantTables ?? [];
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(LocalizationService().translate('table_qr_codes'), style: TextStyle(color: themeText, fontSize: 28, fontWeight: FontWeight.bold)),
              ElevatedButton.icon(
                onPressed: () {}, // Placeholder for Print All
                icon: const Icon(Icons.print_rounded, color: Colors.white),
                label: Text(LocalizationService().translate('print_all_qr'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: themePrimary, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 20,
                mainAxisSpacing: 20,
                childAspectRatio: 0.85,
              ),
              itemCount: tables.length,
              itemBuilder: (context, index) {
                final table = tables[index];
                // URL that encodes into the QR code — matches the website route
                const String websiteBaseUrl = 'http://localhost:5173';
                final qrData = '$websiteBaseUrl/menu?table=${Uri.encodeComponent(table.label)}&tid=${table.id}';
                
                return Container(
                  decoration: BoxDecoration(
                    color: themeCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: themeBorder),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Table label + status chip
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${LocalizationService().translate('table')} ${table.label}',
                            style: TextStyle(color: themeText, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: table.status == ui_kit.TableStatus.available
                                  ? Colors.green.withValues(alpha: 0.15)
                                  : themePrimary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              table.status == ui_kit.TableStatus.available ? LocalizationService().translate('free_status') : LocalizationService().translate('occupied_status'),
                              style: TextStyle(
                                color: table.status == ui_kit.TableStatus.available ? Colors.green : themePrimary,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text('${table.capacity} ${LocalizationService().translate('pax_label')}', style: TextStyle(color: themeHint, fontSize: 11)),
                      const SizedBox(height: 12),
                      // QR Code
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 8)],
                        ),
                        child: QrImageView(
                          data: qrData,
                          version: QrVersions.auto,
                          size: 130.0,
                          eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Colors.black),
                          dataModuleStyle: const QrDataModuleStyle(dataModuleShape: QrDataModuleShape.square, color: Colors.black),
                        ),
                      ),
                      const SizedBox(height: 10),
                      // URL text
                      Text(
                        qrData,
                        style: TextStyle(color: themeHint, fontSize: 9),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 8),
                      // Copy button
                      TextButton.icon(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: qrData));
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${LocalizationService().translate('link_copied_for')} ${table.label}!'),
                              backgroundColor: Colors.green,
                              duration: const Duration(seconds: 2),
                            ),
                          );
                        },
                        icon: Icon(Icons.copy_rounded, size: 16, color: themePrimary),
                        label: Text(LocalizationService().translate('copy_link'), style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 12)),
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



  Widget _buildDashboardContent() {
    final today = _summaryData['today'] ?? {};
    final lifetime = _summaryData['lifetime'] ?? {};
    final trends = (_summaryData['trends'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    
    // Calculate split data from summaryData top-level keys
    final orderSplit = _summaryData['types'] as List? ?? [];
    final dineInCount = orderSplit.firstWhere((s) => s['order_type'] == 'Dine-In' || s['order_type'] == 'dine_in', orElse: () => {'count': 0})['count'];
    final pickupCount = orderSplit.firstWhere((s) => s['order_type'] == 'Takeaway' || s['order_type'] == 'takeaway' || s['order_type'] == 'pickup', orElse: () => {'count': 0})['count'];
    final deliveryCount = orderSplit.firstWhere((s) => s['order_type'] == 'Delivery' || s['order_type'] == 'delivery', orElse: () => {'count': 0})['count'];

    final paymentSplit = _summaryData['payments'] as List? ?? [];
    final cashTotal = paymentSplit.firstWhere((s) => s['payment_method']?.toString().toLowerCase() == 'cash', orElse: () => {'total': 0.0})['total'];
    final cardTotal = paymentSplit.firstWhere((s) => s['payment_method']?.toString().toLowerCase() == 'card' || s['payment_method']?.toString().toLowerCase() == 'card_terminal', orElse: () => {'total': 0.0})['total'];
    
    // Use origins from operationalData for the Online Order card to include Website and QR
    final origins = _operationalData['origins'] as List? ?? [];
    final websiteData = origins.firstWhere((o) => o['origin']?.toString().toLowerCase() == 'website', orElse: () => {'total': 0.0})['total'];
    final qrData = origins.firstWhere((o) => o['origin']?.toString().toLowerCase() == 'qr-menu', orElse: () => {'total': 0.0})['total'];
    final onlineTotal = (double.tryParse(websiteData.toString()) ?? 0.0) + (double.tryParse(qrData.toString()) ?? 0.0);

    final topItems = _summaryData['topItems'] as List? ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        LocalizationService().translate('operational_analytics'),
                        style: TextStyle(
                          color: themeText,
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 24),
                      // Date Selection Button
                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _dashboardDate,
                            firstDate: DateTime(2023),
                            lastDate: DateTime.now(),
                            builder: (context, child) {
                              return Theme(
                                data: Theme.of(context).copyWith(
                                  colorScheme: ColorScheme.fromSeed(
                                    seedColor: themePrimary,
                                    brightness: ThemeService().isDarkMode ? Brightness.dark : Brightness.light,
                                  ),
                                ),
                                child: child!,
                              );
                            },
                          );
                          if (picked != null && picked != _dashboardDate) {
                            setState(() {
                              _dashboardDate = picked;
                              _isLoading = true;
                            });
                            _fetchSummary(date: picked);
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: themeCard,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: themeBorder),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.calendar_today_rounded, size: 16, color: themePrimary),
                              const SizedBox(width: 8),
                              Text(
                                "${_dashboardDate.year}-${_dashboardDate.month.toString().padLeft(2, '0')}-${_dashboardDate.day.toString().padLeft(2, '0')}",
                                style: TextStyle(color: themeText, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 8),
                              Icon(Icons.arrow_drop_down, color: themeHint),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    LocalizationService().translate('live_data_sync'),
                    style: TextStyle(color: themeHint, fontSize: 16),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _dashboardDate.day == DateTime.now().day && _dashboardDate.month == DateTime.now().month && _dashboardDate.year == DateTime.now().year
                    ? themePrimary.withValues(alpha: 0.1)
                    : Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      _dashboardDate.day == DateTime.now().day && _dashboardDate.month == DateTime.now().month && _dashboardDate.year == DateTime.now().year
                        ? Icons.sync 
                        : Icons.history, 
                      color: _dashboardDate.day == DateTime.now().day && _dashboardDate.month == DateTime.now().month && _dashboardDate.year == DateTime.now().year
                        ? themePrimary 
                        : Colors.orange
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _dashboardDate.day == DateTime.now().day && _dashboardDate.month == DateTime.now().month && _dashboardDate.year == DateTime.now().year
                        ? LocalizationService().translate('auto_sync_active')
                        : 'HISTORICAL DATA VIEW',
                      style: TextStyle(
                        color: _dashboardDate.day == DateTime.now().day && _dashboardDate.month == DateTime.now().month && _dashboardDate.year == DateTime.now().year
                          ? themePrimary 
                          : Colors.orange,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
              const SizedBox(height: 40),

              Row(
                children: [
                  _DashboardMetric(
                    label: LocalizationService().translate('todays_sale'),
                    value:
                        '\$${(double.tryParse(today['total'].toString()) ?? 0.0).toStringAsFixed(2)}',
                    icon: Icons.payments_rounded,
                    color: Colors.green,
                  ),
                  const SizedBox(width: 24),
                  _DashboardMetric(
                    label: LocalizationService().translate('todays_orders'),
                    value: '${today['count'] ?? 0}',
                    icon: Icons.receipt_rounded,
                    color: themePrimary,
                  ),
                  const SizedBox(width: 24),
                  _DashboardMetric(
                    label: LocalizationService().translate('lifetime_orders'),
                    value: '${lifetime['count'] ?? 0}',
                    icon: Icons.all_inclusive_rounded,
                    color: Colors.orange,
                  ),
                  const SizedBox(width: 24),
                  _DashboardMetric(
                    label: LocalizationService().translate('avg_prep_time'),
                    value: '${today['avgPrepTime'] ?? '0.0'} min',
                    icon: Icons.timer_rounded,
                    color: Colors.deepPurple,
                  ),
                ],
              ),
              const SizedBox(height: 32),

              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          LocalizationService().translate('order_service_split'),
                          style: TextStyle(
                            color: themeText,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            _SmallMetricCard(
                              label: LocalizationService().translate('dine_in'),
                              value: '${dineInCount ?? 0}',
                              icon: Icons.restaurant,
                              color: themePrimary,
                              
                            ),
                            const SizedBox(width: 16),
                            _SmallMetricCard(
                              label: LocalizationService().translate('pick_up'),
                              value: '${pickupCount ?? 0}',
                              icon: Icons.shopping_bag,
                              color: themeSecondary,
                              
                            ),
                            const SizedBox(width: 16),
                            _SmallMetricCard(
                              label: LocalizationService().translate('delivery'),
                              value: '${deliveryCount ?? 0}',
                              icon: Icons.delivery_dining,
                              color: themePrimary.withValues(alpha: 0.7),
                              
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        Text(
                          LocalizationService().translate('payment_method_coverage'),
                          style: TextStyle(
                            color: themeText,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 20),
                        Row(
                          children: [
                            _SmallMetricCard(
                              label: LocalizationService().translate('cash'),
                              value:
                                  '\$${(double.tryParse(cashTotal.toString()) ?? 0.0).toStringAsFixed(0)}',
                              icon: Icons.money,
                              color: Colors.green,
                              
                            ),
                            const SizedBox(width: 16),
                            _SmallMetricCard(
                              label: LocalizationService().translate('card_terminal'),
                              value:
                                  '\$${(double.tryParse(cardTotal.toString()) ?? 0.0).toStringAsFixed(0)}',
                              icon: Icons.credit_card,
                              color: themePrimary,
                              
                            ),
                            const SizedBox(width: 16),
                            _SmallMetricCard(
                              label: LocalizationService().translate('online_order'),
                              value:
                                  '\$${(double.tryParse(onlineTotal.toString()) ?? 0.0).toStringAsFixed(0)}',
                              icon: Icons.language,
                              color: themePrimary.withValues(alpha: 0.9),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 32),
                  Expanded(
                    flex: 1,
                    child: _TrendChart(
                      title: LocalizationService().translate('monthly_revenue_trend'),
                      trends: trends,
                      
                      color: themePrimary,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 48),

              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: themeCard,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: themeBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            LocalizationService().translate('daily_deductions'),
                            style: TextStyle(
                              color: themeText,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              _SmallMetricCard(
                                label: LocalizationService().translate('tips_today'),
                                value:
                                    '\$${(double.tryParse(today['tips']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                                icon: Icons.volunteer_activism,
                                color: themePrimary,
                                
                              ),
                              const SizedBox(width: 16),
                              _SmallMetricCard(
                                label: LocalizationService().translate('discounts_label'),
                                value:
                                    '-\$${(double.tryParse(today['discounts']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                                icon: Icons.loyalty,
                                color: Colors.redAccent,
                                
                              ),
                            ],
                          ),
                          const SizedBox(height: 32),
                          Text(
                            LocalizationService().translate('top_selling_items'),
                            style: TextStyle(
                              color: themeText,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ...topItems
                              .map(
                                (item) => Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        item['name'] ?? 'Unknown Item',
                                        style: TextStyle(
                                          color: themeText,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: themePrimary.withValues(
                                            alpha: 0.1,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: Text(
                                          '${item['sold']} ${LocalizationService().translate('sold')}',
                                          style: TextStyle(
                                            color: themePrimary,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          const SizedBox(height: 40),
                          Text(
                            LocalizationService().translate('popular_customizations'),
                            style: TextStyle(
                              color: themeText,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ...(_summaryData['customizations'] as List? ?? []).map(
                            (c) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${c['name']} (${c['type']})',
                                    style: TextStyle(color: themeText, fontSize: 13, fontWeight: FontWeight.w500),
                                  ),
                                  Text(
                                    '${c['count']} ${LocalizationService().translate('uses')}',
                                    style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 32),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: themeCard,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: themeBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            LocalizationService().translate('live_operational_status'),
                            style: TextStyle(
                              color: themeText,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 24),
                          _StatusRow(
                            label: LocalizationService().translate('pending_orders_kds'),
                            value: '${_summaryData['live']?['pending'] ?? 0}',
                            icon: Icons.kitchen,
                            color: Colors.red,
                          ),
                          _StatusRow(
                            label: LocalizationService().translate('awaiting_payment'),
                            value: '${_summaryData['live']?['unpaid'] ?? 0}',
                            icon: Icons.payment,
                            color: Colors.orange,
                          ),
                          _StatusRow(
                            label: LocalizationService().translate('today_reservations'),
                            value: '${_reservations.length}',
                            icon: Icons.event_available,
                            color: themePrimary,
                          ),
                          _StatusRow(
                            label: LocalizationService().translate('active_orders'),
                            value: '${_summaryData['live']?['active'] ?? 0}',
                            icon: Icons.restaurant,
                            color: Colors.green,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              _buildUnifiedSummary(themeText, themeCard, themeBorder, themePrimary, themeHint),
            ],
          ),
    );
  }

  Widget _buildPOSView() {
    return Row(
      children: [
        // Main Catalog
        Expanded(
          flex: 3,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildPOSCategories(),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
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
                              Text(
                                _editingOrderId != null 
                                  ? '${LocalizationService().translate('updating_order')} #$_editingOrderId' 
                                  : LocalizationService().translate('main_course_items'),
                                style: TextStyle(
                                  color: _editingOrderId != null ? themePrimary : themeText,
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _menuItems.any((i) => i['id'].toString().startsWith('s')) 
                                  ? LocalizationService().translate('demo_mode_desc')
                                  : LocalizationService().translate('browse_menu_desc'),
                                style: TextStyle(
                                  color: _menuItems.any((i) => i['id'].toString().startsWith('s')) ? themePrimary : themeHint,
                                  fontSize: 14,
                                  fontWeight: _menuItems.any((i) => i['id'].toString().startsWith('s')) ? FontWeight.bold : FontWeight.normal,
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              if (_editingOrderId != null) ...[
                                _buildOutlinedActionButton(
                                  label: LocalizationService().translate('cancel_edit'),
                                  icon: Icons.close_rounded,
                                  color: Colors.red,
                                  onPressed: () => _clearCart(),
                                ),
                                const SizedBox(width: 16),
                              ],
                              Container(
                                width: 300,
                                decoration: BoxDecoration(
                                  color: themeCard,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: themeBorder),
                                ),
                                child: TextField(
                                  style: TextStyle(color: themeText),
                                  onChanged: (val) => setState(() => _menuSearchQuery = val),
                                  decoration: InputDecoration(
                                   hintText: LocalizationService().translate('search_items'),
                                    hintStyle: TextStyle(color: themeHint),
                                    prefixIcon: Icon(Icons.search, color: themeHint, size: 20),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              _buildTagButton(LocalizationService().translate('favorites').toUpperCase(), false),
                              const SizedBox(width: 12),
                              _buildTagButton(LocalizationService().translate('recent').toUpperCase(), false),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Expanded(child: _buildPOSGrid()),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Cart Sidebar
        SizedBox(
          width: 400,
          child: Container(
            decoration: BoxDecoration(
              color: themeCard,
              border: Border(left: BorderSide(color: themeBorder)),
            ),
            child: _buildPOSCart(),
          ),
        ),
      ],
    );
  }

  Widget _buildPOSCategories() {
    final Set<String> dynamicCategories = {};
    for (var item in _menuItems) {
      if (item['category'] != null) {
        dynamicCategories.add((item['category'] as String).toUpperCase());
      }
    }
    
    final List<String> categories = ['all_caps'];
    categories.addAll(dynamicCategories.isNotEmpty ? dynamicCategories : ['appetizers', 'main_course', 'desserts']);

    return Container(
      height: 84,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      decoration: BoxDecoration(
        color: themeCard,
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, index) {
          String cat = categories[index];
          bool sel = _selectedCategory.toUpperCase() == cat.toUpperCase() || 
                     (cat == 'all_caps' && _selectedCategory == 'All Items');
          int itemCount = cat == 'all_caps' ? _menuItems.length : _menuItems.where((i) => i['category']?.toString().toUpperCase() == cat.toUpperCase()).length;
          
          return GestureDetector(
            onTap: () => setState(() {
              if (cat == 'all_caps') {
                _selectedCategory = 'All Items';
              } else {
                _selectedCategory = cat;
              }
            }),
            child: Container(
              margin: const EdgeInsets.only(right: 16, top: 8), // Added top margin for badge space
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: sel
                          ? themePrimary
                          : themeCard, // Use themeCard instead of manual ternary
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: sel ? [
                        BoxShadow(color: themePrimary.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4))
                      ] : null,
                    ),
                    child: Text(
                      LocalizationService().translate(cat.toLowerCase()).toUpperCase(),
                      style: TextStyle(
                        color: sel ? Colors.white : themeText,
                        fontWeight: sel ? FontWeight.bold : FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  if (itemCount > 0)
                    Positioned(
                      right: -8,
                      top: -8,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                        decoration: BoxDecoration(
                          color: sel ? Colors.white : themePrimary,
                          shape: BoxShape.circle,
                          border: Border.all(color: sel ? themePrimary : themeBg, width: 2),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 4, offset: const Offset(0, 2))
                          ],
                        ),
                        child: Center(
                          child: Text(
                            '$itemCount',
                            style: TextStyle(
                              color: sel ? themePrimary : Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPOSGrid() {
    final displayItems = _menuItems.isNotEmpty ? _menuItems : [];

    final filteredItems = displayItems.where((item) {
      final matchesCat =
          _selectedCategory == 'All Items' ||
          _selectedCategory == 'ALL' ||
          item['category'].toString().toUpperCase() ==
              _selectedCategory.toUpperCase();
      
      final matchesSearch = _menuSearchQuery.isEmpty || 
          item['name'].toString().toLowerCase().contains(_menuSearchQuery.toLowerCase());

      return matchesCat && matchesSearch;
    }).toList();

    return GridView.builder(
      padding: EdgeInsets.zero,
      itemCount: filteredItems.length + 1,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        childAspectRatio: 1.25,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemBuilder: (context, index) {
        if (index == filteredItems.length) {
          return GestureDetector(
            onTap: () {},
            child: Container(
              decoration: BoxDecoration(
                color: themeCard, // Use themeCard instead of manual ternary
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: themeBorder, width: 1.2),
              ),
              child: Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                    Icon(Icons.add_rounded, size: 32, color: themeHint),
                    const SizedBox(height: 12),
                    Text(
                       LocalizationService().translate('custom_item'),
                      style: TextStyle(
                        color: themeHint,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                ), // Closes FittedBox
              ), // Closes Center
            ), // Closes Container
          ); // Closes GestureDetector
        }

        final item = filteredItems[index];
        bool selected = _cartItems.any((i) => i['id'] == item['id']);
        bool available = item['is_available'] != false && item['is_available'] != 0;

        return GestureDetector(
          onTap: available ? () => _addToCart(item) : null,
          child: Container(
            decoration: BoxDecoration(
              color: themeCard,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: selected ? themePrimary : themeBorder,
                width: selected ? 2 : 1,
              ),
              boxShadow: selected
                  ? [
                      BoxShadow(
                        color: themePrimary.withValues(alpha: 0.15),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ]
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  children: [
                    Container(
                      height: 75,
                      decoration: BoxDecoration(
                        color: themeBorder.withValues(alpha: 0.1),
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(18),
                        ),
                        image: item['image'] != null && item['image'].toString().isNotEmpty
                            ? DecorationImage(
                                image: NetworkImage(resolveImageUrl(item['image'] as String)),
                                fit: BoxFit.cover,
                              )
                            : null,
                      ),
                    ),
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: themePrimary,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: Text(
                          '\$${(item['price'] as double).toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                    if (item['is_available'] == 0 || item['is_available'] == false || item['is_available'] == "0")
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                          ),
                          child: const Center(
                            child: Text(
                              'OUT OF STOCK',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item['name'] as String,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: themeText,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Expanded(
                          child: Text(
                            item['description']?.toString() ?? item['category']?.toString() ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: themeHint, fontSize: 11, height: 1.2),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              item['category']?.toString().toUpperCase() ?? '',
                              style: TextStyle(
                                color: themeHint.withValues(alpha: 0.8),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: themeBg.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.add_shopping_cart, size: 16, color: themePrimary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPOSCart() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: themeBg, // Use themeBg instead of manual ternary
            border: Border(bottom: BorderSide(color: themeBorder)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _buildTypeButton(LocalizationService().translate('dine_in'), Icons.restaurant, _orderType == 'Dine-In', () {
                    setState(() => _orderType = 'Dine-In');
                  }),
                  const SizedBox(width: 8),
                  _buildTypeButton(LocalizationService().translate('pickup'), Icons.shopping_bag_outlined, _orderType == 'Pickup', () {
                    setState(() {
                      _orderType = 'Pickup';
                      _selectedTable = null;
                    });
                  }),
                  const SizedBox(width: 8),
                  _buildTypeButton(LocalizationService().translate('delivery'), Icons.delivery_dining_outlined, _orderType == 'Delivery', () {
                    setState(() {
                      _orderType = 'Delivery';
                      _selectedTable = null;
                    });
                  }),
                ],
              ),
              if (_orderType == 'Dine-In') ...[
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: _showTableSelectDialog,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: themeBg,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: _selectedTable == null ? themePrimary.withValues(alpha: 0.5) : themeBorder),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.table_bar_outlined, color: _selectedTable == null ? themePrimary : themeHint, size: 18),
                              const SizedBox(width: 8),
                              Text(
                                _selectedTable != null 
                                  ? '${LocalizationService().translate('table')} ${_selectedTable!.label}' 
                                  : LocalizationService().translate('select_table'),
                                style: TextStyle(color: _selectedTable != null ? themeText : themeHint, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: themeBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: _selectedWaiter == null ? themePrimary.withValues(alpha: 0.5) : themeBorder),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<Map<String, dynamic>>(
                            value: _selectedWaiter,
                            hint: Text(LocalizationService().translate('select_waiter'), style: TextStyle(color: themeHint, fontSize: 13)),
                            isExpanded: true,
                            dropdownColor: themeCard,
                            style: TextStyle(color: themeText),
                            items: _waiters.map((w) {
                              return DropdownMenuItem<Map<String, dynamic>>(
                                value: w,
                                child: Text(w['name']),
                              );
                            }).toList(),
                            onChanged: (val) => setState(() => _selectedWaiter = val),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                
                // Customer / Guest Selection
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: themeBg.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: themeBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _isNewGuestMode ? 'NEW GUEST REGISTRATION' : 'SELECT CUSTOMER (LOYALTY)',
                            style: TextStyle(color: themeHint, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                          ),
                          InkWell(
                            onTap: () => setState(() => _isNewGuestMode = !_isNewGuestMode),
                            child: Text(
                              _isNewGuestMode ? 'SEARCH EXISTING' : 'ADD NEW GUEST',
                              style: TextStyle(color: themePrimary, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (!_isNewGuestMode)
                        _buildCustomerSelector()
                      else
                        _buildNewGuestForm(),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 14),
            child: _cartItems.isEmpty
                ? Center(
                    child: Text(
                      LocalizationService().translate('no_items_desc'),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: themeHint),
                    ),
                  )
                : SingleChildScrollView(
                    child: DataTable(
                      columnSpacing: 8,
                      horizontalMargin: 0,
                      dataRowMinHeight: 32,
                      dataRowMaxHeight: 44,
                      headingRowHeight: 32,
                      columns: [
                        DataColumn(
                          label: Text(
                            LocalizationService().translate('item'),
                            style: TextStyle(
                              color: themeHint,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            LocalizationService().translate('qty'),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: themeHint,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            LocalizationService().translate('price'),
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              color: themeHint,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Total',
                            textAlign: TextAlign.right,
                            style: TextStyle(
                              color: themeHint,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                      rows: _cartItems.map((item) {
                        return DataRow(
                          cells: [
                            DataCell(
                              Row(
                                children: [
                                  item['image'] != null
                                      ? Image.network(
                                          resolveImageUrl(item['image'] as String),
                                          width: 20,
                                          height: 20,
                                          fit: BoxFit.cover,
                                          errorBuilder:
                                              (
                                                context,
                                                error,
                                                stackTrace,
                                              ) => Icon(
                                                Icons.restaurant_menu_rounded,
                                                color: themePrimary,
                                                size: 18,
                                              ),
                                        )
                                      : Icon(
                                          Icons.restaurant_menu_rounded,
                                          color: themePrimary,
                                          size: 18,
                                        ),
                                  const SizedBox(width: 8),
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
                                            fontSize: 11,
                                          ),
                                        ),
                                        Builder(builder: (context) {
                                          String customizationText = '';
                                          if (item['variant'] != null) customizationText += item['variant']['name'];
                                          if (item['extras'] != null && (item['extras'] as List).isNotEmpty) {
                                            if (customizationText.isNotEmpty) customizationText += ' • ';
                                            customizationText += (item['extras'] as List).map((e) => e['name']).join(', ');
                                          }
                                          if (customizationText.isEmpty && item['description'] != null) {
                                             customizationText = item['description'];
                                          }
                                          if (customizationText.isEmpty) return const SizedBox.shrink();
                                          return Text(
                                            customizationText,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(
                                              color: themeHint,
                                              fontSize: 9,
                                            ),
                                          );
                                        }),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            DataCell(
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      Icons.remove_circle_outline,
                                      color: themePrimary,
                                      size: 18,
                                    ),
                                    onPressed: () => _removeFromCart(
                                      _cartItems.indexOf(item),
                                    ),
                                  ),
                                  Text(
                                    '${item['quantity']}',
                                    style: TextStyle(
                                      color: themeText,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                  IconButton(
                                    icon: Icon(
                                      Icons.add_circle_outline,
                                      color: themePrimary,
                                      size: 18,
                                    ),
                                    onPressed: () => _addToCart(item),
                                  ),
                                ],
                              ),
                            ),
                            DataCell(
                              Builder(builder: (context) {
                                double basePrice = double.tryParse(item['price'].toString()) ?? 0;
                                if (item['variant'] != null) {
                                  basePrice += double.tryParse(item['variant']['price_adjustment'].toString()) ?? 0;
                                }
                                if (item['extras'] != null) {
                                  for (var e in item['extras']) {
                                    basePrice += double.tryParse(e['price_adjustment'].toString()) ?? 0;
                                  }
                                }
                                return Text(
                                  '\$${basePrice.toStringAsFixed(2)}',
                                  textAlign: TextAlign.right,
                                  style: TextStyle(
                                    color: themeHint,
                                    fontSize: 12,
                                  ),
                                );
                              }),
                            ),
                            DataCell(
                              Builder(builder: (context) {
                                double basePrice = double.tryParse(item['price'].toString()) ?? 0;
                                if (item['variant'] != null) {
                                  basePrice += double.tryParse(item['variant']['price_adjustment'].toString()) ?? 0;
                                }
                                if (item['extras'] != null) {
                                  for (var e in item['extras']) {
                                    basePrice += double.tryParse(e['price_adjustment'].toString()) ?? 0;
                                  }
                                }
                                return Text(
                                  '\$${(basePrice * (item['quantity'] ?? 1)).toStringAsFixed(2)}',
                                  textAlign: TextAlign.right,
                                  style: TextStyle(
                                    color: themeText,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                );
                              }),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: themeBg, // Use themeBg instead of manual ternary
            border: Border(top: BorderSide(color: themeBorder)),
          ),
          child: Column(
            children: [
              _buildPriceRow(LocalizationService().translate('subtotal'), '\$${_subtotal.toStringAsFixed(2)}'),
              Row(
                children: [
                  Expanded(
                    child: _buildTappablePriceRow(
                      LocalizationService().translate('tip'),
                      '\$${_tip.toStringAsFixed(2)}',
                      icon: Icons.volunteer_activism_outlined,
                      onTap: () => _showValueInputDialog(LocalizationService().translate('add_tip'), _tip, (val) => setState(() => _tip = val)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildTappablePriceRow(
                      LocalizationService().translate('discount'),
                      '-\$${_discount.toStringAsFixed(2)}',
                      icon: Icons.local_offer_outlined,
                      color: Colors.green,
                      onTap: () => _showValueInputDialog(LocalizationService().translate('apply_discount'), _discount, (val) => setState(() => _discount = val)),
                    ),
                  ),
                ],
              ),
              if (_isTaxEnabled || _reservationFee > 0)
                Row(
                  children: [
                    if (_isTaxEnabled)
                      Expanded(
                        child: _buildPriceRow(
                          '${LocalizationService().translate('tax')} (${_taxRate.toStringAsFixed(_taxRate == _taxRate.truncate() ? 0 : 1)}%)',
                          '\$${_tax.toStringAsFixed(2)}',
                        ),
                      ),
                    if (_isTaxEnabled && _reservationFee > 0) const SizedBox(width: 16),
                    if (_reservationFee > 0)
                      Expanded(
                        child: _buildPriceRow(
                          LocalizationService().translate('advance_paid'),
                          '-\$${_reservationFee.toStringAsFixed(2)}',
                          color: themePrimary,
                        ),
                      ),
                  ],
                ),
              const SizedBox(height: 8),
              _buildPriceRow(
                LocalizationService().translate('total'),
                '\$${_total.toStringAsFixed(2)}',
                isTotal: true,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  // Clear Cart Button (Compact)
                  SizedBox(
                    width: 42,
                    height: 42,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : () {
                        if (_cartItems.isEmpty) return;
                        _clearCart();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red.withValues(alpha: 0.1),
                        foregroundColor: Colors.red,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Icon(Icons.delete_sweep_outlined, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Print Button (Compact)
                  SizedBox(
                    width: 42,
                    height: 42,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _showPrintPreview,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: themePrimary.withValues(alpha: 0.1),
                        foregroundColor: themePrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Icon(Icons.print_rounded, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Split Bill Button (Compact) - Only show if not Pay First
                  if (_paymentPolicy != 'Pay First') ...[
                    SizedBox(
                      width: 42,
                      height: 42,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _showSplitBillDialog,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple.withValues(alpha: 0.1),
                          foregroundColor: Colors.purple,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                          padding: EdgeInsets.zero,
                        ),
                        child: const Icon(Icons.call_split_rounded, size: 20),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  // Primary Action Button (Send to Kitchen OR Pay Now)
                  Expanded(
                    child: SizedBox(
                      height: 42,
                      child: ElevatedButton.icon(
                        icon: _isLoading 
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Icon(
                              (_editingOrderId != null || _paymentPolicy == 'Pay Last') 
                                ? Icons.send_to_mobile_rounded 
                                : Icons.check_circle_outline_rounded, 
                              color: Colors.white, 
                              size: 18
                            ),
                        label: Text(
                          (_editingOrderId != null) 
                            ? LocalizationService().translate('update_order').toUpperCase()
                            : (_paymentPolicy == 'Pay First' 
                                ? LocalizationService().translate('complete_payment').toUpperCase()
                                : LocalizationService().translate('send_to_kitchen').toUpperCase()),
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                        ),
                        onPressed: _isLoading ? null : () {
                          if (_cartItems.isEmpty) {
                            _showWarningDialog(LocalizationService().translate('add_items_to_cart_warning'));
                            return;
                          }
                          
                          if (_orderType == 'Dine-In') {
                            if (_selectedTable == null) {
                              _showWarningDialog(LocalizationService().translate('select_table_warning'));
                              return;
                            }
                            if (_selectedWaiter == null) {
                              _showWarningDialog(LocalizationService().translate('select_waiter_warning'));
                              return;
                            }
                          }

                          if (_paymentPolicy == 'Pay First' && _editingOrderId == null) {
                            if (_isNewGuestMode) {
                              if (_customerFirstNameController.text.trim().isEmpty) {
                                _showWarningDialog(LocalizationService().translate('enter_guest_name_warning'));
                                return;
                              }
                              if (_customerPhoneController.text.trim().isEmpty) {
                                _showWarningDialog(LocalizationService().translate('enter_guest_phone_warning'));
                                return;
                              }
                            }
                            _showCheckoutDialog();
                          } else {
                            _placeOrder();
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: themePrimary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }



  Widget _buildTypeButton(String label, IconData icon, bool isSelected, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? themePrimary : themeBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isSelected ? themePrimary : themeBorder),
            boxShadow: isSelected ? [BoxShadow(color: themePrimary.withValues(alpha: 0.2), blurRadius: 6, offset: const Offset(0, 2))] : null,
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : themeHint, size: 16),
              const SizedBox(height: 4),
              Text(label, style: TextStyle(color: isSelected ? Colors.white : themeText, fontSize: 9, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTagButton(String label, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        color: isSelected ? themePrimary : themeCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: themeBorder),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: isSelected ? Colors.white : themeText,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }


  Widget _buildPriceRow(
    String label,
    String value, {
    bool isTotal = false,
    Color? color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isTotal ? themeText : themeHint,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              fontSize: isTotal ? 14 : 11,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color ?? (isTotal ? themePrimary : themeText),
              fontWeight: FontWeight.bold,
              fontSize: isTotal ? 18 : 13,
            ),
          ),
        ],
      ),
    );
  }

  /// A price row with a pencil-edit icon that triggers a dialog when tapped
  Widget _buildTappablePriceRow(
    String label,
    String value, {
    Color? color,
    IconData icon = Icons.edit,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(icon, size: 14, color: color ?? themeHint),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(color: themeHint, fontSize: 11),
                ),
                const SizedBox(width: 4),
                if (onTap != null) Icon(Icons.edit, size: 12, color: color ?? themeHint),
              ],
            ),
            Text(
              value,
              style: TextStyle(
                color: color ?? themeText,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Outlined button with icon and colored border
  Widget _buildOutlinedActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback? onPressed,
  }) {
    return SizedBox(
      height: 36,
      child: ElevatedButton.icon(
        onPressed: (_isLoading || onPressed == null) ? null : onPressed,
        icon: Icon(icon, size: 16, color: Colors.white),
        label: Text(
          label.toUpperCase(), 
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 9)
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 4),
        ),
      ),
    );
  }

  /// Dialog to enter a numeric value (tip or discount)
  void _showValueInputDialog(String title, double currentValue, void Function(double) onConfirm) {
    final controller = TextEditingController(text: currentValue > 0 ? currentValue.toStringAsFixed(2) : '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: themePrimary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(title.contains('Tip') ? Icons.volunteer_activism : Icons.local_offer, color: themePrimary, size: 20),
            ),
            const SizedBox(width: 12),
            Text(title, style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Wrap(
              spacing: 8,
              children: [5.0, 10.0, 15.0, 20.0].map((amt) => ActionChip(
                label: Text('\$$amt', style: const TextStyle(fontWeight: FontWeight.bold)),
                backgroundColor: themePrimary.withValues(alpha: 0.1),
                side: BorderSide(color: themePrimary.withValues(alpha: 0.3)),
                labelStyle: TextStyle(color: themePrimary),
                onPressed: () => controller.text = amt.toStringAsFixed(2),
              )).toList(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
              style: TextStyle(color: themeText, fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                prefixText: '\$  ',
                prefixStyle: TextStyle(color: themePrimary, fontSize: 20, fontWeight: FontWeight.bold),
                hintText: '0.00',
                hintStyle: TextStyle(color: themeHint),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: themeBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: themePrimary, width: 2),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              onConfirm(0.0);
              Navigator.pop(ctx);
            },
            child: Text('Clear', style: TextStyle(color: Colors.red.withValues(alpha: 0.8))),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: themeHint)),
          ),
          ElevatedButton(
            onPressed: () {
              final val = double.tryParse(controller.text) ?? 0.0;
              onConfirm(val);
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: themePrimary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Apply', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerSelector() {
    return Column(
      children: [
        TextField(
          onChanged: (val) => setState(() => _customerSearchQuery = val),
          style: TextStyle(color: themeText, fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Search by Name or Phone...',
            hintStyle: TextStyle(color: themeHint, fontSize: 12),
            prefixIcon: Icon(Icons.search, size: 18, color: themePrimary),
            filled: true,
            fillColor: themeBg,
            contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
          ),
        ),
        if (_customerSearchQuery.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 8),
            constraints: const BoxConstraints(maxHeight: 200),
            decoration: BoxDecoration(
              color: themeCard,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: themeBorder),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
            ),
            child: ListView(
              shrinkWrap: true,
              children: _allCustomers.where((c) {
                final q = _customerSearchQuery.toLowerCase();
                return (c['first_name']?.toString().toLowerCase().contains(q) ?? false) ||
                       (c['phone']?.toString().toLowerCase().contains(q) ?? false);
              }).map((c) {
                final isSelected = _selectedCustomer?['id'] == c['id'];
                return ListTile(
                  dense: true,
                  title: Text(c['first_name'] ?? 'Guest', style: TextStyle(color: themeText, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                  subtitle: Text(c['phone'] ?? '', style: TextStyle(color: themeHint, fontSize: 11)),
                  trailing: isSelected ? Icon(Icons.check_circle, color: themePrimary, size: 18) : null,
                  onTap: () {
                    setState(() {
                      _selectedCustomer = c;
                      _customerSearchQuery = '';
                    });
                  },
                );
              }).toList(),
            ),
          ),
        if (_selectedCustomer != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: themePrimary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: themePrimary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.person, color: themePrimary, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Selected: ${_selectedCustomer!['first_name']} (${_selectedCustomer!['phone']})',
                      style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, size: 14, color: themePrimary),
                    onPressed: () => setState(() => _selectedCustomer = null),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildNewGuestForm() {
    return Column(
      children: [
        _buildCRMField(_customerFirstNameController, 'Full Name', Icons.person_outline),
        const SizedBox(height: 8),
        _buildCRMField(_customerPhoneController, 'Phone Number', Icons.phone_android),
        const SizedBox(height: 8),
        _buildCRMField(_customerEmailController, 'Email (Optional)', Icons.email_outlined),
      ],
    );
  }

  Widget _buildCRMField(TextEditingController controller, String label, IconData icon) {
    return TextField(
      controller: controller,
      style: TextStyle(color: themeText, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: themeHint, fontSize: 11),
        prefixIcon: Icon(icon, size: 16, color: themePrimary),
        filled: true,
        fillColor: themeBg,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      ),
    );
  }

  Widget _buildKDSView() {
    final kdsOrders = _placedOrders.where((o) {
      final status = (o['status']?.toString() ?? '').toLowerCase();
      return ['pending', 'preparing', 'ready', 'rejected', 'paid', 'partially paid', 'ordered'].contains(status);
    }).toList();

    if (kdsOrders.isEmpty) {
      return Container(
        color: themeBg,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.kitchen_rounded, size: 80, color: themeHint.withValues(alpha: 0.2)),
              const SizedBox(height: 16),
              Text(LocalizationService().translate('no_kds_orders'), style: TextStyle(color: themeHint, fontSize: 18, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      );
    }

    int pendingCount = _placedOrders.where((o) {
      final s = (o['status']?.toString() ?? '').toLowerCase();
      return s == 'pending' || s == 'ordered' || s == 'paid' || s == 'partially paid';
    }).length;
    int preparingCount = _placedOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'preparing').length;
    int readyCount = _placedOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'ready').length;
    int rejectedCount = _placedOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'rejected').length;

    return DefaultTabController(
      length: 4,
      child: Container(
        color: themeBg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(LocalizationService().translate('kitchen_production'), style: TextStyle(color: themeText, fontSize: 22, fontWeight: FontWeight.bold)),
                      Text('${kdsOrders.length} ${LocalizationService().translate('active_tickets')}', style: TextStyle(color: themeHint, fontSize: 13)),
                    ],
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.refresh_rounded, color: themePrimary),
                    onPressed: () {
                      _fetchOrders();
                      _fetchSummary();
                    },
                  ),
                  const SizedBox(width: 16),
                  Container(
                    width: 550,
                    decoration: BoxDecoration(
                      color: themeCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: themeBorder),
                    ),
                    child: TabBar(
                      indicatorSize: TabBarIndicatorSize.tab,
                      indicator: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        color: themePrimary,
                      ),
                      labelColor: Colors.white,
                      unselectedLabelColor: themeHint,
                      labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
                      tabs: [
                        _buildKDSMainTab(LocalizationService().translate('pending'), pendingCount),
                        _buildKDSMainTab(LocalizationService().translate('preparing'), preparingCount),
                        _buildKDSMainTab(LocalizationService().translate('ready'), readyCount),
                        _buildKDSMainTab(LocalizationService().translate('rejected'), rejectedCount),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                   _buildKDSTab('Pending'),
                   _buildKDSTab('Preparing'),
                   _buildKDSTab('Ready'),
                   _buildKDSTab('Rejected'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKDSMainTab(String label, int count) {
    return Tab(
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(label.toUpperCase()),
          ),
          if (count > 0)
            Positioned(
              right: -12,
              top: -12,
              child: Container(
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  border: Border.all(color: themePrimary, width: 1.5),
                ),
                child: Center(
                  child: Text(
                    '$count',
                    style: TextStyle(color: themePrimary, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
  Widget _buildKDSTab(String status) {
    final filteredOrders = _placedOrders.where((o) {
      final oStatus = (o['status']?.toString() ?? '').toLowerCase();
      final matchesStatus = (status == 'Pending') 
        ? (oStatus == 'pending' || oStatus == 'ordered' || oStatus == 'paid' || oStatus == 'partially paid') 
        : (oStatus == status.toLowerCase());
      return matchesStatus;
    }).toList()
      ..sort((a, b) => (int.tryParse(b['id'].toString()) ?? 0).compareTo(int.tryParse(a['id'].toString()) ?? 0));

    if (filteredOrders.isEmpty) {
      return Center(
        child: Text('${LocalizationService().translate('no_orders_in')} ${LocalizationService().translate(status.toLowerCase())}', style: TextStyle(color: themeHint, fontSize: 14)),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 6,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.8,
      ),
      itemCount: filteredOrders.length,
      itemBuilder: (context, index) {
        final order = filteredOrders[index];
        final items = order['items'] as List? ?? [];
        return Container(
          decoration: BoxDecoration(
            color: themeCard,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: themeBorder),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: order['status'] == 'Ready' 
                    ? Colors.green.withValues(alpha: 0.08) 
                    : themePrimary.withValues(alpha: 0.08),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '#${order['order_number'] ?? order['id']}', 
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: themeText)
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Icon(Icons.access_time_rounded, size: 14, color: themeHint),
                                const SizedBox(width: 4),
                                Text(
                                  _getLapseTime(order['order_time']),
                                  style: TextStyle(color: themeHint, fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ],
                        ),
                        _buildOrderStatusChip(order['status'] ?? 'Unknown'),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        if (order['table_number'] != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.green.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${LocalizationService().translate('table')} ${order['table_number']}', 
                              style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11)
                            ),
                          )
                        else
                          Text(order['order_type'] ?? 'Dine-In', style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 11)),
                        
                        if (order['origin'] != null && order['origin'] != 'In-Store')
                          _buildOriginBadge(order['origin']),
                        _buildPaymentStatusBadge(order['status'] ?? 'Unknown'),
                      ],
                    ),
                  ],
                ),
              ),
              // Items
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(10),
                  itemCount: items.length,
                  itemBuilder: (context, idx) {
                    final item = items[idx];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('x${item['quantity']}', style: TextStyle(fontWeight: FontWeight.bold, color: themePrimary, fontSize: 12)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item['name'] ?? 'Item', style: TextStyle(color: themeText, fontWeight: FontWeight.w600, fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis),
                                if (item['variant'] != null)
                                  Text(
                                    'V: ${item['variant']['name']}',
                                    style: TextStyle(color: themePrimary, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                if (item['extras'] != null && (item['extras'] as List).isNotEmpty)
                                  Text(
                                    'E: ${(item['extras'] as List).map((e) => e['name']).join(', ')}',
                                    style: TextStyle(color: themePrimaryAccent, fontSize: 9, fontWeight: FontWeight.w500),
                                  ),
                                if (item['notes'] != null && item['notes'].toString().isNotEmpty)
                                   Text(item['notes'], style: TextStyle(color: themeHint, fontSize: 9, fontStyle: FontStyle.italic)),
                              ],
                            ),
                          ),
                          if (order['status'] == 'Pending')
                            InkWell(
                              onTap: () => _removeOrderItem(order['id'], item['id']),
                              child: const Icon(Icons.close, color: Colors.red, size: 14),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              if (order['status'] == 'Rejected' && order['rejection_reason'] != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  margin: const EdgeInsets.only(bottom: 4),
                  color: Colors.red.withValues(alpha: 0.1),
                  child: Text(
                    'REASON: ${order['rejection_reason']}',
                    style: const TextStyle(color: Colors.red, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              // Footer / Action
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    if (order['status'] == 'Pending' || order['status'] == 'Ordered' || order['status'] == 'Paid' || order['status'] == 'Partially Paid') ...[
                      Expanded(
                        flex: 1,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            elevation: 0,
                          ),
                          onPressed: () => _showRejectionDialog(order['id']),
                          child: const Text('REJECT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 4),
                    ],
                    if (order['status'] != 'Rejected')
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: (order['status'] == 'Pending' || order['status'] == 'Ordered' || order['status'] == 'Paid') ? Colors.green : (order['status'] == 'Preparing' ? themePrimary : themePrimary),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            elevation: 0,
                          ),
                          onPressed: () {
                            String nextStatus = 'Preparing';
                            if (order['status'] == 'Preparing') nextStatus = 'Ready';
                            if (order['status'] == 'Ready') nextStatus = 'Served';
                            _updateOrderStatus(order['id'], nextStatus);
                          },
                          child: Text(
                            (order['status'] == 'Pending' || order['status'] == 'Ordered' || order['status'] == 'Paid') ? 'ACCEPT' : (order['status'] == 'Preparing' ? 'READY' : 'SERVE'),
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOrderStatusChip(String status) {
    Color getStatusColor(String s) {
      switch (s) {
        case 'Pending': return Colors.red;
        case 'Ordered': return Colors.orange;
        case 'Preparing': return themePrimary;
        case 'Ready': return Colors.greenAccent[700]!;
        case 'Served': return Colors.teal;
        case 'Paid': return Colors.green;
        case 'Cancelled': return Colors.grey;
        default: return Colors.grey;
      }
    }
    Color c = getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c),
      ),
      child: Text(
        status,
        style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }


  String _getLapseTime(String? orderTimeStr) {
    if (orderTimeStr == null) return '--:--';
    try {
      DateTime orderTime = DateTime.parse(orderTimeStr).toLocal();
      Duration diff = DateTime.now().toLocal().difference(orderTime);
      if (diff.isNegative) return "00:00";
      int minutes = diff.inMinutes;
      int seconds = diff.inSeconds % 60;
      return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    } catch (_) {
      return '--:--';
    }
  }

  Widget _buildPaymentStatusBadge(String status) {
    bool isPaid = status == 'Paid' || status == 'Partially Paid' || status == 'Served';
    if (isPaid) return const SizedBox.shrink(); // Hide if already paid/served to avoid duplication with status chip
    
    Color color = Colors.deepOrange;
    String label = 'UNPAID';
    IconData icon = Icons.error_outline;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
              Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOriginBadge(String? origin) {
    if (origin == null || origin == 'In-Store' || origin.isEmpty) return const SizedBox.shrink();
    
    Color badgeColor = origin == 'Website' ? themePrimary : Colors.purple;
    IconData badgeIcon = origin == 'Website' ? Icons.language : Icons.qr_code_scanner;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: badgeColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(badgeIcon, size: 12, color: badgeColor),
          const SizedBox(width: 4),
          Text(origin.toUpperCase(), style: TextStyle(color: badgeColor, fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Future<void> _handlePdfDownload(Map<String, dynamic> order) async {
    try {
      final pdfBytes = await ReceiptService.generateInvoicePdf(order: order, settings: _settings);
      final blob = html.Blob([pdfBytes], 'application/pdf');
      final url = html.Url.createObjectUrlFromBlob(blob);
      html.AnchorElement(href: url)
        ..setAttribute('download', 'Invoice_${order['order_number'] ?? order['id']}.pdf')
        ..click();
      html.Url.revokeObjectUrl(url);
    } catch (e) {
      debugPrint('Error downloading PDF: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to download PDF: $e')),
      );
    }
  }

  void _showOrderDetailsDialog(Map<String, dynamic> order) {
    showDialog(
      context: context,
      builder: (context) => Theme(
        data: ThemeService().themeData,
        child: Dialog(
          backgroundColor: themeCard,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Container(
            width: MediaQuery.of(context).size.width * 0.45,
            height: MediaQuery.of(context).size.height * 0.85,
            padding: const EdgeInsets.all(28),
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
                          LocalizationService().translate('order_details'), 
                          style: TextStyle(color: themePrimary, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2)
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${order['order_number'] ?? order['id']}', 
                          style: TextStyle(color: themeText, fontSize: 24, fontWeight: FontWeight.bold)
                        ),
                      ],
                    ),
                    IconButton(
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: themeBg, shape: BoxShape.circle),
                        child: Icon(Icons.close, color: themeHint, size: 20),
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const Divider(height: 40),
                Expanded(
                  child: ListView.builder(
                    itemCount: (order['items'] as List? ?? []).length,
                    itemBuilder: (context, index) {
                      final item = (order['items'] as List)[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: themeBg.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: themePrimary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text('x${item['quantity']}', style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item['name'] ?? 'Item', style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 16)),
                                  if (item['variant'] != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        '${LocalizationService().translate('variant')}: ${item['variant']['name']}',
                                        style: TextStyle(color: themePrimary, fontSize: 12, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  if (item['extras'] != null && (item['extras'] as List).isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Wrap(
                                        spacing: 8,
                                        children: (item['extras'] as List).map<Widget>((e) => Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(color: themePrimary.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(4)),
                                          child: Text('+ ${e['name']}', style: TextStyle(color: themePrimaryAccent, fontSize: 11)),
                                        )).toList(),
                                      ),
                                    ),
                                  if (item['notes'] != null && item['notes'].toString().isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Row(
                                        children: [
                                          Icon(Icons.notes, size: 12, color: themeHint),
                                          const SizedBox(width: 4),
                                          Expanded(child: Text(item['notes'], style: TextStyle(color: themeHint, fontSize: 12, fontStyle: FontStyle.italic))),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              '\$${double.tryParse(item['subtotal'].toString())?.toStringAsFixed(2) ?? '0.00'}',
                              style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const Divider(height: 40),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(LocalizationService().translate('total_amount'), style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.w500)),
                    Text('\$${double.tryParse(order['total_amount'].toString())?.toStringAsFixed(2) ?? '0.00'}', style: TextStyle(color: themePrimary, fontSize: 28, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _handlePdfDownload(order),
                        icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.white, size: 20),
                        label: Text(LocalizationService().translate('download_pdf'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red[800], 
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => ReceiptService.printReceipt(order: Map<String, dynamic>.from(order), settings: _settings),
                        icon: const Icon(Icons.print_rounded, color: Colors.white, size: 20),
                        label: Text(LocalizationService().translate('print'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey[850], 
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (order['status'] != 'Paid' && order['status'] != 'Cancelled' && order['status'] != 'Rejected')
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _showExistingOrderCheckoutDialog(order);
                          },
                          icon: const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                          label: Text(LocalizationService().translate('checkout_btn'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green[700], 
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOrdersView() {
    final now = DateTime.now();
    final filteredOrders = _placedOrders.where((o) {
      // 1. Status Filter
      if (_orderStatusFilter != 'ALL') {
        final oStatus = o['status'].toString().toLowerCase();
        final f = _orderStatusFilter.toLowerCase();
        bool matches = false;
        if (f == 'pending') {
          matches = (oStatus == 'pending' || oStatus == 'ordered' || oStatus == 'preparing' || oStatus == 'paid' || oStatus == 'partially paid');
        } else {
          matches = (oStatus == f);
        }
        if (!matches) return false;
      }
      
      // 2. Current Month Filter
      try {
        final date = DateTime.parse(o['order_time']).toLocal();
        if (date.month != now.month || date.year != now.year) return false;
      } catch (_) { return false; }
      
      return true;
    }).toList()
      ..sort((a, b) => (int.tryParse(b['id'].toString()) ?? 0).compareTo(int.tryParse(a['id'].toString()) ?? 0));

    return Container(
      color: themeBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header & Filters
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(LocalizationService().translate('live_order_feed'), style: TextStyle(color: themeText, fontSize: 28, fontWeight: FontWeight.bold)),
                    Text(LocalizationService().translate('monthly_operational_history'), style: TextStyle(color: themeHint, fontSize: 13)),
                  ],
                ),
                const Spacer(),
                _buildOrderFilters(),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Orders List in Tabular Format
          Expanded(
            child: filteredOrders.isEmpty 
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 80, color: themeHint.withValues(alpha: 0.3)),
                      const SizedBox(height: 16),
                      Text(LocalizationService().translate('no_orders_found'), style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: filteredOrders.length,
                  itemBuilder: (context, index) {
                    final order = filteredOrders[index];
                    final String timeStr = _formatDateTime(order['order_time']?.toString());
                    final double total = double.tryParse(order['total_amount'].toString()) ?? 0.0;
                    
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: themeCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: themeBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          )
                        ],
                      ),
                      child: Row(
                        children: [
                          // Actions
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Tooltip(
                                message: LocalizationService().translate('edit'),
                                child: IconButton(
                                  icon: Icon(Icons.edit_note_rounded, color: themePrimary, size: 22),
                                  onPressed: () {
                                    setState(() {
                                      _cartItems = (order['items'] as List).map((item) => {
                                        'id': item['menu_item_id'] ?? 'custom-${item['id']}',
                                        'name': item['name'],
                                        'price': double.tryParse(item['unit_price']?.toString() ?? '') ?? 
                                                 ((double.tryParse(item['subtotal'].toString()) ?? 0.0) / (item['quantity'] ?? 1)),
                                        'quantity': item['quantity'],
                                        'notes': item['notes'],
                                        'extras': item['extras'],
                                        'variants': item['variants'],
                                      }).toList();
                                      _editingOrderId = order['id'];
                                      _selectedTabIndex = 0;
                                      _orderType = order['order_type'] ?? 'Dine-In';
                                    });
                                  },
                                ),
                              ),
                              Tooltip(
                                message: LocalizationService().translate('print'),
                                child: IconButton(
                                  icon: const Icon(Icons.print_rounded, color: Colors.blue, size: 20),
                                  onPressed: () => ReceiptService.printReceipt(order: order, settings: _settings),
                                ),
                              ),
                              Tooltip(
                                message: LocalizationService().translate('split_bill'),
                                child: IconButton(
                                  icon: Icon(Icons.call_split_rounded, color: Colors.purple, size: 20),
                                  onPressed: () {
                                    setState(() {
                                      _cartItems = (order['items'] as List).map((item) => {
                                        'id': item['menu_item_id'] ?? 'custom-${item['id']}',
                                        'name': item['name'],
                                        'price': double.tryParse(item['unit_price']?.toString() ?? '') ?? 
                                                 ((double.tryParse(item['subtotal'].toString()) ?? 0.0) / (item['quantity'] ?? 1)),
                                        'quantity': item['quantity'],
                                        'notes': item['notes'],
                                        'extras': item['extras'],
                                        'variants': item['variants'],
                                      }).toList();
                                      _editingOrderId = order['id'];
                                      _orderType = order['order_type'] ?? 'Dine-In';
                                    });
                                    _showSplitBillDialog();
                                  },
                                ),
                              ),
                              Tooltip(
                                message: LocalizationService().translate('merge_bill'),
                                child: IconButton(
                                  icon: Icon(Icons.merge_type_rounded, color: Colors.orange, size: 20),
                                  onPressed: () {
                                    setState(() {
                                      _cartItems = (order['items'] as List).map((item) => {
                                        'id': item['menu_item_id'] ?? 'custom-${item['id']}',
                                        'name': item['name'],
                                        'price': double.tryParse(item['unit_price']?.toString() ?? '') ?? 
                                                 ((double.tryParse(item['subtotal'].toString()) ?? 0.0) / (item['quantity'] ?? 1)),
                                        'quantity': item['quantity'],
                                        'notes': item['notes'],
                                        'extras': item['extras'],
                                        'variants': item['variants'],
                                      }).toList();
                                      _editingOrderId = order['id'];
                                      _orderType = order['order_type'] ?? 'Dine-In';
                                    });
                                    _showMergeBillDialog();
                                  },
                                ),
                              ),
                              Tooltip(
                                message: LocalizationService().translate('download_pdf'),
                                child: IconButton(
                                  icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 20),
                                  onPressed: () => _handlePdfDownload(Map<String, dynamic>.from(order)),
                                ),
                              ),
                              Tooltip(
                                message: LocalizationService().translate('view_details'),
                                child: IconButton(
                                  icon: Icon(Icons.visibility_rounded, color: themePrimary, size: 20),
                                  onPressed: () => _showOrderDetailsDialog(order),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 24),

                          // ID Badge
                          Tooltip(
                            message: LocalizationService().translate('order_serial'),
                            child: Container(
                              width: 55, height: 40,
                              decoration: BoxDecoration(color: themePrimary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('SN', style: TextStyle(color: themePrimary, fontSize: 9, fontWeight: FontWeight.bold)),
                                  Text(
                                    order['order_number']?.toString().split('-').last ?? order['id'].toString(), 
                                    style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 13)
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 20),

                          // Order Details
                          Expanded(
                            flex: 3,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      order['order_number'] ?? 'Order ${order['id']}', 
                                      style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 15)
                                    ),
                                    const SizedBox(width: 8),
                                    _buildOriginBadge(order['origin']),
                                    _buildPaymentStatusBadge(order['status'] ?? 'Unknown'),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Icon(Icons.access_time_rounded, size: 12, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text(timeStr, style: TextStyle(color: themeHint, fontSize: 11)),
                                    const SizedBox(width: 8),
                                    Icon(Icons.table_bar_outlined, size: 12, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text(
                                      order['table_number'] != null ? '${LocalizationService().translate('table')} ${order['table_number']}' : (order['order_type'] ?? 'Dine-In'),
                                      style: TextStyle(color: themeHint, fontSize: 11)
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(Icons.restaurant_menu_rounded, size: 12, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text('${(order['items'] as List?)?.length ?? 0} Items', style: TextStyle(color: themeHint, fontSize: 11)),
                                  ],
                                ),
                                if (order['status'] == 'Rejected' || order['status'] == 'Cancelled')
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4.0),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error_outline, size: 14, color: Colors.red),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${LocalizationService().translate('rejection_reason')}: ${order['cancel_reason'] ?? 'No Reason'}',
                                          style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),

                          // Amount
                          Expanded(
                            flex: 1,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('\$${total.toStringAsFixed(2)}', style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 16)),
                                Text(LocalizationService().translate('total_amount'), style: TextStyle(color: themeHint, fontSize: 11)),
                              ],
                            ),
                          ),

                          const SizedBox(width: 24),

                          // Status
                          _buildOrderStatusChip(order['status'] ?? 'Unknown'),
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

  Widget _buildOrderFilters() {
    final filters = ['all', 'pending', 'preparing', 'ready', 'paid', 'rejected', 'cancelled'];
    return Row(
      children: filters.map((f) {
        final bool sel = _orderStatusFilter.toLowerCase() == f;
        int count = 0;
        if (f == 'all') {
          count = _placedOrders.length;
        } else if (f == 'pending') {
          count = _placedOrders.where((o) {
            final s = o['status'].toString().toLowerCase();
            return s == 'pending' || s == 'ordered' || s == 'preparing' || s == 'paid' || s == 'partially paid';
          }).length;
        } else {
          count = _placedOrders.where((o) => o['status'].toString().toLowerCase() == f).length;
        }

        return GestureDetector(
          onTap: () => setState(() {
            _orderStatusFilter = f.toUpperCase();
            _selectedOrderDetails = null; // Clear selection when filtering
          }),
          child: Container(
            margin: const EdgeInsets.only(left: 12, top: 8),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? themePrimary : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? themePrimary : themeBorder),
                  ),
                  child: Text(
                    LocalizationService().translate(f).toUpperCase(),
                    style: TextStyle(color: sel ? Colors.white : themeHint, fontWeight: sel ? FontWeight.bold : FontWeight.w500, fontSize: 11)
                  ),
                ),
                if (count > 0)
                  Positioned(
                    right: -6,
                    top: -6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      decoration: BoxDecoration(
                        color: sel ? Colors.white : themePrimary,
                        shape: BoxShape.circle,
                        border: Border.all(color: sel ? themePrimary : themeBg, width: 1.5),
                      ),
                      child: Center(
                        child: Text(
                          '$count',
                          style: TextStyle(
                            color: sel ? themePrimary : Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }



  Widget _buildReservationStatusChip(String status) {
    Color getStatusColor(String s) {
      switch (s.toLowerCase()) {
        case 'pending': return themePrimary;
        case 'confirmed': return themePrimary;
        case 'seated': return Colors.greenAccent[700]!;
        case 'completed': return Colors.teal;
        case 'cancelled':
        case 'no-show': return Colors.red;
        default: return Colors.grey;
      }
    }
    Color c = getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildReservationsView() {
    DateTime now = DateTime.now();

    final filteredRes = _reservations.where((r) {
      if (r['reservation_date'] != null) {
        try {
          DateTime resDate = DateTime.parse(r['reservation_date']).toLocal();
          // Filter for current month only
          if (resDate.month != now.month || resDate.year != now.year) return false;
          // Also hide past days of the same month if needed? 
          // User said "current month", so we show everything in the month.
        } catch (_) {}
      }

      if (_reservationStatusFilter != 'ALL' && _reservationStatusFilter != 'Upcoming') {
        if (r['status'].toString().toLowerCase() != _reservationStatusFilter.toLowerCase()) return false;
      }

      if (_reservationStatusFilter == 'Upcoming') {
         String st = r['status'].toString().toLowerCase();
         if (st == 'cancelled' || st == 'completed' || st == 'no-show') return false;
      }

      return true;
    }).toList()
      ..sort((a, b) => (int.tryParse(b['id'].toString()) ?? 0).compareTo(int.tryParse(a['id'].toString()) ?? 0));

    return Row(
      children: [
        Expanded(
          flex: 2,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(LocalizationService().translate('live_bookings'), style: TextStyle(color: themeText, fontSize: 24, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 24),
                    ElevatedButton.icon(
                      onPressed: _showNewReservationDialog,
                      icon: const Icon(Icons.add, color: Colors.white, size: 18),
                      label: Text(LocalizationService().translate('add_new_booking'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: themePrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const Spacer(),
                    _buildReservationFilters(),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  itemCount: filteredRes.length,
                  itemBuilder: (context, index) {
                    final res = filteredRes[index];
                    final bool isSelected = _selectedReservationDetails != null && _selectedReservationDetails!['id'] == res['id'];
                    
                    return GestureDetector(
                      onTap: () => setState(() => _selectedReservationDetails = res),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isSelected ? themePrimary.withValues(alpha: 0.1) : themeCard,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isSelected ? themePrimary : themeBorder),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text('${res['first_name']} ${res['last_name'] ?? ''}'.trim(), 
                                      style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold)),
                                    const SizedBox(width: 12),
                                    _buildReservationStatusChip(res['status'] ?? 'pending'),
                                    if (res['origin'] != null && res['origin'] != 'In-Store') ...[
                                      const SizedBox(width: 8),
                                      _buildOriginBadge(res['origin']),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(Icons.people, size: 14, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text('${res['party_size']} ${LocalizationService().translate('guests')}', style: TextStyle(color: themeHint, fontSize: 13, fontWeight: FontWeight.w600)),
                                    const SizedBox(width: 12),
                                    Icon(Icons.access_time_filled, size: 14, color: themePrimary),
                                    const SizedBox(width: 4),
                                    Text('${res['reservation_time']?.toString().substring(0,5)}', style: TextStyle(color: themePrimary, fontSize: 13, fontWeight: FontWeight.bold)),
                                    if (res['table_id'] != null) ...[
                                      const SizedBox(width: 12),
                                      Icon(Icons.table_restaurant, size: 14, color: Colors.green),
                                      const SizedBox(width: 4),
                                      Text('${LocalizationService().translate('table')} ${res['table_id']}', style: const TextStyle(color: Colors.green, fontSize: 13, fontWeight: FontWeight.bold)),
                                    ]
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        Expanded(
          flex: 1,
          child: Container(
            decoration: BoxDecoration(
              color: themeCard,
              border: Border(left: BorderSide(color: themeBorder)),
            ),
            child: _selectedReservationDetails == null
                ? Center(child: Text(LocalizationService().translate('select_booking_details'), style: TextStyle(color: themeHint)))
                : _buildReservationDetailsPane(),
          ),
        ),
      ],
    );
  }

  Widget _buildReservationFilters() {
    final filters = ['Upcoming', 'Pending', 'Confirmed', 'Seated', 'ALL'];
    return Row(
      children: filters.map((f) {
        final bool sel = _reservationStatusFilter == f;
        int count = 0;
        if (f == 'ALL') {
          count = _reservations.length;
        } else {
          count = _reservations.where((r) => r['status'] == f).length;
        }

        return GestureDetector(
          onTap: () => setState(() {
            _reservationStatusFilter = f;
            _selectedReservationDetails = null; // Clear selection
          }),
          child: Container(
            margin: const EdgeInsets.only(left: 12, top: 8),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? themePrimary : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? themePrimary : themeBorder),
                  ),
                  child: Text(
                    LocalizationService().translate(f == 'ALL' ? 'all_caps' : f.toLowerCase()).toUpperCase(),
                    style: TextStyle(color: sel ? Colors.white : themeHint, fontWeight: sel ? FontWeight.bold : FontWeight.w500, fontSize: 11)
                  ),
                ),
                if (count > 0)
                  Positioned(
                    right: -6,
                    top: -6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      decoration: BoxDecoration(
                        color: sel ? Colors.white : themePrimary,
                        shape: BoxShape.circle,
                        border: Border.all(color: sel ? themePrimary : themeBg, width: 1.5),
                      ),
                      child: Center(
                        child: Text(
                          '$count',
                          style: TextStyle(
                            color: sel ? themePrimary : Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      );
    }

  Widget _buildWaitingView() {
    // Filter logic based on the selected tab
    final filteredOrders = _placedOrders.where((o) {
      final s = (o['status']?.toString() ?? '').toLowerCase();
      if (_waitingTab == 'Active') {
        return ['pending', 'ordered', 'preparing', 'paid', 'partially paid'].contains(s);
      } else if (_waitingTab == 'Ready') {
        return s == 'ready';
      }
      return false;
    }).toList();

    // Tab Counts for Badges
    int activeCount = _placedOrders.where((o) {
      final s = o['status'].toString().toLowerCase();
      return ['pending', 'ordered', 'preparing', 'paid', 'partially paid'].contains(s);
    }).length;
    int readyCount = _placedOrders.where((o) {
      final s = o['status'].toString().toLowerCase();
      return s == 'ready';
    }).length;

    // Analytics Calculations based on Tab
    double mainMetric = 0;
    String metricLabel = LocalizationService().translate('avg_prep_time');
    if (filteredOrders.isNotEmpty) {
      if (_waitingTab == 'Active') {
        final totalSeconds = filteredOrders.fold<int>(0, (prev, o) {
          try {
            final startTime = DateTime.parse(o['order_time']).toLocal();
            return prev + DateTime.now().difference(startTime).inSeconds;
          } catch (_) { return prev; }
        });
        mainMetric = totalSeconds / filteredOrders.length / 60;
      } else if (_waitingTab == 'Ready') {
        metricLabel = LocalizationService().translate('avg_counter_time');
        final totalSeconds = filteredOrders.fold<int>(0, (prev, o) {
          try {
            final readyTime = DateTime.parse(o['updated_at'] ?? o['order_time']).toLocal();
            return prev + DateTime.now().difference(readyTime).inSeconds;
          } catch (_) { return prev; }
        });
        mainMetric = totalSeconds / filteredOrders.length / 60;
      } else {
        metricLabel = LocalizationService().translate('cancellation_rate');
        final cancelled = filteredOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'cancelled').length;
        mainMetric = (cancelled / filteredOrders.length) * 100;
      }
    }

    return Container(
      color: themeBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Analytical Header Stats
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
            child: Row(
              children: [
                _buildStatCard(
                  metricLabel, 
                  _waitingTab == 'History' ? '${mainMetric.toStringAsFixed(1)}%' : '${mainMetric.toStringAsFixed(1)} min', 
                  _waitingTab == 'Ready' ? Icons.room_service : Icons.timer, 
                  _waitingTab == 'History' ? Colors.red : Colors.blue
                ),
                const SizedBox(width: 16),
                _buildStatCard(
                  LocalizationService().translate('orders_in_view'), 
                  '${filteredOrders.length}', 
                  Icons.receipt_long, 
                  themePrimary
                ),
                const Spacer(),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(LocalizationService().translate('order_velocity_analytics'), style: TextStyle(color: themeText, fontSize: 24, fontWeight: FontWeight.bold)),
                    Text(LocalizationService().translate('lifecycle_tracking'), style: TextStyle(color: themeHint, fontSize: 13)),
                  ],
                ),
              ],
            ),
          ),

          // Sub-Tab Navigation
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: Row(
              children: [
                _buildWaitingTab('Active', activeCount, Icons.fireplace_rounded),
                const SizedBox(width: 12),
                _buildWaitingTab('Ready', readyCount, Icons.check_circle_outline),
              ],
            ),
          ),

          // Table Header
          Expanded(
            child: filteredOrders.isEmpty 
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: themeCard,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: themePrimary.withValues(alpha: 0.1), blurRadius: 40, spreadRadius: 10)],
                        ),
                        child: Icon(Icons.auto_graph_rounded, size: 80, color: themePrimary.withValues(alpha: 0.2)),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        '${LocalizationService().translate('no_orders_in')} ${LocalizationService().translate(_waitingTab.toLowerCase())}', 
                        style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold)
                      ),
                      Text(
                        'Operational dashboard is ready for incoming tickets.',
                        style: TextStyle(color: themeHint, fontSize: 14)
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(24),
                  itemCount: filteredOrders.length,
                  itemBuilder: (context, index) {
                    final order = filteredOrders[index];
                    final String lapse = _getLapseTime(order['order_time']);
                    
                    // Progress Calculation
                    int minutes = 0;
                    try {
                      final startTime = DateTime.parse(order['order_time']).toLocal();
                      minutes = DateTime.now().difference(startTime).inMinutes;
                    } catch (_) {}
                    double progress = (minutes / 20).clamp(0.0, 1.0);
                    Color progressColor = progress < 0.5 ? Colors.green : (progress < 0.8 ? Colors.orange : Colors.red);
                    
                    final bool isWarning = progress > 0.8;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: themeCard,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isWarning ? Colors.red.withValues(alpha: 0.3) : themeBorder),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          )
                        ],
                      ),
                      child: Row(
                        children: [
                          // Actions (Left Most)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Tooltip(
                                message: LocalizationService().translate('edit'),
                                child: IconButton(
                                  icon: Icon(Icons.edit_note_rounded, color: themePrimary, size: 22),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () {
                                    setState(() {
                                      _cartItems = (order['items'] as List).map((item) => {
                                        'id': item['menu_item_id'] ?? 'custom-${item['id']}',
                                        'name': item['name'],
                                        'price': double.tryParse(item['unit_price']?.toString() ?? '') ?? 
                                                 ((double.tryParse(item['subtotal'].toString()) ?? 0.0) / (item['quantity'] ?? 1)),
                                        'quantity': item['quantity'],
                                        'notes': item['notes'],
                                        'extras': item['extras'],
                                        'variants': item['variants'],
                                      }).toList();
                                      _editingOrderId = order['id'];
                                      _selectedTabIndex = 0;
                                      _orderType = order['order_type'] ?? 'Dine-In';
                                    });
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Tooltip(
                                message: LocalizationService().translate('print'),
                                child: IconButton(
                                  icon: const Icon(Icons.print_rounded, color: Colors.blue, size: 20),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => ReceiptService.printReceipt(order: order, settings: _settings),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Tooltip(
                                message: LocalizationService().translate('download_pdf'),
                                child: IconButton(
                                  icon: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 20),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => _handlePdfDownload(Map<String, dynamic>.from(order)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Tooltip(
                                message: LocalizationService().translate('view_details'),
                                child: IconButton(
                                  icon: Icon(Icons.visibility_rounded, color: themePrimary, size: 20),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  onPressed: () => _showOrderDetailsDialog(order),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 24),

                          // ID & Badge
                          Tooltip(
                            message: LocalizationService().translate('order_serial'),
                            child: Container(
                              width: 55, height: 40,
                              decoration: BoxDecoration(color: themePrimary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text('SN', style: TextStyle(color: themePrimary, fontSize: 9, fontWeight: FontWeight.bold)),
                                  Text(
                                    order['order_number']?.toString().split('-').last ?? order['id'].toString(), 
                                    style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 13)
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 20),
                          
                          // Order Details
                          Expanded(
                            flex: 3,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      order['order_number'] ?? 'Order ${order['id']}', 
                                      style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 15)
                                    ),
                                    const SizedBox(width: 8),
                                    _buildOriginBadge(order['origin']),
                                    _buildPaymentStatusBadge(order['status'] ?? 'Unknown'),
                                  ],
                                ),
                                Row(
                                  children: [
                                    Icon(Icons.access_time_rounded, size: 12, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text(
                                      _formatDateTime(order['order_time']),
                                      style: TextStyle(color: themeHint, fontSize: 11, fontWeight: FontWeight.w500)
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(Icons.table_bar_outlined, size: 12, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text(
                                      order['table_number'] != null ? '${LocalizationService().translate('table')} ${order['table_number']}' : (order['order_type'] ?? 'Dine-In'),
                                      style: TextStyle(color: themeHint, fontSize: 11, fontWeight: FontWeight.w500)
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(Icons.restaurant_menu_rounded, size: 12, color: themeHint),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${(order['items'] as List?)?.length ?? 0} Items', 
                                      style: TextStyle(color: themeHint, fontSize: 11, fontWeight: FontWeight.w500)
                                    ),
                                  ],
                                ),
                                if (order['status'] == 'Rejected' || order['status'] == 'Cancelled')
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4.0),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error_outline, size: 14, color: Colors.red),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${LocalizationService().translate('rejection_reason')}: ${order['cancel_reason'] ?? 'No Reason'}',
                                          style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          
                          // Progress & Lapse
                          Expanded(
                            flex: 2,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(lapse, style: TextStyle(color: isWarning ? Colors.red : themeText, fontWeight: FontWeight.bold, fontSize: 13)),
                                    Text('${(progress * 100).toInt()}%', style: TextStyle(color: progressColor, fontSize: 11, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: progress,
                                    backgroundColor: themeBg,
                                    valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                                    minHeight: 4,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 32),
                          
                          // Status & Action Update
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              _buildOrderStatusChip(order['status'] ?? 'Pending'),
                              const SizedBox(height: 8),
                              if (order['status'] == 'Pending' || order['status'] == 'Ordered' || order['status'] == 'Paid')
                                Tooltip(
                                  message: 'Current: ${order['status']} | Next: Preparing',
                                  child: IconButton(
                                    icon: const Icon(Icons.check_circle_rounded, color: Colors.green, size: 22),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => _updateOrderStatus(order['id'], 'Preparing'),
                                  ),
                                ),
                              if (order['status'] == 'Preparing')
                                Tooltip(
                                  message: 'Current: Preparing | Next: Ready',
                                  child: IconButton(
                                    icon: const Icon(Icons.restaurant_rounded, color: Colors.orange, size: 22),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => _updateOrderStatus(order['id'], 'Ready'),
                                  ),
                                ),
                              if (order['status'] == 'Ready')
                                Tooltip(
                                  message: 'Current: Ready | Next: Paid/Complete',
                                  child: IconButton(
                                    icon: const Icon(Icons.done_all_rounded, color: Colors.blue, size: 22),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () {
                                      // Load order into cart and switch to checkout
                                      setState(() {
                                        _cartItems = (order['items'] as List).map((item) => {
                                          'id': item['menu_item_id'] ?? 'custom-${item['id']}',
                                          'name': item['name'],
                                          'price': double.tryParse(item['unit_price']?.toString() ?? '') ?? 
                                                   ((double.tryParse(item['subtotal'].toString()) ?? 0.0) / (item['quantity'] ?? 1)),
                                          'quantity': item['quantity'],
                                          'notes': item['notes'],
                                          'extras': item['extras'],
                                          'variants': item['variant'],
                                        }).toList();
                                        _editingOrderId = order['id'];
                                        _selectedTabIndex = 0; // Go to POS
                                      });
                                      // Delay slightly to ensure state is set before showing dialog
                                      Future.delayed(const Duration(milliseconds: 100), () {
                                        _showCheckoutDialog();
                                      });
                                    },
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

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      width: 220,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: themeCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: themeBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label, style: TextStyle(color: themeHint, fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(color: themeText, fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaitingTab(String label, int count, IconData icon) {
    final bool isSelected = _waitingTab == label;
    return GestureDetector(
      onTap: () => setState(() => _waitingTab = label),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: isSelected ? themePrimary : themeCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isSelected ? themePrimary : themeBorder),
              boxShadow: isSelected ? [BoxShadow(color: themePrimary.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4))] : [],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 18, color: isSelected ? Colors.white : themeHint),
                const SizedBox(width: 8),
                Text(
                  LocalizationService().translate(label.toLowerCase()).toUpperCase(),
                  style: TextStyle(
                    color: isSelected ? Colors.white : themeText,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          if (count > 0)
            Positioned(
              right: -6,
              top: -6,
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : themePrimary,
                  shape: BoxShape.circle,
                  border: Border.all(color: isSelected ? themePrimary : Colors.white, width: 2),
                ),
                constraints: const BoxConstraints(minWidth: 22, minHeight: 22),
                child: Center(
                  child: Text(
                    '$count',
                    style: TextStyle(
                      color: isSelected ? themePrimary : Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReservationDetailsPane() {
    final res = _selectedReservationDetails!;
    int? currentTableId = res['table_id'] != null ? int.tryParse(res['table_id'].toString()) : null;
    
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text('${res['first_name']} ${res['last_name'] ?? ''}', 
                    style: TextStyle(color: themeText, fontSize: 26, fontWeight: FontWeight.bold)),
              ),
              IconButton(
                icon: Icon(Icons.close, color: themeHint),
                onPressed: () => setState(() => _selectedReservationDetails = null),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  _buildReservationStatusChip(res['status'] ?? 'pending'),
                  if (res['origin'] != null && res['origin'] != 'In-Store') ...[
                    const SizedBox(width: 8),
                    _buildOriginBadge(res['origin']),
                  ],
                ],
              ),
              Text('ID: #${res['id']}', style: TextStyle(color: themeHint, fontSize: 12)),
            ],
          ),
          const Divider(height: 32),
          
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('CONTACT INFO', style: TextStyle(color: themeHint, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.phone, color: themeText, size: 18),
                      const SizedBox(width: 8),
                      Text(res['phone'] ?? 'No phone provided', style: TextStyle(color: themeText, fontSize: 15)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.email, color: themeText, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(res['email'] ?? 'No email provided', style: TextStyle(color: themeText, fontSize: 15))),
                    ],
                  ),
                  
                  const Divider(height: 32),
                  Text('BOOKING DETAILS', style: TextStyle(color: themeHint, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1)),
                  const SizedBox(height: 16),
                  _buildInfoRow('Date', res['reservation_date']?.toString().substring(0, 10) ?? ''),
                  const SizedBox(height: 12),
                  _buildInfoRow('Time', res['reservation_time']?.toString().substring(0, 5) ?? '', valueColor: themePrimary),
                  const SizedBox(height: 12),
                  _buildInfoRow('Party Size', '${res['party_size']} Guests'),
                  
                  if (res['notes'] != null && res['notes'].toString().isNotEmpty) ...[
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: themePrimary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: themePrimary.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.note_alt_outlined, color: themePrimary, size: 16),
                              const SizedBox(width: 8),
                              Text('GUEST NOTES', style: TextStyle(color: themePrimary, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(res['notes'], style: TextStyle(color: themeText, fontSize: 14, height: 1.4)),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          
          const Divider(height: 16),
          const SizedBox(height: 8),
          
          if (res['status'] == 'Pending') ...[
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _updateReservationStatus(res['id'], 'Confirmed'),
                style: ElevatedButton.styleFrom(backgroundColor: themePrimary, padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('Confirm Booking', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ] else if (res['status'] == 'Confirmed') ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: themeBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: themeBorder),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<int>(
                  value: currentTableId,
                  hint: Text('Assign a Table', style: TextStyle(color: themeHint)),
                  isExpanded: true,
                  dropdownColor: themeCard,
                  style: TextStyle(color: themeText),
                  items: (_restaurantTables ?? []).map((t) {
                    return DropdownMenuItem<int>(
                      value: int.tryParse(t.id),
                      child: Text('Table ${t.label} (Cap: ${t.capacity})'),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) _updateReservationStatus(res['id'], res['status'], val);
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: currentTableId == null ? null : () => _updateReservationStatus(res['id'], 'Seated', currentTableId),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green, 
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  disabledBackgroundColor: Colors.grey[800],
                ),
                child: const Text('Seat Guest', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => _updateReservationStatus(res['id'], 'No-Show'),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.orange),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Mark No-Show', style: TextStyle(color: Colors.orange)),
              ),
            ),
          ] else if (res['status'] == 'Seated') ...[
             SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _updateReservationStatus(res['id'], 'Completed'),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('Complete Booking', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
          
          if (res['status'] != 'Cancelled' && res['status'] != 'Completed' && res['status'] != 'No-Show') ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => _updateReservationStatus(res['id'], 'Cancelled'),
                child: const Text('Cancel Booking', style: TextStyle(color: Colors.red)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: themeHint, fontSize: 14)),
        Text(value, style: TextStyle(color: valueColor ?? themeText, fontSize: 15, fontWeight: FontWeight.bold)),
      ],
    );
  }
  Future<void> _fetchTables() async {
    try {
      final response = await http.get(Uri.parse('$apiBaseUrl/api/tables'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        if (mounted) {
          setState(() {
            if (data.isEmpty) {
              _restaurantTables = _getSampleTables();
            } else {
              _restaurantTables = data.map((t) {
                ui_kit.TableStatus status = ui_kit.TableStatus.available;
                switch (t['status']) {
                  case 'Occupied': status = ui_kit.TableStatus.occupied; break;
                  case 'Reserved': status = ui_kit.TableStatus.reserved; break;
                  case 'Needs Clearing': status = ui_kit.TableStatus.needsClearing; break;
                }
                return ui_kit.RestaurantTable(
                  id: t['id'].toString(),
                  label: t['table_number'].toString(),
                  status: status,
                  capacity: t['capacity'] is int ? t['capacity'] : int.tryParse(t['capacity'].toString()) ?? 4,
                  type: t['table_type'],
                  size: t['table_size'],
                  x: double.tryParse(t['pos_x'].toString()) ?? 0,
                  y: double.tryParse(t['pos_y'].toString()) ?? 0,
                );
              }).toList();
            }
          });
        }
      } else {
         if (mounted) setState(() => _restaurantTables = _getSampleTables());
      }
    } catch (e) {
      debugPrint('Tables error: $e');
      if (mounted) setState(() => _restaurantTables = _getSampleTables());
    }
  }

  List<ui_kit.RestaurantTable> _getSampleTables() {
    return List.generate(12, (i) {
      return ui_kit.RestaurantTable(
        id: 'sample_$i',
        label: '${i + 1}',
        capacity: (i % 3 == 0) ? 6 : 4,
        type: (i % 3 == 0) ? 'Round' : ((i % 3 == 1) ? 'Rectangular' : 'Square'),
        size: (i % 3 == 0) ? 'Large' : ((i % 3 == 1) ? 'Medium' : 'Small'),
        status: (i == 2) ? ui_kit.TableStatus.occupied : ui_kit.TableStatus.available,
        x: (i % 4) * 180.0 + 50,
        y: (i ~/ 4) * 180.0 + 50,
      );
    });
  }

  void _updateTableCoord(ui_kit.RestaurantTable table, double x, double y) async {
    try {
      await http.patch(
        Uri.parse('$apiBaseUrl/api/tables/${table.id}'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'pos_x': x, 'pos_y': y}),
      );
    } catch (e) {
      debugPrint('Error updating table: $e');
    }
  }

  void _updateTableStatus(ui_kit.RestaurantTable table, String newStatusDb) async {
    try {
      await http.patch(
        Uri.parse('$apiBaseUrl/api/tables/${table.id}'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'status': newStatusDb}),
      );
      _fetchTables();
    } catch (e) {
      debugPrint('Error status table: $e');
    }
  }

  void _startOrderFromTable(ui_kit.RestaurantTable table) {
    setState(() {
      _selectedTable = table;
      _selectedTabIndex = 0; // Switch to POS tab
    });

    // If the table was Reserved, try to find and seat the reservation
    if (table.status == ui_kit.TableStatus.reserved) {
      final reservation = _reservations.firstWhere(
        (r) => r['table_id']?.toString() == table.id,
        orElse: () => null,
      );
      if (reservation != null) {
        _updateReservationStatus(reservation['id'], 'Seated');
        // Apply reservation fee as advance payment
        if (reservation['booking_fee'] != null) {
          setState(() {
            _reservationFee = double.tryParse(reservation['booking_fee'].toString()) ?? 0.0;
          });
        }
      }
    }

    // Update table status to Occupied in DB
    _updateTableStatus(table, 'Occupied');
  }

  Widget _buildTablesView() {
    if (_restaurantTables == null) {
      return Center(child: CircularProgressIndicator(color: themePrimary));
    }

    if (_restaurantTables!.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.table_bar_outlined, size: 64, color: themeHint),
            const SizedBox(height: 16),
            Text(LocalizationService().translate('no_tables_found'), style: TextStyle(color: themeHint, fontSize: 18)),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _fetchTables,
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
              child: Text(LocalizationService().translate('retry_fetch'), style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(LocalizationService().translate('interactive_floor_plan'), style: TextStyle(color: themeText, fontSize: 24, fontWeight: FontWeight.bold)),
              const Spacer(),
              ElevatedButton.icon(
                onPressed: _showAddTableDialog,
                icon: const Icon(Icons.add, color: Colors.white, size: 18),
                label: Text(LocalizationService().translate('add_new_table'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: themePrimary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
              const SizedBox(width: 12),
              if (_restaurantTables!.any((t) => t.id.startsWith('sample_')))
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: themePrimary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: themePrimary),
                  ),
                  child: Text('DEMO MODE', style: TextStyle(color: themePrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: ui_kit.VisualFloorPlan(
              initialTables: _restaurantTables!,
              onTableMoved: (t, x, y) => _updateTableCoord(t, x, y),
              onTableTap: (t) => _showTableActionDialog(t),
              backgroundColor: themeBg,
            ),
          ),
        ),
      ],
    );
  }

  void _showTableActionDialog(ui_kit.RestaurantTable table) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: themeCard,
          title: Text('${LocalizationService().translate('table')} ${table.label}', style: TextStyle(color: themeText)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (table.status == ui_kit.TableStatus.available || table.status == ui_kit.TableStatus.reserved)
                ListTile(
                  leading: const Icon(Icons.add_shopping_cart, color: Colors.green),
                  title: Text(LocalizationService().translate('start_new_order'), style: TextStyle(color: themeText)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _startOrderFromTable(table);
                  },
                ),
              if (table.status == ui_kit.TableStatus.occupied)
                ListTile(
                  leading: Icon(Icons.receipt_long, color: themePrimary),
                  title: Text(LocalizationService().translate('manage_active_order'), style: TextStyle(color: themeText)),
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _selectedTable = table;
                      _selectedTabIndex = 0;
                    });
                  },
                ),
              if (table.status != ui_kit.TableStatus.available)
                ListTile(
                  leading: const Icon(Icons.cleaning_services, color: Colors.amber),
                  title: Text(LocalizationService().translate('clear_table'), style: TextStyle(color: themeText)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _updateTableStatus(table, 'Available');
                  },
                ),
              const Divider(color: Colors.white12),
              ExpansionTile(
                title: Text(LocalizationService().translate('manual_status_override'), style: TextStyle(color: themeHint, fontSize: 13)),
                children: [
                  _buildTableStatusOption(ctx, table, 'Available', Colors.green),
                  _buildTableStatusOption(ctx, table, 'Occupied', themePrimary),
                  _buildTableStatusOption(ctx, table, 'Reserved', themePrimary),
                  _buildTableStatusOption(ctx, table, 'Needs Clearing', Colors.amber),
                ],
              ),
              const Divider(color: Colors.white12),
              ListTile(
                leading: Icon(Icons.edit, color: themePrimary),
                title: Text(LocalizationService().translate('edit_table_details'), style: TextStyle(color: themeText)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showEditTableDialog(table);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_forever, color: Colors.red),
                title: Text(LocalizationService().translate('delete_table'), style: TextStyle(color: Colors.red)),
                onTap: () {
                  Navigator.pop(ctx);
                  _confirmDeleteTable(table);
                },
              ),
            ],
          ),
        );
      }
    );
  }

  void _confirmDeleteTable(ui_kit.RestaurantTable table) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        title: Text(LocalizationService().translate('delete_table'), style: const TextStyle(color: Colors.white)),
        content: Text('${LocalizationService().translate('delete_table_confirm')} ${table.label}?', style: TextStyle(color: themeHint)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(LocalizationService().translate('cancel').toUpperCase(), style: TextStyle(color: themeHint))),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final resp = await http.delete(Uri.parse('$apiBaseUrl/api/tables/${table.id}'));
                if (resp.statusCode == 200) {
                  if (!mounted) return;
                  _fetchTables();
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('table_removed')), backgroundColor: Colors.green));
                }
              } catch (e) {
                debugPrint('Delete error: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text(LocalizationService().translate('delete').toUpperCase(), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showEditTableDialog(ui_kit.RestaurantTable table) {
    final labelController = TextEditingController(text: table.label);
    final capacityController = TextEditingController(text: table.capacity.toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: themeCard,
        title: Text('${LocalizationService().translate('edit_table_details')} ${table.label}', style: TextStyle(color: themeText)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: labelController,
              style: TextStyle(color: themeText),
              decoration: InputDecoration(
                labelText: LocalizationService().translate('table_number'),
                labelStyle: TextStyle(color: themeHint),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: themeBorder)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: capacityController,
              style: TextStyle(color: themeText),
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: LocalizationService().translate('capacity'),
                labelStyle: TextStyle(color: themeHint),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: themeBorder)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(LocalizationService().translate('cancel').toUpperCase(), style: TextStyle(color: themeHint))),
          ElevatedButton(
            onPressed: () async {
              if (labelController.text.trim().isEmpty) {
                _showWarningDialog(LocalizationService().translate('enter_table_number_warning'));
                return;
              }
              if (capacityController.text.trim().isEmpty) {
                _showWarningDialog(LocalizationService().translate('enter_capacity_warning'));
                return;
              }
              final body = {
                'table_number': labelController.text.trim(),
                'capacity': int.tryParse(capacityController.text) ?? table.capacity,
              };
              try {
                final resp = await http.patch(
                  Uri.parse('$apiBaseUrl/api/tables/${table.id}'),
                  headers: {'Content-Type': 'application/json'},
                  body: json.encode(body),
                );
                if (resp.statusCode == 200) {
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (!mounted) return;
                  _fetchTables();
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(LocalizationService().translate('table_updated')), backgroundColor: Colors.green));
                }
              } catch (e) {
                debugPrint('Edit error: $e');
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
            child: Text(LocalizationService().translate('save_changes').toUpperCase(), style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildTableStatusOption(BuildContext ctx, ui_kit.RestaurantTable table, String status, Color color) {
    return ListTile(
      leading: Icon(Icons.circle, color: color),
      title: Text(LocalizationService().translate(status.toLowerCase().replaceAll(' ', '_')), style: TextStyle(color: themeText)),
      onTap: () {
        Navigator.pop(ctx);
        _updateTableStatus(table, status);
      },
    );
  }

  Widget _buildUnifiedSummary(Color themeText, Color themeCard, Color themeBorder, Color themePrimary, Color themeHint) {
    final clockedInCount = _hrStats['staff'] is List 
        ? (_hrStats['staff'] as List).where((s) => s['status'] == 'Active').length 
        : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 48),
        Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: themeCard,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: themeBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    LocalizationService().translate('mission_control_summary'),
                    style: TextStyle(color: themeText, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  Icon(Icons.analytics_outlined, color: themePrimary, size: 32),
                ],
              ),
              const SizedBox(height: 32),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Operational Health
                  Expanded(
                    flex: 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          LocalizationService().translate('operational_health'),
                          style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 20),
                        _StatusRow(
                          label: LocalizationService().translate('staff_on_duty'),
                          value: '$clockedInCount',
                          icon: Icons.badge_outlined,
                          color: Colors.blue,
                        ),
                        _StatusRow(
                          label: LocalizationService().translate('low_stock_items'),
                          value: '${_lowStockItems.length}',
                          icon: Icons.inventory_2_outlined,
                          color: _lowStockItems.isNotEmpty ? Colors.orange : Colors.green,
                        ),
                        if (_lowStockItems.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 8, left: 40),
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _lowStockItems.take(5).map((item) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.orange.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  item['name'], 
                                  style: const TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.w600)
                                ),
                              )).toList(),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 48),
                  // Financial Status
                  Expanded(
                    flex: 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              LocalizationService().translate('financial_reconciliation'),
                              style: TextStyle(color: themeText, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.add, size: 16),
                              label: Text(LocalizationService().translate('log_expense')),
                              onPressed: () => _showExpenseLoggingModal(context),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: ThemeService().themeData.colorScheme.secondary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _StatusRow(
                          label: LocalizationService().translate('net_profit_estimate'),
                          value: '\$${(double.tryParse(_financialData['net_profit']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                          icon: Icons.trending_up,
                          color: Colors.green,
                        ),
                        _StatusRow(
                          label: LocalizationService().translate('estimated_cogs'),
                          value: '\$${(double.tryParse(_financialData['cogs']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                          icon: Icons.kitchen,
                          color: Colors.orange,
                        ),
                        _StatusRow(
                          label: LocalizationService().translate('total_expenses'),
                          value: '\$${(double.tryParse(_financialData['expenses']?.toString() ?? '0') ?? 0.0).toStringAsFixed(2)}',
                          icon: Icons.money_off,
                          color: Colors.red,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Map<String, dynamic> _deepCastMap(Map dynamicMap) {
    return dynamicMap.map((key, value) {
      if (value is Map) {
        return MapEntry(key.toString(), _deepCastMap(value));
      } else if (value is List) {
        return MapEntry(key.toString(), value.map((e) => e is Map ? _deepCastMap(e) : e).toList());
      }
      return MapEntry(key.toString(), value);
    });
  }

  Future<void> _saveGatewaySettings(String name, Map<String, dynamic> data) async {
    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/payment-gateways'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({...data, 'gateway_name': name}),
      );
      if (resp.statusCode == 200) {
        _fetchSettings();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment gateway settings updated successfully'))
          );
        }
      }
    } catch (e) {
      debugPrint('Error saving gateway settings: $e');
    }
  }

  Future<void> _saveMessagingSettings(String name, Map<String, dynamic> data) async {
    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/messaging-settings'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({...data, 'provider_name': name}),
      );
      if (resp.statusCode == 200) {
        _fetchSettings();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Messaging settings updated successfully'))
          );
        }
      }
    } catch (e) {
      debugPrint('Error saving messaging settings: $e');
    }
  }

  Future<void> _testMessagingConnection(String provider, Map<String, dynamic> data) async {
    final phoneController = TextEditingController();
    if (!mounted) return;
    
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Test Connection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter a phone number to send a test message:'),
            const SizedBox(height: 16),
            TextField(
              controller: phoneController,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                hintText: '+1234567890',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Send Test')),
        ],
      ),
    );

    if (result == true && phoneController.text.isNotEmpty) {
      try {
        final resp = await http.post(
          Uri.parse('$apiBaseUrl/api/messaging-settings/test'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            ...data,
            'provider_name': provider,
            'test_number': phoneController.text,
          }),
        );
        final decoded = json.decode(resp.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(decoded['message'] ?? 'Test complete'))
          );
        }
      } catch (e) {
        debugPrint('Error testing messaging connection: $e');
      }
    }
  }

  Future<void> _saveEmailSettings(String name, Map<String, dynamic> data) async {
    try {
      final resp = await http.post(
        Uri.parse('$apiBaseUrl/api/email-settings'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({...data, 'provider_name': name}),
      );
      if (resp.statusCode == 200) {
        _fetchSettings();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Email settings updated successfully'))
          );
        }
      }
    } catch (e) {
      debugPrint('Error saving email settings: $e');
    }
  }

  Future<void> _testEmailConnection(String provider, Map<String, dynamic> data) async {
    final emailController = TextEditingController();
    if (!mounted) return;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Test Email Connection'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Enter an email address to send a test message:'),
            const SizedBox(height: 16),
            TextField(
              controller: emailController,
              decoration: const InputDecoration(
                labelText: 'Email Address',
                hintText: 'test@example.com',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.emailAddress,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Send Test')),
        ],
      ),
    );

    if (result == true && emailController.text.isNotEmpty) {
      try {
        final resp = await http.post(
          Uri.parse('$apiBaseUrl/api/email-settings/test'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            ...data,
            'provider_name': provider,
            'test_email': emailController.text,
          }),
        );
        final decoded = json.decode(resp.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(decoded['message'] ?? 'Test complete'))
          );
        }
      } catch (e) {
        debugPrint('Error testing email connection: $e');
      }
    }
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _StatusRow({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(label, style: TextStyle(color: color.withValues(alpha: 0.7))),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardMetric extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _DashboardMetric({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardBg = theme.cardColor;
    final textColor = theme.textTheme.bodyLarge?.color ?? Colors.black87;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: textColor.withValues(alpha: 0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(height: 20),
            Text(
              label,
              style: TextStyle(
                color: textColor.withValues(alpha: 0.7),
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                color: textColor,
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallMetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _SmallMetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardBg = theme.cardColor;
    final textColor = theme.textTheme.bodyLarge?.color ?? Colors.black87;

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: textColor.withValues(alpha: 0.1)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: textColor.withValues(alpha: 0.7),
                    fontSize: 14,
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TrendChart extends StatelessWidget {
  final String title;
  final List<dynamic> trends;
  final Color color;

  const _TrendChart({
    required this.title,
    required this.trends,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardBg = theme.cardColor;
    final textColor = theme.textTheme.bodyLarge?.color ?? Colors.black87;

    final last6Months = trends.length > 6 ? trends.sublist(trends.length - 6) : trends;
    double maxVal = 1.0;
    for (var t in last6Months) {
      double val = double.tryParse(t['total'].toString()) ?? 0.0;
      if (val > maxVal) maxVal = val;
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: textColor.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: textColor,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 32),
          SizedBox(
            height: 200,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: last6Months.map((t) {
                final double total = double.tryParse(t['total'].toString()) ?? 0.0;
                final heightFactor = total / maxVal;
                
                return Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        total > 0 ? '\$${total.toStringAsFixed(0)}' : '',
                        style: TextStyle(
                          color: color,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        height: 140 * heightFactor + 2,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [color, color.withValues(alpha: 0.3)],
                          ),
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(8),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                        Text(
                          t['month'] ?? '',
                          style: TextStyle(
                            color: textColor.withValues(alpha: 0.5),
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}


