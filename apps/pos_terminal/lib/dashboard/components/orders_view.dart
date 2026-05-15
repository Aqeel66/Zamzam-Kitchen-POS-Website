import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../localization_service.dart';
import '../../services/receipt_service.dart';
import '../../utils/pos_utils.dart';
import '../../components/pos_widgets.dart';

class OrdersView extends StatelessWidget {
  final List<dynamic> placedOrders;
  final String statusFilter;
  final Function(String filter) onFilterChanged;
  final Function(Map<String, dynamic> order) onEdit;
  final Function(Map<String, dynamic> order) onSettle;
  final Function(Map<String, dynamic> order) onSplit;
  final Function(Map<String, dynamic> order) onMerge;
  final Function(Map<String, dynamic> order) onViewDetails;
  final Function(Map<String, dynamic> order) onDownloadPdf;
  final Map<String, dynamic> settings;

  final String orderSortDirection;
  final Color themePrimary;
  final Color themeBg;
  final Color themeText;
  final Color themeHint;
  final Color themeCard;
  final Color themeBorder;

  const OrdersView({
    super.key,
    required this.placedOrders,
    required this.statusFilter,
    required this.onFilterChanged,
    required this.onEdit,
    required this.onSettle,
    required this.onSplit,
    required this.onMerge,
    required this.onViewDetails,
    required this.onDownloadPdf,
    required this.settings,
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
    final now = DateTime.now();
    final filteredOrders =
        placedOrders.where((o) {
          if (statusFilter != 'ALL') {
            final oStatus = o['status'].toString().toLowerCase();
            final f = statusFilter.toLowerCase();
            bool matches = false;
            if (f == 'pending') {
              matches =
                  (oStatus == 'pending' ||
                  oStatus == 'ordered' ||
                  oStatus == 'preparing' ||
                  oStatus == 'paid' ||
                  oStatus == 'partially paid');
            } else {
              matches = (oStatus == f);
            }
            if (!matches) return false;
          }

          try {
            final date = DateTime.parse(o['order_time']).toLocal();
            if (date.month != now.month || date.year != now.year) return false;
          } catch (_) {
            return false;
          }

          return true;
        }).toList()..sort((a, b) {
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
          return orderSortDirection == 'Ascending'
              ? aId.compareTo(bId)
              : bId.compareTo(aId);
        });

    return Container(
      color: themeBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      LocalizationService().translate('live_order_feed'),
                      style: TextStyle(
                        color: themeText,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      LocalizationService().translate(
                        'monthly_operational_history',
                      ),
                      style: TextStyle(color: themeHint, fontSize: 13),
                    ),
                  ],
                ),
                const Spacer(),
                _buildFilters(),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: filteredOrders.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.receipt_long_outlined,
                          size: 80,
                          color: themeHint.withOpacity(0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          LocalizationService().translate('no_orders_found'),
                          style: TextStyle(
                            color: themeText,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(24),
                    itemCount: filteredOrders.length,
                    itemBuilder: (context, index) {
                      final order = filteredOrders[index];
                      final String timeStr = POSUtils.formatDateTime(
                        order['order_time']?.toString(),
                      );
                      final double total =
                          double.tryParse(order['total_amount'].toString()) ??
                          0.0;

                      final bool isPaidRecord =
                          (order['status']?.toString() ?? '').toLowerCase() ==
                              'paid' ||
                          (order['payment_status']?.toString() ?? '')
                                  .toLowerCase() ==
                              'paid' ||
                          order['payment'] != null ||
                          (order['payment_method'] != null &&
                              order['payment_method'].toString().isNotEmpty);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: themeCard,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: themeBorder),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // 1. Fixed Actions Column (approx 300px)
                            SizedBox(
                              width: 280,
                              child: Row(
                                children: [
                                  // Payment Button with reserved space
                                  SizedBox(
                                    width: 40,
                                    child: Visibility(
                                      visible: !isPaidRecord,
                                      maintainSize: true,
                                      maintainAnimation: true,
                                      maintainState: true,
                                      child: Tooltip(
                                        message: LocalizationService()
                                            .translate('settle_payment'),
                                        child: IconButton(
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(
                                            maxWidth: 40,
                                            minWidth: 40,
                                          ),
                                          visualDensity: VisualDensity.compact,
                                          icon: const Icon(
                                            Icons.payments_rounded,
                                            color: Colors.green,
                                            size: 24,
                                          ),
                                          onPressed: () => onSettle(order),
                                        ),
                                      ),
                                    ),
                                  ),
                                  Tooltip(
                                    message: LocalizationService().translate(
                                      'edit',
                                    ),
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(
                                        maxWidth: 40,
                                        minWidth: 40,
                                      ),
                                      visualDensity: VisualDensity.compact,
                                      icon: Icon(
                                        Icons.edit_note_rounded,
                                        color: themePrimary,
                                        size: 22,
                                      ),
                                      onPressed: () => onEdit(order),
                                    ),
                                  ),
                                  Tooltip(
                                    message: LocalizationService().translate(
                                      'print',
                                    ),
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(
                                        maxWidth: 40,
                                        minWidth: 40,
                                      ),
                                      visualDensity: VisualDensity.compact,
                                      icon: const Icon(
                                        Icons.print_rounded,
                                        color: Colors.blue,
                                        size: 20,
                                      ),
                                      onPressed: () =>
                                          ReceiptService.printReceipt(
                                            order: order,
                                            settings: settings,
                                          ),
                                    ),
                                  ),
                                  Tooltip(
                                    message: LocalizationService().translate(
                                      'download_pdf',
                                    ),
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(
                                        maxWidth: 40,
                                        minWidth: 40,
                                      ),
                                      visualDensity: VisualDensity.compact,
                                      icon: const Icon(
                                        Icons.picture_as_pdf_rounded,
                                        color: Colors.red,
                                        size: 20,
                                      ),
                                      onPressed: () => onDownloadPdf(
                                        Map<String, dynamic>.from(order),
                                      ),
                                    ),
                                  ),
                                  Tooltip(
                                    message: LocalizationService().translate(
                                      'split_bill',
                                    ),
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(
                                        maxWidth: 40,
                                        minWidth: 40,
                                      ),
                                      visualDensity: VisualDensity.compact,
                                      icon: const Icon(
                                        Icons.call_split_rounded,
                                        color: Colors.purple,
                                        size: 20,
                                      ),
                                      onPressed: () => onSplit(order),
                                    ),
                                  ),
                                  Tooltip(
                                    message: LocalizationService().translate(
                                      'merge_bill',
                                    ),
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(
                                        maxWidth: 40,
                                        minWidth: 40,
                                      ),
                                      visualDensity: VisualDensity.compact,
                                      icon: const Icon(
                                        Icons.merge_type_rounded,
                                        color: Colors.orange,
                                        size: 20,
                                      ),
                                      onPressed: () => onMerge(order),
                                    ),
                                  ),
                                  Tooltip(
                                    message: LocalizationService().translate(
                                      'view_details',
                                    ),
                                    child: IconButton(
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(
                                        maxWidth: 40,
                                        minWidth: 40,
                                      ),
                                      visualDensity: VisualDensity.compact,
                                      icon: Icon(
                                        Icons.visibility_rounded,
                                        color: themePrimary,
                                        size: 20,
                                      ),
                                      onPressed: () => onViewDetails(order),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 10),
                            // 2. Fixed Order Info Column (approx 220px)
                            SizedBox(
                              width: 140,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '#${order['order_number'] ?? order['id']}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.9),
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerLeft,
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.access_time_rounded,
                                          size: 10,
                                          color: themeHint,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          timeStr,
                                          style: TextStyle(
                                            color: themeHint,
                                            fontSize: 10,
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Icon(
                                          Icons.restaurant_menu_rounded,
                                          size: 10,
                                          color: themeHint,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${(order['items'] as List?)?.length ?? 0} Items',
                                          style: TextStyle(
                                            color: themeHint,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 25),
                            // 3. Status Badges in Fixed Columns
                            SizedBox(
                              width: 85,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: OrderStatusChip(
                                  status: order['status'] ?? 'Unknown',
                                  themePrimary: themePrimary,
                                ),
                              ),
                            ),
                            SizedBox(
                              width: 85,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: OriginBadge(
                                  origin: order['origin'],
                                  themePrimary: themePrimary,
                                ),
                              ),
                            ),
                            SizedBox(
                              width: 85,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Visibility(
                                  visible:
                                      order['order_type'] != null &&
                                      order['order_type'] != 'In-Store',
                                  maintainSize: true,
                                  maintainAnimation: true,
                                  maintainState: true,
                                  child: OrderTypeBadge(
                                    type: order['order_type'],
                                    themePrimary: themePrimary,
                                  ),
                                ),
                              ),
                            ),
                            SizedBox(
                              width: 90,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: PaymentStatusBadge(order: order),
                              ),
                            ),
                            const Spacer(),
                            // 4. Fixed Total Column
                            SizedBox(
                              width: 90,
                              child: Text(
                                '${settings['tenant']?['currency'] ?? '\$'}${total.toStringAsFixed(2)}',
                                textAlign: TextAlign.right,
                                style: TextStyle(
                                  color: themeText,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
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
    );
  }

  Widget _buildFilters() {
    final filters = [
      'ALL',
      'Pending',
      'Preparing',
      'Ready',
      'Served',
      'Paid',
      'Cancelled',
    ];
    return Row(
      children: filters.map((f) {
        final bool sel = statusFilter == f;
        int count = 0;
        if (f == 'ALL') {
          count = placedOrders.length;
        } else if (f == 'Pending') {
          count = placedOrders.where((o) {
            final s = o['status'].toString().toLowerCase();
            return (s == 'pending' ||
                s == 'ordered' ||
                s == 'preparing' ||
                s == 'paid' ||
                s == 'partially paid');
          }).length;
        } else {
          count = placedOrders
              .where(
                (o) => o['status'].toString().toLowerCase() == f.toLowerCase(),
              )
              .length;
        }

        return GestureDetector(
          onTap: () => onFilterChanged(f),
          child: Container(
            margin: const EdgeInsets.only(left: 12),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: sel ? themePrimary : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? themePrimary : themeBorder),
                  ),
                  child: Text(
                    LocalizationService()
                        .translate(f == 'ALL' ? 'all_caps' : f.toLowerCase())
                        .toUpperCase(),
                    style: TextStyle(
                      color: sel ? Colors.white : themeHint,
                      fontWeight: sel ? FontWeight.bold : FontWeight.w500,
                      fontSize: 11,
                    ),
                  ),
                ),
                if (count > 0)
                  Positioned(
                    right: -6,
                    top: -6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      constraints: const BoxConstraints(
                        minWidth: 18,
                        minHeight: 18,
                      ),
                      decoration: BoxDecoration(
                        color: sel ? Colors.white : themePrimary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: sel ? themePrimary : themeBg,
                          width: 1.5,
                        ),
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
}

