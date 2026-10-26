import { useEffect, useRef, useState } from "react";
import { Layers, RotateCcw, X } from "lucide-react";
import EastJavaMarkerMap from "../components/EastJavaMarkerMap";
import {
  type MapMetric,
  type LayerState,
  DEFAULT_LAYERS,
  METRIC_CONFIG,
} from "../data/mapConfig";
import TopBar from "../components/TopBar";
import { regionHealth } from "../data/healthData";

interface HealthMapPageProps {
  onAIPanel?: () => void;
  year?: string;
}

// Re-derive status for the drawer from the same config
function drawerStatus(metric: MapMetric, r: typeof regionHealth[number]) {
  const cfg = METRIC_CONFIG[metric];
  return cfg.getStatusLabel(r);
}

const LAYER_DEFS: { key: keyof LayerState; label: string; desc: string }[] = [
  { key: "boundaries", label: "Batas Wilayah Kabupaten/Kota", desc: "Garis batas administratif" },
  { key: "markers",    label: "Titik Fasilitas Kesehatan",    desc: "Marker per kabupaten/kota" },
  { key: "heatmap",    label: "Heatmap Kepadatan Kasus",      desc: "Warna fill berdasarkan metrik" },
  { key: "labels",     label: "Label Nama Daerah",            desc: "Teks nama wilayah di peta" },
];

const DEFAULT_LAYER_CHECKED: Record<keyof LayerState, boolean> = {
  boundaries: true,
  markers:    true,
  heatmap:    false,
  labels:     false,
};

