import 'package:flutter/material.dart';
import '../../localization_service.dart';
import '../../theme_service.dart';
import 'package:ui_kit/ui_kit.dart' as ui_kit;
import '../../components/pos_widgets.dart';

class ReservationsView extends StatefulWidget {
  final List<dynamic> reservations;
  final String statusFilter;
  final Map<String, dynamic>? selectedReservation;
  final List<ui_kit.RestaurantTable>? restaurantTables;
  final Function(String filter) onFilterChanged;
  final Function(Map<String, dynamic>? res) onSelectReservation;
  final VoidCallback onAddReservation;
  final VoidCallback onRefresh;
  final Function(dynamic id, String status, [dynamic tableId]) onUpdateStatus;
  final String orderSortDirection;
  final Color themePrimary;
  final Color themeBg;
  final Color themeText;
  final Color themeHint;
  final Color themeCard;
  final Color themeBorder;

  const ReservationsView({
    super.key,
    required this.reservations,
    required this.statusFilter,
    this.selectedReservation,
    this.restaurantTables,
    required this.onFilterChanged,
    required this.onSelectReservation,
    required this.onAddReservation,
    required this.onRefresh,
    required this.onUpdateStatus,
    this.orderSortDirection = 'Descending',
    required this.themePrimary,
    required this.themeBg,
    required this.themeText,
    required this.themeHint,
    required this.themeCard,
    required this.themeBorder,
  });

  @override
  State<ReservationsView> createState() => _ReservationsViewState();
}

class _ReservationsViewState extends State<ReservationsView> {
  final ScrollController _scrollController = ScrollController();
  
  // Controllers for editing
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _partySizeController;
  late TextEditingController _dateController;
  late TextEditingController _timeController;
  
  bool _isEditing = false;

  @override
  void initState() {
    super.initState();
    _initControllers();
  }

  void _initControllers() {
    final res = widget.selectedReservation;
    _nameController = TextEditingController(text: res != null ? '${res['first_name'] ?? ''} ${res['last_name'] ?? ''}'.trim() : '');
    _phoneController = TextEditingController(text: res?['phone'] ?? '');
    _emailController = TextEditingController(text: res?['email'] ?? '');
    _partySizeController = TextEditingController(text: res?['party_size']?.toString() ?? '');
    _dateController = TextEditingController(text: res?['reservation_date']?.toString().split('T')[0] ?? '');
    _timeController = TextEditingController(text: res?['reservation_time']?.toString().substring(0, 5) ?? '');
  }

