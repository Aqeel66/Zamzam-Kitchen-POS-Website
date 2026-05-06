import 'package:flutter/material.dart';
import '../../localization_service.dart';
import '../../theme_service.dart';
import '../../utils/pos_utils.dart';
import '../../components/pos_widgets.dart';

class KDSView extends StatelessWidget {
  final List<dynamic> placedOrders;
  final Function(dynamic orderId, String nextStatus) onUpdateStatus;
  final Function(dynamic orderId) onReject;
  final VoidCallback onRefresh;
  final String orderSortDirection;
  final Color themePrimary;
  final Color themeBg;
  final Color themeText;
  final Color themeHint;
  final Color themeCard;
  final Color themeBorder;

  const KDSView({
    super.key,
    required this.placedOrders,
    required this.onUpdateStatus,
    required this.onReject,
    required this.onRefresh,
    this.orderSortDirection = 'Descending',
    required this.themePrimary,
    required this.themeBg,
    required this.themeText,
    required this.themeHint,
    required this.themeCard,
    required this.themeBorder,
  });

  @override
  Widget build(BuildContext context) {
    final kdsOrders = placedOrders.where((o) {
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

    int pendingCount = placedOrders.where((o) {
      final s = (o['status']?.toString() ?? '').toLowerCase();
      return s == 'pending' || s == 'ordered' || s == 'paid' || s == 'partially paid';
    }).length;
    int preparingCount = placedOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'preparing').length;
    int readyCount = placedOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'ready').length;
    int rejectedCount = placedOrders.where((o) => (o['status']?.toString() ?? '').toLowerCase() == 'rejected').length;

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
                    onPressed: onRefresh,
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
    final filteredOrders = placedOrders.where((o) {
      final oStatus = (o['status']?.toString() ?? '').toLowerCase();
      final matchesStatus = (status == 'Pending') 
        ? (oStatus == 'pending' || oStatus == 'ordered' || oStatus == 'paid' || oStatus == 'partially paid') 
        : (oStatus == status.toLowerCase());
      return matchesStatus;
    }).toList()
      ..sort((a, b) {
        final aPay = (a['payment_status']?.toString() ?? '').toLowerCase();
        final bPay = (b['payment_status']?.toString() ?? '').toLowerCase();
        final aStatus = (a['status']?.toString() ?? '').toLowerCase();
        final bStatus = (b['status']?.toString() ?? '').toLowerCase();
        if (aPay == 'unpaid' && bPay != 'unpaid') return -1;
        if (aPay != 'unpaid' && bPay == 'unpaid') return 1;
        if (aStatus == 'pending' && bStatus != 'pending') return -1;
        if (aStatus != 'pending' && bStatus == 'pending') return 1;
        
        final aId = int.tryParse(a['id'].toString()) ?? 0;
        final bId = int.tryParse(b['id'].toString()) ?? 0;
        return orderSortDirection == 'Ascending' ? aId.compareTo(bId) : bId.compareTo(aId);
      });

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
        childAspectRatio: 0.85, // Increased height to show more item records
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
                              style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 16, fontWeight: FontWeight.bold)
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Icon(Icons.access_time_rounded, size: 14, color: themeHint),
                                const SizedBox(width: 4),
                                Text(
                                  POSUtils.getLapseTime(order['order_time']),
                                  style: TextStyle(color: themeHint, fontSize: 12, fontWeight: FontWeight.w500),
                                ),
                              ],
                            ),
                          ],
                        ),
                        OrderStatusChip(status: order['status'] ?? 'Unknown', themePrimary: themePrimary),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
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
                        else if (order['order_type'] != null && order['order_type'] != 'In-Store')
                          OrderTypeBadge(type: order['order_type'], themePrimary: themePrimary),
                        
                        if (order['origin'] != null)
                          OriginBadge(origin: order['origin'], themePrimary: themePrimary),
                        if ((order['status']?.toString() ?? '').toLowerCase() != 'paid')
                          PaymentStatusBadge(order: order),
                      ],
                    ),
                  ],
                ),
              ),
              // Items
              Expanded(
                child: Scrollbar(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    itemCount: items.length,
                    itemBuilder: (context, idx) {
                      final item = items[idx];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('x${item['quantity']}', style: TextStyle(fontWeight: FontWeight.bold, color: themePrimary, fontSize: 13)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item['name'] ?? 'Item', style: TextStyle(color: themeText, fontWeight: FontWeight.bold, fontSize: 11), maxLines: 2, overflow: TextOverflow.ellipsis),
                                  if (item['variant'] != null)
                                    Text(
                                      '${item['variant']['name']}',
                                      style: TextStyle(color: themePrimary, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  if (item['extras'] != null && (item['extras'] as List).isNotEmpty)
                                    Text(
                                      '${(item['extras'] as List).map((e) => e['name']).join(', ')}',
                                      style: TextStyle(color: Colors.orange.shade800, fontSize: 10, fontWeight: FontWeight.w600),
                                    ),
                                  if (item['notes'] != null && item['notes'].toString().isNotEmpty)
                                     Text('Note: ${item['notes']}', style: TextStyle(color: Colors.red.shade400, fontSize: 10, fontStyle: FontStyle.italic, fontWeight: FontWeight.w500)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
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
              // Action Buttons
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
                          onPressed: () => onReject(order['id']),
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
                            onUpdateStatus(order['id'], nextStatus);
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
}
