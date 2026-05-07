import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import '../services/order_service.dart';
import '../theme_service.dart';

class MyOrdersView extends StatefulWidget {
  final Map<String, dynamic>? userData;

  const MyOrdersView({super.key, this.userData});

  @override
  State<MyOrdersView> createState() => _MyOrdersViewState();
}

class _MyOrdersViewState extends State<MyOrdersView> {
  List<dynamic> _orders = [];
  bool _isLoading = true;
  String _statusFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final response = await OrderService.fetchOrders();
      if (response.statusCode == 200) {
        final List<dynamic> allOrders = json.decode(response.body);
        
        // Filter by current waiter ID if available
        final waiterId = widget.userData?['id'];
        if (waiterId != null) {
          setState(() {
            _orders = allOrders.where((o) => o['user_id'].toString() == waiterId.toString()).toList();
          });
        } else {
          setState(() {
            _orders = allOrders;
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching orders: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themePrimary = theme.primaryColor;

    final filteredOrders = _statusFilter == 'ALL'
        ? _orders
        : _orders.where((o) {
            final s = o['status'].toString().toUpperCase();
            if (_statusFilter == 'PENDING') {
              return s == 'PENDING' || s == 'ORDERED';
            }
            return s == _statusFilter;
          }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Active Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchOrders,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(themePrimary),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredOrders.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _fetchOrders,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredOrders.length,
                          itemBuilder: (context, index) {
                            final order = filteredOrders[index];
                            return _buildOrderCard(order, theme);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar(Color primaryColor) {
    final filters = ['ALL', 'PENDING', 'PREPARING', 'READY', 'SERVED'];
    return Container(
      height: 50,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: filters.length,
        itemBuilder: (context, index) {
          final f = filters[index];
          final isSelected = _statusFilter == f;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: FilterChip(
              label: Text(f, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : null)),
              selected: isSelected,
              onSelected: (val) => setState(() => _statusFilter = f),
              selectedColor: primaryColor,
              checkmarkColor: Colors.white,
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey.withValues(alpha: 0.5)),
          const SizedBox(height: 16),
          const Text('No orders found', style: TextStyle(color: Colors.grey, fontSize: 16)),
        ],
      ),
    );
  }

  Widget _buildOrderCard(dynamic order, ThemeData theme) {
    final status = order['status'].toString();
    final itemsCount = (order['items'] as List?)?.length ?? 0;
    final timeStr = _formatTime(order['order_time']);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        title: Row(
          children: [
            Text('#${order['order_number'] ?? order['id']}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const Spacer(),
            _buildStatusBadge(status),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            children: [
              Icon(Icons.table_bar_outlined, size: 14, color: theme.hintColor),
              const SizedBox(width: 4),
              Text('Table ${order['table_number'] ?? order['table_id'] ?? 'N/A'}'),
              const SizedBox(width: 12),
              Icon(Icons.access_time, size: 14, color: theme.hintColor),
              const SizedBox(width: 4),
              Text(timeStr),
            ],
          ),
        ),
        children: [
          const Divider(),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: itemsCount,
            itemBuilder: (context, iIndex) {
              final item = order['items'][iIndex];
              return ListTile(
                dense: true,
                title: Text(item['name'] ?? 'Unknown Item'),
                subtitle: item['notes'] != null && item['notes'].isNotEmpty ? Text(item['notes']) : null,
                trailing: Text('x${item['quantity']}'),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  '£${double.tryParse(order['total_amount'].toString())?.toStringAsFixed(2) ?? '0.00'}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: theme.primaryColor, fontSize: 18),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toUpperCase()) {
      case 'PENDING': color = Colors.orange; break;
      case 'ORDERED': color = Colors.blue; break;
      case 'PREPARING': color = Colors.purple; break;
      case 'READY': color = Colors.green; break;
      case 'SERVED': color = Colors.teal; break;
      case 'PAID': color = Colors.green; break;
      case 'CANCELLED': color = Colors.red; break;
      default: color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  String _formatTime(dynamic time) {
    if (time == null) return '--:--';
    try {
      final dt = DateTime.parse(time.toString()).toLocal();
      return DateFormat('HH:mm').format(dt);
    } catch (e) {
      return time.toString();
    }
  }
}
