import { useEffect, useRef, useState } from "react";
import { Layers, RotateCcw, X } from "lucide-react";
import EastJavaMarkerMap from "../components/EastJavaMarkerMap";
import {
  type MapMetric,
  type LayerState,
  DEFAULT_LAYERS,
  METRIC_CONFIG,
  CLUSTER_STYLES,
} from "../data/mapConfig";
import TopBar from "../components/TopBar";
import { regionHealth } from "../data/healthData";
import { formatDecimal, formatNumber, formatPercent } from "../lib/formatNumber";

interface HealthMapPageProps {
  onAIPanel?: () => void;
  year?: string;
}

const LAYER_DEFS: { key: keyof LayerState; label: string; desc: string }[] = [
  { key: "fill",       label: "Warna Klaster",      desc: "Warna isi wilayah berdasarkan metrik" },
  { key: "boundaries", label: "Batas Wilayah",      desc: "Garis batas antar kabupaten/kota" },
  { key: "labels",     label: "Label Nama Daerah",  desc: "Teks nama wilayah di peta" },
];

const DEFAULT_LAYER_CHECKED: Record<keyof LayerState, boolean> = {
  fill:       true,
  boundaries: true,
  labels:     true,
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

  // Esc menutup panel detail wilayah.
  useEffect(() => {
    if (selectedRegion === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedRegion(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedRegion]);

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
      <TopBar title="Health Map Jawa Timur" onAIPanel={onAIPanel} />

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
          style={{ padding: "var(--spacing-lg)", display: "flex", flexDirection: "column", minHeight: 0 }}
          onClick={() => setLayerPanelOpen(false)}
        >
          <EastJavaMarkerMap
            metric={metric}
            layers={layers}
            resetKey={resetKey}
            focusRegion={kabupatenFilter !== "Semua Wilayah" ? kabupatenFilter : undefined}
            selectedRegion={selectedRegion}
            onRegionClick={(id) => setSelectedRegion((prev) => (prev === id ? null : id))}
            onMapBackgroundClick={() => setSelectedRegion(null)}
            panelOpen={selectedRegion !== null}
          />
        </div>

        {/* Panel detail wilayah: kolom samping tetap (laci di bawah peta < 1100px) */}
        {selectedData && (() => {
          const cfg       = METRIC_CONFIG[metric];
          const clusterId = cfg.getCluster(selectedData);
          const cluster   = CLUSTER_STYLES[clusterId];
          const hospitals = Math.round(selectedData.facilityCount * 0.28);
          const puskesmas = selectedData.facilityCount - hospitals;

          const main = {
            bedRatio:     { label: "Rasio tempat tidur", value: formatDecimal(selectedData.bedRatio, 2), unit: "per 1.000 penduduk" },
            stuntingRate: { label: "Prevalensi stunting", value: formatPercent(selectedData.stuntingRate, 1), unit: "dari balita" },
            disease:      { label: "Total kasus penyakit", value: formatNumber(selectedData.dbd + selectedData.tb + selectedData.pneumonia), unit: "kasus" },
          }[metric];

          // Peringkat dihitung dari data yang ada: urut nilai metrik aktif
          // dari terendah, lalu cari posisi wilayah terpilih.
          const sorted = [...regionHealth].sort((a, b) => cfg.getValue(a) - cfg.getValue(b));
          const rank = sorted.findIndex((r) => r.id === selectedData.id) + 1;
          const total = regionHealth.length;

          const rows: [string, string][] = [
            ["Rasio tempat tidur", `${formatDecimal(selectedData.bedRatio, 2)} per 1.000 penduduk`],
            ["Prevalensi stunting", formatPercent(selectedData.stuntingRate, 1)],
            ["Jumlah penduduk",    formatNumber(selectedData.population)],
            ["Total fasilitas",    formatNumber(selectedData.facilityCount)],
            ["Rumah sakit",        formatNumber(hospitals)],
            ["Puskesmas",          formatNumber(puskesmas)],
          ];

          return (
            <aside className="cura-region-panel" role="dialog" aria-label={`Detail ${selectedData.name}`}>
              <div className="cura-region-panel-header">
                <div style={{ minWidth: 0 }}>
                  <div className="cura-region-kicker">
                    {selectedData.type === "kota" ? "KOTA" : "KABUPATEN"}
                  </div>
                  <div className="cura-region-title">{selectedData.name}</div>
                </div>
                <button
                  type="button"
                  className="cura-region-close"
                  onClick={() => setSelectedRegion(null)}
                  aria-label="Tutup panel detail wilayah"
                  title="Tutup (Esc)"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="cura-region-panel-body">
                {/* Kartu nilai utama: label + badge, lalu angka besar + satuan */}
                <div className="cura-metric-card" style={{ background: cluster.color + "14" }}>
                  <div className="cura-metric-card-head">
                    <span className="cura-metric-label">{main.label}</span>
                    <span className="cura-metric-badge" style={{ background: cluster.color }}>
                      {cluster.label}
                    </span>
                  </div>
                  <div className="cura-metric-value-row">
                    <span className="cura-metric-value">{main.value}</span>
                    <span className="cura-metric-unit">{main.unit}</span>
                  </div>
                </div>

                {/* Ringkasan wilayah: satu bagian tanpa baris ganda */}
                <div>
                  <div className="cura-region-section-label">Ringkasan Wilayah</div>
                  <div className="cura-region-rows">
                    {rows.map(([label, value]) => (
                      <div key={label} className="cura-region-row">
                        <span className="cura-region-row-label">{label}</span>
                        <span className="cura-region-row-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="cura-region-rank">
                  Peringkat {formatNumber(rank)} dari {formatNumber(total)} untuk metrik {main.label.toLowerCase()}.
                </p>
              </div>

              <div className="cura-region-panel-footer">
                <button className="cura-btn cura-btn-primary" type="button">
                  Lihat Profil Lengkap
                </button>
                <button className="cura-btn cura-btn-secondary" type="button">
                  Bandingkan Wilayah
                </button>
              </div>
            </aside>
          );
        })()}
      </div>
      </div>
    </div>
  );
}
