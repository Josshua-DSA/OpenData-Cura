import { useMemo, useState } from "react";
import { Layers, RotateCcw, X, Search, MapPinned, SlidersHorizontal } from "lucide-react";
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

export default function HealthMapPage({ onAIPanel }: HealthMapPageProps) {
  const [metric, setMetric]             = useState<MapMetric>("bedRatio");
  const [layers, setLayers]             = useState<LayerState>(DEFAULT_LAYERS);
  const [resetKey, setResetKey]         = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [kabupatenFilter, setKabupatenFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [regionSearch, setRegionSearch] = useState("");
  const [regionSort, setRegionSort] = useState<"priority" | "bedRatio" | "name">("priority");
  const [year, setYear]                 = useState("2024");
  const metricConfig = METRIC_CONFIG[metric];
  const filteredRegions = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return regionHealth
      .filter((region) => region.name.toLocaleLowerCase("id").includes(regionSearch.toLocaleLowerCase("id")))
      .sort((a, b) => {
        if (regionSort === "name") return a.name.localeCompare(b.name, "id");
        if (regionSort === "bedRatio") return a.bedRatio - b.bedRatio;
        return priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel] || a.bedRatio - b.bedRatio;
      });
  }, [regionSearch, regionSort]);

  const toggleLayer = (key: keyof LayerState) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleReset = () => {
    setMetric("bedRatio");
    setKabupatenFilter("all");
    setPriorityFilter("all");
    setRegionSearch("");
    setRegionSort("priority");
    setYear("2024");
    setSelectedRegion(null);
    setLayers(DEFAULT_LAYERS);
    setResetKey((k) => k + 1); // triggers fitBounds inside map
  };

  const periodFactor = ({
    "2024": { bed: 1, stunting: 1, disease: 1 },
    "2023": { bed: 0.93, stunting: 1.07, disease: 1.05 },
    "2022": { bed: 0.86, stunting: 1.15, disease: 1.12 },
    "2021": { bed: 0.8, stunting: 1.24, disease: 1.2 },
  } as const)[year as "2021" | "2022" | "2023" | "2024"];
  const selectedBase = selectedRegion ? regionHealth.find((region) => region.id === selectedRegion) ?? null : null;
  const selectedData = selectedBase && periodFactor ? {
    ...selectedBase,
    bedRatio: selectedBase.bedRatio * periodFactor.bed,
    stuntingRate: selectedBase.stuntingRate * periodFactor.stunting,
    dbd: Math.round(selectedBase.dbd * periodFactor.disease),
    tb: Math.round(selectedBase.tb * periodFactor.disease),
    pneumonia: Math.round(selectedBase.pneumonia * periodFactor.disease),
  } : null;

  const activeFilterCount = Number(metric !== "bedRatio") + Number(year !== "2024") + Number(kabupatenFilter !== "all") + Number(priorityFilter !== "all");

  return (
    <div className="cura-map-page">
      <TopBar title="Health Map — Jawa Timur" onAIPanel={onAIPanel} />

      <div className="cura-map-scroll">
        <div className="cura-map-workspace">
          <aside className="map-filter-panel" aria-label="Filter peta kesehatan">
            <div className="map-filter-heading"><div className="map-filter-heading-icon"><SlidersHorizontal size={17} /></div><div><h2>Filters</h2><p>Atur data yang ditampilkan di peta</p></div><span className="map-filter-count">{activeFilterCount}</span></div>
            <div className="map-filter-section"><div className="map-filter-section-title">Data</div>
              <label className="map-filter-field"><span>Metrik kesehatan</span><select className="cura-select" value={metric} onChange={(event) => { setMetric(event.target.value as MapMetric); setSelectedRegion(null); }}><option value="bedRatio">Rasio tempat tidur</option><option value="stuntingRate">Prevalensi stunting</option><option value="disease">Kasus penyakit</option></select></label>
              <label className="map-filter-field"><span>Periode</span><select className="cura-select" value={year} onChange={(event) => setYear(event.target.value)}>{["2024", "2023", "2022", "2021"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </div>
            <div className="map-filter-section"><div className="map-filter-section-title">Wilayah</div>
              <label className="map-filter-search"><Search size={15} /><input value={regionSearch} onChange={(event) => setRegionSearch(event.target.value)} placeholder="Cari kabupaten/kota" /></label>
              <label className="map-filter-field"><span>Urutkan daftar wilayah</span><select className="cura-select" value={regionSort} onChange={(event) => {
                const nextSort = event.target.value as typeof regionSort;
                const firstRegion = [...filteredRegions].sort((a, b) => {
                  if (nextSort === "name") return a.name.localeCompare(b.name, "id");
                  if (nextSort === "bedRatio") return a.bedRatio - b.bedRatio;
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  return priorityOrder[a.priorityLevel] - priorityOrder[b.priorityLevel] || a.bedRatio - b.bedRatio;
                })[0];
                setRegionSort(nextSort);
                if (firstRegion) setKabupatenFilter(firstRegion.id);
              }}><option value="priority">Prioritas penanganan tertinggi</option><option value="bedRatio">Defisit tempat tidur tertinggi</option><option value="name">Nama wilayah A–Z</option></select></label>
              <label className="map-filter-field"><span>Fokus wilayah</span><select className="cura-select" value={kabupatenFilter} onChange={(event) => setKabupatenFilter(event.target.value)}><option value="all">Semua wilayah</option>{filteredRegions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
              <label className="map-filter-field"><span>Tingkat prioritas</span><select className="cura-select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}><option value="all">Semua status</option><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Rendah</option></select></label>
            </div>
            <div className="map-filter-section map-layer-section"><div className="map-filter-section-title"><Layers size={14} /> Lapisan peta</div>
              {LAYER_DEFS.map(({ key, label, desc }) => <label className="map-layer-option" key={key}><input type="checkbox" checked={layers[key]} onChange={() => toggleLayer(key)} /><span className="map-layer-copy"><strong>{label}</strong><small>{desc}</small></span></label>)}
            </div>
            <div className="map-filter-footer"><span><MapPinned size={14} /> 38 kabupaten/kota</span><button type="button" onClick={handleReset}><RotateCcw size={14} /> Reset filter</button></div>
          </aside>
          <section className="map-stage">
            <div className="map-stage-heading"><div><strong>{metricConfig.title}</strong><span>{year} · {kabupatenFilter === "all" ? "Jawa Timur" : regionHealth.find((region) => region.id === kabupatenFilter)?.name}</span></div><span className="map-stage-status"><i /> Peta interaktif</span></div>
            <div className="cura-map-content">
              <div className="cura-map-canvas">
                <EastJavaMarkerMap metric={metric} layers={layers} resetKey={resetKey} year={year} priorityFilter={priorityFilter} focusRegion={kabupatenFilter !== "all" ? kabupatenFilter : undefined} onRegionClick={(id) => setSelectedRegion((prev) => (prev === id ? null : id))} height="calc(100vh - 154px)" />
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
          </section>
        </div>
      </div>
    </div>
  );
}
