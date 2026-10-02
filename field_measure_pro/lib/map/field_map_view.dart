import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/geo_point.dart';
import '../gis/geodesic_calculator.dart';
import '../gis/path_simplifier.dart';
import '../core/units.dart';

enum MapInteractionMode { normal, drawing, pointByPoint, editing, gpsWalk }

enum MapLayerType { satellite, street, terrain }

class MapLayerInfo {
  final MapLayerType type;
  final String name;
  final String urlTemplate;
  final String attribution;
  final int maxZoom;

  const MapLayerInfo({
    required this.type,
    required this.name,
    required this.urlTemplate,
    required this.attribution,
    this.maxZoom = 19,
  });
}

class MapProviders {
  static const MapLayerInfo satellite = MapLayerInfo(
    type: MapLayerType.satellite,
    name: 'Satellite',
    urlTemplate:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  );

  static const MapLayerInfo street = MapLayerInfo(
    type: MapLayerType.street,
    name: 'Street',
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  );

  static const MapLayerInfo terrain = MapLayerInfo(
    type: MapLayerType.terrain,
    name: 'Terrain',
    urlTemplate: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap, © OpenStreetMap',
    maxZoom: 17,
  );

  static const List<MapLayerInfo> allLayers = [satellite, street, terrain];

  static MapLayerInfo getLayerByName(String name) {
    switch (name.toLowerCase()) {
      case 'street':
        return street;
      case 'terrain':
        return terrain;
      case 'satellite':
      default:
        return satellite;
    }
  }
}

class FieldMapView extends StatefulWidget {
  final List<GeoPoint> points;
  final List<GeoPoint>? originalGpsPoints;
  final GeoPoint? currentGpsPoint;
  final MapInteractionMode mode;
  final int? selectedVertexIndex;
  final String? customModeTitle;

  // Blocker #2: Authoritative explicit operation callbacks (sole source of truth is PolygonEditorController)
  final void Function(int index)? onVertexDragStart;
  final void Function(int index, GeoPoint newPoint)? onVertexDrag;
  final void Function(int index)? onVertexDragEnd;
  final VoidCallback? onVertexDragCancel;
  final void Function(int index, GeoPoint midpoint)? onMidpointInsert;
  final void Function(int index)? onVertexSelected;
  final void Function(List<GeoPoint>)? onDrawingFinished;
  final void Function(GeoPoint point)? onMapTapPoint;

  const FieldMapView({
    super.key,
    required this.points,
    this.originalGpsPoints,
    this.currentGpsPoint,
    required this.mode,
    this.selectedVertexIndex,
    this.customModeTitle,
    this.onVertexDragStart,
    this.onVertexDrag,
    this.onVertexDragEnd,
    this.onVertexDragCancel,
    this.onMidpointInsert,
    this.onVertexSelected,
    this.onDrawingFinished,
    this.onMapTapPoint,
  });

  @override
  State<FieldMapView> createState() => _FieldMapViewState();
}

class _FieldMapViewState extends State<FieldMapView> {
  final GlobalKey _mapKey = GlobalKey();
  final MapController _mapController = MapController();
  final List<Offset> _touchScreenPoints = [];
  bool _isFreehandDrawing = false;
  bool _isDraggingVertex = false;
  late MapLayerInfo _currentLayer;
  bool _showLayerMenu = false;

  @override
  void initState() {
    super.initState();
    // Blocker #3 & Section 24: Restore persisted map layer
    _currentLayer = MapProviders.getLayerByName(UnitSettings.selectedMapLayer);
  }

  @override
  Widget build(BuildContext context) {
    // Initial camera center
    LatLng center = const LatLng(29.9457, 78.1642);
    if (widget.points.isNotEmpty) {
      center = LatLng(widget.points.first.latitude, widget.points.first.longitude);
    } else if (widget.currentGpsPoint != null) {
      center = LatLng(widget.currentGpsPoint!.latitude, widget.currentGpsPoint!.longitude);
    }

    final polygonLayers = <Polygon>[];
    final polylineLayers = <Polyline>[];

    // 1. Original GPS Polygon (dashed yellow) if available
    if (widget.originalGpsPoints != null && widget.originalGpsPoints!.length >= 3) {
      polygonLayers.add(
        Polygon(
          points: widget.originalGpsPoints!.map((p) => LatLng(p.latitude, p.longitude)).toList(),
          color: const Color(0x33FACC15),
          borderColor: const Color(0xFFEAB308),
          borderStrokeWidth: 2.0,
          isDotted: true,
        ),
      );
    }

    // 2. Authoritative Main Polygon (closed if >= 3 and not GPS walking)
    if (widget.points.length >= 3 && widget.mode != MapInteractionMode.gpsWalk) {
      polygonLayers.add(
        Polygon(
          points: widget.points.map((p) => LatLng(p.latitude, p.longitude)).toList(),
          color: const Color(0x4422C55E),
          borderColor: const Color(0xFF16A34A),
          borderStrokeWidth: 3.5,
        ),
      );
    }

    // 3. Polyline for Point-by-Point creation before close or GPS walking path
    if ((widget.mode == MapInteractionMode.gpsWalk || widget.mode == MapInteractionMode.pointByPoint) &&
        widget.points.length >= 2) {
      polylineLayers.add(
        Polyline(
          points: widget.points.map((p) => LatLng(p.latitude, p.longitude)).toList(),
          color: widget.mode == MapInteractionMode.pointByPoint
              ? const Color(0xFF4ADE80)
              : const Color(0xFF3B82F6),
          strokeWidth: 4.0,
        ),
      );
    }

    // Markers for editing and point-by-point: Vertices and Midpoints
    final markers = <Marker>[];

    // In point-by-point mode, render markers for placed points
    if (widget.mode == MapInteractionMode.pointByPoint) {
      for (int i = 0; i < widget.points.length; i++) {
        final pt = widget.points[i];
        markers.add(
          Marker(
            point: LatLng(pt.latitude, pt.longitude),
            width: 32,
            height: 32,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF16A34A),
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 4)],
              ),
              child: Center(
                child: Text(
                  '${i + 1}',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        );
      }
    }

