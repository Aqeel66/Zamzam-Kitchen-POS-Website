import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:ui_kit/ui_kit.dart' as ui_kit;
import '../theme_service.dart';
import '../localization_service.dart';

class TableMapView extends StatefulWidget {
  final List<dynamic> userPermissions;
  final Function(ui_kit.RestaurantTable) onTableTap;

  const TableMapView({
    super.key,
    required this.userPermissions,
    required this.onTableTap,
  });

  @override
  State<TableMapView> createState() => _TableMapViewState();
}

class _TableMapViewState extends State<TableMapView> {
  List<ui_kit.RestaurantTable>? _restaurantTables;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchTables();
  }

  Future<void> _fetchTables() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final resp = await http.get(
        Uri.parse('${ThemeService.apiBaseUrl}/api/tables'),
      );

      if (resp.statusCode == 200) {
        final List<dynamic> data = json.decode(resp.body);
        if (mounted) {
          setState(() {
            _restaurantTables = data.map((json) {
              return ui_kit.RestaurantTable(
                id: json['id'].toString(),
                label: json['table_number'].toString(),
                capacity: json['capacity'] ?? 4,
                currentOccupancy: json['status'] == 'Occupied' ? (json['party_size'] ?? 1) : 0,
                status: _mapStatus(json['status']),
                x: double.tryParse(json['pos_x']?.toString() ?? '0') ?? 0,
                y: double.tryParse(json['pos_y']?.toString() ?? '0') ?? 0,
              );
            }).toList();
          });
        }
      }
    } catch (e) {
      debugPrint('Error fetching tables: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  ui_kit.TableStatus _mapStatus(String? status) {
    switch (status) {
      case 'Available':
        return ui_kit.TableStatus.available;
      case 'Occupied':
        return ui_kit.TableStatus.occupied;
      case 'Reserved':
        return ui_kit.TableStatus.reserved;
      case 'Needs Clearing':
        return ui_kit.TableStatus.needsCleaning;
      default:
        return ui_kit.TableStatus.available;
    }
  }

  @override
  Widget build(BuildContext context) {
    final themePrimary = Theme.of(context).primaryColor;
    final themeText = Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black;
    final themeBg = Theme.of(context).scaffoldBackgroundColor;
    final themeHint = themeText.withValues(alpha: 0.6);

    if (_isLoading && (_restaurantTables == null || _restaurantTables!.isEmpty)) {
      return Center(child: CircularProgressIndicator(color: themePrimary));
    }

    if (_restaurantTables == null || _restaurantTables!.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.table_bar_outlined, size: 64, color: themeHint),
            const SizedBox(height: 16),
            Text(
              LocalizationService().translate('no_tables_found'),
              style: TextStyle(color: themeHint, fontSize: 18),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _fetchTables,
              style: ElevatedButton.styleFrom(backgroundColor: themePrimary),
              child: Text(
                LocalizationService().translate('retry_fetch'),
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                LocalizationService().translate('interactive_floor_plan'),
                style: TextStyle(
                  color: themeText,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _fetchTables,
                tooltip: 'Refresh Tables',
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: ui_kit.VisualFloorPlan(
              initialTables: _restaurantTables!,
              // Waiters cannot move tables by default, but let's allow it if we want
              onTableMoved: null, 
              onTableTap: widget.onTableTap,
              backgroundColor: themeBg,
            ),
          ),
        ),
      ],
    );
  }
}
