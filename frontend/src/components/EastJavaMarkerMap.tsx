import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { regionHealth } from "../data/healthData";
import eastJavaGeo from "../data/eastJavaGeo";
import { Layers, Minus, Plus, RotateCcw } from "lucide-react";
import {
  type MapMetric,
  type LayerState,
  DEFAULT_LAYERS,
  METRIC_CONFIG,
  MAP_CENTROIDS,
  MAP_BOUNDS,
} from "../data/mapConfig";

export type { MapMetric, LayerState };

// ── MapCapture: grab map instance + respond to resetKey ───────────────────────
function MapCapture({
  target, resetKey,
}: {
  target: React.MutableRefObject<L.Map | null>;
  resetKey: number;
}) {
  const map = useMap();
  useEffect(() => { target.current = map; }, [map, target]);
  useEffect(() => {
    map.fitBounds(MAP_BOUNDS, { padding: [6, 6], animate: true });
  }, [resetKey, map]);
  return null;
}

// ── RegionFocus: fly to selected region, reset to full bounds when cleared ────
function RegionFocus({ regionId }: { regionId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!regionId) return;
    const pos = MAP_CENTROIDS[regionId];
    if (pos) map.flyTo(pos as L.LatLngExpression, 11, { animate: true, duration: 0.85 });
  }, [regionId, map]);
  return null;
}

// ── Component props ───────────────────────────────────────────────────────────
export interface EastJavaMarkerMapProps {
  metric?: MapMetric;
  onRegionClick?: (id: string) => void;
  height?: number | string;
  compact?: boolean;
  layers?: LayerState;
  resetKey?: number;
  focusRegion?: string;
}

