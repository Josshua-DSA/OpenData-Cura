import React, { useState, useCallback, useMemo, useRef } from "react";
import eastJavaGeo from "../data/eastJavaGeo";
import { regionHealth } from "../data/healthData";

export type MapMetric = "bedRatio" | "stuntingRate" | "facilityCount";

interface ChoroplethMapProps {
  metric: MapMetric;
  selectedRegion?: string | null;
  onRegionClick?: (regionId: string) => void;
  onRegionHover?: (regionId: string | null) => void;
  height?: number | string;
  compact?: boolean;
}

interface TooltipState {
  x: number;
  y: number;
  regionId: string;
}

// ── Bed-ratio categorical colour scheme ───────────────────────────────────────
function getBedRatioFill(ratio: number): string {
  if (ratio >= 1.2) return "#1677C8";   // Adequate
  if (ratio >= 1.0) return "#8EC5E8";   // Stable
  if (ratio >= 0.75) return "#E5A33B";  // Watch
  return "#D94A4A";                      // Critical
}

function getBedRatioStatus(ratio: number): { label: string; color: string } {
  if (ratio >= 1.2) return { label: "Adequate", color: "#1677C8" };
  if (ratio >= 1.0) return { label: "Stable", color: "#1677C8" };
  if (ratio >= 0.75) return { label: "Watch", color: "#E5A33B" };
  return { label: "Critical", color: "#D94A4A" };
}

// ── Continuous gradient helpers (for non-bedRatio metrics) ───────────────────
function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => {
    const s = h.replace("#", "");
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  const ca = parse(a), cb = parse(b);
  return `rgb(${Math.round(ca[0] + (cb[0] - ca[0]) * t)},${Math.round(ca[1] + (cb[1] - ca[1]) * t)},${Math.round(ca[2] + (cb[2] - ca[2]) * t)})`;
}

const METRIC_CFG = {
  bedRatio:      { min: 0.42, max: 2.45, a: "#FEE2E2", b: "#1677C8", label: "Bed Ratio",       fmt: (v: number) => v.toFixed(2), unit: "/1k pop" },
  stuntingRate:  { min: 9.8,  max: 31.2, a: "#FEF0F0", b: "#991B1B", label: "Stunting Rate",   fmt: (v: number) => `${v.toFixed(1)}%`, unit: "" },
  facilityCount: { min: 18,   max: 125,  a: "#F0FDF4", b: "#14532D", label: "Facilities",      fmt: (v: number) => String(Math.round(v)), unit: "" },
};

// ── Major city label config ───────────────────────────────────────────────────
const LABEL_IDS = new Set([
  "surabaya", "malang-kota", "jember", "banyuwangi",
  "bangkalan", "sampang", "pamekasan", "sumenep", "sidoarjo",
  "gresik", "kediri-kota", "madiun-kota", "probolinggo-kota",
  "pasuruan-kota", "tuban", "bojonegoro",
]);

// ── Mercator projection ───────────────────────────────────────────────────────
const BASE_SCALE = 12000;
const CENTER_LON = 112.71;
const CENTER_LAT_RAD = (-7.83 * Math.PI) / 180;

function projectPoint(lon: number, lat: number): [number, number] {
  const latRad = (lat * Math.PI) / 180;
  const x = (lon - CENTER_LON) * (BASE_SCALE / 360) * (2 * Math.PI);
  const y = -(
    Math.log(Math.tan(Math.PI / 4 + latRad / 2)) -
    Math.log(Math.tan(Math.PI / 4 + CENTER_LAT_RAD / 2))
  ) * (BASE_SCALE / (2 * Math.PI));
  return [x, y];
}

function coordsToPoints(ring: number[][]): string {
  return ring.map(([lon, lat]) => projectPoint(lon, lat).join(",")).join(" ");
}

function centroidOf(ring: number[][]): [number, number] {
  let sx = 0, sy = 0;
  for (const [lon, lat] of ring) { const [px, py] = projectPoint(lon, lat); sx += px; sy += py; }
  return [sx / ring.length, sy / ring.length];
}