export default function HealthMapPage({ onAIPanel }: HealthMapPageProps) {
  const [metric, setMetric]             = useState<MapMetric>("bedRatio");
  const [layers, setLayers]             = useState<LayerState>(DEFAULT_LAYERS);
  const [resetKey, setResetKey]         = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [kabupatenFilter, setKabupatenFilter] = useState("Semua Wilayah");
  const [year, setYear]                 = useState("2024");
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const layerBtnRef = useRef<HTMLButtonElement>(null);

  // Close layer panel on outside click
  useEffect(() => {
    if (!layerPanelOpen) return;
    function handler(e: MouseEvent) {
      if (layerBtnRef.current && !layerBtnRef.current.closest("[data-layers-root]")?.contains(e.target as Node)) {
        setLayerPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [layerPanelOpen]);

  const toggleLayer = (key: keyof LayerState) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleReset = () => {
    setMetric("bedRatio");
    setKabupatenFilter("Semua Wilayah");
    setYear("2024");
    setSelectedRegion(null);
    setLayers(DEFAULT_LAYERS);
    setResetKey((k) => k + 1); // triggers fitBounds inside map
  };

  const selectedData = selectedRegion
    ? regionHealth.find((r) => r.id === selectedRegion) ?? null
    : null;

  const activeLayerCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="cura-map-page">
      <TopBar title="Health Map — Jawa Timur" onAIPanel={onAIPanel} />

      <div className="cura-map-scroll">
      {/* ── Filter bar ── */}
      <div className="cura-filter-bar">
        {/* Metric selector */}
        <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", fontSize: "var(--font-size-body-sm)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
          Metrik:
          <select
            className="cura-select"
            value={metric}
            onChange={(e) => {
              setMetric(e.target.value as MapMetric);
              setSelectedRegion(null);
            }}
          >
            <option value="bedRatio">Rasio Tempat Tidur</option>
            <option value="stuntingRate">Prevalensi Stunting</option>
            <option value="disease">Kasus Penyakit Menular</option>
          </select>
        </label>

        {/* Region selector */}
        <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", fontSize: "var(--font-size-body-sm)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
          Wilayah:
          <select
            className="cura-select"
            value={kabupatenFilter}
            onChange={(e) => setKabupatenFilter(e.target.value)}
          >
            <option value="Semua Wilayah">Semua Wilayah</option>
            {regionHealth.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>

        {/* Period selector */}
        <label style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", fontSize: "var(--font-size-body-sm)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
          Periode:
          <select
            className="cura-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {["2024", "2023", "2022", "2021"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>

        {/* ── Layers popover ── */}
        <div data-layers-root style={{ position: "relative" }}>
          <button
            ref={layerBtnRef}
            className="cura-btn cura-btn-secondary"
            onClick={() => setLayerPanelOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: layerPanelOpen ? "var(--color-light-blue)" : undefined,
              borderColor: layerPanelOpen ? "var(--color-medical-blue)" : undefined,
              color: layerPanelOpen ? "var(--color-medical-blue)" : undefined,
            }}
          >
            <Layers size={15} />
            Layers
            {activeLayerCount > 0 && (
              <span style={{
                background: "var(--color-medical-blue)", color: "white",
                borderRadius: 99, fontSize: 10, fontWeight: 700,
                padding: "0 5px", minWidth: 16, textAlign: "center",
                lineHeight: "16px", height: 16, display: "inline-flex", alignItems: "center",
              }}>
                {activeLayerCount}
              </span>
            )}
          </button>

          {layerPanelOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0,
              background: "var(--color-white)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "var(--spacing-lg)",
              width: 260,
              zIndex: 500,
            }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.09em", color: "var(--color-text-secondary)",
                marginBottom: "var(--spacing-md)", fontFamily: "var(--font-family-base)",
              }}>
                Lapisan Peta
              </div>

              {LAYER_DEFS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--color-border)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={() => toggleLayer(key)}
                    style={{ accentColor: "var(--color-medical-blue)", marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{
                      fontSize: "var(--font-size-body-sm)", fontWeight: 600,
                      color: layers[key] ? "var(--color-navy)" : "var(--color-text-secondary)",
                      fontFamily: "var(--font-family-base)",
                    }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-family-base)", marginTop: 1,
                    }}>
                      {desc}
                    </div>
                  </div>
                </label>
              ))}

              <button
                style={{
                  marginTop: "var(--spacing-md)", width: "100%",
                  fontSize: "var(--font-size-caption)", fontWeight: 600,
                  color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)",
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", padding: 0,
                }}
                onClick={() => setLayers(DEFAULT_LAYERS)}
              >
                Reset layers ke default
              </button>
            </div>
          )}
        </div>

        {/* Reset everything */}
        <button
          className="cura-btn cura-btn-secondary"
          onClick={handleReset}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* ── Map + optional detail drawer ── */}
      <div className="cura-map-content">

        {/* Map canvas */}
        <div
          className="cura-map-canvas"
          style={{ flex: 1, padding: "var(--spacing-lg)", display: "flex", flexDirection: "column", minHeight: 0 }}
          onClick={() => setLayerPanelOpen(false)}
        >
          <EastJavaMarkerMap
            metric={metric}
            layers={layers}
            resetKey={resetKey}
            focusRegion={kabupatenFilter !== "Semua Wilayah" ? kabupatenFilter : undefined}
            onRegionClick={(id) => setSelectedRegion((prev) => (prev === id ? null : id))}
            height={520}
          />
        </div>

        {/* ── Region detail drawer ── */}
        {selectedData && (() => {
          const status    = drawerStatus(metric, selectedData);
          const hospitals = Math.round(selectedData.facilityCount * 0.28);
          const puskesmas = selectedData.facilityCount - hospitals;
          const cfg       = METRIC_CONFIG[metric];
          const rows      = cfg.tooltipRows(selectedData);

          return (
            <>
              <div
                className="cura-drawer-overlay"
                onClick={() => setSelectedRegion(null)}
                style={{ display: "none" }}
              />
              <aside style={{
                width: 320,
                background: "var(--color-white)",
                borderLeft: "1px solid var(--color-border)",
                display: "flex", flexDirection: "column",
                flexShrink: 0, overflowY: "auto",
              }}>
                <div className="cura-drawer-header">
                  <div>
                    <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2, fontFamily: "var(--font-family-base)" }}>
                      {selectedData.type === "kota" ? "Kota" : "Kabupaten"}
                    </div>
                    <div style={{ fontSize: "var(--font-size-heading-sm)", fontWeight: 700, color: "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>
                      {selectedData.name}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="cura-drawer-body" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>

                  {/* Status banner — color matches current metric */}
                  <div style={{ background: status.color + "18", borderRadius: "var(--radius-md)", padding: "var(--spacing-md) var(--spacing-lg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)", marginBottom: 2 }}>
                        {cfg.title}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "var(--font-size-kpi)", color: status.color, fontFamily: "var(--font-family-base)" }}>
                        {rows[0]?.[1] ?? "—"}
                      </div>
                    </div>
                    <span style={{ background: status.color, color: "white", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Metric detail rows */}
                  <div>
                    <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-family-base)" }}>
                      Detail Metrik
                    </div>
                    {rows.map(([label, value]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: "var(--font-size-body-sm)" }}>
                        <span style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Static health indicators */}
                  <div>
                    <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-family-base)" }}>
                      Indikator Kesehatan
                    </div>
                    {[
                      { label: "Bed Ratio",     value: `${selectedData.bedRatio.toFixed(2)} / 1.000` },
                      { label: "Stunting",       value: `${selectedData.stuntingRate.toFixed(1)}%` },
                      { label: "Rumah Sakit",    value: String(hospitals) },
                      { label: "Puskesmas",      value: String(puskesmas) },
                      { label: "Populasi",       value: selectedData.population.toLocaleString("id-ID") },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: "var(--font-size-body-sm)" }}>
                        <span style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
                    <button className="cura-btn cura-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                      Lihat Profil Lengkap
                    </button>
                    <button className="cura-btn cura-btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                      Bandingkan Wilayah
                    </button>
                  </div>
                </div>
              </aside>
            </>
          );
        })()}
      </div>
      </div>
    </div>
  );
}
