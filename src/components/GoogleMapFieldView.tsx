import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Search,
  Undo2,
  Redo2,
  Trash2,
  CheckCircle,
  Plus,
  Save,
  Eye,
  Sliders,
  RotateCw,
  LocateFixed,
  Car,
  Footprints,
  Pencil,
  MousePointer2,
  Hand,
  AlertTriangle,
  Scissors,
  X,
  Layers,
  Sparkles,
  ChevronDown,
  Table,
  Check,
  GripVertical,
} from 'lucide-react';
import {
  LatLng,
  calculateArea,
  calculatePerimeter,
  calculateDistance,
  calculateMidpoint,
  computeAllUnits,
  createSampleParcel,
  formatArea,
  formatDistance,
  validatePolygon,
  simplifyPolygon,
  REGIONAL_PRESETS,
} from '../utils/geoUtils';
import { StreetViewModal } from './StreetViewModal';
import { SavedField } from './SavedFieldsDrawer';

export type ToolMode = 'pointByPoint' | 'freehand' | 'edit' | 'panZoom';

interface GoogleMapFieldViewProps {
  apiKey: string;
  onOpenSavedFields: () => void;
  savedFieldsCount: number;
  onSaveField: (field: SavedField) => void;
  activeLoadedField: SavedField | null;
}

