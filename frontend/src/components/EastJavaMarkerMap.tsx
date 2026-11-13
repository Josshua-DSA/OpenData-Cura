import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { Layers, Minus, Plus, RotateCcw } from "lucide-react";
import { regionHealth, type RegionHealth } from "../data/healthData";
import { extractPolygons, type KabupatenFeature } from "../lib/geoUtils";
import {
  type MapMetric,
  type LayerState,
  type ClusterId,
  type LegendEntry,
  CLUSTER_STYLES,
  DEFAULT_LAYERS,
  METRIC_CONFIG,
} from "../data/mapConfig";

export type { MapMetric, LayerState };

// ── Constants ─────────────────────────────────────────────────────────────────
// Fokus awal: hanya Jawa Timur (bukan Bali/NTB).
const GEO_SMOOTH_FACTOR = 0.5;
const JATIM_BOUNDS_FALLBACK: L.LatLngBoundsExpression = [
  [-9.05, 110.85],
  [-6.55, 114.85],
];
const MAP_PADDING = 24;
// Sedikit lebih luas dari Jawa Timur agar Bali & NTB tidak dominan.
const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [-10.4, 109.4],
  [-5.1, 116.6],
];

const PANE_BASEMAP = "basemapPane";
const PANE_LABELS = "labelsPane";

// Basemap: tile raster OSM standar (tanpa API key). Tidak ada URL CARTO yang
// memunculkan placeholder "API KEY REQUIRED". Bila tile gagal dimuat, peta
// kembali ke latar polos #eef2f7 (warna wrapper) tanpa gambar rusak.
const BASEMAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

// Warna isi cadangan bila klaster tidak dikenal (tidak pernah undefined).
const CLUSTER_FALLBACK_FILL = "#cbd5e1";

// Ambang zoom label (relatif terhadap luas median wilayah).
// Zoom awal (~z7): wilayah besar saja; lebih dekat: semua kabupaten; kota: zoom tinggi.
const WEIGHT_THRESHOLD_FACTOR = 0.22;

// ── Tipe data GeoJSON (react-leaflet `data`) ────────────────────────────────
type GeoFeatures = Array<{
  type: "Feature";
  properties: { id: string; name: string; type: "kabupaten" | "kota" };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
}>;

// ── Sumber data peta: file statis di public/geo (geoBoundaries ADM2) ────────
// 38 fitur kabupaten/kota, properti id/name/type, koordinat [lng, lat].
const GEO_URL = "/geo/jatim-kabkota.geojson";

// Batas cakupan peta Jawa Timur daratan + Madura (lon 111–114.6).
// File ADM2 ikut membawa pulau-pulau terpencil Sumenep (Kangean/Masalembu:
// lon sampai 115.94, lat sampai -5.05). Hanya sub-poligon TERPENCIL itu yang
// dibuang — berdasarkan bbox, bukan per-titik — supaya wilayah utama tetap utuh
// (mis. pantai timur Banyuwangi yang mencapai lon 114.605 tidak ikut terpotong).
// Ke-38 fitur tetap ada.
const GEO_CLIP = { maxLng: 114.6, maxLat: -5.5 };

function clipToJatim(data: GeoJSON.GeoJsonObject): GeoJSON.GeoJsonObject {
  if (!("features" in data) || !Array.isArray(data.features)) return data;

  const isRemoteIslet = (poly: number[][][]) => {
    let minLng = Infinity;
    let maxLat = -Infinity;
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }
    return minLng > GEO_CLIP.maxLng || maxLat > GEO_CLIP.maxLat;
  };

  const features = data.features.map((f) => {
    if (!f || !f.geometry) return f;
    const g = f.geometry;
    if (g.type !== "MultiPolygon") return f;

    const kept = g.coordinates.filter((poly: number[][][]) => !isRemoteIslet(poly));
    if (kept.length === g.coordinates.length || kept.length === 0) return f;
    return {
      ...f,
      geometry:
        kept.length === 1
          ? { type: "Polygon", coordinates: kept[0] }
          : { type: "MultiPolygon", coordinates: kept },
    } as GeoJSON.Feature;
  });

  return { ...data, features } as GeoJSON.GeoJsonObject;
}

let geoPromise: Promise<GeoJSON.GeoJsonObject> | undefined;
function loadGeo(): Promise<GeoJSON.GeoJsonObject> {
  geoPromise ??= fetch(GEO_URL).then((r) => {
    if (!r.ok) throw new Error("gagal memuat peta");
    return r.json();
  }).then((data: GeoJSON.GeoJsonObject) => clipToJatim(data));
  return geoPromise;
}

// Feature GeoJSON hasil fetch (bentuknya sama dengan KabupatenFeature).
function geoFeaturesOf(data: GeoJSON.GeoJsonObject | null): GeoFeatures {
  if (!data || !("features" in data) || !Array.isArray(data.features)) return [];
  return data.features as unknown as GeoFeatures;
}

