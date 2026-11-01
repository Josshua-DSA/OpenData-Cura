import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, useMap } from "react-leaflet";
import BasemapLayers from "./BasemapLayers";

import { regionHealth, type RegionHealth } from "../data/healthData";
import { regionScoreRows } from "../data/regionScoreData";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  type MapMetric,
  type LayerState,
  DEFAULT_LAYERS,
  METRIC_CONFIG,
} from "../data/mapConfig";

export interface EastJavaMarkerMapProps {
  metric?: MapMetric;
  onRegionClick?: (id: string) => void;
  height?: number | string;
  compact?: boolean;
  layers?: LayerState;
  resetKey?: number;
  /** Bumped by the page when the map canvas is resized (e.g. drawer toggled). */
  mapBumpKey?: number;
  focusRegion?: string;
}

type EastJavaFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  {
    id: string;
    name: string;
    type: "kabupaten" | "kota";
  }
>;

type EastJavaGeoData = GeoJSON.FeatureCollection<
  EastJavaFeature["geometry"],
  EastJavaFeature["properties"]
>;

let geoJsonCache: Promise<EastJavaGeoData> | null = null;
function loadGeoJson(): Promise<EastJavaGeoData> {
  if (!geoJsonCache) {
    geoJsonCache = fetch("/geo/jatim-kabkota.geojson").then((response) => {
      if (!response.ok) throw new Error("Batas wilayah tidak dapat dimuat.");
      return response.json() as Promise<EastJavaGeoData>;
    });
  }
  return geoJsonCache;
}

// Custom panes shared by MapPanes, the basemap TileLayers and the GeoJSON layer.
const PANE_BASEMAP = "basemapPane";
const PANE_POLYGON = "polygonPane";
const PANE_LABELS = "labelsPane";
// Our own regency/city name labels — a separate pane from the basemap label
// tiles so the two never interleave (PANE_LABELS sits at 650 for CARTO text).
const PANE_REGION_LABELS = "regionLabelsPane";
const REGION_LABELS_Z = 500;

// Zoom rules for region labels: below REGION_LABEL_FULL_ZOOM only regions
// bigger than REGION_LABEL_AREA_THRESHOLD (deg², largest polygon) are drawn;
// from it upwards every region is labelled.
const REGION_LABEL_FULL_ZOOM = 8;
const REGION_LABEL_AREA_THRESHOLD = 0.05;
// CARTO's own place labels would collide with ours, so they only return once
// the user has zoomed far enough in for the extra context to be useful.
const BASEMAP_LABEL_MIN_ZOOM = 10;

// Facility markers sit above the choropleth (450) but below our region names
// (500), so the circle never hides the label if the two ever coincide. Unlike
// the other custom panes this one is clickable (marker tooltips).
const PANE_MARKERS = "markersPane";
const MARKERS_Z = 550;

// Facility-count bubbles: radius scales with sqrt(count) so AREA — not radius —
// reads as the magnitude. Stops are derived from the real data (18…125) and
// clamped to the 6–16 px band.
const MARKER_RADIUS_MIN = 6;
const MARKER_RADIUS_MAX = 16;
const FACILITY_COUNT_MIN = 18;
const FACILITY_COUNT_MAX = 125;

// A kota ("city") is a small enclave inside — or touching — its kabupaten. At
// province zoom its polygon is only ~10–25 px across, so a kota bubble must not
// be allowed to grow past 8 px or it spills over the enclosing kabupaten and
// swallows its marker. Kota labels also shrink to 10 px so they fit the enclave.
const MARKER_RADIUS_MIN_KOTA = 5;
const MARKER_RADIUS_MAX_KOTA = 8;
// The bubble sits ON the anchor; the label floats this far ABOVE it.
const LABEL_OFFSET_ABOVE_MARKER_PX = 14;

// Twins (Kediri, Blitar, Probolinggo, Pasuruan, Mojokerto, Madiun, Malang — each
// a kabupaten *and* a kota) must stay visually distinct at the initial zoom.
// These are minimums in screen pixels between the two markers.
const TWIN_MIN_SEPARATION_PX = 18;
// A marker nudged to satisfy the rule above must not end up hugging the border.
const MARKER_MIN_BORDER_CLEARANCE_PX = 6;

// ── Name / id matching between the GeoJSON and the health dataset ────────────
// The dataset uses ids like "blitar-kab" / "blitar-kota"; the GeoJSON uses the
// same ids but a human name such as "Kab. Blitar" / "Kota Blitar". Matching is
// resolved in three passes so a double (Blitar, Kediri, Malang, Madiun,
// Mojokerto, Pasuruan, Probolinggo — each has a kabupaten *and* a kota) never
// collapses into a single region.

type RegionKind = "kabupaten" | "kota";

/** lowercase, drop the kabupaten/kota prefix and every non-alphanumeric char. */
function normalizeName(value: string): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b(kabupaten|kab|kota)\b\.?/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

/** "Kota Blitar" → "kota", "Kab. Blitar" → "kabupaten", undefined when unknown. */
function regionKind(value: string): RegionKind | undefined {
  const v = String(value ?? "").toLowerCase();
  if (/\bkota\b/.test(v)) return "kota";
  if (/\bkabupaten\b|\bkab\.?\s/.test(v)) return "kabupaten";
  const suffix = v.split("-").pop();
  if (suffix === "kota") return "kota";
  if (suffix === "kab") return "kabupaten";
  return undefined;
}

/**
 * Composite key shared by both sides: `blitar|kabupaten`, `blitar|kota`.
 * Falls back to the bare normalised name when the kind is unknown, so a region
 * without a kab/kota marker still matches.
 */
function regionKeyFromName(name: string, type?: string): string {
  const kind = regionKind(type ?? "") ?? regionKind(name);
  const base = normalizeName(name);
  return kind ? `${base}|${kind}` : base;
}

function regionKeyFromId(id: string): string {
  return regionKeyFromName(id, id);
}

/** Builds the lookup table used to attach health data to each GeoJSON feature. */
function buildRegionIndex(): Map<string, RegionHealth> {
  const index = new Map<string, RegionHealth>();
  for (const region of regionHealth) {
    const keys = new Set<string>([
      regionKeyFromId(region.id),
      regionKeyFromName(region.name),
      normalizeName(region.id),
      normalizeName(region.name),
    ]);
    for (const key of keys) {
      if (key && !index.has(key)) index.set(key, region);
    }
  }
  return index;
}

/**
 * Resolve the health record for a GeoJSON feature, trying the most precise key
 * first: explicit id → id normalised → name+type (handles kab/kota twins).
 */
function matchRegion(
  index: Map<string, RegionHealth>,
  properties: EastJavaFeature["properties"]
): RegionHealth | undefined {
  const { id, name, type } = properties;
  return (
    index.get(regionKeyFromId(id)) ??
    index.get(regionKeyFromName(name, type)) ??
    index.get(normalizeName(id)) ??
    index.get(normalizeName(name)) ??
    regionHealth.find((region) => region.id === id)
  );
}

// Fit padding (px) used for the initial view, Reset and focusRegion.
// Equal padding on every side (24px) frames Jawa Timur tightly, Power BI style;
// the floating legend card is offset in CSS instead of stealing bottom room.
const FIT_PADDING: L.PointExpression = [24, 24];
const FOCUS_MAX_ZOOM = 10;

/**
 * Cool-down after an `invalidateSize()` triggered by the ResizeObserver. Any
 * resize caused by our own re-measure lands inside this window and is ignored,
 * which is what stops the invalidate → resize → invalidate feedback loop.
 */
const RESIZE_COOLDOWN_MS = 200;