// Inner Controller component that has access to useMap()
const MapController: React.FC<{
  points: LatLng[];
  isClosed: boolean;
  toolMode: ToolMode;
  selectedVertexIndex: number | null;
  onSelectVertex: (index: number | null) => void;
  onPointsChange: (newPoints: LatLng[]) => void;
  onVertexDragStart?: (index: number) => void;
  onVertexDrag: (index: number, newPt: LatLng) => void;
  onVertexDragEnd?: (index: number, newPt: LatLng) => void;
  userLocation: LatLng | null;
  followUser: boolean;
  mapType: string;
  showTraffic: boolean;
  hasIntersection: boolean;
  onSelectPointForStreetView: (pt: LatLng) => void;
  onMapCenterChange?: (center: LatLng) => void;
  onProjectionReady?: (project: (x: number, y: number) => LatLng | null) => void;
}> = ({
  points,
  isClosed,
  toolMode,
  selectedVertexIndex,
  onSelectVertex,
  onPointsChange,
  onVertexDragStart,
  onVertexDrag,
  onVertexDragEnd,
  userLocation,
  followUser,
  mapType,
  showTraffic,
  hasIntersection,
  onSelectPointForStreetView,
  onMapCenterChange,
  onProjectionReady,
}) => {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);

  // Expose Google Maps pixel-to-LatLng projection for Freehand marking
  useEffect(() => {
    if (!map || !onProjectionReady) return;

    class ProjectionOverlay extends google.maps.OverlayView {
      onAdd() {}
      draw() {}
      onRemove() {}
    }

    const overlay = new ProjectionOverlay();
    overlay.setMap(map);

    onProjectionReady((pixelX: number, pixelY: number) => {
      const proj = overlay.getProjection();
      if (!proj) return null;
      const gLatLng = proj.fromContainerPixelToLatLng(new google.maps.Point(pixelX, pixelY));
      if (!gLatLng) return null;
      return { lat: gLatLng.lat(), lng: gLatLng.lng(), timestamp: Date.now() };
    });

    return () => {
      overlay.setMap(null);
    };
  }, [map, onProjectionReady]);

  // Lock map gestures during Freehand drawing mode
  useEffect(() => {
    if (!map) return;
    map.setOptions({
      gestureHandling: toolMode === 'freehand' ? 'none' : 'greedy',
    });
  }, [map, toolMode]);

  // Update map type
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType);
  }, [map, mapType]);

  // Traffic Layer toggle
  useEffect(() => {
    if (!map) return;
    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(map);
    } else {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
      }
    }
  }, [map, showTraffic]);

  // Follow user location
  useEffect(() => {
    if (!map || !userLocation || !followUser) return;
    map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
  }, [map, userLocation, followUser]);

  // Center change listener for sample parcel generation
  useEffect(() => {
    if (!map || !onMapCenterChange) return;
    const idleListener = map.addListener('idle', () => {
      const c = map.getCenter();
      if (c) {
        onMapCenterChange({ lat: c.lat(), lng: c.lng() });
      }
    });
    return () => {
      google.maps.event.removeListener(idleListener);
    };
  }, [map, onMapCenterChange]);

  // Accuracy Circle for User Location
  useEffect(() => {
    if (!map) return;
    if (userLocation && userLocation.accuracy && userLocation.accuracy > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = new google.maps.Circle({
          strokeColor: '#3b82f6',
          strokeOpacity: 0.5,
          strokeWeight: 1.5,
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          map,
        });
      }
      accuracyCircleRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      accuracyCircleRef.current.setRadius(userLocation.accuracy);
      accuracyCircleRef.current.setMap(map);
    } else {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
      }
    }
  }, [map, userLocation]);

  // Render polygon or polyline with dynamic validation styling
  useEffect(() => {
    if (!map) return;

    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
    const strokeColor = hasIntersection ? '#ef4444' : '#16a34a';
    const fillColor = hasIntersection ? '#f87171' : '#22c55e';

    // Auto-close when 3 or more points exist or isClosed is true
    const shouldDrawPolygon = (isClosed || points.length >= 3) && points.length >= 3;

    if (shouldDrawPolygon) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      if (!polygonRef.current) {
        polygonRef.current = new google.maps.Polygon({
          paths: path,
          strokeColor,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          fillColor,
          fillOpacity: hasIntersection ? 0.45 : 0.35,
          clickable: false,
          zIndex: 10,
          map,
        });
      } else {
        polygonRef.current.setOptions({
          paths: path,
          strokeColor,
          fillColor,
          fillOpacity: hasIntersection ? 0.45 : 0.35,
        });
        polygonRef.current.setMap(map);
      }
    } else {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }

      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          path,
          strokeColor,
          strokeOpacity: 0.95,
          strokeWeight: 3,
          clickable: false,
          zIndex: 10,
          map,
        });
      } else {
        polylineRef.current.setOptions({ path, strokeColor });
        polylineRef.current.setMap(map);
      }
    }

    return () => {
      if (polygonRef.current) polygonRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, [map, points, isClosed, hasIntersection]);

  const [isDragging, setIsDragging] = useState(false);

  // Handle map click to add point in pointByPoint or edit mode
  useEffect(() => {
    if (!map) return;

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      // In panZoom mode or while actively dragging a vertex, ignore clicks
      if (toolMode === 'panZoom' || isDragging) return;
      if (!e.latLng) return;

      const newPt: LatLng = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        timestamp: Date.now(),
      };

      // Snap-to-close check if near the first point
      if (points.length >= 3) {
        const first = points[0];
        const distToStart = calculateDistance(newPt, first);
        if (distToStart < 15) {
          // Snap closed
          onPointsChange(points);
          return;
        }
      }

      onPointsChange([...points, newPt]);
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, points, toolMode, isDragging, onPointsChange]);

  // Handle Midpoint Insertion
  const handleInsertMidpoint = (index: number) => {
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    const mid = calculateMidpoint(p1, p2);
    const updated = [...points];
    updated.splice(index + 1, 0, mid);
    onPointsChange(updated);
    onSelectVertex(index + 1);
  };

  return (
    <>
      {/* Live User Location Advanced Marker */}
      {userLocation && (
        <AdvancedMarker
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          zIndex={100}
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-blue-400 opacity-75"></span>
            <div className="relative w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        </AdvancedMarker>
      )}

      {/* Field Boundary Vertices (Draggable AdvancedMarkers with Real-Time Touch Dragging) */}
      {points.map((pt, idx) => {
        const isSelected = selectedVertexIndex === idx;

        return (
          <AdvancedMarker
            key={`vertex-${idx}`}
            position={{ lat: pt.lat, lng: pt.lng }}
            draggable={toolMode === 'edit' || toolMode === 'pointByPoint'}
            onDragStart={() => {
              setIsDragging(true);
              onSelectVertex(idx);
              if (onVertexDragStart) onVertexDragStart(idx);
            }}
            onDrag={(e) => {
              if (e.latLng) {
                const newPt: LatLng = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                  timestamp: Date.now(),
                };
                onVertexDrag(idx, newPt);
              }
            }}
            onDragEnd={(e) => {
              setIsDragging(false);
              if (e.latLng) {
                const newPt: LatLng = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                  timestamp: Date.now(),
                };
                if (onVertexDragEnd) onVertexDragEnd(idx, newPt);
              }
            }}
            zIndex={isSelected ? 90 : 50 + idx}
          >
            <div
              className="relative flex items-center justify-center p-3 -m-3 touch-none select-none cursor-grab active:cursor-grabbing group"
              style={{ touchAction: 'none' }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectVertex(isSelected ? null : idx);
              }}
            >
              {/* Vertex Number Badge with touch-optimized target */}
              <div
                className={`w-7 h-7 rounded-full font-extrabold text-xs flex items-center justify-center border-2 shadow-lg transition-transform ${
                  isSelected
                    ? 'bg-amber-500 text-white border-white scale-125 ring-4 ring-amber-400/60 shadow-amber-500/50'
                    : 'bg-emerald-600 text-white border-white hover:scale-125 shadow-emerald-900/40'
                }`}
              >
                {idx + 1}
              </div>

              {/* Tooltip on Hover */}
              <div className="hidden group-hover:flex absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-lg shadow-lg items-center gap-1.5 whitespace-nowrap z-50 border border-slate-700 pointer-events-auto">
                <span>Corner #{idx + 1}</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-mono">Drag to move</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPointForStreetView(pt);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold underline ml-1"
                >
                  Street View
                </button>
              </div>
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Segment Distance Badges & Midpoint Insertion Handles */}
      {points.length >= 2 &&
        points.map((pt, idx) => {
          const isLastSegment = idx === points.length - 1;
          // In open mode with < 3 points, do not connect last to first
          if (points.length < 3 && !isClosed && isLastSegment) return null;

          const nextPt = points[(idx + 1) % points.length];
          const mid = calculateMidpoint(pt, nextPt);
          const segmentDist = calculateDistance(pt, nextPt);

          return (
            <AdvancedMarker
              key={`midpoint-${idx}`}
              position={{ lat: mid.lat, lng: mid.lng }}
              zIndex={30}
            >
              <div className="flex items-center gap-1 -translate-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInsertMidpoint(idx);
                  }}
                  title={`Segment ${idx + 1} to ${(idx + 1) % points.length + 1}: ${segmentDist.toFixed(1)}m. Click to add corner.`}
                  className="px-1.5 py-0.5 rounded-full bg-slate-900/90 text-white border border-emerald-500/80 text-[10px] font-mono font-bold shadow-lg hover:scale-110 hover:bg-emerald-600 hover:border-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{segmentDist.toFixed(1)}m</span>
                </button>
              </div>
            </AdvancedMarker>
          );
        })}
    </>
  );
};