// Bounds sebenarnya dari GeoJSON (termasuk Madura & Sumenep), agar fitBounds
// dijalankan setelah data geometri tersedia dan tidak memotong pulau.
function computeGeoBounds(features: GeoFeatures): L.LatLngBounds {
  const bounds = L.latLngBounds([]);
  const addRing = (ring: number[][]) => {
    for (const [lng, lat] of ring) bounds.extend([lat, lng]);
  };
  for (const f of features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Polygon") {
      for (const ring of f.geometry.coordinates) addRing(ring);
    } else {
      for (const poly of f.geometry.coordinates) for (const ring of poly) addRing(ring);
    }
  }
  return bounds;
}

function fallbackBounds(): L.LatLngBounds {
  return L.latLngBounds(JATIM_BOUNDS_FALLBACK as L.LatLngTuple[]);
}

// Normalisasi id/nama wilayah: buang awalan "kabupaten", "kab", "kota".
function normalizeRegionKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^kabupaten\s+/, "")
    .replace(/^kab\.?\s+/, "")
    .replace(/^kota\s+/, "")
    .replace(/[\s.]+/g, " ")
    .replace(/[\s-]+/g, "")
    .trim();
}

// Cocokkan feature → wilayah lewat id, lalu name+type (normalisasi), sehingga
// pasangan kembar seperti Kab. Blitar (blitar-kab) dan Kota Blitar (blitar-kota)
// tidak saling tertukar.
const regionsByKey = (() => {
  const map = new Map<string, RegionHealth[]>();
  for (const r of regionHealth) {
    const key = `${r.type}|${normalizeRegionKey(r.name)}`;
    const list = map.get(key);
    if (list) list.push(r);
    else map.set(key, [r]);
  }
  return map;
})();

function matchRegion(
  feature: GeoFeatures[number],
  usedRegionIds: Set<string>,
): RegionHealth | null {
  const key = `${feature.properties.type}|${normalizeRegionKey(feature.properties.name)}`;
  const candidates = (regionsByKey.get(key) ?? []).filter((r) => !usedRegionIds.has(r.id));
  const picked = candidates[0];
  if (!picked) return null;
  usedRegionIds.add(picked.id);
  return picked;
}

const regionsById: Record<string, RegionHealth> = Object.fromEntries(
  regionHealth.map((r) => [r.id, r]),
);

// Teks label: hapus awalan "Kab.", kota tetap "Kota ...".
function displayName(id: string, fallback: string): string {
  const region = regionsById[id];
  const raw = region ? region.name : fallback;
  if (raw.startsWith("Kota ")) return raw;
  return raw.replace(/^Kab\.\s*/, "");
}

