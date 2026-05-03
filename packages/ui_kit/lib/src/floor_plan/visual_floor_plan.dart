import 'package:flutter/material.dart';
import '../theme/zamam_theme.dart';

enum TableStatus { available, occupied, reserved, needsClearing }

class RestaurantTable {
  final String id;
  final String label;
  final TableStatus status;
  final int capacity;
  final String? type;
  final String? size;
  double x;
  double y;

  RestaurantTable({
    required this.id,
    required this.label,
    required this.status,
    required this.capacity,
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
    // Sync external changes
    setState(() {
      tables = List.from(widget.initialTables);
    });
  }

  Color _getStatusColor(TableStatus status) {
    switch (status) {
      case TableStatus.available:
        return Colors.green.shade400;
      case TableStatus.occupied:
        return ZamamTheme.pulseOrange;
      case TableStatus.reserved:
        return Colors.blue.shade400;
      case TableStatus.needsClearing:
        return Colors.amber.shade500;
    }
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
                final RenderBox renderBox =
                    context.findRenderObject() as RenderBox;
                final Offset localOffset = renderBox.globalToLocal(
                  details.offset,
                );

                setState(() {
                  final index = tables.indexWhere((t) => t.id == table.id);
                  tables[index].x = localOffset.dx;
                  tables[index].y = localOffset.dy;
                });
                
                if (widget.onTableMoved != null) {
                  widget.onTableMoved!(table, localOffset.dx, localOffset.dy);
                }
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
    final content = Material(
      color: Colors.transparent,
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          color: _getStatusColor(table.status),
          shape: table.type == 'Round' ? BoxShape.circle : BoxShape.rectangle,
          borderRadius: table.type == 'Round' ? null : BorderRadius.circular(table.type == 'Rectangular' ? 4 : 12),
          boxShadow: isDragging
              ? [
                  const BoxShadow(
                    color: Colors.black26,
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ]
              : [
                  const BoxShadow(
                    color: Colors.black12,
                    blurRadius: 4,
                    spreadRadius: 1,
                  ),
                ],
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_getTypeIcon(table.type), size: 16, color: Colors.white.withValues(alpha: 0.7)),
              const SizedBox(height: 2),
              Text(
                table.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.chair_outlined, size: 10, color: Colors.white.withValues(alpha: 0.7)),
                  const SizedBox(width: 2),
                  Text(
                    '${table.capacity}',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 10),
                  ),
                  if (table.size != null) ...[
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        table.size!.substring(0, 1).toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
    
    // If not dragging, wrap in GestureDetector
    if (!isDragging) {
      return GestureDetector(
        onTap: () {
          if (widget.onTableTap != null) {
            widget.onTableTap!(table);
          }
        },
        child: content,
      );
    }
    
    return content;
  }
}