export const GoogleMapFieldView: React.FC<GoogleMapFieldViewProps> = ({
  apiKey,
  onOpenSavedFields,
  savedFieldsCount,
  onSaveField,
  activeLoadedField,
}) => {
  // Tool Modes: pointByPoint, freehand, edit, panZoom
  const [toolMode, setToolMode] = useState<ToolMode>('pointByPoint');

  // Map State
  const [mapType, setMapType] = useState<google.maps.MapTypeId | 'satellite' | 'hybrid' | 'roadmap' | 'terrain'>('hybrid');
  const [showTraffic, setShowTraffic] = useState<boolean>(false);
  const [tilt, setTilt] = useState<number>(0);

  // Field Points & History Stack
  const [points, setPoints] = useState<LatLng[]>([]);
  const [history, setHistory] = useState<LatLng[][]>([]);
  const [redoStack, setRedoStack] = useState<LatLng[][]>([]);
  const [isClosed, setIsClosed] = useState<boolean>(true);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);

  // Drag lifecycle snapshot
  const dragStartSnapshotRef = useRef<LatLng[] | null>(null);

  // Draggable Tabs Bar State (repositionable anywhere on screen)
  const [tabBarPos, setTabBarPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingTabBarRef = useRef(false);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tabBarRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDownTabBar = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag when pressing the handle or bar background, not child buttons
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingTabBarRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    const rect = tabBarRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handlePointerMoveTabBar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTabBarRef.current) return;
    const newX = e.clientX - dragStartOffsetRef.current.x;
    const newY = e.clientY - dragStartOffsetRef.current.y;

    const width = tabBarRef.current?.offsetWidth || 180;
    const height = tabBarRef.current?.offsetHeight || 44;

    const minX = 8;
    const maxX = window.innerWidth - width - 8;
    const minY = 8;
    const maxY = window.innerHeight - height - 80;

    setTabBarPos({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  };

  const handlePointerUpTabBar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingTabBarRef.current) return;
    isDraggingTabBarRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  // Freehand Drawing State & Projection
  const [isFreehandDrawing, setIsFreehandDrawing] = useState(false);
  const freehandRawPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [freehandSvgPath, setFreehandSvgPath] = useState<string>('');
  const projectPixelToLatLngRef = useRef<((x: number, y: number) => LatLng | null) | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Unit settings
  const [areaUnit, setAreaUnit] = useState<string>('Acres');
  const [selectedRegion, setSelectedRegion] = useState<string>('uttarakhand');
  const [showBreakdownModal, setShowBreakdownModal] = useState<boolean>(false);

  // Live Location & GPS Walk
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [followUser, setFollowUser] = useState<boolean>(false);
  const [isGpsWalking, setIsGpsWalking] = useState<boolean>(false);
  const [gpsStats, setGpsStats] = useState<{ accuracy: number; speed: number }>({
    accuracy: 0,
    speed: 0,
  });

  // Current Map Center for generating demo parcels
  const [currentMapCenter, setCurrentMapCenter] = useState<LatLng>({
    lat: 30.3165,
    lng: 78.0322,
  });

  // Search input
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  // Street View Modal
  const [streetViewTarget, setStreetViewTarget] = useState<LatLng | null>(null);

  // Save Modal
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [fieldName, setFieldName] = useState<string>('');
  const [fieldCrop, setFieldCrop] = useState<string>('');
  const [fieldNotes, setFieldNotes] = useState<string>('');

  // Default Center
  const [defaultCenter] = useState<google.maps.LatLngLiteral>({
    lat: 30.3165,
    lng: 78.0322,
  });

  // Validation
  const validation = validatePolygon(points);
  const hasIntersection = !validation.isValid && Boolean(validation.errorMessage?.includes('Self-intersection'));

  // Compute live Area and Perimeter immediately
  const areaSqM = calculateArea(points);
  const perimeterM = calculatePerimeter(points, isClosed);
  const allUnits = computeAllUnits(areaSqM, selectedRegion);

  // Load field when activeLoadedField changes
  useEffect(() => {
    if (activeLoadedField) {
      setPoints(activeLoadedField.points);
      setIsClosed(true);
      setHistory([]);
      setRedoStack([]);
      setSelectedVertexIndex(null);
      setToolMode('edit');
    }
  }, [activeLoadedField]);

  // Push history on changes
  const pushPointsWithHistory = useCallback((newPoints: LatLng[]) => {
    setHistory((prev) => [...prev, points]);
    setRedoStack([]);
    setPoints(newPoints);
  }, [points]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [points, ...r]);
    setHistory((h) => h.slice(0, h.length - 1));
    setPoints(prev);
    setSelectedVertexIndex(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((h) => [...h, points]);
    setRedoStack((r) => r.slice(1));
    setPoints(next);
    setSelectedVertexIndex(null);
  };

  const handleClear = () => {
    if (points.length === 0) return;
    setHistory((h) => [...h, points]);
    setRedoStack([]);
    setPoints([]);
    setSelectedVertexIndex(null);
  };

  // Quick Demo Field Loader
  const handleLoadDemoParcel = (sqMeters: number) => {
    const center = userLocation || currentMapCenter;
    const demoPoints = createSampleParcel(center.lat, center.lng, sqMeters);
    pushPointsWithHistory(demoPoints);
    setIsClosed(true);
    setToolMode('edit');
  };

  // Add current GPS Location as a point
  const handleAddCurrentGpsLocation = () => {
    if (!userLocation) {
      alert('Waiting for GPS signal... Make sure location permissions are enabled.');
      return;
    }
    pushPointsWithHistory([...points, { ...userLocation, timestamp: Date.now() }]);
  };

  // Vertex Drag Handlers
  const onVertexDragStart = (index: number) => {
    setSelectedVertexIndex(index);
    dragStartSnapshotRef.current = [...points];
  };

  const onVertexDrag = (index: number, newPt: LatLng) => {
    // Real-time update of polygon points while dragging:
    // Triggers instant recalculation of live area & perimeter and updates Google Maps polygon/polyline
    setPoints((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const updated = [...prev];
      updated[index] = newPt;
      return updated;
    });
  };

  const onVertexDragEnd = (index: number, newPt: LatLng) => {
    setPoints((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const updated = [...prev];
      updated[index] = newPt;
      return updated;
    });

    if (dragStartSnapshotRef.current) {
      setHistory((prev) => [...prev, dragStartSnapshotRef.current!]);
      setRedoStack([]);
      dragStartSnapshotRef.current = null;
    }
  };

  // Vertex Deletion (with minimum 3 vertices safety guard)
  const handleDeleteSelectedVertex = () => {
    if (selectedVertexIndex === null) return;
    if (points.length <= 3) {
      alert('Cannot delete vertex: A polygon boundary requires at least 3 points.');
      return;
    }
    const updated = points.filter((_, idx) => idx !== selectedVertexIndex);
    pushPointsWithHistory(updated);
    setSelectedVertexIndex(null);
  };

  // Ramer-Douglas-Peucker (RDP) Boundary Simplifier
  const handleSimplifyBoundary = (toleranceMeters: number) => {
    if (points.length <= 4) {
      alert('Polygon is already minimal (<= 4 vertices).');
      return;
    }
    const simplified = simplifyPolygon(points, toleranceMeters);
    if (simplified.length < points.length) {
      pushPointsWithHistory(simplified);
      setSelectedVertexIndex(null);
    } else {
      alert('No redundant vertices found at this tolerance level.');
    }
  };

  // High-accuracy live geolocation tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const currentLoc: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude ?? undefined,
          timestamp: pos.timestamp,
        };

        setUserLocation(currentLoc);
        setGpsStats({
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
        });

        // GPS Walk mode
        if (isGpsWalking && pos.coords.accuracy <= 25) {
          setPoints((prev) => {
            if (prev.length === 0) return [currentLoc];
            const last = prev[prev.length - 1];
            // Geodesic distance on WGS84 authalic sphere instead of flat-earth approximation
            const dist = calculateDistance(last, currentLoc);

            if (dist >= 1.5) {
              return [...prev, currentLoc];
            }
            return prev;
          });
        }
      },
      (err) => {
        console.warn('Geolocation warning:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsWalking]);

  // Search Address / Place
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || typeof google === 'undefined') return;

    setSearchLoading(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      setSearchLoading(false);
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const loc = results[0].geometry.location;
        setUserLocation((u) => u || { lat: loc.lat(), lng: loc.lng() });
      } else {
        alert('Location not found. Try searching a city, village, or coordinates.');
      }
    });
  };

  // Save current field
  const handleConfirmSave = () => {
    if (points.length < 3) {
      alert('A field boundary requires at least 3 points.');
      return;
    }
    const newField: SavedField = {
      id: 'field_' + Date.now(),
      name: fieldName.trim() || `Field #${savedFieldsCount + 1}`,
      points,
      areaSqMeters: areaSqM,
      perimeterMeters: perimeterM,
      createdAt: Date.now(),
      cropType: fieldCrop.trim() || undefined,
      notes: fieldNotes.trim() || undefined,
    };
    onSaveField(newField);
    setShowSaveModal(false);
    setFieldName('');
    setFieldCrop('');
    setFieldNotes('');
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="pointer-events-auto flex items-center bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl w-full sm:w-80"
        >
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, village, farm, coordinates..."
            className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-slate-400"
          />
          {searchLoading && (
            <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          )}
        </form>

        {/* Quick Demo Parcel Buttons */}
        <div className="pointer-events-auto hidden md:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1.5 rounded-xl shadow-xl text-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase px-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Quick Demo:
          </span>
          <button
            onClick={() => handleLoadDemoParcel(4046.86)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-green-300 font-semibold text-[11px] border border-slate-700 transition"
            title="Load 1 Acre Reference Farm Plot"
          >
            1 Acre
          </button>
          <button
            onClick={() => handleLoadDemoParcel(5000.0)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold text-[11px] border border-slate-700 transition"
            title="Load 5,000 m² Calibration Plot"
          >
            5,000 m²
          </button>
          <button
            onClick={() => handleLoadDemoParcel(2529.285)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-[11px] border border-slate-700 transition"
            title="Load 1 Bigha Boundary"
          >
            1 Bigha
          </button>
        </div>

        {/* Map Type & Layer Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 p-1.5 rounded-xl shadow-xl text-xs">
          {/* Map Layer Switcher */}
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            {(['satellite', 'hybrid', 'roadmap', 'terrain'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMapType(type)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition ${
                  mapType === type
                    ? 'bg-green-600 text-white shadow font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Traffic Toggle */}
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className={`p-1.5 rounded-lg border transition ${
              showTraffic
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-transparent hover:text-slate-200'
            }`}
            title="Toggle Live Google Traffic Layer"
          >
            <Car className="w-4 h-4" />
          </button>

          {/* 3D Tilt Toggle */}
          <button
            onClick={() => setTilt(tilt === 0 ? 45 : 0)}
            className={`p-1.5 rounded-lg border transition ${
              tilt > 0
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border-transparent hover:text-slate-200'
            }`}
            title="Toggle 45° 3D Aerial Perspective"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Saved Fields Drawer Trigger */}
          <button
            onClick={onOpenSavedFields}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 border border-slate-700"
          >
            <Layers className="w-3.5 h-3.5 text-green-400" />
            <span>Fields</span>
            <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {savedFieldsCount}
            </span>
          </button>
        </div>
      </div>

      {/* Draggable & Compact Drawing Mode Tabs Bar */}
      <div
        ref={tabBarRef}
        onPointerDown={handlePointerDownTabBar}
        onPointerMove={handlePointerMoveTabBar}
        onPointerUp={handlePointerUpTabBar}
        style={
          tabBarPos
            ? { left: `${tabBarPos.x}px`, top: `${tabBarPos.y}px`, transform: 'none' }
            : undefined
        }
        className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1 bg-slate-900/95 backdrop-blur border border-slate-700/80 p-1 sm:p-1.5 rounded-2xl shadow-2xl touch-none select-none cursor-grab active:cursor-grabbing"
      >
        {/* Drag Handle Indicator */}
        <div
          className="px-1 py-1 text-slate-500 hover:text-slate-300 transition shrink-0 cursor-grab active:cursor-grabbing flex items-center"
          title="Drag to reposition tabs bar anywhere"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Point-by-Point */}
        <button
          onClick={() => setToolMode('pointByPoint')}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
            toolMode === 'pointByPoint'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Tap anywhere on map to add boundary corners"
        >
          <MousePointer2 className="w-3.5 h-3.5 shrink-0" />
          <span className={toolMode === 'pointByPoint' ? 'inline' : 'hidden sm:inline'}>
            {toolMode === 'pointByPoint' ? 'Point' : 'Point-by-Point'}
          </span>
        </button>

        {/* Freehand Draw */}
        <button
          onClick={() => setToolMode('freehand')}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
            toolMode === 'freehand'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Draw continuous boundary by dragging mouse or stylus across map"
        >
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          <span className={toolMode === 'freehand' ? 'inline' : 'hidden sm:inline'}>
            {toolMode === 'freehand' ? 'Draw' : 'Freehand Draw'}
          </span>
        </button>

        {/* Edit & Adjust */}
        <button
          onClick={() => setToolMode('edit')}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
            toolMode === 'edit'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Drag vertices, insert midpoints, delete corners"
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span className={toolMode === 'edit' ? 'inline' : 'hidden sm:inline'}>
            {toolMode === 'edit' ? 'Edit' : 'Edit & Adjust'}
          </span>
        </button>

        {/* Pan Map */}
        <button
          onClick={() => setToolMode('panZoom')}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
            toolMode === 'panZoom'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Free map navigation without placing points"
        >
          <Hand className="w-3.5 h-3.5 shrink-0" />
          <span className={toolMode === 'panZoom' ? 'inline' : 'hidden sm:inline'}>
            {toolMode === 'panZoom' ? 'Pan' : 'Pan Map'}
          </span>
        </button>
      </div>

      {/* Freehand Draw Active Guidance Banner */}
      {toolMode === 'freehand' && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-emerald-600/95 text-white border border-emerald-400 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-medium backdrop-blur">
          <Pencil className="w-4 h-4 text-emerald-200 shrink-0 animate-pulse" />
          <span>Drag with your mouse, pen, or finger to outline the field boundary. Release to close & calculate.</span>
          <button
            onClick={() => setToolMode('pointByPoint')}
            className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-[11px] font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none bg-slate-900/95 text-emerald-400 border border-emerald-500/50 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold backdrop-blur">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Validation Warning Notice (Bow-tie / Self-intersection) */}
      {hasIntersection && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-rose-600/90 text-white border border-rose-400 px-4 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce backdrop-blur">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
          <span>Self-intersection detected: Boundary edges cannot cross each other.</span>
        </div>
      )}

      {/* Selected Vertex Inspector Card (Floats when a vertex is selected) */}
      {selectedVertexIndex !== null && points[selectedVertexIndex] && (
        <div className="absolute top-28 right-4 z-30 pointer-events-auto bg-slate-900/95 border border-amber-500/40 p-3 rounded-2xl shadow-2xl backdrop-blur w-64 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Vertex #{selectedVertexIndex + 1}
            </span>
            <button
              onClick={() => setSelectedVertexIndex(null)}
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 font-mono text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg">
            <div>Lat: {points[selectedVertexIndex].lat.toFixed(6)}°</div>
            <div>Lng: {points[selectedVertexIndex].lng.toFixed(6)}°</div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleDeleteSelectedVertex}
              disabled={points.length <= 3}
              className="flex-1 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/40 disabled:opacity-40 disabled:pointer-events-none font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
              title="Delete this vertex"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setStreetViewTarget(points[selectedVertexIndex!])}
              className="flex-1 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Street View</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Google Map Container */}
      <div className="flex-1 w-full h-full relative">
        <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={17}
            mapId="DEMO_MAP_ID"
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            mapTypeId={mapType}
            tilt={tilt}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            mapTypeControl={false}
            streetViewControl={true}
            fullscreenControl={true}
          >
            <MapController
              points={points}
              isClosed={isClosed}
              toolMode={toolMode}
              selectedVertexIndex={selectedVertexIndex}
              onSelectVertex={setSelectedVertexIndex}
              onPointsChange={pushPointsWithHistory}
              onVertexDragStart={onVertexDragStart}
              onVertexDrag={onVertexDrag}
              onVertexDragEnd={onVertexDragEnd}
              userLocation={userLocation}
              followUser={followUser}
              mapType={mapType}
              showTraffic={showTraffic}
              hasIntersection={hasIntersection}
              onSelectPointForStreetView={(pt) => setStreetViewTarget(pt)}
              onMapCenterChange={setCurrentMapCenter}
              onProjectionReady={(projFn) => {
                projectPixelToLatLngRef.current = projFn;
              }}
            />
          </Map>
        </APIProvider>

        {/* Freehand Draw Interactive Touch/Mouse Layer */}
        {toolMode === 'freehand' && (
          <div
            className="absolute inset-0 z-20 cursor-crosshair touch-none select-none"
            onPointerDown={(e) => {
              setIsFreehandDrawing(true);
              const rect = e.currentTarget.getBoundingClientRect();
              const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              freehandRawPointsRef.current = [pt];
              setFreehandSvgPath(`M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`);
            }}
            onPointerMove={(e) => {
              if (!isFreehandDrawing) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              freehandRawPointsRef.current.push(pt);
              setFreehandSvgPath((prev) => `${prev} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`);
            }}
            onPointerUp={() => {
              if (!isFreehandDrawing) return;
              setIsFreehandDrawing(false);

              const rawPixels = freehandRawPointsRef.current;
              setFreehandSvgPath('');
              freehandRawPointsRef.current = [];

              if (rawPixels.length < 8) return;

              // Convert recorded pixels to geographic LatLng using projection
              const project = projectPixelToLatLngRef.current;
              if (!project) {
                alert('Map projection is initializing. Please try again.');
                return;
              }

              // Sample pixels to remove adjacent duplicate points (pixel distance >= 6px)
              const convertedPoints: LatLng[] = [];
              let lastPx: { x: number; y: number } | null = null;

              for (const px of rawPixels) {
                if (lastPx) {
                  const dPx = Math.hypot(px.x - lastPx.x, px.y - lastPx.y);
                  if (dPx < 6) continue;
                }
                const pt = project(px.x, px.y);
                if (pt) {
                  convertedPoints.push(pt);
                  lastPx = px;
                }
              }

              if (convertedPoints.length >= 3) {
                // Ensure loop is closed
                const first = convertedPoints[0];
                const last = convertedPoints[convertedPoints.length - 1];
                if (calculateDistance(first, last) > 6) {
                  convertedPoints.push({ ...first, timestamp: Date.now() });
                }

                // Run RDP simplification on the WGS84 authalic sphere (2.0m tolerance)
                const simplified = simplifyPolygon(convertedPoints, 2.0);
                const finalVertices = simplified.length >= 3 ? simplified : convertedPoints;

                pushPointsWithHistory(finalVertices);
                setIsClosed(true);
                setToolMode('edit');
                setToastMessage(`Freehand boundary marked! ${finalVertices.length} corners placed.`);
                setTimeout(() => setToastMessage(null), 4000);
              }
            }}
          >
            {/* Real-time Glowing SVG Trail */}
            <svg className="w-full h-full pointer-events-none filter drop-shadow(0 2px 6px rgba(0,0,0,0.5))">
              <path
                d={freehandSvgPath}
                fill="none"
                stroke="#10b981"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Live Map Interaction Instructions Pill */}
        <div className="absolute top-28 left-4 z-20 pointer-events-none hidden sm:block">
          <div className="bg-slate-900/85 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg text-[11px] text-slate-300">
            {points.length === 0 && (
              <span>👉 Click anywhere on the map to place boundary corner #1</span>
            )}
            {points.length === 1 && (
              <span>👉 Corner 1 placed. Click another location to measure boundary line</span>
            )}
            {points.length === 2 && (
              <span className="text-amber-300 font-semibold">
                👉 Line distance: {calculateDistance(points[0], points[1]).toFixed(1)}m · Click 3rd point to close & calculate area
              </span>
            )}
            {points.length >= 3 && (
              <span className="text-emerald-400 font-semibold">
                ✅ Closed parcel active ({points.length} points) · Drag any corner to adjust
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Walk / Follow Overlay Buttons (Right Side) */}
        <div className="absolute right-4 bottom-36 z-20 flex flex-col gap-2 pointer-events-auto">
          {/* Add Current Location Point */}
          <button
            onClick={handleAddCurrentGpsLocation}
            className="p-3 rounded-2xl shadow-xl border backdrop-blur bg-slate-900/90 text-green-400 border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer"
            title="Drop vertex at your live GPS position"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Follow Me Toggle */}
          <button
            onClick={() => setFollowUser(!followUser)}
            className={`p-3 rounded-2xl shadow-xl border backdrop-blur transition-all cursor-pointer ${
              followUser
                ? 'bg-blue-600 text-white border-blue-400 shadow-blue-600/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Auto-center map on your live location"
          >
            <LocateFixed className="w-5 h-5" />
          </button>

          {/* GPS Walk Boundary Mode */}
          <button
            onClick={() => {
              if (!isGpsWalking) {
                setIsGpsWalking(true);
                setFollowUser(true);
                setToolMode('edit');
              } else {
                setIsGpsWalking(false);
              }
            }}
            className={`px-3 py-2.5 rounded-2xl shadow-xl border backdrop-blur flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              isGpsWalking
                ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-rose-600/40'
                : 'bg-slate-900/90 text-emerald-400 border-slate-700 hover:bg-slate-800'
            }`}
            title="Record field boundary by walking the perimeter"
          >
            <Footprints className="w-5 h-5" />
            <span className="hidden sm:inline">
              {isGpsWalking ? 'Stop GPS Walk' : 'GPS Walk'}
            </span>
          </button>
        </div>

        {/* Live GPS Quality Pill (Top Left below search) */}
        {userLocation && (
          <div className="absolute top-16 left-3 z-20 bg-slate-900/85 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-[11px] text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                (userLocation.accuracy ?? 99) <= 10
                  ? 'bg-green-400'
                  : (userLocation.accuracy ?? 99) <= 25
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            ></span>
            <span>
              GPS: <strong className="text-white">±{(userLocation.accuracy ?? 0).toFixed(1)}m</strong>
            </span>
            {gpsStats.speed > 0 && (
              <>
                <span className="text-slate-600">•</span>
                <span>{gpsStats.speed.toFixed(1)} km/h</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Measurement & Real-Time Calculation HUD */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3 sm:px-6 backdrop-blur z-30">
        <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
          {/* Main Metrics and Actions Row */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Area & Perimeter Displays */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
              {/* Primary Area Box */}
              <div className="bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700/80 shadow-md">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Field Area (Live)
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xl sm:text-2xl font-black tracking-tight ${
                      hasIntersection
                        ? 'text-rose-400'
                        : points.length >= 3
                        ? 'text-green-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {points.length >= 3
                      ? formatArea(areaSqM, areaUnit, selectedRegion)
                      : '0.00 ' + areaUnit}
                  </span>
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value)}
                    className="bg-slate-700 text-white text-xs font-semibold rounded px-1.5 py-0.5 border border-slate-600 focus:outline-none cursor-pointer"
                  >
                    <option value="Acres">Acres</option>
                    <option value="Hectares">Hectares</option>
                    <option value="Square Meters">m²</option>
                    <option value="Square Feet">sq ft</option>
                    <option value="Bigha">Bigha</option>
                  </select>
                </div>
              </div>

              {/* Regional State Preset Selector (when Bigha is selected) */}
              {areaUnit === 'Bigha' && (
                <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/80 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Region</span>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="bg-slate-700 text-white text-xs rounded px-2 py-0.5 border border-slate-600 focus:outline-none mt-0.5 cursor-pointer"
                  >
                    {REGIONAL_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Perimeter Box */}
              <div className="bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700/80 shadow-md">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  {points.length >= 3 ? 'Perimeter' : 'Distance'}
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-200">
                  {formatDistance(perimeterM)}
                </span>
              </div>

              {/* Breakdown Modal Trigger Button */}
              {points.length >= 3 && (
                <button
                  onClick={() => setShowBreakdownModal(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer"
                  title="View all units breakdown & segment lengths"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>All Units</span>
                </button>
              )}
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-1.5 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0">
              {/* Simplify Boundary (RDP) */}
              {points.length > 4 && (
                <button
                  onClick={() => handleSimplifyBoundary(2.0)}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Simplify polygon using Ramer-Douglas-Peucker (2m tolerance)"
                >
                  <Scissors className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Simplify</span>
                </button>
              )}

              {/* Undo */}
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Undo last edit (drag, insert, draw)"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              {/* Redo */}
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Redo edit"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* Clear */}
              <button
                onClick={handleClear}
                disabled={points.length === 0}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-red-400 border border-slate-700 transition cursor-pointer"
                title="Clear all points"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Save Field Button */}
              <button
                onClick={() => setShowSaveModal(true)}
                disabled={points.length < 3 || hasIntersection}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-lg shadow-green-600/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Field</span>
              </button>
            </div>
          </div>

          {/* Instant Multi-Unit Equivalences Banner (Always Visible when >= 3 points) */}
          {points.length >= 3 && (
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong className="text-white font-semibold">{allUnits.acres.toFixed(3)}</strong> Acres
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  <strong className="text-white font-semibold">{allUnits.hectares.toFixed(4)}</strong> Hectares
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  <strong className="text-white font-semibold">{allUnits.sqMeters.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong> m²
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  <strong className="text-white font-semibold">{allUnits.sqFeet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> sq ft
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  <strong className="text-amber-400 font-semibold">{allUnits.bigha.toFixed(3)}</strong> Bigha ({selectedRegion})
                </span>
              </div>
              <span className="text-emerald-400 font-medium text-[10px]">
                WGS84 Authalic Ellipsoid
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Complete Units & Segments Breakdown Modal */}
      {showBreakdownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Full Land Unit & Perimeter Breakdown</h3>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standard & Regional Units Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Area Equivalences</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Acres</span>
                  <span className="font-bold text-green-400 text-sm">{allUnits.acres.toFixed(4)}</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Hectares</span>
                  <span className="font-bold text-green-400 text-sm">{allUnits.hectares.toFixed(4)}</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Square Meters</span>
                  <span className="font-bold text-white text-sm">{allUnits.sqMeters.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Square Feet</span>
                  <span className="font-bold text-white text-sm">{allUnits.sqFeet.toLocaleString(undefined, { maximumFractionDigits: 0 })} sq ft</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Square Yards</span>
                  <span className="font-bold text-white text-sm">{allUnits.sqYards.toLocaleString(undefined, { maximumFractionDigits: 1 })} sq yd</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Bigha ({selectedRegion})</span>
                  <span className="font-bold text-amber-400 text-sm">{allUnits.bigha.toFixed(4)}</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Biswa</span>
                  <span className="font-bold text-amber-400 text-sm">{allUnits.biswa.toFixed(2)}</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Kanal</span>
                  <span className="font-bold text-amber-400 text-sm">{allUnits.kanal.toFixed(3)}</span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                  <span className="text-slate-400 text-[10px] block">Guntha</span>
                  <span className="font-bold text-amber-400 text-sm">{allUnits.guntha.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Perimeter Segments Table */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Boundary Edges & Segments ({points.length} vertices)
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                {points.map((p, idx) => {
                  const nextPt = points[(idx + 1) % points.length];
                  const dist = calculateDistance(p, nextPt);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-slate-750"
                    >
                      <span className="text-slate-300 font-mono">
                        Side {idx + 1} ➔ {((idx + 1) % points.length) + 1}
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {dist.toFixed(1)} m ({ (dist * 3.28084).toFixed(0) } ft)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Street View Modal */}
      {streetViewTarget && (
        <StreetViewModal
          location={streetViewTarget}
          onClose={() => setStreetViewTarget(null)}
        />
      )}

      {/* Save Field Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Save className="w-5 h-5 text-green-400" />
              Save Measured Field
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Field Name *</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. North Acre Wheat Plot"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Crop / Purpose</label>
                <input
                  type="text"
                  value={fieldCrop}
                  onChange={(e) => setFieldCrop(e.target.value)}
                  placeholder="e.g. Rice, Wheat, Sugarcane, Pasture"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes</label>
                <textarea
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  placeholder="Additional field survey details..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Calculated Summary */}
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Total Area</span>
                  <span className="font-bold text-green-400">{formatArea(areaSqM, areaUnit, selectedRegion)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Perimeter</span>
                  <span className="font-bold text-slate-200">{formatDistance(perimeterM)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow cursor-pointer"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