    if (widget.mode == MapInteractionMode.editing) {
      for (int i = 0; i < widget.points.length; i++) {
        final pt = widget.points[i];
        final isSelected = widget.selectedVertexIndex == i;

        // Touch hit target for phone & desktop
        markers.add(
          Marker(
            point: LatLng(pt.latitude, pt.longitude),
            width: 48,
            height: 48,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () {
                widget.onVertexSelected?.call(i);
              },
              onPanStart: (details) {
                setState(() {
                  _isDraggingVertex = true;
                });
                widget.onVertexDragStart?.call(i);
              },
              onPanUpdate: (details) {
                // Derived directly from current pointer position through map camera
                final renderBox = _mapKey.currentContext?.findRenderObject() as RenderBox?;
                if (renderBox != null) {
                  final localOffset = renderBox.globalToLocal(details.globalPosition);
                  final latLng = _mapController.camera.screenPointToLatLng(
                    Point<double>(localOffset.dx, localOffset.dy),
                  );

                  final newGeoPoint = GeoPoint(
                    latitude: latLng.latitude,
                    longitude: latLng.longitude,
                    timestamp: DateTime.now().millisecondsSinceEpoch,
                  );

                  widget.onVertexDrag?.call(i, newGeoPoint);
                }
              },
              onPanEnd: (details) {
                setState(() {
                  _isDraggingVertex = false;
                });
                widget.onVertexDragEnd?.call(i);
              },
              onPanCancel: () {
                setState(() {
                  _isDraggingVertex = false;
                });
                widget.onVertexDragCancel?.call();
              },
              child: Center(
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? const Color(0xFFFBBF24) : const Color(0xFF16A34A),
                    border: Border.all(color: Colors.white, width: 2.5),
                    boxShadow: const [
                      BoxShadow(color: Colors.black45, blurRadius: 4, offset: Offset(0, 2)),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '${i + 1}',
                      style: TextStyle(
                        color: isSelected ? Colors.black : Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );

        // Midpoint handle between vertex i and i+1
        if (widget.points.length >= 3) {
          final nextPt = widget.points[(i + 1) % widget.points.length];
          final mid = GeodesicCalculator.midpoint(pt, nextPt);

          markers.add(
            Marker(
              point: LatLng(mid.latitude, mid.longitude),
              width: 40,
              height: 40,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  widget.onMidpointInsert?.call(i + 1, mid);
                  widget.onVertexSelected?.call(i + 1);
                },
                child: Center(
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFF16A34A), width: 2),
                      boxShadow: const [
                        BoxShadow(color: Colors.black38, blurRadius: 3, offset: Offset(0, 1)),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        '+',
                        style: TextStyle(
                          color: Color(0xFF16A34A),
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          height: 1.0,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }
      }
    }

    // Current GPS position marker
    if (widget.currentGpsPoint != null) {
      markers.add(
        Marker(
          point: LatLng(widget.currentGpsPoint!.latitude, widget.currentGpsPoint!.longitude),
          width: 24,
          height: 24,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF3B82F6),
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [BoxShadow(color: Colors.blueAccent, blurRadius: 8)],
            ),
          ),
        ),
      );
    }

    final InteractiveFlag interactiveFlags;
    if (_isDraggingVertex || widget.mode == MapInteractionMode.drawing) {
      interactiveFlags = InteractiveFlag.none;
    } else {
      interactiveFlags = InteractiveFlag.all;
    }

    String modeLabel = widget.customModeTitle ?? '';
    if (modeLabel.isEmpty) {
      switch (widget.mode) {
        case MapInteractionMode.drawing:
          modeLabel = 'DRAWING (FREEHAND)';
          break;
        case MapInteractionMode.pointByPoint:
          modeLabel = 'DRAWING (POINT-BY-POINT)';
          break;
        case MapInteractionMode.editing:
          modeLabel = 'EDITING BOUNDARY';
          break;
        case MapInteractionMode.gpsWalk:
          modeLabel = 'GPS WALK ACTIVE';
          break;
        case MapInteractionMode.normal:
          modeLabel = 'MAP VIEW';
          break;
      }
    }

    return Stack(
      key: _mapKey,
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 17.0,
            onTap: (tapPosition, point) {
              if (widget.mode == MapInteractionMode.pointByPoint && widget.onMapTapPoint != null) {
                widget.onMapTapPoint!(GeoPoint(
                  latitude: point.latitude,
                  longitude: point.longitude,
                  timestamp: DateTime.now().millisecondsSinceEpoch,
                ));
              }
            },
            interactionOptions: InteractionOptions(
              flags: interactiveFlags,
            ),
          ),
          children: [
            TileLayer(
              urlTemplate: _currentLayer.urlTemplate,
              maxZoom: _currentLayer.maxZoom,
              userAgentPackageName: 'com.fieldmeasurepro.app',
            ),
            if (polygonLayers.isNotEmpty) PolygonLayer(polygons: polygonLayers),
            if (polylineLayers.isNotEmpty) PolylineLayer(polylines: polylineLayers),
            if (markers.isNotEmpty) MarkerLayer(markers: markers),
          ],
        ),

        // Freehand Touch Drawing Canvas Overlay
        if (widget.mode == MapInteractionMode.drawing)
          Positioned.fill(
            child: GestureDetector(
              onPanStart: (details) {
                setState(() {
                  _isFreehandDrawing = true;
                  _touchScreenPoints.clear();
                  _touchScreenPoints.add(details.localPosition);
                });
              },
              onPanUpdate: (details) {
                setState(() {
                  _touchScreenPoints.add(details.localPosition);
                });
              },
              onPanEnd: (details) {
                setState(() {
                  _isFreehandDrawing = false;
                });
                _finishFreehandDrawing();
              },
              child: CustomPaint(
                painter: FreehandTouchPainter(points: _touchScreenPoints),
                size: Size.infinite,
              ),
            ),
          ),

        // Mode Indicator Badge
        Positioned(
          top: 14,
          left: 14,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xCC0F172A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF334155)),
              boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.mode == MapInteractionMode.editing
                        ? const Color(0xFFFBBF24)
                        : const Color(0xFF4ADE80),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  modeLabel,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
        ),