// ── Point-in-polygon / nearest-inside (pure math) ───────────────────────────
function pointInRing(point: [number, number], ring: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: [number, number], rings: [number, number][][]): boolean {
  if (rings.length === 0) return false;
  if (!pointInRing(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

function distSq(a: [number, number], b: [number, number]): number {
  const dLat = a[0] - b[0];
  const dLng = a[1] - b[1];
  return dLat * dLat + dLng * dLng;
}

// Titik terdekat dari start, digeser menuju start sampai di dalam ring.
// Bila semua t gagal (poligon cekung), mundur ke titik tengah sisi ring
// dan bergeser ke arah centroid-nya hingga benar-benar di dalam.
function nearestPointInside(start: [number, number], ring: [number, number][]): [number, number] {
  let nearest = start;
  let best = Infinity;
  for (const p of ring) {
    const d = distSq(start, p);
    if (d < best) {
      best = d;
      nearest = p;
    }
  }
  for (let t = 0.5; t >= 0; t -= 0.1) {
    const candidate: [number, number] = [
      start[0] + (nearest[0] - start[0]) * t,
      start[1] + (nearest[1] - start[1]) * t,
    ];
    if (pointInPolygon(candidate, [ring])) return candidate;
  }

  // Fallback: titik di dalam pada tiap tepi ring (midpoint yang sudah di dalam),
  // lalu pilih yang paling dekat dengan start.
  let bestEdge: [number, number] | null = null;
  let bestEdgeDist = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (let t = 0.5; t >= 0; t -= 0.05) {
      const candidate: [number, number] = [
        start[0] + (mid[0] - start[0]) * t,
        start[1] + (mid[1] - start[1]) * t,
      ];
      if (pointInPolygon(candidate, [ring])) {
        const d = distSq(start, candidate);
        if (d < bestEdgeDist) {
          bestEdgeDist = d;
          bestEdge = candidate;
        }
        break;
      }
    }
  }
  return bestEdge ?? nearest;
}

interface LabelPoint {
  id: string;
  name: string;
  type: "kabupaten" | "kota";
  lat: number;
  lng: number;
  minZoom: number;
}

// Dibangun SEKALI dari geoData saja (tidak bergantung metrik/hover/zoom).
// Mengembalikan titik label + jumlah fitur yang berhasil dicocokkan ke wilayah.
interface LabelBuild {
  points: LabelPoint[];
  matched: number;
  total: number;
}

function buildLabelPoints(features: GeoFeatures): LabelBuild {
  const usedRegionIds = new Set<string>();
  let matched = 0;

  const raw = features.map((f) => {
    const rings = extractPolygons({
      type: "Feature",
      properties: f.properties,
      geometry: f.geometry,
    } as KabupatenFeature);

    // Poligon terbesar = bbox area terbesar.
    let bestRing: [number, number][] = [];
    let bestArea = -Infinity;
    let box = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    for (const ring of rings) {
      let minLat = Infinity;
      let maxLat = -Infinity;
      let minLng = Infinity;
      let maxLng = -Infinity;
      for (const [lat, lng] of ring) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
      const area = (maxLat - minLat) * (maxLng - minLng);
      if (area > bestArea) {
        bestArea = area;
        bestRing = ring;
        box = { minLat, maxLat, minLng, maxLng };
      }
    }

    const centroid: [number, number] = [
      (box.minLat + box.maxLat) / 2,
      (box.minLng + box.maxLng) / 2,
    ];
    // Centroid bbox bisa jatuh di luar poligon → nearestPointInside.
    const anchor = pointInPolygon(centroid, [bestRing])
      ? centroid
      : nearestPointInside(centroid, bestRing);

    // Cocokkan ke data wilayah (id, lalu name+type ternormalisasi).
    const region = matchRegion(f, usedRegionIds);
    if (region) matched += 1;
    const id = region ? region.id : f.properties.id;

    return {
      id,
      name: displayName(id, f.properties.name),
      type: region ? region.type : f.properties.type,
      lat: anchor[0],
      lng: anchor[1],
      area: bestArea,
    };
  });

  const sorted = raw.map((r) => r.area).slice().sort((a, b) => b - a);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;

  const points = raw.map((r) => {
    let minZoom: number;
    if (r.type === "kota") minZoom = 10;
    else if (r.area >= median) minZoom = 6;
    else if (r.area >= median * WEIGHT_THRESHOLD_FACTOR) minZoom = 8;
    else minZoom = 9;
    return { id: r.id, name: r.name, type: r.type, lat: r.lat, lng: r.lng, minZoom };
  });

  return { points, matched, total: features.length };
}

// ── Pane tambahan (basemap & label), dibuat SINKRON saat render pertama ────
// Poligon TIDAK lagi memakai pane/renderer kustom: <GeoJSON> dirender di
// `overlayPane` bawaan Leaflet (z-index 400) dengan renderer SVG default milik
// map. Dengan begitu renderer-nya sama dengan renderer yang di-refresh oleh
// `map.invalidateSize()` / `viewreset`, sehingga transform SVG tidak tertinggal
// pada ukuran container lama (penyebab poligon tergeser ±250px ke atas).
// `useMemo` berjalan saat render (bukan useEffect) agar pane sudah ada sebelum
// <GeoJSON> dan portal label di subtree ini dibuat.
function ensurePane(map: L.Map, name: string, zIndex: number, pointerEvents: "auto" | "none") {
  let pane = map.getPane(name);
  if (!pane) pane = map.createPane(name);
  pane.style.zIndex = String(zIndex);
  pane.style.pointerEvents = pointerEvents;
  return pane;
}

interface PaneLayersProps {
  paneReady: boolean;
  onPanesReady: () => void;
  onMap: (map: L.Map) => void;
  layers: LayerState;
  geoData: GeoJSON.GeoJsonObject;
  styleFn: L.StyleFunction;
  onEachFeature: (feature: GeoJSON.Feature, layer: L.Layer) => void;
  labelPoints: LabelPoint[];
  zoom: number;
  geoReady: boolean;
  onGeoReady: () => void;
  onLayerReady: (layer: L.GeoJSON | null) => void;
  onTileError: () => void;
}

function PaneLayers({
  paneReady,
  onPanesReady,
  onMap,
  layers,
  geoData,
  styleFn,
  onEachFeature,
  labelPoints,
  zoom,
  geoReady,
  onGeoReady,
  onLayerReady,
  onTileError,
}: PaneLayersProps) {
  const map = useMap();

  // Sinkron pada render pertama: pane basemap (200) & label (500).
  // Poligon memakai `overlayPane` bawaan Leaflet (400) — tanpa pane kustom.
  useMemo(() => {
    ensurePane(map, PANE_BASEMAP, 200, "none");
    ensurePane(map, PANE_LABELS, 500, "none");
  }, [map]);

  const paneAda =
    map.getPane(PANE_LABELS) !== undefined &&
    map.getPane("overlayPane") !== undefined;

  useEffect(() => {
    onMap(map);
    if (paneAda) onPanesReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, paneAda]);

  // Anak hanya dirender setelah state pane ready=true DAN pane benar-benar ada.
  if (!paneReady || !paneAda) return null;

  return (
    <>
      <TileLayer
        key="osm"
        url={BASEMAP_TILE_URL}
        attribution={BASEMAP_ATTRIBUTION}
        opacity={1}
        pane={PANE_BASEMAP}
        className="ejm-basemap-tiles"
        eventHandlers={{ tileerror: onTileError }}
      />

      {/* Choropleth 38 kabupaten/kota — overlayPane bawaan Leaflet, renderer
          SVG default milik map (TANPA prop `pane` dan TANPA renderer kustom).
          `key` TIDAK memakai metric/layers: perubahan layer memakai setStyle
          pada layer yang ada (tanpa remount, tanpa fitBounds). */}
      <GeoJSON
        ref={(instance: L.GeoJSON | null) => {
          onLayerReady(instance);
          if (instance) onGeoReady();
        }}
        data={geoData}
        style={styleFn}
        // smoothFactor: opsi Polyline (types GeoJSONOptions belum memuatnya).
        {...({ smoothFactor: GEO_SMOOTH_FACTOR } as L.GeoJSONOptions)}
        onEachFeature={onEachFeature}
      />

      {layers.labels && <LabelsLayer points={labelPoints} zoom={zoom} />}

      {/* View awal: invalidateSize + fitBounds SETELAH geoData & layout final. */}
      <MapInitialView geoData={geoData} geoReady={geoReady} />
    </>
  );
}

// ── View awal: invalidateSize + fitBounds SETELAH layout container final ───
// Penyebab poligon tergeser: renderer SVG Leaflet memposisikan dirinya lewat
// `Renderer._updateTransform()` yang menghitung offset dari `map.getSize()`
// (cache `map._size`) dan `Renderer._update()` yang di-skip selama
// `map._animatingZoom`. Bila itu dijalankan sebelum container punya ukuran
// final, transform SVG tertinggal dan semua path tergeser (label tidak, karena
// label adalah marker Leaflet asli yang diposisikan oleh map pane sendiri).
// Urutan perbaikan: pastikan container > 0 px → invalidateSize → fitBounds
// (bounds dari GeoJSON) → setView tanpa animasi untuk memaksa renderer
// menghitung ulang bounds + transform. Diulang sekali setelah 300 ms karena
// tinggi kartu peta di sini berasal dari `calc(100dvh - ...)` yang baru stabil
// setelah browser menyelesaikan layout/paint.
function MapInitialView({
  geoData,
  geoReady,
}: {
  geoData: GeoJSON.GeoJsonObject | null;
  geoReady: boolean;
}) {
  const map = useMap();
  const startedRef = useRef(false);
  const maxBoundsAppliedRef = useRef(false);

  useEffect(() => {
    if (!geoReady || !geoData || startedRef.current) return;
    startedRef.current = true;

    // Bounds dari data ASLI (dirender penuh tanpa penyederhanaan sebelum fit).
    const rawBounds = L.geoJSON(geoData, {
      // smoothFactor: 0 -> seluruh titik dipakai, bounds tetap akurat.
      ...({ smoothFactor: 0 } as L.GeoJSONOptions),
    }).getBounds();
    const bounds = rawBounds.isValid() ? rawBounds : computeGeoBounds(geoFeaturesOf(geoData));

    const container = map.getContainer();
    const frames: number[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    // maxBounds hanya dihitung/dipasang SETELAH fitBounds selesai.
    const applyMaxBoundsOnce = () => {
      if (maxBoundsAppliedRef.current || cancelled) return;
      maxBoundsAppliedRef.current = true;
      map.setMaxBounds(MAX_BOUNDS);
    };

    const syncView = () => {
      if (cancelled) return;
      // Container harus benar-benar punya ukuran; kalau belum, coba lagi nanti.
      if (container.offsetWidth <= 0 || container.offsetHeight <= 0) return;

      // 1) Segarkan cache ukuran map (memicu viewreset → renderer _reset).
      map.invalidateSize({ animate: false });

      // 2) Fit ke bounds sebenarnya dari geoData.
      const fitTarget = bounds.isValid() ? bounds : fallbackBounds();

      // Pasang listener SEKALI tepat sebelum fitBounds: moveend pertama berarti
      // fitBounds sudah selesai.
      map.once("moveend", applyMaxBoundsOnce);
      map.fitBounds(fitTarget, { padding: [MAP_PADDING, MAP_PADDING], animate: false });

      // 3) Paksa renderer menghitung ulang bounds + transform (tanpa animasi).
      map.setView(map.getCenter(), map.getZoom(), { animate: false });

      // Fallback: bila tidak ada moveend (view tidak berubah), tetap pasang
      // maxBounds setelah fitBounds selesai.
      applyMaxBoundsOnce();
    };

    // requestAnimationFrame ganda: tunggu layout/paint final sebelum mengukur.
    frames.push(
      requestAnimationFrame(() => {
        frames.push(
          requestAnimationFrame(() => {
            syncView();
            // Ulangi sekali setelah 300 ms untuk ukuran container yang telat stabil.
            timer = setTimeout(() => {
              syncView();
              map.setView(map.getCenter(), map.getZoom(), { animate: false });
            }, 300);
          }),
        );
      }),
    );

    return () => {
      cancelled = true;
      frames.forEach((id) => cancelAnimationFrame(id));
      if (timer) clearTimeout(timer);
      map.off("moveend", applyMaxBoundsOnce);
    };
  }, [geoData, geoReady, map]);

  return null;
}

// ── Reset: fit ulang HANYA saat resetKey berubah (guarded) ─────────────────
function MapReset({ resetKey, bounds }: { resetKey: number; bounds: L.LatLngBounds }) {
  const map = useMap();
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    map.fitBounds(bounds, { padding: [MAP_PADDING, MAP_PADDING], animate: false });
  }, [resetKey, map]);
  return null;
}

// ── Resize: invalidateSize hanya bila lebar/tinggi benar-benar berubah ─────
function MapResizer() {
  const map = useMap();
  const lastRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w <= 0 || h <= 0) return;
      if (lastRef.current && lastRef.current.w === w && lastRef.current.h === h) return;
      lastRef.current = { w, h };
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

// ── Zoom → label (zoomend di-debounce 150ms) ───────────────────────────────
function MapZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onZoom(map.getZoom());
      }, 150);
    };
    map.on("zoomend", handler);
    return () => {
      if (timer) clearTimeout(timer);
      map.off("zoomend", handler);
    };
  }, [map, onZoom]);
  return null;
}