  @override
  void didUpdateWidget(ReservationsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.selectedReservation != oldWidget.selectedReservation) {
      _initControllers();
      _isEditing = false;
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _partySizeController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.reservations.where((res) {
      if (widget.statusFilter == 'ALL') return true;
      if (widget.statusFilter == 'Upcoming') {
        return res['status'] == 'Confirmed' || res['status'] == 'Pending';
      }
      return res['status'] == widget.statusFilter;
    }).toList();

    // Sort
    filtered.sort((a, b) {
      final da = DateTime.tryParse(a['created_at']?.toString() ?? '') ?? DateTime(2000);
      final db = DateTime.tryParse(b['created_at']?.toString() ?? '') ?? DateTime(2000);
      return widget.orderSortDirection == 'Ascending' ? da.compareTo(db) : db.compareTo(da);
    });

    return Container(
      color: widget.themeBg,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Side: Header + Filters + List
          Expanded(
            flex: 5,
            child: Column(
              children: [
                // Header (Moved inside Left Column)
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                  child: Row(
                    children: [
                      Text(
                        LocalizationService().translate('live_bookings'),
                        style: TextStyle(color: widget.themeText, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(width: 24),
                      ElevatedButton.icon(
                        onPressed: widget.onAddReservation,
                        icon: const Icon(Icons.add, color: Colors.white, size: 18),
                        label: Text(LocalizationService().translate('add_new_booking'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: widget.themePrimary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          elevation: 0,
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton(
                        icon: Icon(Icons.refresh_rounded, color: widget.themeHint),
                        onPressed: widget.onRefresh,
                      ),
                    ],
                  ),
                ),

                // Filters Bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: _buildReservationFilters(),
                  ),
                ),

                // List Area
                Expanded(
                  child: filtered.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.event_busy_rounded, size: 64, color: widget.themeHint.withValues(alpha: 0.3)),
                              const SizedBox(height: 16),
                              Text(
                                LocalizationService().translate('no_reservations_found'),
                                style: TextStyle(color: widget.themeHint, fontSize: 16),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 0),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final res = filtered[index];
                            final bool isSelected = widget.selectedReservation?['id'] == res['id'];
                            return _buildReservationListItem(res, isSelected);
                          },
                        ),
                ),
              ],
            ),
          ),

          // Right Side: Details Console (Touching Top)
          Expanded(
            flex: 3,
            child: Container(
              decoration: BoxDecoration(
                color: widget.themeCard.withValues(alpha: 0.3),
                border: Border(left: BorderSide(color: widget.themeBorder)),
              ),
              child: widget.selectedReservation == null
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.info_outline_rounded, size: 48, color: widget.themeHint.withValues(alpha: 0.2)),
                          const SizedBox(height: 16),
                          Text(
                            'Select a booking to view details',
                            style: TextStyle(color: widget.themeHint, fontSize: 14),
                          ),
                        ],
                      ),
                    )
                  : _buildReservationDetailsPane(widget.selectedReservation!),
            ),
          ),
        ],
      ),
    );
  }

  String _getTableLabel(Map<String, dynamic> res) {
    if (res['assigned_table_number'] != null && res['assigned_table_number'].toString().isNotEmpty) {
      return res['assigned_table_number'].toString();
    }
    if (res['table_number'] != null && res['table_number'].toString().isNotEmpty) {
      return res['table_number'].toString();
    }
    
    // Attempt local lookup if IDs are present
    if (res['table_id'] != null && widget.restaurantTables != null) {
      final tid = res['table_id'].toString();
      try {
        final table = widget.restaurantTables!.firstWhere((t) => t.id == tid);
        return table.label;
      } catch (_) {}
    }
    
    return 'N/A';
  }

  bool _hasTableAssigned(Map<String, dynamic> res) {
    return (res['assigned_table_number'] != null && res['assigned_table_number'].toString().isNotEmpty) ||
           (res['table_number'] != null && res['table_number'].toString().isNotEmpty) ||
           (res['table_id'] != null && res['table_id'].toString() != '0');
  }

  Widget _buildReservationListItem(Map<String, dynamic> res, bool isSelected) {
    return GestureDetector(
      onTap: () => widget.onSelectReservation(res),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: widget.themeCard,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? widget.themePrimary : widget.themeBorder,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected ? widget.themePrimary.withValues(alpha: 0.1) : Colors.black.withValues(alpha: 0.01),
              blurRadius: 4,
              offset: const Offset(0, 2),
            )
          ],
        ),
        child: Row(
          children: [
            // Name Section
            Expanded(
              flex: 4,
              child: Text(
                '${res['first_name'] ?? ''} ${res['last_name'] ?? ''}'.trim(),
                style: TextStyle(color: widget.themeText, fontWeight: FontWeight.bold, fontSize: 16),
                overflow: TextOverflow.ellipsis,
              ),
            ),

            // Date & Time
            Expanded(
              flex: 5,
              child: Row(
                children: [
                  _buildInfoItem(Icons.calendar_today_rounded, (res['reservation_date']?.toString() ?? '').split('T')[0]),
                  const SizedBox(width: 16),
                  _buildInfoItem(Icons.access_time_rounded, (res['reservation_time']?.toString() ?? '').substring(0, 5)),
                ],
              ),
            ),

            // Guests & Table
            Expanded(
              flex: 5,
              child: Row(
                children: [
                  _buildInfoItem(Icons.people_rounded, '${res['party_size']} Guests'),
                  const SizedBox(width: 16),
                  _buildInfoItem(
                    Icons.table_restaurant_rounded, 
                    'Table ${_getTableLabel(res)}', 
                    color: _hasTableAssigned(res) ? widget.themePrimary : Colors.red
                  ),
                ],
              ),
            ),

            // Badges & Actions
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                OriginBadge(origin: res['origin'], themePrimary: widget.themePrimary),
                const SizedBox(width: 12),
                _buildStatusBadge(res['status'] ?? 'Pending'),
                if (isSelected) ...[
                  const SizedBox(width: 12),
                  Icon(Icons.arrow_forward_ios_rounded, size: 14, color: widget.themePrimary),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String text, {Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color ?? widget.themeHint),
        const SizedBox(width: 8),
        Text(
          text,
          style: TextStyle(
            color: color ?? widget.themeHint, 
            fontSize: 14, 
            fontWeight: color != null ? FontWeight.bold : FontWeight.normal
          ),
        ),
      ],
    );
  }

  Widget _buildReservationDetailsPane(Map<String, dynamic> res) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _nameController.text,
                      style: TextStyle(color: widget.themeText, fontSize: 18, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text('BOOKING ID: #${res['id']}', style: TextStyle(color: widget.themeHint, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(Icons.close_rounded, color: widget.themeHint, size: 20),
                onPressed: () => widget.onSelectReservation(null),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildStatusBadge(res['status'] ?? 'Pending'),
              const SizedBox(width: 6),
              OriginBadge(origin: res['origin'], themePrimary: widget.themePrimary),
            ],
          ),
          const SizedBox(height: 12),
          
          _buildSectionHeader('CONTACT INFORMATION', onEdit: _isEditing ? null : () => setState(() => _isEditing = true)),
          const SizedBox(height: 4),
          if (_isEditing) ...[
            _buildEditField('Full Name', _nameController),
            const SizedBox(height: 4),
            _buildEditField('Phone Number', _phoneController),
            const SizedBox(height: 4),
            _buildEditField('Email Address', _emailController),
          ] else ...[
            _buildDetailRow(Icons.phone_rounded, res['phone'] ?? 'No phone'),
            const SizedBox(height: 4),
            _buildDetailRow(Icons.email_rounded, res['email'] ?? 'No email'),
          ],
          
          const SizedBox(height: 12),
          _buildSectionHeader('BOOKING LOGISTICS'),
          const SizedBox(height: 4),
          if (_isEditing) ...[
            Row(
              children: [
                Expanded(child: _buildEditField('Date', _dateController)),
                const SizedBox(width: 8),
                Expanded(child: _buildEditField('Time', _timeController)),
              ],
            ),
            const SizedBox(height: 4),
            _buildEditField('Party Size', _partySizeController),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      // We could call an update API here, but for now just exit edit mode
                      setState(() => _isEditing = false);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: widget.themePrimary, 
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Save Changes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(
                  onPressed: () => setState(() => _isEditing = false),
                  child: Text('Cancel', style: TextStyle(color: widget.themeHint, fontSize: 13)),
                ),
              ],
            ),
          ] else ...[
            _buildDataField('Reserved Date', (res['reservation_date']?.toString() ?? '').split('T')[0]),
            const SizedBox(height: 4),
            _buildDataField('Reserved Time', (res['reservation_time']?.toString() ?? '').substring(0, 5)),
            const SizedBox(height: 4),
            _buildDataField('Total Guests', '${res['party_size']} People'),
            const SizedBox(height: 4),
            _buildDataField('Assigned Table', 'Table ${_getTableLabel(res)}', 
              color: _hasTableAssigned(res) ? widget.themePrimary : Colors.red),
          ],
          
          const SizedBox(height: 12),
          
          // Table Assignment Dropdown
          Text('TABLE ASSIGNMENT', style: TextStyle(color: widget.themeHint, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 4),
          _buildTableDropdown(res),
          
          const SizedBox(height: 16),
          
          // Actions
          if (res['status'] != 'Seated' && res['status'] != 'Cancelled') ...[
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                onPressed: res['table_id'] != null 
                  ? () => widget.onUpdateStatus(res['id'], 'Seated', res['table_id'])
                  : () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Please assign a table first'), backgroundColor: Colors.orange),
                      );
                    },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: const Text('SEAT GUEST NOW', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => widget.onUpdateStatus(res['id'], 'No-Show'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange,
                      side: const BorderSide(color: Colors.orange, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('NO-SHOW', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextButton(
                    onPressed: () => widget.onUpdateStatus(res['id'], 'Cancelled'),
                    child: const Text('CANCEL', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
              ],
            ),
          ] else if (res['status'] == 'Seated') ...[
             Container(
               padding: const EdgeInsets.all(16),
               decoration: BoxDecoration(
                 color: Colors.green.withValues(alpha: 0.1),
                 borderRadius: BorderRadius.circular(16),
                 border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
               ),
               child: Row(
                 children: [
                   const Icon(Icons.check_circle_rounded, color: Colors.green, size: 24),
                   const SizedBox(width: 12),
                   Expanded(
                     child: Text('GUEST SEATED AT TABLE ${res['table_number']}', 
                       style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 14)),
                   ),
                 ],
               ),
             ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, {VoidCallback? onEdit}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: TextStyle(color: widget.themeHint, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
        if (onEdit != null)
          TextButton.icon(
            onPressed: onEdit,
            icon: const Icon(Icons.edit_rounded, size: 14),
            label: const Text('Edit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
          ),
      ],
    );
  }

  Widget _buildDetailRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: widget.themeHint),
          const SizedBox(width: 12),
          Text(text, style: TextStyle(color: widget.themeText, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildDataField(String label, String value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: widget.themeHint, fontSize: 13)),
          Text(value, style: TextStyle(color: color ?? widget.themeText, fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildEditField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: widget.themeHint, fontSize: 9, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        TextField(
          controller: controller,
          style: TextStyle(color: widget.themeText, fontSize: 12),
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: widget.themeBg.withValues(alpha: 0.5),
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.themeBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.themeBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: widget.themePrimary)),
          ),
        ),
      ],
    );
  }

  Widget _buildTableDropdown(Map<String, dynamic> res) {
    final tables = widget.restaurantTables ?? [];
    
    // Standardize IDs to String for comparison and ensure value exists in items
    final String? selectedTableId = res['table_id']?.toString();
    final bool valueExists = tables.any((t) => t.id == selectedTableId);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: widget.themeBg.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: widget.themeBorder),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: valueExists ? selectedTableId : null,
          isExpanded: true,
          hint: Text('Select Table to Assign', style: TextStyle(color: widget.themeHint, fontSize: 14)),
          dropdownColor: widget.themeCard,
          icon: Icon(Icons.keyboard_arrow_down_rounded, color: widget.themePrimary),
          items: tables.map((t) {
            return DropdownMenuItem<String>(
              value: t.id,
              child: Text('Table ${t.label} (Avail: ${t.capacity - t.currentOccupancy} / ${t.capacity})', 
                style: TextStyle(color: widget.themeText, fontSize: 13)),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) {
              widget.onUpdateStatus(res['id'], res['status'] ?? 'Confirmed', val);
            }
          },
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'Confirmed': color = Colors.green; break;
      case 'Pending': color = Colors.orange; break;
      case 'Seated': color = Colors.blue; break;
      case 'Cancelled': color = Colors.red; break;
      default: color = widget.themeHint;
    }
    return BaseBadge(
      label: status,
      color: color,
    );
  }

  Widget _buildReservationFilters() {
    final filters = ['Upcoming', 'Pending', 'Confirmed', 'Seated', 'ALL'];
    
    // Calculate counts for each status
    final Map<String, int> counts = {
      'ALL': widget.reservations.length,
      'Upcoming': widget.reservations.where((res) => res['status'] == 'Confirmed' || res['status'] == 'Pending').length,
      'Pending': widget.reservations.where((res) => res['status'] == 'Pending').length,
      'Confirmed': widget.reservations.where((res) => res['status'] == 'Confirmed').length,
      'Seated': widget.reservations.where((res) => res['status'] == 'Seated').length,
    };

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: filters.map((f) {
          final bool sel = widget.statusFilter == f;
          final int count = counts[f] ?? 0;
          
          return Padding(
            padding: const EdgeInsets.only(left: 12),
            child: ChoiceChip(
              label: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(f.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: sel ? Colors.white : widget.themeHint)),
                  if (count > 0 || f == 'ALL') ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: sel ? Colors.white.withValues(alpha: 0.2) : widget.themePrimary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        count.toString(),
                        style: TextStyle(
                          fontSize: 10, 
                          fontWeight: FontWeight.bold, 
                          color: sel ? Colors.white : widget.themePrimary
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              selected: sel,
              onSelected: (_) => widget.onFilterChanged(f),
              selectedColor: widget.themePrimary,
              backgroundColor: widget.themeCard,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              side: BorderSide(color: sel ? widget.themePrimary : widget.themeBorder),
              showCheckmark: false,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            ),
          );
        }).toList(),
      ),
    );
  }
}
