/**
 * High-Precision Geodesic Geometry and Regional Land Unit Utilities
 * Model: WGS84 Authalic Sphere Estimate (Radius = 6,371,007.2 m)
 */

export interface LatLng {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: number;
}

export interface RegionalUnit {
  id: string;
  name: string;
  bighaSqMeters: number;
  biswaSqMeters: number;
  kanalSqMeters: number;
  marlaSqMeters: number;
}

export const REGIONAL_PRESETS: RegionalUnit[] = [
  { id: 'uttarakhand', name: 'Uttarakhand (20 Nali = 2,529 m²)', bighaSqMeters: 2529.285, biswaSqMeters: 126.464, kanalSqMeters: 505.857, marlaSqMeters: 25.293 },
  { id: 'up_standard', name: 'Uttar Pradesh (Standard = 2,529 m²)', bighaSqMeters: 2529.285, biswaSqMeters: 126.464, kanalSqMeters: 505.857, marlaSqMeters: 25.293 },
  { id: 'punjab_haryana', name: 'Punjab & Haryana (Kanal/Marla = 4,047 m²)', bighaSqMeters: 4046.856, biswaSqMeters: 202.343, kanalSqMeters: 505.857, marlaSqMeters: 25.293 },
  { id: 'rajasthan_pucca', name: 'Rajasthan (Pucca = 2,529 m²)', bighaSqMeters: 2529.285, biswaSqMeters: 126.464, kanalSqMeters: 505.857, marlaSqMeters: 25.293 },
  { id: 'bihar', name: 'Bihar (Standard = 2,529 m²)', bighaSqMeters: 2529.285, biswaSqMeters: 126.464, kanalSqMeters: 505.857, marlaSqMeters: 25.293 },
  { id: 'mp', name: 'Madhya Pradesh (Standard = 2,529 m²)', bighaSqMeters: 2529.285, biswaSqMeters: 126.464, kanalSqMeters: 505.857, marlaSqMeters: 25.293 },
];

export const WGS84_AUTHALIC_RADIUS = 6371007.2;

/**
 * Calculates geodesic distance in meters using Haversine formula
 */
export function calculateDistance(p1: LatLng, p2: LatLng): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return WGS84_AUTHALIC_RADIUS * c;
}

/**
 * Calculates polygon area in square meters using spherical excess formula and Google Maps geometry
 */
export function calculateArea(points: LatLng[]): number {
  if (!points || points.length < 3) return 0;

  // Use Google Maps official spherical geometry calculation if available
  if (
    typeof google !== 'undefined' &&
    google.maps &&
    google.maps.geometry &&
    google.maps.geometry.spherical
  ) {
    try {
      const gPath = points.map((p) => new google.maps.LatLng(p.lat, p.lng));
      // Explicitly pass WGS84_AUTHALIC_RADIUS (6,371,007.2 m) to avoid the default equatorial radius (6,378,137 m)
      const gArea = google.maps.geometry.spherical.computeArea(gPath, WGS84_AUTHALIC_RADIUS);
      if (!isNaN(gArea) && gArea > 0) return gArea;
    } catch {
      // fallback to geodesic spherical excess below
    }
  }

  // Geodesic spherical excess integration matching Field Measure Pro
  let totalExcess = 0.0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    const lambda1 = (p1.lng * Math.PI) / 180.0;
    const lambda2 = (p2.lng * Math.PI) / 180.0;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;

    let deltaLambda = lambda2 - lambda1;
    while (deltaLambda > Math.PI) deltaLambda -= 2 * Math.PI;
    while (deltaLambda < -Math.PI) deltaLambda += 2 * Math.PI;

    totalExcess += deltaLambda * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  const r = WGS84_AUTHALIC_RADIUS;
  const rawArea = (Math.abs(totalExcess) * r * r) / 2.0;
  return rawArea;
}

/**
 * Calculates perimeter in meters
 */
export function calculatePerimeter(points: LatLng[], isClosed: boolean = true): number {
  if (!points || points.length < 2) return 0;

  if (
    typeof google !== 'undefined' &&
    google.maps &&
    google.maps.geometry &&
    google.maps.geometry.spherical
  ) {
    try {
      const gPath = points.map((p) => new google.maps.LatLng(p.lat, p.lng));
      if (isClosed && points.length >= 3) {
        gPath.push(new google.maps.LatLng(points[0].lat, points[0].lng));
      }
      // Explicitly pass WGS84_AUTHALIC_RADIUS (6,371,007.2 m)
      const gLen = google.maps.geometry.spherical.computeLength(gPath, WGS84_AUTHALIC_RADIUS);
      if (!isNaN(gLen) && gLen > 0) return gLen;
    } catch {
      // fallback
    }
  }

  let total = 0;
  const count = isClosed && points.length >= 3 ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += calculateDistance(p1, p2);
  }
  return total;
}

/**
 * Calculates midpoint between two points
 */