// ── Label: marker Leaflet asli, pointer-events none ────────────────────────
// Posisi label TIDAK dihitung manual. Marker diposisikan Leaflet sendiri
// (`latLngToLayerPoint`, relatif ke map pane), jadi saat pan/zoom marker ikut
// bergeser bersama map pane tanpa perlu event listener apa pun. Menghitung
// `latLngToContainerPoint` lalu menaruh elemen di dalam map pane membuat label
// tergeser dua kali sebesar pergeseran map pane (bug "label tertinggal saat
// pan"), karena pane itu sendiri ikut di-translate.
const LABEL_CLASS = "ejm-label";

// Nilai numerik ditulis dengan satuan eksplisit ("11px", bukan 11) karena
// di-apply lewat `Object.assign(el.style, …)` yang TIDAK menambahkan "px"
// seperti React; angka telanjang akan ditolak CSS dan diabaikan.
const LABEL_STYLE: CSSProperties = {
  position: "absolute",
  left: "0px",
  top: "0px",
  // Titik jangkar marker berada di (0,0) elemen induk; -50%/-50% memusatkan
  // teks tepat di titik label.
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  fontSize: "11px",
  fontWeight: 600,
  color: "#0f172a",
  textShadow: "0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 2px #fff",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-family-base)",
  userSelect: "none",
};

