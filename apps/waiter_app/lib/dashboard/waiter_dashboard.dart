import 'package:flutter/material.dart';
import '../theme_service.dart';
import 'table_map_view.dart';
import 'order_entry_view.dart';
import 'my_orders_view.dart';
import 'profile_view.dart';
import 'landing_dashboard_view.dart';
import '../services/order_service.dart';
import 'package:ui_kit/ui_kit.dart' as ui_kit;
import 'dart:async';
import 'dart:convert';

class WaiterDashboard extends StatefulWidget {
  final Function(BuildContext)? onLogout;
  final List<dynamic> userPermissions;
  final Map<String, dynamic>? userData;

  const WaiterDashboard({
    super.key,
    this.onLogout,
    this.userPermissions = const [],
    this.userData,
  });

  @override
  State<WaiterDashboard> createState() => _WaiterDashboardState();
}

class _WaiterDashboardState extends State<WaiterDashboard> {
  int _selectedIndex = 0;
  ui_kit.RestaurantTable? _selectedTable;
  int _readyOrdersCount = 0;
  Timer? _notificationTimer;

  @override
  void initState() {
    super.initState();
    _fetchReadyOrdersCount();
    _notificationTimer = Timer.periodic(const Duration(seconds: 10), (_) => _fetchReadyOrdersCount());
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchReadyOrdersCount() async {
    try {
      final response = await OrderService.fetchOrders();
      if (response.statusCode == 200) {
        final List<dynamic> allOrders = json.decode(response.body);
        final myReadyOrders = allOrders.where((o) => 
          o['status'].toString().toUpperCase() == 'READY'
        ).toList();
        
        if (mounted) {
          setState(() {
            _readyOrdersCount = myReadyOrders.length;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching notification count: $e');
    }
  }

  void _onTableTap(ui_kit.RestaurantTable table) {
    setState(() {
      _selectedTable = table;
    });
  }

  Future<void> _handleSubmitOrder(Map<String, dynamic> orderData) async {
    try {
      final isTakeaway = orderData['table_id'] == 'takeaway';
      final formattedData = {
        'order_type': isTakeaway ? 'Takeaway' : 'Dine-In',
        'table_id': isTakeaway ? null : orderData['table_id'],
        'total_amount': orderData['total'],
        'status': 'Pending',
        'origin': 'In-Store',
        'user_id': widget.userData?['id'] ?? 1, // Use logged in user ID
        'items': (orderData['items'] as List).map((item) {
          return {
            'id': item['id'],
            'quantity': item['quantity'],
            'price': double.tryParse(item['price'].toString()) ?? 0.0,
            'variant': item['variant'],
            'extras': item['extras'] ?? [],
            'notes': item['notes'] ?? '',
          };
        }).toList(),
      };

      final response = await OrderService.placeOrder(formattedData);

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Order submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() {
            _selectedTable = null;
          });
        }
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Submission failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedTable != null) {
      return OrderEntryView(
        table: _selectedTable!,
        onCancel: () => setState(() => _selectedTable = null),
        onOrderSubmit: _handleSubmitOrder,
      );
    }

    final theme = Theme.of(context);
    final primaryYellow = const Color(0xFFFFB300);

    Widget body;
    switch (_selectedIndex) {
      case 0:
        body = LandingDashboardView(
          userData: widget.userData,
          onCreateOrder: () => setState(() => _selectedIndex = 1),
        );
        break;
      case 1:
        body = TableMapView(
          userPermissions: widget.userPermissions,
          onTableTap: _onTableTap,
        );
        break;
      case 2:
        body = MyOrdersView(userData: widget.userData);
        break;
      case 3:
        body = ProfileView(
          userData: widget.userData,
          onLogout: widget.onLogout ?? (_) {},
        );
        break;
      default:
        body = const Center(child: Text('View coming soon...'));
    }

    return Scaffold(
      body: Row(
        children: [
          // Sidebar
          Container(
            width: 260,
            color: Colors.white,
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10),
              ],
            ),
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 24.0),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF006064).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.restaurant_menu, color: Color(0xFF006064)),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        ThemeService.instance.restaurantName.toLowerCase().replaceAll(' ', ''),
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF006064)),
                      ),
                    ],
                  ),
                ),
                _buildSidebarItem(0, Icons.grid_view, 'Dashboard', primaryYellow),
                _buildSidebarItem(1, Icons.table_bar_outlined, 'Tables', primaryYellow),
                _buildSidebarItem(2, Icons.list_alt_outlined, 'Orders', primaryYellow),
                _buildSidebarItem(3, Icons.person_outline, 'Profile', primaryYellow),
                const Spacer(),
                if (widget.userData != null)
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.grey.shade200,
                          child: const Icon(Icons.person, color: Colors.grey),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.userData?['username'] ?? 'Waiter',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                              const Text('Waiters', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.grey),
                  title: const Text('Logout', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
                  onTap: () => widget.onLogout?.call(context),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
          // Main Content
          Expanded(
            child: body,
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarItem(int index, IconData icon, String label, Color activeColor) {
    final isSelected = _selectedIndex == index;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: ListTile(
        onTap: () => setState(() => _selectedIndex = index),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        tileColor: isSelected ? activeColor : Colors.transparent,
        leading: Icon(icon, color: isSelected ? Colors.black87 : Colors.grey),
        title: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black87 : Colors.grey,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
