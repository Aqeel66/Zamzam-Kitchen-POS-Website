import 'package:flutter/material.dart';
import '../localization_service.dart';

/// A unified badge widget to ensure consistent look and feel across the application.
class BaseBadge extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;
  final bool useShadow;
  final double opacity;

  const BaseBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
    this.useShadow = false,
    this.opacity = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color, width: 1.5),
          boxShadow: useShadow
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.2),
                    blurRadius: 4 * opacity,
                    spreadRadius: 2 * opacity,
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 12, color: color),
              const SizedBox(width: 4),
            ],
            Text(
              label.toUpperCase(),
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class OrderStatusChip extends StatelessWidget {
  final String status;
  final Color themePrimary;

  const OrderStatusChip({
    super.key,
    required this.status,
    required this.themePrimary,
  });

  Color _getStatusColor(String s) {
    switch (s) {
      case 'Pending':
        return Colors.red;
      case 'Ordered':
        return Colors.orange;
      case 'Preparing':
        return themePrimary;
      case 'Ready':
        return Colors.greenAccent[700]!;
      case 'Served':
        return Colors.teal;
      case 'Paid':
        return Colors.green;
      case 'Cancelled':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    String s = status.toLowerCase();
    if (s == 'ordered' || s == 'paid') return const SizedBox.shrink();
    Color c = _getStatusColor(status);

    return BaseBadge(label: status, color: c);
  }
}

class OriginBadge extends StatelessWidget {
  final String? origin;
  final Color themePrimary;

  const OriginBadge({super.key, this.origin, required this.themePrimary});

  @override
  Widget build(BuildContext context) {
    if (origin == null || origin!.isEmpty) return const SizedBox.shrink();

    Color badgeColor;
    IconData badgeIcon;
    String? labelOverride;

    if (origin == 'Website') {
      badgeColor = themePrimary;
      badgeIcon = Icons.language;
    } else if (origin == 'In-Store' || origin == 'Counter') {
      badgeColor = Colors.teal;
      badgeIcon = Icons.point_of_sale_rounded;
      labelOverride = 'Counter';
    } else {
      badgeColor = Colors.purple;
      badgeIcon = Icons.qr_code_scanner;
    }

    return BaseBadge(
      label: labelOverride ?? origin!,
      color: badgeColor,
      icon: badgeIcon,
    );
  }
}

class PaymentStatusBadge extends StatelessWidget {
  final Map<String, dynamic> order;

  const PaymentStatusBadge({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final status = (order['status']?.toString() ?? '').toLowerCase();
    final paymentStatus = (order['payment_status']?.toString() ?? '')
        .toLowerCase();

    bool isPaid =
        status == 'paid' ||
        paymentStatus == 'paid' ||
        order['payment'] != null ||
        (order['payment_method'] != null &&
            order['payment_method'].toString().isNotEmpty);

    if (isPaid) {
      return _StatusBadge(
        color: Colors.green,
        label: LocalizationService().translate('paid'),
        icon: Icons.check_circle_rounded,
      );
    }

    return _StatusBadge(
      color: Colors.deepOrange,
      label: LocalizationService().translate('unpaid'),
      icon: Icons.warning_amber_rounded,
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final Color color;
  final String label;
  final IconData icon;

  const _StatusBadge({
    required this.color,
    required this.label,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.2, end: 1.0),
      duration: const Duration(milliseconds: 1000),
      builder: (context, opacity, child) {
        return BaseBadge(
          label: label,
          color: color,
          icon: icon,
          useShadow: true,
          opacity: opacity,
        );
      },
    );
  }
}

class ReservationStatusChip extends StatelessWidget {
  final String status;

  const ReservationStatusChip({super.key, required this.status});

  Color _getResStatusColor(String s) {
    switch (s.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return Colors.green;
      case 'seated':
        return Colors.blue;
      case 'completed':
        return Colors.teal;
      case 'cancelled':
        return Colors.red;
      case 'no-show':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    Color c = _getResStatusColor(status);
    return BaseBadge(label: status, color: c);
  }
}

class OrderTypeBadge extends StatelessWidget {
  final String? type;
  final Color themePrimary;

  const OrderTypeBadge({super.key, this.type, required this.themePrimary});

  @override
  Widget build(BuildContext context) {
    final String label = type ?? 'Dine-In';
    Color badgeColor;
    IconData badgeIcon;

    switch (label.toLowerCase()) {
      case 'dine-in':
      case 'dine in':
        badgeColor = Colors.blue;
        badgeIcon = Icons.restaurant_rounded;
        break;
      case 'takeaway':
      case 'take away':
        badgeColor = Colors.orange;
        badgeIcon = Icons.shopping_bag_rounded;
        break;
      case 'delivery':
        badgeColor = Colors.purple;
        badgeIcon = Icons.delivery_dining_rounded;
        break;
      case 'counter':
        badgeColor = themePrimary;
        badgeIcon = Icons.person_rounded;
        break;
      default:
        badgeColor = Colors.grey;
        badgeIcon = Icons.info_outline_rounded;
    }

    return BaseBadge(label: label, color: badgeColor, icon: badgeIcon);
  }
}