// Elemen teks untuk `L.divIcon({ html })`. Dibuat sebagai DOM node (bukan
// string HTML) supaya nama wilayah tidak perlu di-escape manual.
function createLabelElement(text: string): HTMLElement {
  const el = document.createElement("span");
  el.className = LABEL_CLASS;
  Object.assign(el.style, LABEL_STYLE);
  el.textContent = text;
  return el;
}

// Satu marker Leaflet per kabupaten/kota, dimiliki satu L.layerGroup di pane
// `labelsPane` (z 500, pointer-events none). Marker hanya ditambah/dibuang saat
// himpunan label yang terlihat berubah (zoom melewati `minZoom`); marker yang
// sudah ada dibiarkan, dan pan/drag sama sekali tidak menyentuh React.
function LabelsLayer({ points, zoom }: { points: LabelPoint[]; zoom: number }) {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);
  // id → marker + teks yang sedang ditampilkan, agar label yang teksnya berubah
  // diganti tanpa membuat marker ganda.
  const markersRef = useRef(new Map<string, { marker: L.Marker; text: string }>());

  // Layer group pemilik marker: dibuat & dipasang SEKALI per map.
  useEffect(() => {
    const group = L.layerGroup().addTo(map);
    groupRef.current = group;
    const markers = markersRef.current;
    return () => {
      group.remove();
      group.clearLayers();
      groupRef.current = null;
      markers.clear();
    };
  }, [map]);

  // Sinkronisasi visibilitas. Dijalankan hanya saat `zoom` berubah (state yang
  // diperbarui handler zoomend ber-debounce 150 ms) atau daftar titik berubah.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const markers = markersRef.current;
    const visible = new Set<string>();

    for (const p of points) {
      if (zoom < p.minZoom) continue;
      visible.add(p.id);
      const existing = markers.get(p.id);
      // Marker yang sudah ada tidak disentuh sama sekali (Leaflet yang
      // memindahkannya saat pan/zoom). Hanya teks yang berubah yang diganti.
      if (existing && existing.text === p.name) continue;
      if (existing) {
        group.removeLayer(existing.marker);
        markers.delete(p.id);
      }
      const marker = L.marker([p.lat, p.lng], {
        pane: PANE_LABELS,
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "ejm-label-icon",
          html: createLabelElement(p.name),
          // Ikon nol: teks dipusatkan oleh translate(-50%,-50%) di LABEL_STYLE.
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      });
      markers.set(p.id, { marker, text: p.name });
      group.addLayer(marker);
    }

    // Label yang tidak lagi terlihat pada zoom ini dibuang.
    for (const [id, entry] of markers) {
      if (visible.has(id)) continue;
      group.removeLayer(entry.marker);
      markers.delete(id);
    }
  }, [map, points, zoom]);

  return null;
}

// ── Legenda klaster ─────────────────────────────────────────────────────────
function LegendCard({
  title,
  legend,
  counts,
  total,
}: {
  title: string;
  legend: LegendEntry[];
  counts: Record<ClusterId, number>;
  total: number;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 12px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px 18px",
        background: "var(--color-white)",
      }}
    >
      <div style={{ minWidth: 140, maxWidth: 240 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-text-secondary)",
          }}
        >
          Legenda Klaster
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-family-base)",
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center" }}>
        {legend.map((entry) => (
          <div key={entry.cluster} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: entry.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-family-base)",
              }}
            >
              {entry.label}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                fontFamily: "var(--font-family-base)",
              }}
            >
              {entry.threshold}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-medical-blue)",
                background: "var(--color-light-blue)",
                borderRadius: 99,
                padding: "0 7px",
                minWidth: 20,
                textAlign: "center",
                fontFamily: "var(--font-family-base)",
              }}
            >
              {counts[entry.cluster]}
            </span>
          </div>
        ))}
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-family-base)",
          }}
        >
          {total} wilayah
        </span>
      </div>
    </div>
  );
}