export function calculateMidpoint(p1: LatLng, p2: LatLng): LatLng {
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const lng1 = (p1.lng * Math.PI) / 180;

  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by)
  );
  const lng3 = lng1 + Math.atan2(by, Math.cos(lat1) + bx);

  return {
    lat: (lat3 * 180) / Math.PI,
    lng: (lng3 * 180) / Math.PI,
  };
}

/**
 * PolygonValidator: checks coordinate validity and self-intersections (bow-tie detection)
 */
function ccw(p1: [number, number], p2: [number, number], p3: [number, number]): number {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

function segmentsIntersect(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number]
): boolean {
  const d1 = ccw(a1, a2, b1);
  const d2 = ccw(a1, a2, b2);
  const d3 = ccw(b1, b2, a1);
  const d4 = ccw(b1, b2, a2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

export function hasSelfIntersection(points: LatLng[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  const coords: [number, number][] = points.map((p) => [p.lng, p.lat]);

  for (let i = 0; i < n; i++) {
    const a1 = coords[i];
    const a2 = coords[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = coords[j];
      const b2 = coords[(j + 1) % n];

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

export function validatePolygon(points: LatLng[]): { isValid: boolean; errorMessage?: string } {
  if (points.length < 3) {
    return { isValid: false, errorMessage: 'A polygon requires at least 3 boundary points.' };
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
      return { isValid: false, errorMessage: `Point ${i + 1} has invalid GPS coordinates.` };
    }
  }
  if (hasSelfIntersection(points)) {
    return {
      isValid: false,
      errorMessage: 'Self-intersection detected: Boundary edges cannot cross each other.',
    };
  }
  return { isValid: true };
}

function initialBearingRadians(a: LatLng, b: LatLng): number {
  const phi1 = (a.lat * Math.PI) / 180.0;
  const phi2 = (b.lat * Math.PI) / 180.0;
  const deltaLambda = ((b.lng - a.lng) * Math.PI) / 180.0;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return Math.atan2(y, x);
}

/**
 * PathSimplifier: Ramer-Douglas-Peucker (RDP) algorithm using spherical cross-track distance on WGS84 authalic sphere
 */
function perpendicularDistanceMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const dAB = calculateDistance(a, b);
  if (dAB < 0.001) {
    return calculateDistance(p, a);
  }

  const dAP = calculateDistance(a, p);
  const deltaAP = dAP / WGS84_AUTHALIC_RADIUS;
  const thetaAP = initialBearingRadians(a, p);
  const thetaAB = initialBearingRadians(a, b);

  const deltaXT = Math.asin(Math.sin(deltaAP) * Math.sin(thetaAP - thetaAB));
  return Math.abs(deltaXT) * WGS84_AUTHALIC_RADIUS;
}

export function simplifyPath(points: LatLng[], toleranceMeters: number): LatLng[] {
  if (points.length <= 2) return points;

  let maxDistance = 0.0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistanceMeters(points[i], start, end);
    if (d > maxDistance) {
      maxDistance = d;
      maxIndex = i;
    }
  }

  if (maxDistance > toleranceMeters) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), toleranceMeters);
    const right = simplifyPath(points.slice(maxIndex), toleranceMeters);
    return [...left.slice(0, left.length - 1), ...right];
  } else {
    return [start, end];
  }
}

export function simplifyPolygon(points: LatLng[], toleranceMeters: number): LatLng[] {
  if (points.length <= 4) return points;

  let maxDist = 0.0;
  let splitIndex = Math.floor(points.length / 2);

  for (let i = 1; i < points.length; i++) {
    const d = calculateDistance(points[0], points[i]);
    if (d > maxDist) {
      maxDist = d;
      splitIndex = i;
    }
  }

  const half1 = points.slice(0, splitIndex + 1);
  const half2 = [...points.slice(splitIndex), points[0]];

  const s1 = simplifyPath(half1, toleranceMeters);
  const s2 = simplifyPath(half2, toleranceMeters);

  const result = [...s1.slice(0, s1.length - 1), ...s2.slice(0, s2.length - 1)];
  return result.length >= 3 ? result : points;
}

export interface AreaBreakdown {
  acres: number;
  hectares: number;
  sqMeters: number;
  sqFeet: number;
  sqYards: number;
  bigha: number;
  biswa: number;
  kanal: number;
  marla: number;
  guntha: number;
  cent: number;
}

export function computeAllUnits(sqMeters: number, regionId: string = 'uttarakhand'): AreaBreakdown {
  const preset = REGIONAL_PRESETS.find((p) => p.id === regionId) || REGIONAL_PRESETS[0];

  return {
    acres: sqMeters * 0.000247105381,
    hectares: sqMeters / 10000.0,
    sqMeters: sqMeters,
    sqFeet: sqMeters * 10.7639104,
    sqYards: sqMeters * 1.19599,
    bigha: preset ? sqMeters / preset.bighaSqMeters : 0,
    biswa: preset ? sqMeters / preset.biswaSqMeters : 0,
    kanal: preset ? sqMeters / preset.kanalSqMeters : 0,
    marla: preset ? sqMeters / preset.marlaSqMeters : 0,
    guntha: sqMeters / 101.17141056,
    cent: sqMeters / 40.4685642,
  };
}