export default function EastJavaMarkerMap({
  metric = "bedRatio",
  onRegionClick,
  height = 480,
  compact = false,
  layers = DEFAULT_LAYERS,
  resetKey = 0,
  focusRegion,
}: EastJavaMarkerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const numH = typeof height === "number" ? height : 480;

  const cfg = METRIC_CONFIG[metric];

  type RegionRow = typeof regionHealth[number];

  const byId = useMemo(() => {
    const m: Record<string, RegionRow> = {};
    for (const r of regionHealth) m[r.id] = r;
    return m;
  }, []);

  const geoData = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: eastJavaGeo.features,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }), []) as any;

  const hoveredRegion = hoveredId ? byId[hoveredId] : null;

  const btnStyle: React.CSSProperties = {
    width: 36, height: 36,
    background: "white",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--color-navy)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    fontFamily: "var(--font-family-base)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 0 }}>

      {/* ── Map area ── */}
      <div style={{ position: "relative", height: numH, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>

        <MapContainer
          bounds={MAP_BOUNDS}
          boundsOptions={{ padding: [6, 6] }}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={18}
          />

          {/* ── Administrative boundary outlines ── */}
          {layers.boundaries && (
            <GeoJSON
              key="boundaries"
              data={geoData}
              style={() => ({
                fillOpacity: 0,
                color: "rgba(30,60,100,0.35)",
                weight: 1.2,
                opacity: 1,
              })}
              interactive={false}
            />
          )}

          {/* ── Heatmap fill layer (semi-transparent polygon fill per metric) ── */}
          {layers.heatmap && (
            <GeoJSON
              key={`heatmap-${metric}`}
              data={geoData}
              style={(feature: any) => {
                const r = byId[feature?.properties?.id];
                return {
                  fillColor:   r ? cfg.getHeatColor(r) : "#ccc",
                  fillOpacity: 0.38,
                  color:       "transparent",
                  weight:      0,
                };
              }}
              interactive={false}
            />
          )}

          {/* ── Circle markers (Titik Fasilitas) ── */}
          {layers.markers && regionHealth.map((region) => {
            const pos = MAP_CENTROIDS[region.id];
            if (!pos) return null;
            const fill    = cfg.getColor(region);
            const isHov   = hoveredId === region.id;
            const isFocus = focusRegion === region.id;
            const isDimmed = focusRegion !== undefined && !isFocus;
            return (
              <CircleMarker
                key={`${metric}-${region.id}`}
                center={pos}
                radius={isFocus ? 16 : isHov && !isDimmed ? 13 : 10}
                pathOptions={{
                  fillColor:   fill,
                  fillOpacity: isDimmed ? 0.15 : isFocus ? 1 : 0.95,
                  color:       isFocus ? "#123B5D" : isDimmed ? "rgba(180,180,180,0.4)" : "white",
                  weight:      isFocus ? 3 : 1,
                  opacity:     isDimmed ? 0.3 : 1,
                }}
                eventHandlers={{
                  mouseover: (e: any) => {
                    setHoveredId(region.id);
                    setTooltipPos({ x: e.containerPoint.x, y: e.containerPoint.y });
                  },
                  mousemove: (e: any) => {
                    setTooltipPos({ x: e.containerPoint.x, y: e.containerPoint.y });
                  },
                  mouseout: () => {
                    setHoveredId(null);
                    setTooltipPos(null);
                  },
                  click: () => onRegionClick?.(region.id),
                }}
              />
            );
          })}

          {/* ── Label markers (Nama Daerah) ── */}
          {layers.labels && regionHealth.map((region) => {
            const pos = MAP_CENTROIDS[region.id];
            if (!pos) return null;
            const icon = L.divIcon({
              html: `<span style="font-family:sans-serif;font-size:10px;font-weight:700;color:#163247;text-shadow:0 1px 2px #fff,0 -1px 2px #fff,1px 0 2px #fff,-1px 0 2px #fff;white-space:nowrap;pointer-events:none;">${region.name}</span>`,
              className: "",
              iconSize: [0, 0],
              iconAnchor: [0, -14],
            });
            return (
              <Marker
                key={`label-${region.id}`}
                position={pos}
                icon={icon}
                interactive={false}
                zIndexOffset={-100}
              />
            );
          })}

          <MapCapture target={mapRef} resetKey={resetKey} />
          <RegionFocus regionId={focusRegion ?? null} />
        </MapContainer>

        {/* ── Zoom controls — top left ── */}
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, display: "flex", flexDirection: "column", gap: 4 }}>
          <button style={btnStyle} onClick={() => mapRef.current?.zoomIn()} title="Zoom in">
            <Plus size={15} />
          </button>
          <button style={btnStyle} onClick={() => mapRef.current?.zoomOut()} title="Zoom out">
            <Minus size={15} />
          </button>
          <button style={{ ...btnStyle, marginTop: 2 }} onClick={() => mapRef.current?.fitBounds(MAP_BOUNDS, { padding: [6, 6] })} title="Reset view">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* ── Layers button — top right (only when compact/no external layers panel) ── */}
        {compact && (
          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
            <button
              onClick={() => setLayerPanelOpen((v) => !v)}
              style={{
                ...btnStyle,
                width: "auto", padding: "0 12px",
                gap: 6, fontSize: "var(--font-size-body-sm)",
                fontWeight: 600,
              }}
            >
              <Layers size={15} /> Layers
            </button>
            {layerPanelOpen && (
              <div style={{
                position: "absolute", top: 42, right: 0,
                background: "white", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                padding: "12px 14px", width: 190, zIndex: 1000,
                fontSize: "var(--font-size-caption)",
                fontFamily: "var(--font-family-base)",
                color: "var(--color-text-primary)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  Lapisan Peta
                </div>
                <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>
                  Gunakan filter Layers di panel atas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Hover tooltip ── */}
        {tooltipPos && hoveredRegion && (() => {
          const status   = cfg.getStatusLabel(hoveredRegion);
          const rows     = cfg.tooltipRows(hoveredRegion);
          const flipLeft = tooltipPos.x > 320;
          return (
            <div style={{
              position: "absolute",
              left: flipLeft ? tooltipPos.x - 210 : tooltipPos.x + 16,
              top:  Math.max(6, tooltipPos.y - 130),
              background: "var(--color-navy)",
              color: "white",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-caption)",
              fontFamily: "var(--font-family-base)",
              pointerEvents: "none",
              zIndex: 1100,
              width: 200,
              boxShadow: "0 4px 20px rgba(0,0,0,0.30)",
              lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, fontSize: "var(--font-size-body-sm)", marginBottom: 9 }}>
                {hoveredRegion.name}
              </div>
              {rows.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ opacity: 0.65 }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.14)",
              }}>
                <span style={{ opacity: 0.65 }}>Status</span>
                <span style={{
                  background: status.color, color: "white",
                  padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                }}>
                  {status.label}
                </span>
              </div>
            </div>
          );
        })()}

        {/* ── Attribution ── */}
        <div style={{
          position: "absolute", bottom: 3, right: 8, zIndex: 900,
          fontSize: 10, color: "rgba(0,0,0,0.38)",
          fontFamily: "var(--font-family-base)",
        }}>
          © OpenStreetMap contributors
        </div>
      </div>

      {/* ── Legend strip — below map, metric-driven ── */}
      {!compact && (
        <div style={{
          display: "flex", alignItems: "center", flexWrap: "wrap",
          gap: "var(--spacing-xl)", paddingTop: "var(--spacing-md)",
        }}>
          <span style={{
            fontSize: "var(--font-size-caption)", fontWeight: 600,
            color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)",
            whiteSpace: "nowrap",
          }}>
            {cfg.title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xl)", flexWrap: "wrap" }}>
            {cfg.legend.map(({ label, sublabel, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: color,
                  border: "2px solid white",
                  boxShadow: `0 0 0 1px ${color}`,
                  flexShrink: 0,
                }} />
                <div style={{ fontFamily: "var(--font-family-base)" }}>
                  <span style={{ fontSize: "var(--font-size-caption)", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginLeft: 5 }}>
                    {sublabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
