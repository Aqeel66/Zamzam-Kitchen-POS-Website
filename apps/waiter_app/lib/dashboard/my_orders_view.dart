import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import '../services/order_service.dart';
import '../theme_service.dart';
import 'dart:async';

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

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) => _fetchOrders());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchOrders() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final response = await OrderService.fetchOrders();
      if (response.statusCode == 200) {
        final List<dynamic> allOrders = json.decode(response.body);
        if (mounted) {
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
                        child: GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 400,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 0.85,
                          ),
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
    final filters = ['ALL', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'REJECTED'];
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
    final dateStr = _formatDate(order['order_time']);
    final tableStr = order['table_number'] ?? order['table_id'] ?? 'N/A';

    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: theme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'T-$tableStr',
                      style: TextStyle(color: theme.primaryColor, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Order #${order['order_number'] ?? order['id']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Text(timeStr, style: TextStyle(color: theme.hintColor, fontSize: 12)),
                    ],
                  ),
                ],
              ),
              _buildStatusBadge(status),
            ],
          ),
          const SizedBox(height: 16),
          // Date Line
          Text('$dateStr | $timeStr', style: TextStyle(color: theme.hintColor, fontSize: 12)),
          const SizedBox(height: 16),
          // Items List (Preview)
          Expanded(
            child: ListView.builder(
              physics: const BouncingScrollPhysics(),
              itemCount: itemsCount,
              itemBuilder: (context, iIndex) {
                final item = order['items'][iIndex];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['name'] ?? 'Unknown',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (item['variant'] != null)
                              Text(
                                'Size/Type: ${item['variant']['name']}',
                                style: TextStyle(fontSize: 11, color: theme.hintColor),
                              ),
                            if ((item['extras'] as List? ?? []).isNotEmpty)
                              Text(
                                'Extras: ${(item['extras'] as List).map((e) => e['name']).join(', ')}',
                                style: TextStyle(fontSize: 11, color: theme.hintColor),
                              ),
                          ],
                        ),
                      ),
                      SizedBox(width: 30, child: Text('${item['quantity']}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 14))),
                      SizedBox(width: 60, child: Text('${ThemeService.currency}${item['price']}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 14))),
                    ],
                  ),
                );
              },
            ),
          ),
          const Divider(),
          // Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total (before tax)', style: TextStyle(color: Colors.grey, fontSize: 12)),
              Text(
                '${ThemeService.currency}${double.tryParse(order['total_amount'].toString())?.toStringAsFixed(2) ?? '0.00'}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Action Buttons
          Row(
            children: [
              Expanded(
                flex: 1,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: Text('$itemsCount items', style: TextStyle(color: theme.hintColor, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: status.toUpperCase() == 'READY' ? () => _markAsServed(order['id']) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: status.toUpperCase() == 'READY' ? Colors.teal : theme.primaryColor.withValues(alpha: 0.1),
                    foregroundColor: status.toUpperCase() == 'READY' ? Colors.white : theme.primaryColor,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text(
                    status.toUpperCase() == 'READY' ? 'Mark as Served' : (status.toUpperCase() == 'PENDING' ? 'Pay bill' : 'View Details'),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _markAsServed(dynamic orderId) async {
    try {
      final resp = await OrderService.updateOrderStatus(orderId, 'Served');
      if (resp.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order marked as served'), backgroundColor: Colors.teal),
          );
        }
        _fetchOrders();
      } else {
        throw Exception('Failed to update status');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toUpperCase()) {
      case 'PENDING': color = Colors.orange; break;
      case 'ORDERED': color = Colors.blue; break;
      case 'ACCEPTED': color = Colors.indigo; break;
      case 'PREPARING': color = Colors.purple; break;
      case 'READY': color = Colors.green; break;
      case 'SERVED': color = Colors.teal; break;
      case 'PAID': color = Colors.green; break;
      case 'CANCELLED': 
      case 'REJECTED': color = Colors.red; break;
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
      return DateFormat('HH:mm a').format(dt);
    } catch (e) {
      return time.toString();
    }
  }

  String _formatDate(dynamic time) {
    if (time == null) return '';
    try {
      final dt = DateTime.parse(time.toString()).toLocal();
      return DateFormat('EEE, MMM dd, yyyy').format(dt);
    } catch (e) {
      return '';
    }
  }
}