// Opsi isi wilayah. Catatan: `fill: false` membuat Leaflet menulis
// fill="none", dan dengan pointer-events `visiblePainted` wilayah jadi TIDAK
// bisa di-hover. Karena itu, saat "Warna Klaster" dan "Batas Wilayah" sama-sama
// mati, isi dipertahankan dengan fillOpacity 0.01 (tak terlihat, tetap hoverable).
function fillOptions(layers: LayerState): { fill: boolean; fillOpacity: number } {
  if (layers.fill) return { fill: true, fillOpacity: 0.85 };
  if (layers.boundaries) return { fill: false, fillOpacity: 0 };
  return { fill: true, fillOpacity: 0.01 };
}

// ── Props ───────────────────────────────────────────────────────────────────
export interface EastJavaMarkerMapProps {
  metric?: MapMetric;
  height?: number;
  layers?: LayerState;
  focusRegion?: string;
  selectedRegion?: string | null;
  onRegionClick?: (regionId: string) => void;
  onRegionHover?: (regionId: string | null) => void;
  resetKey?: number;
}

interface TooltipState {
  id: string;
  name: string;
  value: string;
  cluster: ClusterId;
  rows: [string, string][];
}

// ── Komponen utama ──────────────────────────────────────────────────────────
export default function EastJavaMarkerMap({
  metric = "bedRatio",
  height,
  layers = DEFAULT_LAYERS,
  focusRegion,
  selectedRegion = null,
  onRegionClick,
  onRegionHover,
  resetKey = 0,
}: EastJavaMarkerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.GeoJSON | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  // True setelah <GeoJSON> terpasang (geoData siap) -> memicu fitBounds.
  const [geoReady, setGeoReady] = useState(false);
  const [zoom, setZoom] = useState(7);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  // Basemap: tile OSM. Bila tile gagal (tileerror) peta memakai latar polos
  // #eef2f7 dari .ejm-map (tanpa gambar tile rusak).
  const [, setTilesFailed] = useState(false);

  // GeoJSON dari /geo/jatim-kabkota.geojson (dimuat sekali, di-cache modul).
  const [geoData, setGeoData] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGeo().then(
      (data) => {
        if (cancelled) return;
        setGeoData(data);
      },
      () => {
        if (cancelled) return;
        setGeoError("Gagal memuat data peta.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTileError = useCallback(() => {
    setTilesFailed(true);
  }, []);

  const config = METRIC_CONFIG[metric];

  // Prop dipertahankan demi kompatibilitas Overview, sengaja TIDAK diterapkan.
  void focusRegion;

  // Bounds dari data ASLI (dihitung hanya saat geoData berubah).
  const geoBounds = useMemo<L.LatLngBounds | null>(() => {
    if (!geoData) return null;
    const b = computeGeoBounds(geoFeaturesOf(geoData));
    return b.isValid() ? b : null;
  }, [geoData]);

  // Label dihitung SEKALI per geoData (tidak bergantung metrik/zoom).
  const labelReport = useMemo<LabelBuild>(
    () => buildLabelPoints(geoFeaturesOf(geoData)),
    [geoData],
  );
  const labelPoints = labelReport.points;

  // Jumlah wilayah per klaster untuk legenda.
  const counts = useMemo(() => {
    const c: Record<ClusterId, number> = {
      adequate: 0,
      stable: 0,
      watch: 0,
      critical: 0,
      nodata: 0,
    };
    for (const r of regionHealth) c[config.getCluster(r)] += 1;
    return c;
  }, [config]);

  // Laporan jumlah wilayah yang cocok (harus 38 dari 38).
  useEffect(() => {
    if (!geoData) return;
    console.info(
      `[HealthMap] wilayah cocok: ${labelReport.matched} dari ${labelReport.total}`,
    );
  }, [geoData, labelReport]);

  // Debounced zoom: setState hanya bila nilai berubah.
  const handleZoom = useCallback((z: number) => {
    setZoom((prev) => (prev === z ? prev : z));
  }, []);

  // Style GeoJSON - useCallback.
  const styleFn = useCallback(
    (feature?: GeoJSON.Feature<GeoJSON.Geometry | null, { id?: string } | null>): L.PathOptions => {
      const id = feature?.properties?.id ?? "";
      const region = regionsById[id];
      const cluster: ClusterId = region ? config.getCluster(region) : "nodata";
      // fillColor tidak boleh undefined: SVG akan jatuh ke hitam/transparan.
      const fillColor = CLUSTER_STYLES[cluster]?.color ?? CLUSTER_FALLBACK_FILL;
      const { fill, fillOpacity } = fillOptions(layers);
      return {
        fill,
        fillColor,
        fillOpacity,
        color: "#ffffff",
        weight: layers.boundaries ? 1 : 0,
        opacity: 1,
        lineJoin: "round",
        interactive: true,
      };
    },
    [config, layers],
  );

  // Terapkan perubahan layer pada layer YANG ADA (setStyle) — tanpa remount,
  // tanpa fitBounds. Menangani fill, garis, dan status hover/terpilih sekaligus.
  useEffect(() => {
    const layer = baseLayerRef.current;
    if (!layer) return;
    const { fill, fillOpacity } = fillOptions(layers);
    layer.eachLayer((l) => {
      const path = l as L.Path & { feature?: { properties?: { id?: string } } };
      const id = path.feature?.properties?.id ?? "";
      const region = regionsById[id];
      const cluster: ClusterId = region ? config.getCluster(region) : "nodata";
      const fillColor = CLUSTER_STYLES[cluster]?.color ?? CLUSTER_FALLBACK_FILL;
      const isSelected = id === selectedRegion;
      const isHovered = hoveredRef.current === id;
      path.setStyle({
        fill,
        fillColor,
        fillOpacity,
        color: isSelected || isHovered ? "#0f172a" : "#ffffff",
        weight: !layers.boundaries ? 0 : isHovered ? 2.5 : isSelected ? 2 : 1,
      });
      if (isSelected) path.bringToFront();
    });
  }, [layers, config, selectedRegion, metric]);

  // Hover memakai setStyle pada layer (bukan setState React untuk style).
  const handleMouseOver = useCallback(
    (layer: L.Path, id: string, latlng: L.LatLng) => {
      const { fill, fillOpacity } = fillOptions(layers);
      layer.setStyle({
        fill,
        color: "#0f172a",
        weight: layers.boundaries ? 2.5 : 0,
        fillOpacity,
      });
      layer.bringToFront();
      hoveredRef.current = id;

      const region = regionsById[id];
      if (!region) return;
      setTooltip({
        id,
        name: displayName(id, ""),
        value: config.getDisplay(region),
        cluster: config.getCluster(region),
        rows: config.tooltipRows(region),
      });
      if (mapRef.current) {
        const pt = mapRef.current.latLngToContainerPoint(latlng);
        setTooltipPos({ x: pt.x, y: pt.y });
      }
      if (onRegionHover) onRegionHover(id);
    },
    [config, onRegionHover, layers],
  );

  const selectedRef = useRef<string | null>(selectedRegion);
  useEffect(() => {
    selectedRef.current = selectedRegion;
  }, [selectedRegion]);

  const handleMouseOut = useCallback(
    (layer: L.Path, id: string) => {
      const selected = selectedRef.current === id;
      const { fill, fillOpacity } = fillOptions(layers);
      layer.setStyle({
        fill,
        fillOpacity,
        color: selected ? "#0f172a" : "#ffffff",
        weight: !layers.boundaries ? 0 : selected ? 2 : 1,
      });
      hoveredRef.current = null;
      setTooltip(null);
      setTooltipPos(null);
      if (onRegionHover) onRegionHover(null);
    },
    [onRegionHover, layers],
  );

  // onEachFeature - useCallback.
  const onEachFeature = useCallback(
    (
      feature: GeoJSON.Feature<GeoJSON.Geometry, { id: string; name: string }>,
      layer: L.Layer,
    ) => {
      const id = feature.properties?.id ?? "";
      const path = layer as L.Path;
      path.on("mouseover", (e: L.LeafletMouseEvent) => handleMouseOver(path, id, e.latlng));
      path.on("mousemove", (e: L.LeafletMouseEvent) => {
        if (hoveredRef.current !== id || !mapRef.current) return;
        const pt = mapRef.current.latLngToContainerPoint(e.latlng);
        setTooltipPos({ x: pt.x, y: pt.y });
      });
      path.on("mouseout", () => handleMouseOut(path, id));
      path.on("click", () => {
        if (onRegionClick) onRegionClick(id);
      });
    },
    [handleMouseOut, handleMouseOver, onRegionClick],
  );

  // Tandai geoData siap HANYA setelah layer poligon benar-benar terpasang,
  // supaya fitBounds berjalan sesudahnya (bukan sebelumnya).
  useEffect(() => {
    if (!ready) return;
    const layer = baseLayerRef.current;
    if (!layer) return;
    setGeoReady(true);
  }, [ready, metric, geoData]);

  // `ready` di-set oleh <PaneLayers> setelah pane dibuat; ref layer dipasang
  // oleh callback ref <GeoJSON> di komponen anak yang sama.
  const wrapperStyle: CSSProperties = {
    position: "relative",
    isolation: "isolate",
    overflow: "hidden",
    contain: "layout paint",
    zIndex: 0,
    // Latar di sekeliling/tepi peta = latar halaman (kartu murni peta + border).
    background: "var(--color-page-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    ...(height !== undefined
      ? { height, minHeight: 360 }
      : { flex: 1, minHeight: 480, height: "100%" }),
  };

  const clusterStyle = tooltip ? CLUSTER_STYLES[tooltip.cluster] : null;

  // Posisi tooltip dibatasi agar tidak melewati kartu (ukur elemen nyata).
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tooltipBox, setTooltipBox] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const el = tooltipRef.current;
    const wrap = wrapperRef.current;
    if (!el || !wrap || !tooltipPos) {
      setTooltipBox(null);
      return;
    }
    const margin = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxLeft = Math.max(margin, wrap.clientWidth - w - margin);
    const maxTop = Math.max(margin, wrap.clientHeight - h - margin);
    const left = Math.min(Math.max(tooltipPos.x + 12, margin), maxLeft);
    const top = Math.min(Math.max(tooltipPos.y - 12, margin), maxTop);
    setTooltipBox((prev) =>
      prev && prev.left === left && prev.top === top ? prev : { left, top },
    );
  }, [tooltipPos, tooltip]);

  return (
    <div ref={wrapperRef} className="ejm-wrap" data-ejm-map style={wrapperStyle}>
      {/* Selama data belum siap: placeholder dengan tinggi SAMA, tanpa
          MapContainer (agar peta tidak pernah dirender dengan data kosong). */}
      {!geoData && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
            fontSize: 12,
            fontFamily: "var(--font-family-base)",
            color: geoError ? "var(--color-critical, #b91c1c)" : "var(--color-text-secondary)",
          }}
        >
          {geoError ?? "Memuat peta"}
        </div>
      )}

      {geoData && (
        <MapContainer
          className="ejm-map"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          center={[-7.8, 112.85]}
          zoom={7}
          minZoom={6}
          maxZoom={13}
          // maxBounds TIDAK dipasang di sini: dipasang setelah fitBounds selesai
          // (lihat <MapInitialView>) agar tidak memotong/menggeser hasil fit awal.
          maxBoundsViscosity={0.6}
          zoomAnimation
          fadeAnimation
          scrollWheelZoom
          zoomControl={false}
        >
          <MapResizer />
          <MapReset resetKey={resetKey} bounds={geoBounds ?? fallbackBounds()} />
          <MapZoomWatcher onZoom={handleZoom} />

          {/* Pane basemap & label dibuat sinkron di dalam anak ini; poligon
              dirender di overlayPane bawaan Leaflet. */}
          <PaneLayers
            paneReady={ready}
            onPanesReady={() => setReady(true)}
            onMap={(instance) => {
              mapRef.current = instance;
            }}
            layers={layers}
            geoData={geoData}
            styleFn={styleFn as unknown as L.StyleFunction}
            onEachFeature={
              onEachFeature as unknown as (
                feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>,
                layer: L.Layer,
              ) => void
            }
            labelPoints={labelPoints}
            zoom={zoom}
            geoReady={geoReady}
            onGeoReady={() => setGeoReady(true)}
            onLayerReady={(instance) => {
              baseLayerRef.current = instance;
            }}
            onTileError={handleTileError}
          />
        </MapContainer>
      )}

      {/* Kontrol zoom (hanya saat peta sudah dirender) */}
      {geoData && (
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            zIndex: 500,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
        <button
          type="button"
          aria-label="Perbesar"
          onClick={() => mapRef.current?.zoomIn()}
          className="ejm-zoom-btn"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          aria-label="Perkecil"
          onClick={() => mapRef.current?.zoomOut()}
          className="ejm-zoom-btn"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          aria-label="Reset peta"
          onClick={() =>
            mapRef.current?.fitBounds(geoBounds ?? fallbackBounds(), {
              padding: [MAP_PADDING, MAP_PADDING],
              animate: false,
            })
          }
          className="ejm-zoom-btn"
        >
          <RotateCcw size={14} />
        </button>
        </div>
      )}

      {/* Tooltip kartu (tidak menutupi hover, dibatasi di dalam kartu) */}
      {tooltip && tooltipPos && clusterStyle && (
        <div
          ref={tooltipRef}
          className="ejm-tooltip"
          style={{
            position: "absolute",
            left: tooltipBox ? tooltipBox.left : tooltipPos.x + 12,
            top: tooltipBox ? tooltipBox.top : tooltipPos.y - 12,
            zIndex: 600,
            pointerEvents: "none",
            width: "max-content",
            minWidth: 220,
            maxWidth: 300,
            background: "var(--color-white)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "10px 12px",
            overflowWrap: "break-word",
            whiteSpace: "normal",
            fontFamily: "var(--font-family-base)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "var(--color-text-primary)",
              marginBottom: 4,
            }}
          >
            {tooltip.name}
          </div>
          <div
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-text-primary)",
              marginBottom: 6,
            }}
          >
            {tooltip.value}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 99,
                background: clusterStyle.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
              {clusterStyle.label}
            </span>
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
              Skor {config.getPriorityScore(regionsById[tooltip.id])}
            </span>
          </div>
          {tooltip.rows.map(([label, value]) => (
            <div
              key={label}
              style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 11 }}
            >
              <span style={{ color: "var(--color-text-secondary)" }}>{label}</span>
              <span
                style={{
                  color: "var(--color-text-primary)",
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Petunjuk bila batas nonaktif */}
      {geoData && !layers.boundaries && (
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            zIndex: 500,
            background: "var(--color-white)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
            padding: "10px 12px",
            maxWidth: 200,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-text-secondary)",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Layers size={12} /> Batas Wilayah Nonaktif
          </div>
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>
            Aktifkan “Batas Wilayah” pada panel Layers.
          </p>
        </div>
      )}

      {/* Legenda di bawah peta (disembunyikan bila "Warna Klaster" mati) */}
      {geoData && layers.fill && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 550,
          }}
        >
          <LegendCard
            title={config.title}
            legend={config.legend}
            counts={counts}
            total={regionHealth.length}
          />
        </div>
      )}
    </div>
  );
}