/**
 * Format area into standard and regional units
 */
export function formatArea(sqMeters: number, unit: string, regionId?: string, customRate?: number, customName?: string): string {
  if (sqMeters <= 0) return '0.00 ' + unit;

  if (customName && customRate && unit === customName) {
    return `${(sqMeters / customRate).toFixed(3)} ${customName}`;
  }

  switch (unit.toLowerCase()) {
    case 'acres':
      return `${(sqMeters * 0.000247105381).toFixed(3)} Acres`;
    case 'hectares':
    case 'ha':
      return `${(sqMeters / 10000).toFixed(sqMeters >= 100000 ? 2 : 4)} Hectares`;
    case 'square meters':
    case 'm²':
      return `${sqMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`;
    case 'square feet':
    case 'sq ft':
      return `${(sqMeters * 10.7639104).toLocaleString(undefined, { maximumFractionDigits: 0 })} sq ft`;
    case 'square yards':
    case 'sq yd':
      return `${(sqMeters * 1.19599).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sq yd`;
    case 'bigha': {
      const preset = REGIONAL_PRESETS.find((p) => p.id === regionId);
      if (!preset) return 'Conversion unavailable';
      return `${(sqMeters / preset.bighaSqMeters).toFixed(3)} Bigha (${preset.name.split(' ')[0]})`;
    }
    default:
      return `${(sqMeters * 0.000247105381).toFixed(3)} Acres`;
  }
}

/**
 * Format perimeter into meters, km, ft
 */
export function formatDistance(meters: number): string {
  if (meters <= 0) return '0.0 m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(3)} km (${meters.toFixed(1)} m)`;
  }
  return `${meters.toFixed(1)} m (${(meters * 3.28084).toFixed(0)} ft)`;
}

/**
 * Helper to generate a reference test parcel at current map center using WGS84 authalic radius
 */
export function createSampleParcel(centerLat: number, centerLng: number, targetSqMeters: number = 4046.86): LatLng[] {
  // Rectangle of 80m width x (targetSqMeters / 80)m height
  const widthMeters = 80;
  const heightMeters = targetSqMeters / widthMeters;

  const latOffset = ((heightMeters / 2.0) / WGS84_AUTHALIC_RADIUS) * (180.0 / Math.PI);
  const lngOffset =
    ((widthMeters / 2.0) / (WGS84_AUTHALIC_RADIUS * Math.cos((centerLat * Math.PI) / 180.0))) *
    (180.0 / Math.PI);

  return [
    { lat: centerLat - latOffset, lng: centerLng - lngOffset, timestamp: Date.now() },
    { lat: centerLat - latOffset, lng: centerLng + lngOffset, timestamp: Date.now() },
    { lat: centerLat + latOffset, lng: centerLng + lngOffset, timestamp: Date.now() },
    { lat: centerLat + latOffset, lng: centerLng - lngOffset, timestamp: Date.now() },
  ];
}

export function exportToGeoJson(name: string, points: LatLng[], areaSqMeters: number, perimeterMeters: number): string {
  const coords = points.map((p) => [p.lng, p.lat]);
  if (coords.length > 0) {
    coords.push([coords[0][0], coords[0][1]]);
  }

  const geoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          name,
          areaSqMeters,
          perimeterMeters,
          acres: Number((areaSqMeters * 0.000247105).toFixed(3)),
          hectares: Number((areaSqMeters / 10000).toFixed(3)),
          created: new Date().toISOString(),
          app: 'Field Measure Pro - Google Maps',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coords],
        },
      },
    ],
  };

  return JSON.stringify(geoJson, null, 2);
}

export function exportToKML(name: string, points: LatLng[], areaSqMeters: number, perimeterMeters: number): string {
  const coordsStr = points.map((p) => `${p.lng},${p.lat},0`).join(' ');
  const closedCoordsStr = points.length > 0 ? `${coordsStr} ${points[0].lng},${points[0].lat},0` : coordsStr;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <description>Measured via Field Measure Pro with Google Maps. Area: ${areaSqMeters.toFixed(1)} m², Perimeter: ${perimeterMeters.toFixed(1)} m</description>
    <Style id="fieldStyle">
      <LineStyle>
        <color>ff16a34a</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>4022c55e</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>${name}</name>
      <styleUrl>#fieldStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${closedCoordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
}

export function exportToCSV(name: string, points: LatLng[]): string {
  const rows = ['Point_Index,Latitude,Longitude,Accuracy_Meters,Timestamp'];
  points.forEach((p, idx) => {
    rows.push(`${idx + 1},${p.lat.toFixed(7)},${p.lng.toFixed(7)},${p.accuracy ?? ''},${p.timestamp ? new Date(p.timestamp).toISOString() : ''}`);
  });
  return rows.join('\n');
}