/**
 * Bounds of the East Java mainland (Java + Madura + Kangean), derived from the
 * actual boundary data so the viewport always frames every kabupaten/kota.
 *
 * geoBoundaries IDN ADM2 attaches outlying islands to their parent regency:
 * Sumenep carries Karimunjawa (≈115.94E, 5.05S) and Gresik carries Bawean /
 * Masalembu (≈112.6E, 5.05S). Fitting on raw coordinates would zoom out to the
 * Java Sea and leave the province as a stamp in the corner, so points far
 * outside the East Java core box are ignored here (they are still rendered —
 * only the viewport is clamped).
 */
const EAST_JAVA_CORE = { west: 110.5, east: 115.0, south: -9.0, north: -6.3 };

function computeDataBounds(geoData: EastJavaGeoData): L.LatLngBounds {
  const bounds = L.latLngBounds([] as L.LatLngExpression[]);
  for (const feature of geoData.features) {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const point of ring) {
          const [lng, lat] = point;
          if (
            lng < EAST_JAVA_CORE.west ||
            lng > EAST_JAVA_CORE.east ||
            lat < EAST_JAVA_CORE.south ||
            lat > EAST_JAVA_CORE.north
          ) {
            continue;
          }
          bounds.extend([lat, lng] as L.LatLngExpression);
        }
      }
    }
  }
  return bounds;
}

// Small breathing room around the data so border strokes are not flush with the edge.
function padBounds(bounds: L.LatLngBounds, latPad: number, lngPad: number): L.LatLngBounds {
  return L.latLngBounds(
    [bounds.getSouth() - latPad, bounds.getWest() - lngPad],
    [bounds.getNorth() + latPad, bounds.getEast() + lngPad]
  );
}

// ── Region label placement ───────────────────────────────────────────────────

type LngLat = [number, number];
type LngLatRing = LngLat[];
type LngLatPolygon = LngLatRing[];

export type RegionLabel = {
  id: string;
  name: string;
  /** Short form: "Kab. Tuban" → "Tuban", but "Kota Kediri" keeps its prefix so
   *  it never collides with "Kediri" (the regency). */
  shortName: string;
  point: L.LatLng;
  /** Area of the largest polygon, in square degrees (labels scale by this). */
  area: number;
};

/** Shoelace area of a ring, in square degrees (absolute value). */
function ringAreaDeg(ring: LngLatRing): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(area) / 2;
}

function polygonAreaDeg(polygon: LngLatPolygon): number {
  return polygon[0] ? ringAreaDeg(polygon[0]) : 0;
}

/** Standard ray-casting test for a single ring. */
function pointInRing(point: LngLat, ring: LngLatRing): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Inside the outer ring and outside every hole. */
function pointInPolygon(point: LngLat, polygon: LngLatPolygon): boolean {
  if (!polygon[0] || !pointInRing(point, polygon[0])) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false;
  }
  return true;
}

// ── Pole of inaccessibility (Mapbox "polylabel") ────────────────────────────
// A bounding-box centre is a poor anchor for a concave region: it can sit in a
// neighbouring regency, or millimetres from the border, which is exactly how a
// marker ends up "stuck on the boundary". The pole of inaccessibility is the
// interior point furthest from ANY edge, so it is the visual centre in the only
// sense that matters here. The algorithm is Mapbox's polylabel (ISC licence):
// best-first search over a quadtree of cells sized by the polygon's precision.
//
// Coordinates are Lng/Lat degrees, which are not isotropic (1° of longitude is
// ~cos(lat) of 1° of latitude around Java's −7°), so every distance is computed
// in a locally scaled space and converted back on exit.

/** Cell priority: potential maximum clearance using half the bbox diagonal. */
interface LabelCell {
  x: number;
  y: number;
  /** Half the cell size. */
  h: number;
  /** Squared distance from the cell centre to the closest polygon edge. */
  d: number;
  /** Upper bound on the clearance of any point inside the cell. */
  max: number;
}

/**
 * Even-odd inside test against a flat-array ring ([x0,y0,x1,y1,…]).
 *
 * Called inside polylabel's hot loop, which evaluates hundreds of thousands of
 * candidates per region, so it works on the pre-flattened ring rather than the
 * LngLat tuples (no per-call destructuring or allocation).
 */
function pointInFlatRing(px: number, py: number, flat: number[]): boolean {
  let inside = false;
  const n = flat.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const xi = flat[i];
    const yi = flat[i + 1];
    const xj = flat[j];
    const yj = flat[j + 1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Inside the outer flat ring and outside every hole (flat arrays). */
function pointInFlatPolygon(px: number, py: number, rings: number[][]): boolean {
  if (rings.length === 0 || !pointInFlatRing(px, py, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInFlatRing(px, py, rings[i])) return false;
  }
  return true;
}

/**
 * Squared distance from `p` to the closest point of any edge of `polygon`.
 *
 * Flat-array form ([x0,y0,x1,y1,…]) per ring to keep the hot loop allocation
 * free: polylabel evaluates this tens of thousands of times per region.
 */
function squaredDistanceToPolygon(
  px: number,
  py: number,
  rings: number[][]
): number {
  let minDistSq = Infinity;
  for (const flat of rings) {
    const n = flat.length;
    // Edges are (i-1 → i); the last ring index closes back onto the first point.
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
      const ax = flat[j];
      const ay = flat[j + 1];
      const bx = flat[i];
      const by = flat[i + 1];
      // Squared distance from (px,py) to segment a→b.
      let dx = bx - ax;
      let dy = by - ay;
      let sq: number;
      if (dx === 0 && dy === 0) {
        dx = px - ax;
        dy = py - ay;
        sq = dx * dx + dy * dy;
      } else {
        const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          dx = px - bx;
          dy = py - by;
        } else if (t > 0) {
          dx = px - (ax + dx * t);
          dy = py - (ay + dy * t);
        } else {
          dx = px - ax;
          dy = py - ay;
        }
        sq = dx * dx + dy * dy;
      }
      if (sq < minDistSq) minDistSq = sq;
    }
  }
  return minDistSq;
}

/** Binary max-heap ordered by `max`, best candidate first. */
function pushCell(heap: LabelCell[], cell: LabelCell): void {
  heap.push(cell);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].max >= heap[i].max) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function popCell(heap: LabelCell[]): LabelCell {
  const top = heap[0];
  const last = heap.pop() as LabelCell;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let best = i;
      if (l < heap.length && heap[l].max > heap[best].max) best = l;
      if (r < heap.length && heap[r].max > heap[best].max) best = r;
      if (best === i) break;
      [heap[best], heap[i]] = [heap[i], heap[best]];
      i = best;
    }
  }
  return top;
}

/**
 * Pole of inaccessibility of a polygon (outer ring + holes), in Lng/Lat.
 *
 * Returns the interior point whose distance to the nearest edge is greatest.
 * `precision` is the stop condition in degrees; the default is ~10 m, well
 * below a pixel at any zoom this map allows, and the search is capped so a
 * pathological polygon cannot stall the render.
 */