        // Map Layer Selector Button & Dropdown (persisted)
        Positioned(
          top: 14,
          right: 14,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              FloatingActionButton.small(
                heroTag: 'map_layer_toggle',
                backgroundColor: const Color(0xFF1E293B),
                foregroundColor: Colors.white,
                elevation: 3,
                onPressed: () {
                  setState(() {
                    _showLayerMenu = !_showLayerMenu;
                  });
                },
                child: const Icon(Icons.layers, size: 20),
              ),
              if (_showLayerMenu)
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xF20F172A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF334155)),
                    boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 8)],
                  ),
                  child: Column(
                    children: MapProviders.allLayers.map((layer) {
                      final isSelected = layer.type == _currentLayer.type;
                      return InkWell(
                        onTap: () {
                          setState(() {
                            _currentLayer = layer;
                            _showLayerMenu = false;
                          });
                          UnitSettings.setMapLayer(layer.name.toLowerCase());
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF16A34A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            layer.name,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white70,
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
            ],
          ),
        ),

        // Provider Attribution Notice
        Positioned(
          bottom: 2,
          right: 6,
          child: Text(
            _currentLayer.attribution,
            style: const TextStyle(fontSize: 8, color: Colors.white38),
          ),
        ),
      ],
    );
  }

  void _finishFreehandDrawing() {
    if (_touchScreenPoints.length < 5) {
      _touchScreenPoints.clear();
      return;
    }

    final camera = _mapController.camera;
    final List<GeoPoint> geoPoints = [];

    for (final offset in _touchScreenPoints) {
      final latLng = camera.screenPointToLatLng(Point<double>(offset.dx, offset.dy));
      geoPoints.add(GeoPoint(
        latitude: latLng.latitude,
        longitude: latLng.longitude,
        timestamp: DateTime.now().millisecondsSinceEpoch,
        accuracy: null, // Unknown! Touch-drawn, not fake GPS
      ));
    }

    final simplified = PathSimplifier.simplifyPolygon(geoPoints, 1.5);
    _touchScreenPoints.clear();

    if (simplified.length >= 3) {
      widget.onDrawingFinished?.call(simplified);
    }
  }
}

class FreehandTouchPainter extends CustomPainter {
  final List<Offset> points;
  FreehandTouchPainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    final paint = Paint()
      ..color = const Color(0xFF22C55E)
      ..strokeWidth = 4.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final path = Path();
    path.moveTo(points.first.dx, points.first.dy);
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant FreehandTouchPainter oldDelegate) => true;
}