// ── Compute viewBox from all feature coordinates ──────────────────────────────
function computeViewBox(): { vb: string; cx: number; cy: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of eastJavaGeo.features) {
    const geom = f.geometry;
    const rings = geom.type === "Polygon"
      ? (geom.coordinates as number[][][])
      : (geom.coordinates as number[][][][]).flat();
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        const [px, py] = projectPoint(lon, lat);
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
  }
  const pad = (maxX - minX) * 0.04;
  const w = maxX - minX + 2 * pad;
  const h = maxY - minY + 2 * pad;
  return {
    vb: `${minX - pad} ${minY - pad} ${w} ${h}`,
    cx: minX - pad + w / 2,
    cy: minY - pad + h / 2,
  };
}

const { vb: BASE_VB } = computeViewBox();

// ── Main component ────────────────────────────────────────────────────────────
export default function ChoroplethMap({
  metric,
  selectedRegion,
  onRegionClick,
  onRegionHover,
  height = 520,
  compact = false,
}: ChoroplethMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const cfg = METRIC_CFG[metric];

  // Build health lookup
  const healthById = useMemo(() => {
    const m: Record<string, typeof regionHealth[number]> = {};
    for (const r of regionHealth) m[r.id] = r;
    return m;
  }, []);

  function getFill(id: string, hovered: boolean): string {
    const r = healthById[id];
    if (!r) return "#E3EAF0";
    if (metric === "bedRatio") {
      const base = getBedRatioFill(r.bedRatio);
      return hovered ? lerpColor(base, "#ffffff", 0.18) : base;
    }
    const val = r[metric as keyof typeof r] as number;
    const t = Math.max(0, Math.min(1, (val - cfg.min) / (cfg.max - cfg.min)));
    const base = lerpColor(cfg.a, cfg.b, t);
    return hovered ? lerpColor(cfg.a, cfg.b, Math.max(0, t - 0.12)) : base;
  }

  const handleMouseEnter = useCallback((id: string) => {
    setHoveredId(id);
    onRegionHover?.(id);
  }, [onRegionHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
    onRegionHover?.(null);
  }, [onRegionHover]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, regionId: hoveredId ?? "" });
  }, [hoveredId]);

  // Render features
  const features = eastJavaGeo.features;

  // SVG transform for zoom/pan
  const transform = `translate(${panX},${panY}) scale(${zoom})`;

  // Actual SVG height (number)
  const svgH = typeof height === "number" ? height : 520;
  const legendH = compact ? 36 : 56;
  const mapH = svgH - legendH;

  return (
    <div style={{ position: "relative", width: "100%", height: svgH, display: "flex", flexDirection: "column" }}>

      {/* ── SVG Map ── */}
      <div style={{ position: "relative", flex: 1, overflow: "hidden", borderRadius: "var(--radius-md)", background: "#E8F4FA" }}>
        <svg
          ref={svgRef}
          viewBox={BASE_VB}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          style={{ display: "block" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <g transform={transform}>
            {/* ── Polygons ── */}
            {features.map((feature) => {
              const id = feature.properties.id;
              const name = feature.properties.name;
              const isHovered = hoveredId === id;
              const isSelected = selectedRegion === id;
              const fill = getFill(id, isHovered);
              const stroke = isSelected ? "#163247" : "#FFFFFF";
              const strokeW = isSelected ? 1.5 : 0.8;
              const geom = feature.geometry;

              const rings = geom.type === "Polygon"
                ? (geom.coordinates as number[][][])
                : (geom.coordinates as number[][][][]).flat();

              return (
                <g key={id}>
                  {rings.map((ring, ri) => (
                    <polygon
                      key={`${id}-${ri}`}
                      points={coordsToPoints(ring)}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeW / zoom}
                      strokeLinejoin="round"
                      style={{ cursor: "pointer", transition: "fill 0.12s" }}
                      onMouseEnter={() => handleMouseEnter(id)}
                      onClick={() => onRegionClick?.(id)}
                    />
                  ))}

                  {/* ── City label ── */}
                  {LABEL_IDS.has(id) && !compact && (() => {
                    const firstRing = geom.type === "Polygon"
                      ? (geom.coordinates as number[][][])[0]
                      : (geom.coordinates as number[][][][])[0][0];
                    const [cx, cy] = centroidOf(firstRing);
                    const shortName = name
                      .replace("Kab. ", "").replace("Kota ", "")
                      .replace("Kabupaten ", "").replace("Kota ", "");
                    return (
                      <text
                        key={`lbl-${id}`}
                        x={cx} y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={4.5 / zoom}
                        fontFamily="var(--font-family-base)"
                        fontWeight={600}
                        fill="#163247"
                        stroke="white"
                        strokeWidth={0.8 / zoom}
                        paintOrder="stroke"
                        pointerEvents="none"
                        style={{ userSelect: "none" }}
                      >
                        {shortName}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Zoom controls ── */}
        <div style={{
          position: "absolute", top: 12, right: 12,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          {[
            { icon: "+", action: () => setZoom(z => Math.min(z * 1.4, 6)) },
            { icon: "−", action: () => setZoom(z => Math.max(z / 1.4, 1)) },
            { icon: "↺", action: () => { setZoom(1); setPanX(0); setPanY(0); } },
          ].map(({ icon, action }) => (
            <button
              key={icon}
              onClick={action}
              style={{
                width: 32, height: 32,
                background: "white",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-family-base)",
                color: "var(--color-navy)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* ── Tooltip ── */}
        {tooltip && tooltip.regionId && (() => {
          const r = healthById[tooltip.regionId];
          if (!r) return null;
          const status = getBedRatioStatus(r.bedRatio);
          const hospitals = Math.round(r.facilityCount * 0.28);
          const puskesmas = r.facilityCount - hospitals;
          const isRight = tooltip.x > 300;
          return (
            <div style={{
              position: "absolute",
              left: isRight ? tooltip.x - 190 : tooltip.x + 12,
              top: Math.max(8, tooltip.y - 100),
              background: "var(--color-navy)",
              color: "white",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-caption)",
              fontFamily: "var(--font-family-base)",
              pointerEvents: "none",
              zIndex: 50,
              width: 180,
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}>
              <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-body-sm)", marginBottom: 8 }}>
                {r.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.75 }}>Bed Ratio</span>
                  <span style={{ fontWeight: 600 }}>{r.bedRatio.toFixed(2)}/1k</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.75 }}>WHO Benchmark</span>
                  <span>1.00/1k</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ opacity: 0.75 }}>Status</span>
                  <span style={{
                    background: status.label === "Critical" ? "#D94A4A" : status.label === "Watch" ? "#E5A33B" : "#2F9E72",
                    color: "white", padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                  }}>
                    {status.label.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.75 }}>Rumah Sakit</span>
                  <span>{hospitals}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.75 }}>Puskesmas</span>
                  <span>{puskesmas}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Legend ── */}
      <div style={{
        padding: compact ? "6px 4px" : "10px 4px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        {metric === "bedRatio" ? (
          // Categorical legend
          <>
            {[
              { label: "Adequate ≥1.20", color: "#1677C8" },
              { label: "Stable 1.00–1.19", color: "#8EC5E8" },
              { label: "Watch 0.75–0.99", color: "#E5A33B" },
              { label: "Critical <0.75", color: "#D94A4A" },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)", whiteSpace: "nowrap" }}>
                  {label}
                </span>
              </div>
            ))}
          </>
        ) : (
          // Gradient legend
          <>
            <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
              {cfg.fmt(cfg.min)}
            </span>
            <div style={{
              flex: 1, height: 8, borderRadius: 4, minWidth: 80, maxWidth: 180,
              background: `linear-gradient(to right, ${cfg.a}, ${cfg.b})`,
              border: "1px solid var(--border-color)",
            }} />
            <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
              {cfg.fmt(cfg.max)}
            </span>
            <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
              — {cfg.label}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