function poleOfInaccessibility(
  polygon: LngLatPolygon,
  precision = 1e-4
): { point: LngLat; distance: number } {
  const outer = polygon[0] ?? [];
  if (outer.length === 0) return { point: [0, 0], distance: 0 };

  // Longitude degrees are shorter than latitude degrees at Java's latitude;
  // divide longitudes by cos(lat) so the search sees a metric-ish space.
  let sumLat = 0;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of outer) {
    sumLat += lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const lat0 = sumLat / outer.length;
  const cosLat = Math.max(0.2, Math.cos((lat0 * Math.PI) / 180));

  const rings = polygon.map((ring) => {
    const flat: number[] = [];
    for (const [lng, lat] of ring) flat.push(lng / cosLat, lat);
    return flat;
  });

  const scaledPrecision = precision / cosLat;
  const width = (maxLng - minLng) / cosLat;
  const height = maxLat - minLat;
  const cellSize = Math.min(width, height);
  if (!(cellSize > 0)) return { point: [minLng, minLat], distance: 0 };

  const half = cellSize / 2;

  // Is a point in the SCALED grid actually inside the polygon? Distance alone is
  // not enough: a concave regency's bbox contains pockets of its neighbours (and
  // of the sea), and those pockets are just as far from Sidoarjo's own edges as
  // its real interior. Without this test polylabel happily returns a point well
  // outside the region — the exact bug this rewrite is meant to remove.
  const scaledInside = (x: number, y: number) => pointInFlatPolygon(x, y, rings);

  const heap: LabelCell[] = [];
  // Seed the queue with the cells covering the bounding box.
  for (let x = minLng / cosLat; x < maxLng / cosLat; x += cellSize) {
    for (let y = minLat; y < maxLat; y += cellSize) {
      const cx = x + half;
      const cy = y + half;
      const d = squaredDistanceToPolygon(cx, cy, rings);
      pushCell(heap, { x: cx, y: cy, h: half, d, max: d + half * half * 2 });
    }
  }

  // Seed the incumbent with a point we KNOW is inside, so the search can never
  // report an outside point as its answer even if every seed cell is exterior.
  const startX = (minLng / cosLat + maxLng / cosLat) / 2;
  const startY = (minLat + maxLat) / 2;
  let bestX = startX;
  let bestY = startY;
  let bestD = 0;
  let found = false;
  if (scaledInside(startX, startY)) {
    bestD = squaredDistanceToPolygon(startX, startY, rings);
    found = true;
  }

  let guard = 0;
  while (heap.length > 0 && guard < 1_000_000) {
    guard++;
    const cell = popCell(heap);
    // Best possible clearance of this cell can no longer beat what we hold.
    if (cell.d > bestD && scaledInside(cell.x, cell.y)) {
      bestD = cell.d;
      bestX = cell.x;
      bestY = cell.y;
      found = true;
    }
    if (cell.max - bestD <= scaledPrecision) continue;

    const h = cell.h / 2;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cx = cell.x + dx * h;
        const cy = cell.y + dy * h;
        const d = squaredDistanceToPolygon(cx, cy, rings);
        pushCell(heap, {
          x: cx,
          y: cy,
          h,
          d,
          max: d + h * h * 2,
        });
      }
    }
  }

  // Belt and braces: if the bbox centre was outside (a crescent regency), fall
  // back to whichever vertex-adjacent sample is inside — always terminating on a
  // point that belongs to the region.
  if (!found) {
    for (const [lng, lat] of outer) {
      if (pointInPolygon([lng, lat], polygon)) {
        return { point: [lng, lat], distance: squaredDistanceToPolygon(lng / cosLat, lat, rings) };
      }
    }
    return { point: [startX * cosLat, startY], distance: 0 };
  }

  return { point: [bestX * cosLat, bestY], distance: Math.sqrt(bestD) };
}


/** "Kab. Tuban" → "Tuban"; "Kota Kediri" keeps its prefix (avoids ambiguity). */
function shortRegionName(name: string): string {
  return name.replace(/^Kab\.\s*/i, "").trim() || name;
}

/** Escape text before it goes into a divIcon's `html` string. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Anchor geometry for one region: the point the MARKER is placed on, plus the
 * polygon that point belongs to.
 *
 * `computeRegionAnchors` is the single source of truth for "where is this
 * region on the map" — labels and facility markers both read it, so the two can
 * never disagree. The point is the pole of inaccessibility of the LARGEST
 * polygon (a MultiPolygon such as Sumenep spans 72 islands — using the first
 * part would put the name on a tiny islet), i.e. the interior point furthest
 * from any border, which is what keeps markers off the boundary.
 */
interface RegionAnchor {
  id: string;
  name: string;
  /** Lng/Lat inside the region's largest polygon (pole of inaccessibility). */
  point: LngLat;
  /** The largest polygon of the feature, in Lng/Lat. */
  polygon: LngLatPolygon;
  /** Area of that polygon in deg². */
  area: number;
  /** Distance from `point` to the closest polygon edge, in degrees. */
  clearance: number;
}

function computeRegionAnchors(geoData: EastJavaGeoData | null): RegionAnchor[] {
  if (!geoData) return [];
  const anchors: RegionAnchor[] = [];

  for (const feature of geoData.features) {
    const polygons: LngLatPolygon[] =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates as LngLatPolygon]
        : (feature.geometry.coordinates as LngLatPolygon[]);
    if (polygons.length === 0) continue;

    let largest = polygons[0];
    let largestArea = polygonAreaDeg(polygons[0]);
    for (let i = 1; i < polygons.length; i++) {
      const area = polygonAreaDeg(polygons[i]);
      if (area > largestArea) {
        largestArea = area;
        largest = polygons[i];
      }
    }
    if (!largest[0] || largest[0].length === 0) continue;

    const { point, distance } = poleOfInaccessibility(largest);

    anchors.push({
      id: feature.properties.id,
      name: feature.properties.name,
      point,
      polygon: largest,
      area: largestArea,
      clearance: distance,
    });
  }

  return anchors;
}

function computeRegionLabels(geoData: EastJavaGeoData | null): RegionLabel[] {
  return computeRegionAnchors(geoData).map((anchor) => ({
    id: anchor.id,
    name: anchor.name,
    shortName: shortRegionName(anchor.name),
    point: L.latLng(anchor.point[1], anchor.point[0]),
    area: anchor.area,
  }));
}

/** True when a label is allowed at this zoom level. */
function labelVisibleAtZoom(label: RegionLabel, zoom: number): boolean {
  if (!Number.isFinite(zoom)) return true;
  return zoom >= REGION_LABEL_FULL_ZOOM || label.area >= REGION_LABEL_AREA_THRESHOLD;
}

/**
 * True while the Leaflet instance can still touch the DOM.
 *
 * `MapContainer` runs its own `map.remove()` cleanup *before* the cleanup of
 * the children rendered inside it, so a child effect cleanup may receive a map
 * that has already been torn down. Running a map method then throws
 * "Cannot read properties of undefined (reading '_leaflet_pos')" because
 * `PosAnimation` no longer has a map pane to position.
 *
 * IMPORTANT: do NOT test `map._mapPane`. `Map#_initPanes()` creates it via
 * `createPane('mapPane', this._container)`, which returns `undefined` (that
 * private method returns nothing), so `_mapPane` is `undefined` on *every*
 * live map. `map.remove()` then does `delete this._mapPane`. Testing it makes
 * this helper return false forever, which silently skipped pane creation, the
 * basemap and the GeoJSON layer — the "grey basemap, no polygons" symptom.
 * Detect a detached map via `createPane('mapPane')` (returns an element while
 * alive) plus a disconnect listener on the container.
 */
function isMapAlive(map: L.Map | null | undefined): map is L.Map {
  if (!map) return false;
  try {
    const m = map as unknown as { _container?: HTMLElement | null; _loaded?: boolean };
    if (!m._container || !m._container.isConnected) return false;
    // Leaflet's own guard: a map that was removed throws here.
    map.createPane("mapPane");
    return true;
  } catch {
    return false;
  }
}

/** `map._loaded` (internal Leaflet flag) — false until the map finishes init. */
function isMapLoaded(map: L.Map): boolean {
  return Boolean((map as unknown as { _loaded?: boolean })._loaded);
}

