import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../theme_service.dart';
import 'package:ui_kit/ui_kit.dart' as ui_kit;

class LandingDashboardView extends StatefulWidget {
  final Map<String, dynamic>? userData;
  final VoidCallback onCreateOrder;

  const LandingDashboardView({
    super.key,
    this.userData,
    required this.onCreateOrder,
  });

  @override
  State<LandingDashboardView> createState() => _LandingDashboardViewState();
}

class _LandingDashboardViewState extends State<LandingDashboardView> {
  final Color primaryTeal = const Color(0xFF006064);
  final Color primaryYellow = const Color(0xFFFFB300);
  final Color bgColor = const Color(0xFFF8F9FA);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: bgColor,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            const SizedBox(height: 24),
            _buildStatsRow(),
            const SizedBox(height: 24),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 5,
                  child: Column(
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: _buildOrderList()),
                          const SizedBox(width: 24),
                          Expanded(child: _buildPaymentList()),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                Expanded(
                  flex: 2,
                  child: Column(
                    children: [
                      _buildPopularDishes(),
                      const SizedBox(height: 24),
                      _buildOutOfStock(),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final now = DateTime.now();
    final formattedDate = DateFormat('EEEE, d MMMM yyyy').format(now);
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Nice! We have a lot of orders \u{1F601}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF2D3436)),
            ),
          ],
        ),
        Text(
          formattedDate,
          style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'New Orders',
            '16',
            Icons.notifications_outlined,
            primaryTeal,
            Colors.white,
            subtitle: '* Updated every new order',
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatCard(
            'Total Orders',
            '86',
            Icons.assignment_turned_in_outlined,
            Colors.white,
            const Color(0xFF2D3436),
            badgeText: '+2.5% than usual',
            badgeColor: Colors.teal,
            iconColor: Colors.teal,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: _buildStatCard(
            'Waiting List',
            '9',
            Icons.timer_outlined,
            Colors.white,
            const Color(0xFF2D3436),
            badgeText: '+3.2% than usual',
            badgeColor: primaryYellow,
            iconColor: primaryYellow,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: InkWell(
            onTap: widget.onCreateOrder,
            child: Container(
              height: 120,
              decoration: BoxDecoration(
                color: primaryYellow,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: primaryYellow.withValues(alpha: 0.2), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add, color: Colors.black87, size: 28),
                  SizedBox(width: 8),
                  Text(
                    'CREATE NEW ORDER',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.black87),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color bg, Color textColor, {String? subtitle, String? badgeText, Color? badgeColor, Color? iconColor}) {
    return Container(
      height: 120,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(color: textColor.withValues(alpha: 0.8), fontSize: 14, fontWeight: FontWeight.w500)),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: (iconColor ?? textColor).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 20, color: iconColor ?? textColor),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: TextStyle(color: textColor, fontSize: 32, fontWeight: FontWeight.bold)),
              if (subtitle != null)
                Text(subtitle, style: TextStyle(color: textColor.withValues(alpha: 0.6), fontSize: 10)),
              if (badgeText != null)
                Text(badgeText, style: TextStyle(color: badgeColor ?? Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderList() {
    return _buildListContainer(
      'Order List',
      [
        _buildOrderCard('A4', 'Ariel Hikmat', '5 Items', 'Ready', 'Ready to serve', Colors.teal),
        _buildOrderCard('B2', 'Denis Freeman', '4 Items', 'In Progress', 'Cooking Now', Colors.orange),
        _buildOrderCard('TA', 'Morgan Cox', '6 Items', 'In Progress', 'In the Kitchen', Colors.orange),
        _buildOrderCard('TA', 'Paul Rey', '6 Items', 'In Progress', 'In the Kitchen', Colors.orange),
        _buildOrderCard('A9', 'Maja Becker', '8 Items', 'Completed', 'Waiting For Payment', Colors.blue),
      ],
    );
  }

  Widget _buildPaymentList() {
    return _buildListContainer(
      'Payment',
      [
        _buildPaymentCard('A9', 'Maja Becker', 'Order #912'),
        _buildPaymentCard('C2', 'Erwan Richard', 'Order #908'),
        _buildPaymentCard('A2', 'Stefan Meijer', 'Order #904'),
        _buildPaymentCard('A3', 'Julie Madsen', 'Order #903'),
        _buildPaymentCard('B4', 'Aulia Julie', 'Order #897'),
      ],
    );
  }

  Widget _buildListContainer(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 15, offset: const Offset(0, 5)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF2D3436))),
          const SizedBox(height: 16),
          _buildSearchField(),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSearchField() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F2F6),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const TextField(
        decoration: InputDecoration(
          hintText: 'Search a Order',
          hintStyle: TextStyle(color: Colors.grey, fontSize: 14),
          icon: Icon(Icons.search, color: Colors.grey, size: 20),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildOrderCard(String id, String name, String items, String status, String subStatus, Color statusColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(id, style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 13)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                Text(items, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (status == 'Ready') const Icon(Icons.check, size: 12, color: Colors.teal),
                    if (status == 'In Progress') Icon(Icons.timer_outlined, size: 12, color: statusColor),
                    const SizedBox(width: 4),
                    Text(status, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(width: 6, height: 6, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text(subStatus, style: const TextStyle(color: Colors.grey, fontSize: 10)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentCard(String id, String name, String orderId) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: primaryTeal.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(id, style: TextStyle(color: primaryTeal, fontWeight: FontWeight.bold, fontSize: 13)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                Text(orderId, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryYellow,
              foregroundColor: Colors.black87,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Pay Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward, size: 14),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPopularDishes() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Popular Dishes', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              TextButton(onPressed: () {}, child: const Text('View All', style: TextStyle(fontSize: 12))),
            ],
          ),
          const SizedBox(height: 16),
          _buildDishItem('01', 'Scrambled Eggs With Toast', '23 orders'),
          _buildDishItem('02', 'Tacos With Chicken Grilled', '16 orders'),
          _buildDishItem('03', 'Spaghetti Bolognese', '13 orders'),
          _buildDishItem('04', 'French Bread & Potato', '12 orders'),
        ],
      ),
    );
  }

  Widget _buildDishItem(String rank, String name, String count) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Text(rank, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(width: 12),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.fastfood_outlined, color: Colors.grey, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(count, style: const TextStyle(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutOfStock() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Out of Stock', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              TextButton(onPressed: () {}, child: const Text('View All', style: TextStyle(fontSize: 12))),
            ],
          ),
          const SizedBox(height: 16),
          _buildStockItem('Hawaiian Chicken Skewers', 'Available: 04:00 PM'),
          _buildStockItem('Veggie Supreme Pizza', 'Available: 03:30 PM'),
          _buildStockItem('Fish and Chips', 'Available: 04:20 PM'),
        ],
      ),
    );
  }

  Widget _buildStockItem(String name, String availability) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Text(availability, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ],
      ),
    );
  }
}
