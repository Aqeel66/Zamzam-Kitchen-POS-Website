import 'package:flutter/material.dart';
import '../theme_service.dart';
import 'table_map_view.dart';
import 'order_entry_view.dart';
import 'my_orders_view.dart';
import '../services/order_service.dart';
import 'package:ui_kit/ui_kit.dart' as ui_kit;

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

  void _onTableTap(ui_kit.RestaurantTable table) {
    setState(() {
      _selectedTable = table;
    });
  }

  Future<void> _handleSubmitOrder(Map<String, dynamic> orderData) async {
    try {
      final formattedData = {
        'order_type': 'Dine-In',
        'table_id': orderData['table_id'],
        'total_amount': orderData['total'],
        'status': 'Pending',
        'origin': 'In-Store',
        'user_id': widget.userData?['id'] ?? 1, // Use logged in user ID
        'items': (orderData['items'] as List).map((item) {
          return {
            'id': item['id'],
            'quantity': item['quantity'],
            'price': double.tryParse(item['price'].toString()) ?? 0.0,
            'variants': item['variants'] ?? [],
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
    
    Widget body;
    switch (_selectedIndex) {
      case 0:
        body = TableMapView(
          userPermissions: widget.userPermissions,
          onTableTap: _onTableTap,
        );
        break;
      case 1:
        body = MyOrdersView(userData: widget.userData);
        break;
      default:
        body = const Center(child: Text('View coming soon...'));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(ThemeService.instance.restaurantName),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => widget.onLogout?.call(context),
          ),
        ],
      ),
      body: body,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.table_bar),
            label: 'Tables',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.list_alt),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