/**
 * Stop any in-flight pan/flyTo animation, but only when the map is still alive.
 * Never throws: cleanup code must not break unmounting.
 */
function stopMapAnimation(map: L.Map | null | undefined): void {
  if (!isMapAlive(map)) return;
  try {
    // Skip when nothing animates: `stop()` re-runs a frame and repositions the
    // map pane, which is exactly what blows up during teardown.
    const m = map as unknown as { _panAnim?: { _inProgress?: boolean } | null };
    if (!m._panAnim?._inProgress) return;
    map.stop();
  } catch {
    /* map already detached — nothing left to cancel */
  }
}

/** `invalidateSize()` guarded for detach/unmount races. */
function safeInvalidateSize(map: L.Map | null | undefined): void {
  if (!isMapAlive(map)) return;
  // TEMP DIAGNOSTIC: counts calls so a runaway invalidate loop is visible.
  const g = globalThis as unknown as { __eim_invalidate?: number };
  g.__eim_invalidate = (g.__eim_invalidate ?? 0) + 1;
  const n = g.__eim_invalidate;
  if (n === 200 || n === 1000 || n === 5000) {
    console.warn(`[DIAG] invalidateSize dipanggil ${n}x — kemungkinan loop!`);
  }
  try {
    map.invalidateSize();
  } catch {
    /* map already detached */
  }
}

/**
 * Fit the viewport to `bounds` after Leaflet has a non-zero container size.
 * Returns the cleanup that cancels any animation still in flight.
 */
function fitToBounds(map: L.Map, bounds: L.LatLngBounds, animate: boolean): () => void {
  if (!isMapAlive(map)) return () => {};
  if (!bounds.isValid()) {
    console.warn("[EastJavaMarkerMap] Bounds tidak valid — fitBounds dilewati.");
    return () => {};
  }

  if (!isMapLoaded(map)) {
    // Map is still initialising: defer until Leaflet is ready to move the view.
    let cleanup: () => void = () => {};
    let cancelled = false;
    map.whenReady(() => {
      if (cancelled) return;
      cleanup = fitToBounds(map, bounds, animate);
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }

  safeInvalidateSize(map);
  const size = map.getSize();
  if (size.x === 0 || size.y === 0) {
    // Container has no layout yet (page still painting): retry once after a frame.
    const frame = requestAnimationFrame(() => {
      if (!isMapAlive(map) || !bounds.isValid()) return;
      safeInvalidateSize(map);
      try {
        map.fitBounds(bounds, { padding: FIT_PADDING, animate: false });
      } catch {
        /* map detached between frames */
      }
    });
    return () => cancelAnimationFrame(frame);
  }

  if (bounds.isValid()) {
    try {
      map.fitBounds(bounds, { padding: FIT_PADDING, animate });
    } catch {
      /* map detached mid-fit */
      return () => {};
    }
  }
  return () => stopMapAnimation(map);
}

function MapPanes({ onReady }: { onReady: () => void }) {
  const map = useMap();

  useEffect(() => {
    // Every custom pane is created here, before any layer that references it is
    // rendered. Order (low → high): basemap 200 → polygons 450 → our region
    // labels 500 → basemap labels 650. Leaflet inserts each new pane as the last
    // child of the map container, so only the z-index controls the stacking —
    // polygons must sit above tiles.
    const basemapPane = map.getPane(PANE_BASEMAP) ?? map.createPane(PANE_BASEMAP);
    basemapPane.style.zIndex = "200";
    basemapPane.style.pointerEvents = "none";

    const polygonPane = map.getPane(PANE_POLYGON) ?? map.createPane(PANE_POLYGON);
    polygonPane.style.zIndex = "450";

    // Regency/city names we draw ourselves. Sits above the choropleth but below
    // tooltips (Leaflet's tooltip pane is 650) so it never covers them, and the
    // pane is click-through so hover/click still reach the polygons.
    const regionLabelsPane =
      map.getPane(PANE_REGION_LABELS) ?? map.createPane(PANE_REGION_LABELS);
    regionLabelsPane.style.zIndex = String(REGION_LABELS_Z);
    regionLabelsPane.style.pointerEvents = "none";

    // Facility bubbles. Clickable (pointer-events auto) so their tooltips work,
    // stacked between the polygons (450) and our labels (500).
    const markersPane = map.getPane(PANE_MARKERS) ?? map.createPane(PANE_MARKERS);
    markersPane.style.zIndex = String(MARKERS_Z);
    markersPane.style.pointerEvents = "auto";

    const labelsPane = map.getPane(PANE_LABELS) ?? map.createPane(PANE_LABELS);
    labelsPane.style.zIndex = "650";
    labelsPane.style.pointerEvents = "none";

    // Auto-invalidate map size on container resize.
    //
    // MUST be guarded. `invalidateSize()` re-fires Leaflet's own "resize" event,
    // which forces a layout pass that can re-enter this observer. Unguarded, that
    // is a self-sustaining loop that pegs the main thread and freezes the page a
    // few seconds after mount. Guards, in order:
    //   1. only act when the box size actually changed (ignore pure noise),
    //   2. coalesce bursts into one rAF,
    //   3. cool down for RESIZE_COOLDOWN_MS after each call so a re-entrant
    //      resize can never chain back into another invalidateSize.
    const container = map.getContainer();
    let lastW = -1;
    let lastH = -1;
    let frame = 0;
    let cooling = false;
    let coolTimer = 0;
    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentRect;
      if (!box) return;
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      if (cooling || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!isMapAlive(map)) return;
        cooling = true;
        safeInvalidateSize(map);
        coolTimer = window.setTimeout(() => {
          cooling = false;
          coolTimer = 0;
        }, RESIZE_COOLDOWN_MS);
      });
    });
    observer.observe(container);

    // Only signal "panes ready" once the map really is initialised; the
    // basemap and the choropleth layer are mounted off this flag.
    let cancelled = false;
    map.whenReady(() => {
      if (!cancelled) onReady();
    });

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      if (coolTimer) clearTimeout(coolTimer);
      observer.disconnect();
    };
  }, [map, onReady]);

  return null;
}

function MapSetup({
  geoData,
  focusRegion,
  resetKey,
}: {
  geoData: EastJavaGeoData;
  focusRegion?: string;
  resetKey: number;
}) {
  const map = useMap();
  const dataBounds = useMemo(() => computeDataBounds(geoData), [geoData]);

  // Keep panning constrained just outside the province so Bali and NTB never
  // dominate the viewport; 0.75° of slack still lets the user peek at neighbours.
  useEffect(() => {
    if (!isMapAlive(map)) return;
    if (!dataBounds.isValid()) {
      console.warn("[EastJavaMarkerMap] Bounds Jawa Timur tidak valid; maxBounds dilewati.");
      return;
    }
    try {
      map.setMaxBounds(padBounds(dataBounds, 0.75, 0.75));
    } catch {
      /* map detached */
    }
  }, [map, dataBounds]);

  // Frame the province on first load and whenever Reset is pressed (resetKey bump).
  // Skipped while a single regency is focused — the focus effect owns the view then.
  // The initial fit is always instant (animate: false): animating right before a
  // menu switch leaves a pan in flight that crashes once the map is removed.
  useEffect(() => {
    if (focusRegion) return;
    if (!isMapAlive(map)) return () => {};
    let cleanup: () => void = () => {};
    let cancelled = false;
    const run = () => {
      if (cancelled || !isMapAlive(map)) return;
      cleanup = fitToBounds(map, dataBounds, false);
    };
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      // Only fit once Leaflet has finished initialising the map.
      if (isMapLoaded(map)) run();
      else map.whenReady(run);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [map, dataBounds, resetKey, focusRegion]);

  // Zoom to the selected regency; when the selection is cleared, fit the province again.
  const focusFeature = useMemo(
    () => (focusRegion ? geoData.features.find((f) => f.properties.id === focusRegion) : undefined),
    [geoData, focusRegion]
  );
  const hadFocus = useRef(false);

  useEffect(() => {
    if (!isMapAlive(map)) return () => {};
    if (!focusRegion) {
      if (!hadFocus.current) return;
      hadFocus.current = false;
      return;
    }
    hadFocus.current = true;
    if (!focusFeature) {
      console.warn(`[EastJavaMarkerMap] Wilayah "${focusRegion}" tidak ada di GeoJSON.`);
      return;
    }
    const bounds = L.geoJSON(focusFeature).getBounds();
    if (!bounds.isValid()) {
      console.warn(`[EastJavaMarkerMap] Bounds "${focusRegion}" tidak valid.`);
      return;
    }
    const fit = () => {
      if (!isMapAlive(map) || !bounds.isValid()) return;
      safeInvalidateSize(map);
      try {
        map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FOCUS_MAX_ZOOM, animate: false });
      } catch {
        /* map detached mid-fit */
      }
    };
    if (isMapLoaded(map)) fit();
    else map.whenReady(fit);
    return () => stopMapAnimation(map);
  }, [map, focusRegion, focusFeature]);

  return null;
}

