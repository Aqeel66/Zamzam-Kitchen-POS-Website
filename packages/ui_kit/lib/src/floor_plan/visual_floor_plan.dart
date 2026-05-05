import 'package:flutter/material.dart';
import '../theme/zamam_theme.dart';

enum TableStatus { available, occupied, reserved, needsClearing }

class RestaurantTable {
  final String id;
  final String label;
  final TableStatus status;
  final int capacity;
  final int currentOccupancy; // Tracks currently seated people
  final String? type;
  final String? size;
  double x;
  double y;

  RestaurantTable({
    required this.id,
    required this.label,
    required this.status,
    required this.capacity,
    this.currentOccupancy = 0,
    this.type,
    this.size,
    required this.x,
    required this.y,
  });
}

class VisualFloorPlan extends StatefulWidget {
  final List<RestaurantTable> initialTables;
  final Function(RestaurantTable)? onTableTap;
  final Function(RestaurantTable, double, double)? onTableMoved;
  final Color? backgroundColor;

  const VisualFloorPlan({
    super.key,
    required this.initialTables,
    this.onTableTap,
    this.onTableMoved,
    this.backgroundColor,
  });

  @override
  State<VisualFloorPlan> createState() => _VisualFloorPlanState();
}

class _VisualFloorPlanState extends State<VisualFloorPlan> {
  late List<RestaurantTable> tables;

  @override
  void initState() {
    super.initState();
    tables = List.from(widget.initialTables);
  }

  @override
  void didUpdateWidget(VisualFloorPlan oldWidget) {
    super.didUpdateWidget(oldWidget);
    setState(() {
      tables = List.from(widget.initialTables);
    });
  }

  Color _getStatusColor(RestaurantTable table) {
    if (table.status == TableStatus.needsClearing) return Colors.amber.shade500;
    if (table.status == TableStatus.reserved) return Colors.blue.shade400;
    
    // Dynamic color based on available capacity
    final available = table.capacity - table.currentOccupancy;
    if (available <= 0) return Colors.red.shade600; // FULL
    if (available < table.capacity) return Colors.orange.shade600; // PARTIALLY OCCUPIED
    return Colors.green.shade400; // EMPTY/AVAILABLE
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: widget.backgroundColor ?? Theme.of(context).scaffoldBackgroundColor,
        border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: tables.map((table) {
          return Positioned(
            left: table.x,
            top: table.y,
            child: Draggable<RestaurantTable>(
              data: table,
              feedback: _buildTableWidget(table, isDragging: true),
              childWhenDragging: Opacity(
                opacity: 0.3,
                child: _buildTableWidget(table),
              ),
              onDragEnd: (details) {
                final RenderBox renderBox = context.findRenderObject() as RenderBox;
                final Offset localOffset = renderBox.globalToLocal(details.offset);

                setState(() {
                  final index = tables.indexWhere((t) => t.id == table.id);
                  // Clamp to prevent negative coordinates (off-screen)
                  final clampedX = localOffset.dx.clamp(0.0, renderBox.size.width - 100);
                  final clampedY = localOffset.dy.clamp(0.0, renderBox.size.height - 100);
                  
                  tables[index].x = clampedX;
                  tables[index].y = clampedY;
                  
                  if (widget.onTableMoved != null) {
                    widget.onTableMoved!(tables[index], clampedX, clampedY);
                  }
                });
              },
              child: _buildTableWidget(table),
            ),
          );
        }).toList(),
      ),
    );
  }

  IconData _getTypeIcon(String? type) {
    switch (type) {
      case 'Square': return Icons.crop_square;
      case 'Round': return Icons.circle_outlined;
      case 'Rectangular': return Icons.rectangle_outlined;
      default: return Icons.table_bar_outlined;
    }
  }

  Widget _buildTableWidget(RestaurantTable table, {bool isDragging = false}) {
    final available = table.capacity - table.currentOccupancy;
    
    final content = Material(
      color: Colors.transparent,
      child: Container(
        width: 100,
        height: 100,
        decoration: BoxDecoration(
          color: _getStatusColor(table),
          shape: table.type == 'Round' ? BoxShape.circle : BoxShape.rectangle,
          borderRadius: table.type == 'Round' ? null : BorderRadius.circular(table.type == 'Rectangular' ? 6 : 16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDragging ? 0.3 : 0.1),
              blurRadius: isDragging ? 15 : 5,
              spreadRadius: isDragging ? 3 : 1,
            ),
          ],
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_getTypeIcon(table.type), size: 18, color: Colors.white.withValues(alpha: 0.8)),
              const SizedBox(height: 2),
              Text(
                table.label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.chair_rounded, size: 14, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    '$available / ${table.capacity}',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Text(
                available == 0 ? 'FULL' : 'AVAIL',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
    
    if (!isDragging) {
      return GestureDetector(
        onTap: () => widget.onTableTap?.call(table),
        child: content,
      );
    }
    
    return content;
  }
}