// Exposes the Leaflet map instance to the parent (used to re-fit after a basemap swap).
function MapBridge({ target }: { target: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    target.current = map;
    return () => {
      // Never leave a dead map behind for the parent's Reset handler.
      if (target.current === map) target.current = null;
    };
  }, [map, target]);
  return null;
}

/**
 * One name label per kabupaten/kota, centred on its largest polygon.
 *
 * Rendered as `L.marker` + `L.divIcon` (not a text Path) so the text stays
 * legible at any zoom: markers are positioned by the map but their DOM is
 * never scaled by the SVG transform. The markers live in `regionLabelsPane`
 * (z 500, pointer-events none) which keeps them above the choropleth and
 * below Leaflet's tooltip pane, so a hovered region's tooltip is never covered.
 */
function RegionLabelLayer({
  geoData,
  focusRegion,
}: {
  geoData: EastJavaGeoData;
  focusRegion?: string;
}) {
  const map = useMap();
  const labels = useMemo(() => computeRegionLabels(geoData), [geoData]);
  // Zoom is React state so each redraw happens once per zoomend, not per frame.
  // Read it defensively: the initializer runs during render, where calling
  // isMapAlive() (it probes via createPane) would be a side effect.
  const [zoom, setZoom] = useState<number>(() => {
    try {
      return map.getZoom();
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!isMapAlive(map)) return;
    const sync = () => {
      if (!isMapAlive(map)) return;
      setZoom(map.getZoom());
    };
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [map]);

  useEffect(() => {
    if (!isMapAlive(map)) return;
    const layer = L.layerGroup();

    for (const label of labels) {
      if (!labelVisibleAtZoom(label, zoom)) continue;
      const isFocused = Boolean(focusRegion) && focusRegion === label.id;
      const isDimmed = Boolean(focusRegion) && !isFocused;
      // Small kota get a smaller label so the name fits inside the enclave.
      const isKota = isKotaRegion(label.id);
      const classes = [
        "region-label",
        zoom >= REGION_LABEL_FULL_ZOOM ? "region-label--lg" : "",
        isKota ? "region-label--kota" : "",
        isDimmed ? "region-label--dim" : "",
        isFocused ? "region-label--focus" : "",
      ]
        .filter(Boolean)
        .join(" ");

      // The label floats LABEL_OFFSET_ABOVE_MARKER_PX above the point the
      // facility marker occupies, so the two never cover each other.
      const labelPoint = shiftLatLngByPixels(
        map,
        label.point,
        -LABEL_OFFSET_ABOVE_MARKER_PX
      );

      L.marker(labelPoint, {
        pane: PANE_REGION_LABELS,
        interactive: false,
        keyboard: false,
        // Zero-size icon anchored on the point: the .region-label span is
        // centred with a -50%/-50% translate so the text sits exactly on it.
        icon: L.divIcon({
          className: "region-label-icon",
          html: `<span class="${classes}">${escapeHtml(label.shortName)}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      }).addTo(layer);
    }

    layer.addTo(map);
    // Adding markers re-creates DOM only for the current set; drop it as a whole.
    return () => {
      if (isMapAlive(map)) layer.remove();
      layer.clearLayers();
    };
  }, [map, labels, zoom, focusRegion]);

  return null;
}

/**
 * Move a point UP by `offsetPx` screen pixels (negative screen Y is up).
 *
 * The conversion happens in Leaflet's projected (pixel) space at the current
 * zoom, so the visual gap stays the same number of pixels — a raw latitude
 * delta would drift as soon as the user zooms.
 */
function shiftLatLngByPixels(map: L.Map, point: L.LatLng, offsetPx: number): L.LatLng {
  try {
    const projected = map.project(point);
    return map.unproject(L.point(projected.x, projected.y + offsetPx), map.getZoom());
  } catch {
    return point;
  }
}

/**
 * Circle radius for a facility count: sqrt scale mapped onto the pane's band.
 *
 * Square-root keeps the ENCODING honest — the visible area of the circle grows
 * in proportion to `facilityCount`, so a region with twice the facilities looks
 * twice as heavy rather than four times. Kota use a lower floor (5 px) AND a
 * lower ceiling (8 px) so the bubble stays within their small enclave outlines.
 */
function facilityRadius(
  count: number,
  minRadius = MARKER_RADIUS_MIN,
  maxRadius = MARKER_RADIUS_MAX
): number {
  const span = FACILITY_COUNT_MAX - FACILITY_COUNT_MIN;
  const ratio = span > 0 ? (count - FACILITY_COUNT_MIN) / span : 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  const r = minRadius + Math.sqrt(clamped) * (maxRadius - minRadius);
  return Math.round(r * 10) / 10;
}

/**
 * Distance, in screen pixels at the map's current zoom, from `point` to the
 * closest edge of `polygon`. Negative-style sentinels are not used: callers ask
 * only about points they already know are inside.
 *
 * The polygon is projected into pixel space first so the answer is directly
 * comparable to marker radii and label offsets, and so it is correct at any
 * zoom without re-deriving degrees-per-pixel.
 */
function distanceToPolygonBorderPx(
  map: L.Map,
  point: L.LatLng,
  polygon: LngLatPolygon
): number {
  const p = map.project(point);
  let minDistSq = Infinity;
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = map.project(L.latLng(ring[j][1], ring[j][0]));
      const b = map.project(L.latLng(ring[i][1], ring[i][0]));
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      let dx: number;
      let dy: number;
      if (abx === 0 && aby === 0) {
        dx = p.x - a.x;
        dy = p.y - a.y;
      } else {
        const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby);
        if (t > 1) {
          dx = p.x - b.x;
          dy = p.y - b.y;
        } else if (t > 0) {
          dx = p.x - (a.x + abx * t);
          dy = p.y - (a.y + aby * t);
        } else {
          dx = p.x - a.x;
          dy = p.y - a.y;
        }
      }
      const sq = dx * dx + dy * dy;
      if (sq < minDistSq) minDistSq = sq;
    }
  }
  return Number.isFinite(minDistSq) ? Math.sqrt(minDistSq) : 0;
}

/**
 * Move the KABUPATEN marker of a twin pair away from the kota marker until the
 * two are at least `sepPx` apart — escalating to the kota's own marker position
 * rather than a fixed downward hop, because the kota now sits exactly on its
 * pole of inaccessibility and the pair can collide in any direction.
 *
 * Every candidate must stay inside the kabupaten polygon AND keep at least
 * `MARKER_MIN_BORDER_CLEARANCE_PX` from its border, so satisfying the spacing
 * rule can never push a bubble onto the boundary — the very defect being fixed.
 * If no candidate satisfies both, the best valid one (largest gap) is returned.
 */
function separateKabupatenFromKota(
  map: L.Map,
  anchor: RegionAnchor,
  start: L.LatLng,
  kota: L.LatLng,
  sepPx: number
): L.LatLng {
  const kotaPx = map.project(kota);
  const gapOf = (p: L.LatLng) => {
    const q = map.project(p);
    return Math.hypot(q.x - kotaPx.x, q.y - kotaPx.y);
  };
  const usable = (p: L.LatLng) =>
    pointInPolygon([p.lng, p.lat], anchor.polygon) &&
    distanceToPolygonBorderPx(map, p, anchor.polygon) >= MARKER_MIN_BORDER_CLEARANCE_PX;

  let best =
    distanceToPolygonBorderPx(map, start, anchor.polygon) >= MARKER_MIN_BORDER_CLEARANCE_PX
      ? start
      : null;
  let bestGap = best ? gapOf(best) : -Infinity;
  if (best && bestGap >= sepPx) return best;

  // Radial fan from the anchor: push away from the kota, in the direction that
  // increases the gap fastest, trying progressively longer hops.
  const origin = map.project(start);
  const away =
    Math.hypot(kotaPx.x - origin.x, kotaPx.y - origin.y) > 0.001
      ? {
          x: (origin.x - kotaPx.x) / Math.hypot(origin.x - kotaPx.x, origin.y - kotaPx.y),
          y: (origin.y - kotaPx.y) / Math.hypot(origin.x - kotaPx.x, origin.y - kotaPx.y),
        }
      : { x: 0, y: -1 };
  const baseAngle = Math.atan2(away.y, away.x);

  for (let step = 2; step <= 40; step += 2) {
    // Sweep ±80° around the escape direction so a narrow regency still has
    // options, then widen to a full circle as a last resort.
    const spread = step <= 20 ? Math.PI * 0.44 : Math.PI;
    for (let k = 0; k <= 12; k++) {
      const angle = baseAngle + (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * (spread / 6);
      const candidate = map.unproject(
        L.point(origin.x + Math.cos(angle) * step, origin.y + Math.sin(angle) * step),
        map.getZoom()
      );
      if (!usable(candidate)) continue;
      const gap = gapOf(candidate);
      if (gap > bestGap) {
        bestGap = gap;
        best = candidate;
      }
      if (bestGap >= sepPx) return best as L.LatLng;
    }
  }
  return best ?? start;
}

/**
 * Because a kota is an enclave, its bubble starts on top of the kabupaten's.
 * Step the kota away — preferring "downwards", but allowed to slide sideways
 * when straight down hits the city boundary — and keep the position that best
 * separates the two circles while staying inside the kota polygon.
 *
 * Returns the chosen point; `best` starts at the plain downward offset so the
 * call degenerates safely when there is no twin or no room to move.
 */
function separateFromTwin(
  map: L.Map,
  anchor: RegionAnchor,
  start: L.LatLng,
  twin: L.LatLng,
  sepPx: number
): L.LatLng {
  const inside = (p: L.LatLng) => pointInPolygon([p.lng, p.lat], anchor.polygon);
  const twinPx = map.project(twin);
  const gapOf = (p: L.LatLng) => {
    const q = map.project(p);
    return Math.hypot(q.x - twinPx.x, q.y - twinPx.y);
  };

  let best = start;
  let bestGap = gapOf(start);
  if (bestGap >= sepPx) return best;

  const origin = map.project(L.latLng(anchor.point[1], anchor.point[0]));
  // Fanned search: straight down first, then progressively wider sideways
  // offsets (still biased downward, so the bubble stays below its label).
  // The sideways reach must be generous: in a small kota the kabupaten's
  // bubble often sits directly below, and only a longer horizontal slide
  // gets clear of it while staying inside the city outline.
  const dxSteps: number[] = [];
  for (let d = 0; d <= 48; d += 4) {
    dxSteps.push(d);
    if (d !== 0) dxSteps.push(-d);
  }
  for (let dy = 2; dy <= 48; dy += 2) {
    for (const dx of dxSteps) {
      const candidate = map.unproject(L.point(origin.x + dx, origin.y + dy), map.getZoom());
      if (!inside(candidate)) continue;
      const gap = gapOf(candidate);
      if (gap > bestGap) {
        bestGap = gap;
        best = candidate;
      }
    }
    if (bestGap >= sepPx) break;
  }
  return best;
}

/** "…-kota" ids are the urban halves of the kabupaten/kota twins. */
function isKotaRegion(id: string): boolean {
  return /-kota$/.test(id);
}

/** "blitar-kota" → "blitar", used to find the twin kabupaten/kota record. */
function twinBaseId(id: string): string | undefined {
  return id.match(/^(.*)-(kab|kota)$/)?.[1];
}

/**
 * One bubble per region, sized by its facility count.
 *
 * Position is the SAME in-polygon anchor the region label uses
 * (`computeRegionAnchors`), so a bubble can never drift into the sea or into a
 * neighbouring regency the way a hand-listed centroid can. Features are matched
 * to `regionHealth` through `matchRegion`, keeping kabupaten/kota twins apart.
 * The bubble is then nudged ~12 px below the label — clamped so it stays inside
 * its own polygon — and a kota is slid off its enclosing kabupaten.
 */
function FacilityMarkerLayer({
  geoData,
  focusRegion,
}: {
  geoData: EastJavaGeoData;
  focusRegion?: string;
}) {
  const map = useMap();
  // Anchor + polygon per region, keyed by regionHealth id. Matching goes through
  // matchRegion so a kabupaten/kota twin can never receive its sibling's
  // facilityCount (the GeoJSON name carries the "Kab."/"Kota" discriminator).
  const anchorsById = useMemo(() => {
    const index = buildRegionIndex();
    const byId = new Map<string, RegionAnchor>();
    for (const anchor of computeRegionAnchors(geoData)) {
      // Reconstruct the feature's identifying properties so matchRegion can use
      // the same id → name+type → normalised-name ladder as the polygons.
      const region = matchRegion(index, {
        id: anchor.id,
        name: anchor.name,
        type: isKotaRegion(anchor.id) ? "kota" : "kabupaten",
      });
      if (!region) {
        console.warn(
          `[EastJavaMarkerMap] Fitur "${anchor.id}" tidak cocok dengan data kesehatan; marker dilewati.`
        );
        continue;
      }
      byId.set(region.id, anchor);
    }
    return byId;
  }, [geoData]);

  useEffect(() => {
    if (!isMapAlive(map)) return;
    const layer = L.layerGroup();

    // Marker placement is centre-anchored: the bubble sits ON the shared
    // anchor (the pole of inaccessibility) — no downward nudge — so it is as far
    // from every border as the polygon allows. The label is what moves up, in
    // RegionLabelLayer, which keeps bubbles and names from colliding.
    //
    // Twin spacing first: the KABUPATEN bubble is pushed away from the kota's
    // until they are >= 18 px apart at this zoom, staying >= 6 px inside its own
    // border. Only then is the kota's position finalised.
    const kabupatenPoint = new Map<string, L.LatLng>();
    for (const region of regionHealth) {
      if (isKotaRegion(region.id)) continue;
      const base = twinBaseId(region.id);
      const anchor = anchorsById.get(region.id);
      if (base && anchor) {
        kabupatenPoint.set(base, L.latLng(anchor.point[1], anchor.point[0]));
      }
    }

    // Pass 1 — where does each KOTA bubble end up? It must clear its kabupaten
    // twin by TWIN_MIN_SEPARATION_PX, sliding inside its own (small) polygon.
    const kotaPoint = new Map<string, L.LatLng>();
    for (const region of regionHealth) {
      if (!isKotaRegion(region.id)) continue;
      const base = twinBaseId(region.id);
      const anchor = anchorsById.get(region.id);
      const twin = base ? kabupatenPoint.get(base) : undefined;
      if (!base || !anchor || !twin) continue;
      kotaPoint.set(
        base,
        separateFromTwin(map, anchor, L.latLng(anchor.point[1], anchor.point[0]), twin, TWIN_MIN_SEPARATION_PX)
      );
    }

    for (const region of regionHealth) {
      const anchor = anchorsById.get(region.id);
      if (!anchor) continue;

      const kota = isKotaRegion(region.id);
      const base = twinBaseId(region.id);

      const radius = kota
        ? facilityRadius(region.facilityCount, MARKER_RADIUS_MIN_KOTA, MARKER_RADIUS_MAX_KOTA)
        : facilityRadius(region.facilityCount);

      const anchorPoint = L.latLng(anchor.point[1], anchor.point[0]);
      let point = anchorPoint;

      if (kota) {
        point = (base && kotaPoint.get(base)) || anchorPoint;
      } else if (base) {
        // Pass 2 — the KABUPATEN gives way. Its marker is intentionally the one
        // that moves (its polygon is far larger, so a few pixels costs nothing),
        // and only when the pair is closer than 18 px at this zoom.
        const kotaMarker = kotaPoint.get(base);
        if (kotaMarker) {
          point = separateKabupatenFromKota(map, anchor, point, kotaMarker, TWIN_MIN_SEPARATION_PX);
        }
      }

      const isFocused = Boolean(focusRegion) && focusRegion === region.id;
      const isDimmed = Boolean(focusRegion) && !isFocused;

      const marker = L.circleMarker(point, {
        pane: PANE_MARKERS,
        radius,
        fillColor: "#ffffff",
        fillOpacity: 0.9,
        color: "#0f172a",
        weight: 2,
        opacity: isDimmed ? 0.35 : 1,
        // Click must never re-zoom the map (that is the polygon's job).
        bubblingMouseEvents: false,
        className: "facility-marker",
      });

      // Same card styling as the polygon tooltip so the two read as one system.
      // No hospital/puskesmas split: that number is a 0.28-derived estimate,
      // not data, so only the verified facilityCount is stated as fact.
      marker.bindTooltip(
        `<div class="choropleth-tooltip-card">
          <div class="choropleth-tooltip-header">
            <span class="choropleth-tooltip-title">${escapeHtml(region.name)}</span>
          </div>
          <div class="choropleth-tooltip-row">
            <span class="choropleth-tooltip-label">Total fasilitas:</span>
            <strong class="choropleth-tooltip-val">${region.facilityCount.toLocaleString(
              "id-ID"
            )}</strong>
          </div>
        </div>`,
        {
          className: "choropleth-tooltip",
          direction: "top",
          offset: [0, -6],
          opacity: 1,
          // Marker tooltips must not steal the hover from the polygon below.
          permanent: false,
        }
      );

      layer.addLayer(marker);
    }

    layer.addTo(map);
    return () => {
      if (isMapAlive(map)) layer.remove();
      layer.clearLayers();
    };
  }, [map, anchorsById, focusRegion]);

  return null;
}

function MapControls({
  bounds,
  onReset,
}: {
  bounds?: L.LatLngBounds;
  onReset?: () => void;
}) {
  const map = useMap();
  const btnStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#0f172a",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
    transition: "background 0.15s, border-color 0.15s",
  };

  const handleReset = () => {
    if (!isMapAlive(map)) return;
    if (bounds) {
      fitToBounds(map, bounds, true);
    } else {
      console.warn("[EastJavaMarkerMap] Reset dilewati: bounds belum tersedia.");
    }
    onReset?.();
  };

  const zoomBy = (direction: 1 | -1) => {
    if (!isMapAlive(map)) return;
    try {
      if (direction === 1) map.zoomIn();
      else map.zoomOut();
    } catch {
      /* map detached */
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 800,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <button
        style={btnStyle}
        onClick={() => zoomBy(1)}
        title="Perbesar Peta"
        aria-label="Zoom in"
      >
        <Plus size={15} />
      </button>
      <button
        style={btnStyle}
        onClick={() => zoomBy(-1)}
        title="Perkecil Peta"
        aria-label="Zoom out"
      >
        <Minus size={15} />
      </button>
      <button
        style={btnStyle}
        onClick={handleReset}
        title="Reset Tampilan Jawa Timur"
        aria-label="Reset view"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

export default function EastJavaMarkerMap({
  metric = "bedRatio",
  onRegionClick,
  height = "100%",
  compact = false,
  layers = DEFAULT_LAYERS,
  resetKey = 0,
  mapBumpKey = 0,
  focusRegion,
}: EastJavaMarkerMapProps) {
  const [geoData, setGeoData] = useState<EastJavaGeoData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [ready, setReady] = useState(false);
  const [tileSource, setTileSource] = useState<string>("carto");
  const handlePanesReady = useCallback(() => setReady(true), []);
  const onRegionClickRef = useRef(onRegionClick);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const cfg = METRIC_CONFIG[metric];

  // Data-derived viewport bounds shared by MapSetup (fit/max bounds) and MapControls (reset).
  const mapDataBounds = useMemo(
    () => (geoData ? computeDataBounds(geoData) : undefined),
    [geoData]
  );

  useEffect(() => {
    onRegionClickRef.current = onRegionClick;
  }, [onRegionClick]);

  // When the basemap switches source the tile pane is rebuilt; re-fit so the
  // province stays framed regardless of the new tile URL.
  const mapInstanceRef = useRef<L.Map | null>(null);
  const lastFittedSource = useRef<string | null>(null);
  useEffect(() => {
    if (!mapDataBounds || !isMapAlive(mapInstanceRef.current)) return;
    if (lastFittedSource.current === null) {
      lastFittedSource.current = tileSource;
      return;
    }
    if (lastFittedSource.current === tileSource) return;
    lastFittedSource.current = tileSource;
    fitToBounds(mapInstanceRef.current, mapDataBounds, false);
  }, [tileSource, mapDataBounds]);

  // Canvas width changes (sidebar/drawer toggled): re-measure then re-fit to the
  // province. Only invalidateSize here — a card or table toggle must never reset
  // the user's zoom when a single region is focused.
  const bumpRef = useRef(mapBumpKey);
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!isMapAlive(map)) return;
    if (bumpRef.current === mapBumpKey) return; // ignore the initial mount
    bumpRef.current = mapBumpKey;
    safeInvalidateSize(map);
    if (focusRegion || !mapDataBounds) return;
    const frame = requestAnimationFrame(() => {
      if (!isMapAlive(map)) return;
      fitToBounds(map, mapDataBounds, false);
    });
    return () => cancelAnimationFrame(frame);
  }, [mapBumpKey, focusRegion, mapDataBounds]);

  useEffect(() => {
    let active = true;
    loadGeoJson()
      .then((data) => {
        if (!active) return;
        const features = data.features ?? [];
        if (features.length === 0) {
          console.warn("[EastJavaMarkerMap] GeoJSON termuat tetapi tidak berisi fitur.");
        }
        setGeoData(data);
      })
      .catch((error) => {
        if (!active) return;
        console.error("[EastJavaMarkerMap] Gagal memuat /geo/jatim-kabkota.geojson:", error);
        setLoadError("Batas wilayah Jawa Timur tidak dapat dimuat.");
      });
    return () => {
      active = false;
    };
  }, []);

  // Normalised id/name/type → health record lookup (handles kab/kota twins).
  const regionIndex = useMemo(() => buildRegionIndex(), []);

  const metricValue = (region: RegionHealth) =>
    metric === "bedRatio"
      ? region.bedRatio
      : metric === "stuntingRate"
      ? region.stuntingRate
      : region.dbd + region.tb + region.pneumonia;

  const valueText = (region: RegionHealth) =>
    metric === "disease"
      ? `${metricValue(region).toLocaleString("id-ID")} kasus`
      : `${metricValue(region).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${metric === "bedRatio" ? "TT/1.000" : "%"}`;

  const polygonStyle = (feature: EastJavaFeature): L.PathOptions => {
    const isSelectedFocus = focusRegion === feature.properties.id;
    const isDimmed = Boolean(focusRegion && !isSelectedFocus);
    const region = matchRegion(regionIndex, feature.properties);

    return {
      // Power BI choropleth: thin white seams between touching polygons.
      color: "#ffffff",
      weight: 1,
      opacity: 1,
      fill: true,
      // Cluster colour (Adequate dark blue, Stable light blue, Watch orange,
      // Critical red); grey when the region has no metric data.
      fillColor: region ? cfg.getColor(region) : "#cbd5e1",
      fillOpacity: isDimmed ? 0.25 : 0.85,
      lineCap: "round",
      lineJoin: "round",
      pane: PANE_POLYGON,
      className: "choropleth-polygon",
      interactive: true,
    };
  };

  const styleRef = useRef(polygonStyle);
  useEffect(() => {
    styleRef.current = polygonStyle;
  });

  const indexRef = useRef(regionIndex);
  useEffect(() => {
    indexRef.current = regionIndex;
  });

  const onEachFeature = (feature: EastJavaFeature, layer: L.Layer) => {
    const path = layer as L.Path;
    const region = matchRegion(indexRef.current, feature.properties);
    const scoreItem = regionScoreRows.find((row) => row.id === region?.id);

    path.bindTooltip("", {
      sticky: true,
      className: "choropleth-tooltip",
      direction: "top",
      opacity: 1,
      offset: [0, -10],
    });

    path.on("mouseover", () => {
      // Hover highlight: thicker outline, full-opacity fill.
      path.setStyle({
        color: "#1e293b",
        weight: 2.5,
        fillOpacity: 0.95,
      });
      // The polygon renderer lives in `polygonPane`; bringToFront() would move
      // the SVG renderer to the map-pane root and break the pane z-order.

      if (region) {
        const status = cfg.getStatusLabel(region);
        const scoreVal = scoreItem?.score ?? "-";
        path.setTooltipContent(`
          <div class="choropleth-tooltip-card">
            <div class="choropleth-tooltip-header">
              <span class="choropleth-tooltip-title">${feature.properties.name}</span>
              <span class="choropleth-tooltip-type">${
                feature.properties.type === "kota" ? "Kota" : "Kabupaten"
              }</span>
            </div>
            <div class="choropleth-tooltip-row">
              <span class="choropleth-tooltip-label">${cfg.title}:</span>
              <strong class="choropleth-tooltip-val">${valueText(region)}</strong>
            </div>
            <div class="choropleth-tooltip-row">
              <span class="choropleth-tooltip-status">
                <span class="choropleth-tooltip-dot" style="background-color: ${cfg.getColor(
                  region
                )};"></span>
                <strong>${status.label}</strong>
              </span>
              <span class="choropleth-tooltip-score">Skor: <strong>${scoreVal}/100</strong></span>
            </div>
          </div>
        `);
      } else {
        path.setTooltipContent(`
          <div class="choropleth-tooltip-card">
            <div class="choropleth-tooltip-title">${feature.properties.name}</div>
            <div style="color: #64748b; font-size: 11px;">Data tidak tersedia</div>
          </div>
        `);
      }
    });

    path.on("mouseout", () => {
      path.setStyle(styleRef.current(feature));
    });

    path.on("click", () => {
      if (region) {
        onRegionClickRef.current?.(region.id);
      }
    });
  };

  return (
    <div
      className="east-java-map east-java-map-fill"
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={mapContainerRef}
        className="east-java-map-canvas"
        style={{
          width: "100%",
          height: "100%",
          minHeight: 480,
          position: "relative",
          flex: 1,
          // Trap Leaflet's stacked panes (z-index 200–650, absolutely positioned)
          // inside this canvas. Without a containment context they paint OUTSIDE
          // the card and sit above the sidebar/header, swallowing every click on
          // the page. `contain: paint` clips them; `isolation` confines z-order.
          contain: "layout paint",
          isolation: "isolate" as const,
        }}
      >
        {loadError ? (
          <div
            role="alert"
            style={{
              padding: 24,
              color: "#b91c1c",
              background: "#fef2f2",
              borderRadius: 8,
              margin: 16,
            }}
          >
            {loadError}
          </div>
        ) : (
          <MapContainer
            center={[-7.65, 112.7]}
            zoom={8}
            maxBoundsViscosity={0.8}
            minZoom={6}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            attributionControl
            scrollWheelZoom
          >
            <MapPanes onReady={handlePanesReady} />
            <MapBridge target={mapInstanceRef} />

            {geoData && (
              <MapSetup
                geoData={geoData}
                focusRegion={focusRegion}
                resetKey={resetKey}
              />
            )}

            {/* Render pane-dependent layers only after every custom pane exists. */}
            {ready && <BasemapLayers showLabels={layers.labels} onSourceChange={setTileSource} />}

            {/* Choropleth polygons: remount on metric/focus change so style refreshes. */}
            {ready && geoData && layers.boundaries && (
              <GeoJSON
                key={`polygons-${metric}-${focusRegion ?? "all"}`}
                data={geoData}
                pane={PANE_POLYGON}
                style={(feature) => polygonStyle(feature as EastJavaFeature)}
                onEachFeature={(feature, layer) =>
                  onEachFeature(feature as EastJavaFeature, layer)
                }
              />
            )}

            {/* Our own regency/city names — replaces the unreadable CARTO tiles. */}
            {ready && geoData && layers.labels && (
              <RegionLabelLayer geoData={geoData} focusRegion={focusRegion} />
            )}

            {/* Facility bubbles: one per region, sized by facilityCount. */}
            {ready && geoData && layers.markers && (
              <FacilityMarkerLayer geoData={geoData} focusRegion={focusRegion} />
            )}

            <MapControls bounds={mapDataBounds} />
          </MapContainer>
        )}

        {/* Power BI style floating Legend card at bottom-left corner of the map */}
        {!compact && (
          <div className="choropleth-legend-card">
            <div className="choropleth-legend-title">{cfg.title}</div>
            <div className="choropleth-legend-items">
              {cfg.legend.map((item) => {
                const count = regionHealth.filter(
                  (region) => cfg.getColor(region) === item.color
                ).length;
                return (
                  <div className="choropleth-legend-item" key={item.label}>
                    <span
                      className="choropleth-legend-swatch"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="choropleth-legend-text">
                      <span className="choropleth-legend-label">
                        {item.label}
                      </span>
                      <span className="choropleth-legend-sublabel">
                        {item.sublabel}
                      </span>
                      <span className="choropleth-legend-count">
                        ({count} wilayah)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {layers.markers && (
              <div className="choropleth-legend-marker-note">
                Lingkaran = jumlah fasilitas kesehatan per wilayah (semakin besar semakin banyak)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
