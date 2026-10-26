import { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import EastJavaMarkerMap from "../components/EastJavaMarkerMap";
import { regionHealth, priorityRegions, diseaseTrend } from "../data/healthData";
import type { RegionHealth } from "../data/healthData";
import { apiRequest, type ApiEnvelope } from "../lib/api";
import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, Building2, Users, AlertCircle,
  Map, BrainCircuit, ChevronDown, X, Search,
  HeartPulse, MapPinned, Siren, ArrowRight,
} from "lucide-react";

// ── Province-wide KPIs (existing) ────────────────────────────────────────────
const PROVINCE_KPIS: Record<string, { facilities: string; bedRatio: string; priority: number; stunting: string; label: string }> = {
  "2024": { facilities: "1.424", bedRatio: "0,94", priority: 8,  stunting: "18,7%", label: "+12 dari 2023" },
  "2023": { facilities: "1.412", bedRatio: "0,86", priority: 11, stunting: "20,3%", label: "+8 dari 2022"  },
  "2022": { facilities: "1.404", bedRatio: "0,81", priority: 13, stunting: "21,8%", label: "+5 dari 2021"  },
  "2021": { facilities: "1.399", bedRatio: "0,74", priority: 15, stunting: "23,4%", label: "Data baseline"  },
};

// ── Year multipliers for regional data ───────────────────────────────────────
const YEAR_MULT: Record<string, { bed: number; facility: number; stunting: number; disease: number }> = {
  "2024": { bed: 1.00, facility: 1.00, stunting: 1.00, disease: 1.00 },
  "2023": { bed: 0.93, facility: 0.98, stunting: 1.07, disease: 1.05 },
  "2022": { bed: 0.86, facility: 0.96, stunting: 1.15, disease: 1.12 },
  "2021": { bed: 0.80, facility: 0.94, stunting: 1.24, disease: 1.20 },
};

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

const HEALTH_SCORE_FACTORS = [
  "Akses Fasilitas",
  "Rasio Tempat Tidur",
  "Beban Penyakit",
  "KIA & Stunting",
  "Tenaga Kesehatan",
  "Cakupan Program",
];

const REGION_SCORE_EXAMPLES = [
  { name: "Kota Surabaya", score: 82, level: "good" },
  { name: "Kota Malang", score: 78, level: "watch" },
  { name: "Kabupaten Sidoarjo", score: 70, level: "watch" },
  { name: "Kabupaten Jember", score: 58, level: "intervention" },
  { name: "Kabupaten Probolinggo", score: 43, level: "critical" },
];

const PRIORITY_FACTORS = [
  "Skor rendah",
  "Penyakit tinggi",
  "Stunting tinggi",
  "Akses layanan rendah",
];

const PRIORITY_REGION_EXAMPLES = [
  "Kabupaten Probolinggo",
  "Kabupaten Sampang",
  "Kabupaten Jember",
];

const HEALTH_SCORE_LEGEND = [
  { range: "80–100", label: "Baik", level: "good" },
  { range: "60–79", label: "Perlu Pemantauan", level: "watch" },
  { range: "40–59", label: "Perlu Intervensi", level: "intervention" },
  { range: "0–39", label: "Prioritas Tinggi", level: "critical" },
];

function genRegionalTrend(r: RegionHealth, yearMult: number) {
  return MONTHS.map((month, i) => ({
    month,
    dbd:       Math.max(1, Math.round((r.dbd * yearMult / 12) * (0.55 + Math.abs(Math.sin(i * 0.8)) * 0.95))),
    tb:        Math.max(1, Math.round((r.tb * yearMult / 12) * (0.82 + Math.cos(i * 0.5) * 0.24))),
    pneumonia: Math.max(1, Math.round((r.pneumonia * yearMult / 12) * (0.78 + Math.sin(i * 0.7 + 1.5) * 0.42))),
  }));
}

// Deterministic JKN coverage per region
function jknPct(id: string): string {
  const seed = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((79 + (seed % 16)) / 100).toFixed(0) + "," + ((seed % 10)) + "%";
}

function doctorRatio(fc: number, pop: number): string {
  return ((fc * 3.2) / (pop / 1000)).toFixed(2).replace(".", ",");
}

function regionLabel(r: RegionHealth): string {
  return r.type === "kota" ? `Kota ${r.name}` : `Kabupaten ${r.name}`;
}

// ── Sorted region list: priority demo regions first, then alphabetical ────────
const PRIORITY_IDS = ["surabaya","sidoarjo","malang-kab","jember","banyuwangi","sampang","bangkalan","pamekasan","sumenep","malang-kota"];
const SORTED_REGIONS = [
  ...PRIORITY_IDS.map(id => regionHealth.find(r => r.id === id)).filter(Boolean) as RegionHealth[],
  ...regionHealth.filter(r => !PRIORITY_IDS.includes(r.id)).sort((a, b) => a.name.localeCompare(b.name)),
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface OverviewPageProps {
  onAIPanel?: () => void;
  onNavigate?: (page: string) => void;
  year?: string;
  onYearChange?: (y: string) => void;
  region?: string;
  onRegionChange?: (id: string, label?: string) => void;
}

export default function OverviewPage({
  onAIPanel, onNavigate,
  year = "2024", onYearChange,
  region = "all", onRegionChange,
}: OverviewPageProps) {
  const [apiSummary, setApiSummary] = useState<{ total_faskes: number; rasio_tt_rata_rata_resmi: number; distribusi_kategori_who_resmi: Record<string, number> } | null>(null);
  const [mapMetric, setMapMetric] = useState<"bedRatio" | "stuntingRate" | "disease">("bedRatio");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const regionBtnRef = useRef<HTMLButtonElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest<ApiEnvelope<{ total_faskes: number; rasio_tt_rata_rata_resmi: number; distribusi_kategori_who_resmi: Record<string, number> }>>("/api/v1/statistik/executive-summary")
      .then((response) => setApiSummary(response.data))
      .catch(() => setApiSummary(null));
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (mobileSheetOpen && mobileSearchRef.current) {
      setTimeout(() => mobileSearchRef.current?.focus(), 120);
    }
  }, [mobileSheetOpen]);

  // ── Derived data based on region + year ─────────────────────────────────────
  const mult = YEAR_MULT[year] ?? YEAR_MULT["2024"];
  const selectedRegion = region !== "all" ? regionHealth.find(r => r.id === region) ?? null : null;

  const baseKpi = PROVINCE_KPIS[year] ?? PROVINCE_KPIS["2024"];
  const kpi = selectedRegion ? null : apiSummary ? {
    ...baseKpi,
    facilities: apiSummary.total_faskes.toLocaleString("id-ID"),
    bedRatio: apiSummary.rasio_tt_rata_rata_resmi.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    priority: apiSummary.distribusi_kategori_who_resmi.merah ?? baseKpi.priority,
  } : baseKpi;

  const regionBedRatio   = selectedRegion ? selectedRegion.bedRatio * mult.bed : null;
  const regionFacilities = selectedRegion ? Math.round(selectedRegion.facilityCount * mult.facility) : null;
  const regionStunting   = selectedRegion ? selectedRegion.stuntingRate * mult.stunting : null;

  const trendData = selectedRegion
    ? genRegionalTrend(selectedRegion, mult.disease)
    : diseaseTrend;

  const snapshotRows = selectedRegion
    ? [
        { icon: <TrendingUp size={16} color="#22c55e" />, label: "Dokter per 1.000 penduduk", value: doctorRatio(selectedRegion.facilityCount, selectedRegion.population) },
        { icon: <Building2 size={16} color="var(--color-medical-blue)" />, label: "Puskesmas Aktif", value: Math.round(selectedRegion.facilityCount * 0.68).toString() },
        { icon: <Users size={16} color="var(--color-medical-blue)" />, label: "Cakupan JKN", value: jknPct(selectedRegion.id) },
        { icon: <AlertCircle size={16} color="#f97316" />, label: "Kasus Aktif TB", value: Math.round(selectedRegion.tb * mult.disease).toLocaleString("id-ID") },
      ]
    : [
        { icon: <TrendingUp size={16} color="#22c55e" />, label: "Dokter per 1.000 penduduk", value: "0,38" },
        { icon: <Building2 size={16} color="var(--color-medical-blue)" />, label: "Puskesmas Aktif", value: "977" },
        { icon: <Users size={16} color="var(--color-medical-blue)" />, label: "Cakupan JKN", value: "82,4%" },
        { icon: <AlertCircle size={16} color="#f97316" />, label: "Kasus Aktif TB", value: "85.200" },
      ];

  const sectionTitle = selectedRegion
    ? `Ringkasan Kesehatan ${regionLabel(selectedRegion)}`
    : "Ringkasan Kesehatan Jawa Timur";
  const sectionSubtitle = selectedRegion
    ? `Ringkasan indikator kesehatan ${regionLabel(selectedRegion)} berdasarkan data tahun ${year}.`
    : `Gambaran kapasitas layanan dan indikator kesehatan berdasarkan data tahun ${year}.`;

  // ── Region selector helpers ──────────────────────────────────────────────────
  function selectRegion(id: string) {
    const r = regionHealth.find(x => x.id === id);
    onRegionChange?.(id, r ? regionLabel(r) : id);
    setMobileSheetOpen(false);
    setMobileSearch("");
  }
  function clearRegion() {
    onRegionChange?.("all");
  }

  const filteredSheet = SORTED_REGIONS.filter(r =>
    mobileSearch === "" ||
    r.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
    regionLabel(r).toLowerCase().includes(mobileSearch.toLowerCase())
  );

  // ── Bed ratio badge for regional KPI ────────────────────────────────────────
  function bedBadge(br: number | null) {
    if (br === null) return null;
    if (br >= 1.0) return <span className="cura-kpi-badge positive">Memenuhi WHO</span>;
    if (br >= 0.75) return <span className="cura-kpi-badge warning">Di bawah WHO 1,0</span>;
    return <span className="cura-kpi-badge critical">Kritis – Jauh dari WHO</span>;
  }

  // ── Region dropdown (desktop) ────────────────────────────────────────────────
  const RegionDropdown = () => (
    <select
      className="cura-select"
      value={region}
      onChange={(e) => {
        const id = e.target.value;
        const r = regionHealth.find(x => x.id === id);
        onRegionChange?.(id, r ? regionLabel(r) : id);
      }}
      style={{ fontFamily: "var(--font-family-base)", fontSize: "var(--font-size-body-sm)", fontWeight: 500, maxWidth: 220 }}
    >
      <option value="all">Semua Kabupaten/Kota</option>
      {SORTED_REGIONS.map(r => (
        <option key={r.id} value={r.id}>{regionLabel(r)}</option>
      ))}
    </select>
  );

  return (
    <div className="cura-page">
      <TopBar
        title="Overview — Jawa Timur"
        year={year}
        onYearChange={onYearChange}
        onAIPanel={onAIPanel}
      />

      <div className="cura-page-content overview-page-content">

        {/* ── Intro hero ── */}
        <div className="cura-card" style={{
          background: "linear-gradient(135deg, var(--color-navy) 0%, #1e5f8a 100%)",
          border: "none", padding: "var(--spacing-2xl)", color: "white",
        }}>
          <div style={{ fontSize: "var(--font-size-caption)", textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.65, marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-family-base)", fontWeight: 600 }}>
            Tilik Jatim — HealthTrust Jatim
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 var(--spacing-md)", lineHeight: 1.25, fontFamily: "var(--font-family-base)", color: "white" }}>
            {selectedRegion ? `Profil Kesehatan ${regionLabel(selectedRegion)}` : "Memahami Kesehatan Jawa Timur\nMelalui Data"}
          </h1>
          <p style={{ fontSize: "var(--font-size-body)", opacity: 0.82, lineHeight: 1.7, maxWidth: 580, margin: "0 0 var(--spacing-xl)", fontFamily: "var(--font-family-base)" }}>
            {selectedRegion
              ? `Data kesehatan ${regionLabel(selectedRegion)} mencakup fasilitas, kapasitas layanan, dan indikator kesehatan masyarakat berdasarkan data tahun ${year}.`
              : "Tilik Jatim menyajikan informasi fasilitas kesehatan, kapasitas layanan, penyakit, serta kesehatan ibu dan anak di 38 kabupaten/kota Jawa Timur."}
          </p>
          <div style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap", marginBottom: "var(--spacing-xl)" }}>
            <button className="cura-btn" onClick={() => onNavigate?.("healthmap")} style={{ background: "var(--color-medical-blue)", color: "white", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
              <Map size={16} /> Explore Health Map
            </button>
            <button className="cura-btn" onClick={onAIPanel} style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: 8, padding: "10px 20px" }}>
              <BrainCircuit size={16} /> Ask Tilik Jatim AI
            </button>
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-xl)", fontSize: "var(--font-size-caption)", opacity: 0.65, fontFamily: "var(--font-family-base)" }}>
            <span>Data terbaru: <strong style={{ color: "white", opacity: 1 }}>{year}</strong></span>
            <span>Cakupan: <strong style={{ color: "white", opacity: 1 }}>{selectedRegion ? regionLabel(selectedRegion) : "38 Kabupaten/Kota Jawa Timur"}</strong></span>
          </div>
        </div>

        {/* ── KPI section header with region selector ── */}
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--spacing-md)", marginBottom: "var(--spacing-md)", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: "var(--font-size-heading-sm)", fontWeight: 700, color: "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>
                {sectionTitle}
              </div>
              <div style={{ fontSize: "var(--font-size-body-sm)", color: "var(--color-text-secondary)", marginTop: 2, fontFamily: "var(--font-family-base)" }}>
                {sectionSubtitle}
              </div>

              {/* Active filter chip */}
              {selectedRegion && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", marginTop: "var(--spacing-sm)", flexWrap: "wrap" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "var(--color-light-blue)",
                    border: "1px solid var(--color-medical-blue)",
                    borderRadius: 99,
                    padding: "4px 10px 4px 12px",
                    fontSize: "var(--font-size-caption)",
                    fontWeight: 600, color: "var(--color-medical-blue)",
                    fontFamily: "var(--font-family-base)",
                  }}>
                    {regionLabel(selectedRegion)}
                    <button
                      onClick={clearRegion}
                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--color-medical-blue)", padding: 0, marginLeft: 2 }}
                      title="Hapus filter wilayah"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
                    · Tahun {year}
                  </span>
                </div>
              )}
            </div>

            {/* Region selector — desktop select, mobile button */}
            <div style={{ display: "flex", gap: "var(--spacing-sm)", flexShrink: 0, alignItems: "flex-start" }}>
              {isMobile ? (
                <button
                  ref={regionBtnRef}
                  className="cura-btn cura-btn-secondary"
                  onClick={() => setMobileSheetOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {selectedRegion ? regionLabel(selectedRegion) : "Semua Kabupaten/Kota"}
                  <ChevronDown size={14} />
                </button>
              ) : (
                <RegionDropdown />
              )}
            </div>
          </div>

          {/* ── KPI cards ── */}
          <div className="cura-kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--spacing-lg)" }}>

            {/* KPI 1: Total Fasilitas */}
            <div className="cura-kpi-card">
              <div className="cura-kpi-label">Total Fasilitas Kesehatan</div>
              <div className="cura-kpi-value">
                {selectedRegion ? regionFacilities!.toLocaleString("id-ID") : kpi!.facilities}
              </div>
              <span className="cura-kpi-badge positive">
                {selectedRegion
                  ? `${Math.round(selectedRegion.facilityCount * 0.28)} RS · ${Math.round(selectedRegion.facilityCount * 0.72)} Puskesmas`
                  : kpi!.label}
              </span>
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2, fontFamily: "var(--font-family-base)" }}>Data {year}</div>
            </div>

            {/* KPI 2: Bed Ratio */}
            <div className="cura-kpi-card">
              <div className="cura-kpi-label">Rasio Tempat Tidur/1.000 Jiwa</div>
              <div className="cura-kpi-value">
                {selectedRegion
                  ? regionBedRatio!.toFixed(2).replace(".", ",")
                  : kpi!.bedRatio}
              </div>
              {selectedRegion
                ? bedBadge(regionBedRatio)
                : (
                  <span className={`cura-kpi-badge ${parseFloat(kpi!.bedRatio.replace(",", ".")) >= 1.0 ? "positive" : "warning"}`}>
                    {parseFloat(kpi!.bedRatio.replace(",", ".")) >= 1.0 ? "Memenuhi WHO" : "Di bawah WHO 1,0"}
                  </span>
                )}
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2, fontFamily: "var(--font-family-base)" }}>Data {year}</div>
            </div>

            {/* KPI 3: Priority / Status */}
            <div className="cura-kpi-card">
              {selectedRegion ? (
                <>
                  <div className="cura-kpi-label">Status Prioritas Wilayah</div>
                  <div className="cura-kpi-value" style={{
                    fontSize: "var(--font-size-heading-sm)",
                    color: selectedRegion.priorityLevel === "high" ? "var(--color-critical)" : selectedRegion.priorityLevel === "medium" ? "var(--color-warning)" : "var(--color-safe)",
                  }}>
                    {selectedRegion.priorityLevel === "high" ? "Tinggi" : selectedRegion.priorityLevel === "medium" ? "Sedang" : "Rendah"}
                  </div>
                  <span className={`cura-kpi-badge ${selectedRegion.priorityLevel === "high" ? "critical" : selectedRegion.priorityLevel === "medium" ? "warning" : "positive"}`}>
                    {selectedRegion.priorityLevel === "high" ? "Perlu intervensi" : selectedRegion.priorityLevel === "medium" ? "Perlu pemantauan" : "Relatif baik"}
                  </span>
                  <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2, fontFamily: "var(--font-family-base)" }}>Data {year}</div>
                </>
              ) : (
                <>
                  <div className="cura-kpi-label">Kabupaten Prioritas</div>
                  <div className="cura-kpi-value">{kpi!.priority}</div>
                  <span className="cura-kpi-badge warning">Perlu perhatian</span>
                  <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2, fontFamily: "var(--font-family-base)" }}>Data {year}</div>
                </>
              )}
            </div>

            {/* KPI 4: Stunting */}
            <div className="cura-kpi-card">
              <div className="cura-kpi-label">Prevalensi Stunting</div>
              <div className="cura-kpi-value">
                {selectedRegion
                  ? regionStunting!.toFixed(1).replace(".", ",") + "%"
                  : kpi!.stunting}
              </div>
              <span className={`cura-kpi-badge ${(selectedRegion ? regionStunting! : parseFloat(kpi!.stunting)) < 20 ? "positive" : "warning"}`}>
                {selectedRegion
                  ? regionStunting! < 14 ? "Di bawah target nasional" : regionStunting! < 20 ? "Mendekati target" : "Di atas target nasional"
                  : (year === "2024" ? "-1,6% dari 2023" : year === "2023" ? "-1,5% dari 2022" : year === "2022" ? "-1,6% dari 2021" : "Baseline")}
              </span>
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 2, fontFamily: "var(--font-family-base)" }}>Data {year}</div>
            </div>
          </div>
        </div>

        {/* ── Regional health KPI section ── */}
        <section className="regional-kpi-section" aria-labelledby="regional-kpi-title">
          <div className="regional-kpi-heading">
            <div className="regional-kpi-title" id="regional-kpi-title">
              Skor kesehatan Jawa Timur 72/100 dan perlu dipantau
            </div>
            <div className="regional-kpi-subtitle">
              Setiap indikator menampilkan kondisi kesehatan, wilayah sumber perhitungan, indikator pembentuk nilai, serta tingkat prioritas intervensi.
            </div>
          </div>

          <div className="regional-kpi-grid">
            <article className="regional-kpi-card">
              <div className="regional-kpi-card-header">
                <div className="regional-kpi-icon regional-kpi-icon-blue" aria-hidden="true">
                  <HeartPulse size={18} />
                </div>
                <div className="regional-kpi-card-title">Skor Kesehatan Jawa Timur</div>
              </div>
              <div className="regional-kpi-value-row">
                <div className="regional-kpi-value">72<span>/100</span></div>
                <span className="regional-status-badge status-watch">Perlu Pemantauan</span>
              </div>
              <div className="regional-kpi-description">
                Nilai gabungan kondisi kesehatan dari 38 kabupaten/kota di Jawa Timur.
              </div>
              <div className="regional-kpi-source">Sumber perhitungan: 38 kabupaten/kota.</div>
              <div className="regional-tag-list" aria-label="Indikator pembentuk skor">
                {HEALTH_SCORE_FACTORS.map((factor) => (
                  <span className="regional-tag" key={factor}>{factor}</span>
                ))}
              </div>
              <div className="regional-progress-block">
                <div className="regional-progress-label">
                  <span>Skor kesehatan</span>
                  <strong>72 dari 100</strong>
                </div>
                <div
                  className="regional-progress-track"
                  role="progressbar"
                  aria-label="Skor kesehatan Jawa Timur"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={72}
                >
                  <div className="regional-progress-value" />
                </div>
              </div>
            </article>

            <article className="regional-kpi-card">
              <div className="regional-kpi-card-header">
                <div className="regional-kpi-icon regional-kpi-icon-green" aria-hidden="true">
                  <MapPinned size={18} />
                </div>
                <div className="regional-kpi-card-title">Skor Kesehatan per Wilayah</div>
              </div>
              <div className="regional-kpi-value">38 <span>Wilayah Dinilai</span></div>
              <div className="regional-kpi-description">
                Setiap kabupaten/kota memiliki skor kesehatan untuk menunjukkan kondisi dan kebutuhan intervensinya.
              </div>
              <div className="regional-ranking" aria-label="Contoh peringkat skor wilayah">
                {REGION_SCORE_EXAMPLES.map((item) => (
                  <div className="regional-ranking-row" key={item.name}>
                    <div className="regional-ranking-meta">
                      <span>{item.name}</span>
                      <strong>{item.score}</strong>
                    </div>
                    <div className="regional-ranking-track">
                      <div
                        className={`regional-ranking-value score-${item.level}`}
                        style={{ "--region-score": `${item.score}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="regional-kpi-action"
                type="button"
                onClick={() => onNavigate?.("regions")}
              >
                Lihat Semua Wilayah <ArrowRight size={14} />
              </button>
            </article>

            <article className="regional-kpi-card">
              <div className="regional-kpi-card-header">
                <div className="regional-kpi-icon regional-kpi-icon-red" aria-hidden="true">
                  <Siren size={18} />
                </div>
                <div className="regional-kpi-card-title">Wilayah Prioritas</div>
              </div>
              <div className="regional-kpi-value-row">
                <div className="regional-kpi-value">8 <span>Wilayah</span></div>
                <span className="regional-status-badge status-critical">Butuh Intervensi</span>
              </div>
              <div className="regional-kpi-description">
                Wilayah dengan skor kesehatan rendah atau masalah kesehatan yang perlu segera ditangani.
              </div>
              <div className="regional-tag-list" aria-label="Indikator prioritas">
                {PRIORITY_FACTORS.map((factor) => (
                  <span className="regional-tag regional-priority-tag" key={factor}>{factor}</span>
                ))}
              </div>
              <div className="regional-priority-list" aria-label="Contoh wilayah prioritas">
                {PRIORITY_REGION_EXAMPLES.map((name, index) => (
                  <div className="regional-priority-row" key={name}>
                    <span className="regional-priority-rank">{index + 1}</span>
                    <span>{name}</span>
                  </div>
                ))}
              </div>
              <button
                className="regional-kpi-action"
                type="button"
                onClick={onAIPanel}
              >
                Lihat Rekomendasi Program <ArrowRight size={14} />
              </button>
            </article>
          </div>

          <div className="regional-score-legend">
            <div className="regional-score-legend-copy">
              <div className="regional-kpi-card-title">Keterangan Skor Kesehatan Wilayah</div>
              <div className="regional-score-legend-note">
                Skor dihitung dari akses fasilitas, kapasitas layanan, beban penyakit, kesehatan ibu-anak, stunting, tenaga kesehatan, dan cakupan program.
              </div>
            </div>
            <div className="regional-score-legend-items" aria-label="Kategori skor kesehatan wilayah">
              {HEALTH_SCORE_LEGEND.map((item) => (
                <div className="regional-score-legend-item" key={item.range}>
                  <strong>{item.range}</strong>
                  <span className={`regional-status-badge status-${item.level}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Map + Priority list ── */}
        <div className="cura-two-col" style={{ display: "grid", gridTemplateColumns: "70% 30%", gap: "var(--spacing-lg)" }}>
          <div className="cura-card" style={{ padding: "var(--spacing-xl)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--spacing-md)", marginBottom: "var(--spacing-md)", flexWrap: "wrap" }}>
              <div>
                <div className="cura-section-title" style={{ margin: 0 }}>
                  {selectedRegion ? `Peta – ${regionLabel(selectedRegion)}` : "Peta Distribusi Bed Ratio Jawa Timur"}
                </div>
                <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "var(--font-family-base)" }}>
                  {selectedRegion
                    ? `Lokasi ${regionLabel(selectedRegion)} disorot pada peta. Klik marker lain untuk membandingkan.`
                    : "Rasio ketersediaan tempat tidur per 1.000 penduduk pada 38 kabupaten/kota."}
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--spacing-sm)", flexShrink: 0 }}>
                <select
                  className="cura-select"
                  value={mapMetric}
                  onChange={(e) => setMapMetric(e.target.value as typeof mapMetric)}
                  style={{ fontFamily: "var(--font-family-base)", fontSize: "var(--font-size-body-sm)", fontWeight: 500 }}
                >
                  <option value="bedRatio">Bed Ratio</option>
                  <option value="stuntingRate">Stunting</option>
                  <option value="disease">Penyakit</option>
                </select>
                <select
                  className="cura-select"
                  value={year}
                  onChange={(e) => onYearChange?.(e.target.value)}
                  style={{ fontFamily: "var(--font-family-base)", fontSize: "var(--font-size-body-sm)", fontWeight: 500 }}
                >
                  {["2024","2023","2022","2021"].map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
              </div>
            </div>
            <EastJavaMarkerMap
              metric={mapMetric}
              height={480}
              focusRegion={region !== "all" ? region : undefined}
              onRegionClick={(id) => selectRegion(id)}
            />
          </div>

          <div className="cura-card">
            <div className="cura-section-title">
              {selectedRegion ? "Perbandingan Wilayah" : "Kabupaten Prioritas"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
              {priorityRegions.map((r, idx) => {
                const isSelected = r.id === region;
                return (
                  <div
                    key={r.name}
                    className="priority-item"
                    onClick={() => selectRegion(r.id)}
                    style={{ cursor: "pointer", background: isSelected ? "var(--color-light-blue)" : undefined, borderRadius: "var(--radius-sm)", transition: "background 0.15s" }}
                  >
                    <span className="priority-rank">{idx + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: "var(--font-size-body-sm)", color: isSelected ? "var(--color-medical-blue)" : "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
                        Bed ratio: {r.bedRatio}
                      </div>
                    </div>
                    <span className={`priority-badge priority-${r.priorityLevel}`}>
                      {r.priorityLevel === "high" ? "Tinggi" : r.priorityLevel === "medium" ? "Sedang" : "Rendah"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Disease trend + Health system snapshot ── */}
        <div className="cura-two-col" style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: "var(--spacing-lg)" }}>
          <div className="cura-card">
            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <div className="cura-section-title" style={{ margin: 0 }}>Tren Beban Penyakit</div>
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "var(--font-family-base)" }}>
                {selectedRegion
                  ? `${regionLabel(selectedRegion)} · Tahun ${year}`
                  : `Jawa Timur · Tahun ${year}`}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-family-base)" }} />
                <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-family-base)" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="dbd"       stroke="#D94A4A" dot={false} strokeWidth={2} name="DBD" />
                <Line type="monotone" dataKey="tb"        stroke="#E5A33B" dot={false} strokeWidth={2} name="TB" />
                <Line type="monotone" dataKey="pneumonia" stroke="#1677C8" dot={false} strokeWidth={2} name="Pneumonia" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: "var(--spacing-sm)", fontFamily: "var(--font-family-base)" }}>
              {selectedRegion
                ? `${regionLabel(selectedRegion)} · Simulasi data bulanan tahun ${year}`
                : `38 Kabupaten/Kota · Jawa Timur · ${year}`}
            </div>
          </div>

          <div className="cura-card">
            <div className="cura-section-title">Snapshot Sistem Kesehatan</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              {snapshotRows.map(({ icon, label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-secondary)", fontSize: "var(--font-size-body-sm)", fontFamily: "var(--font-family-base)" }}>
                    {icon} {label}
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "var(--spacing-lg)", padding: "var(--spacing-md)", background: "var(--color-page-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
              Data Tahun: {year} · {selectedRegion ? regionLabel(selectedRegion) : "Jawa Timur"}
            </div>
          </div>
        </div>

        {/* ── KIA and stunting summary ── */}
        <section className="overview-detail-section">
          <div className="overview-section-heading">
            <div className="data-page-title">Ringkasan Indikator KIA dan Stunting</div>
            <div className="data-page-subtitle">
              Pemantauan kesehatan ibu, bayi, balita, dan cakupan layanan esensial Jawa Timur pada tahun {year}.
            </div>
          </div>
          <div className="overview-indicator-grid">
            {[
              {
                label: "Angka Kematian Ibu",
                value: "91",
                unit: "per 100.000 kelahiran",
                note: "Membaik 6,2% dari tahun sebelumnya",
                tone: "blue",
                icon: HeartPulse,
              },
              {
                label: "Angka Kematian Bayi",
                value: "6,8",
                unit: "per 1.000 kelahiran",
                note: "Perlu pemantauan di 11 wilayah",
                tone: "yellow",
                icon: Users,
              },
              {
                label: "Prevalensi Stunting",
                value: selectedRegion ? `${regionStunting!.toFixed(1).replace(".", ",")}%` : kpi!.stunting,
                unit: selectedRegion ? regionLabel(selectedRegion) : "Jawa Timur",
                note: "Target nasional berikutnya 14%",
                tone: "orange",
                icon: AlertCircle,
              },
              {
                label: "Cakupan Kunjungan Ibu Hamil",
                value: "89,4%",
                unit: "kunjungan lengkap",
                note: "Naik 2,8 poin dari 2023",
                tone: "green",
                icon: TrendingUp,
              },
            ].map(({ label, value, unit, note, tone, icon: Icon }) => (
              <article className="overview-indicator-card" key={label}>
                <div className={`data-summary-icon tone-${tone}`}><Icon size={18} /></div>
                <div className="overview-indicator-label">{label}</div>
                <div className="overview-indicator-value">{value}</div>
                <div className="overview-indicator-unit">{unit}</div>
                <div className="overview-indicator-note">{note}</div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Program coverage and intervention focus ── */}
        <section className="overview-detail-section overview-detail-half">
          <div className="overview-section-heading">
            <div className="data-page-title">Cakupan Program dan Fokus Intervensi</div>
            <div className="data-page-subtitle">
              Kemajuan program prioritas dan area yang membutuhkan penguatan lintas kabupaten/kota.
            </div>
          </div>
          <div className="overview-program-grid">
            <article className="overview-program-card">
              <div className="data-panel-title">Cakupan Program Prioritas</div>
              {[
                ["Cek Kesehatan Gratis", 76, "76%"],
                ["Imunisasi Dasar Lengkap", 84, "84%"],
                ["Pemantauan Balita di Posyandu", 71, "71%"],
                ["Tindak Lanjut Kasus TBC", 68, "68%"],
              ].map(([label, value, display]) => (
                <div className="overview-program-row" key={label}>
                  <div><span>{label}</span><strong>{display}</strong></div>
                  <div className="overview-program-track">
                    <div
                      className="overview-program-value"
                      style={{ "--program-progress": `${value}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </article>
            <article className="overview-program-card">
              <div className="data-panel-title">Fokus Intervensi Berikutnya</div>
              {[
                ["01", "Penguatan layanan primer", "Perluasan akses Puskesmas, Pustu, dan sistem rujukan pada wilayah prioritas."],
                ["02", "Percepatan penurunan stunting", "Pendampingan keluarga berisiko dan pemantauan pertumbuhan balita secara rutin."],
                ["03", "Pengendalian beban penyakit", "Skrining PTM dan penemuan aktif TBC dengan tindak lanjut pengobatan."],
                ["04", "Peningkatan kualitas data", "Penguatan pencatatan program untuk keputusan intervensi yang lebih tepat."],
              ].map(([number, title, description]) => (
                <div className="overview-focus-row" key={number}>
                  <span>{number}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </div>
              ))}
            </article>
          </div>
        </section>

        {/* ── Health insight ── */}
        <section className="overview-detail-section overview-detail-half">
          <div className="overview-section-heading">
            <div className="data-page-title">Insight Kesehatan Jawa Timur</div>
            <div className="data-page-subtitle">
              Temuan lintas indikator untuk membantu menentukan fokus pemantauan dan intervensi wilayah.
            </div>
          </div>
          <div className="overview-insight-grid">
            <article className="overview-insight-primary">
              <div className="overview-insight-icon"><BrainCircuit size={20} /></div>
              <div>
                <div className="overview-insight-eyebrow">Insight utama Tilik Jatim</div>
                <div className="overview-insight-title">
                  Kesenjangan akses layanan dan stunting masih terkonsentrasi di wilayah prioritas.
                </div>
                <p>
                  Delapan kabupaten memerlukan penguatan layanan primer, pendampingan keluarga, dan pemantauan gizi balita secara terintegrasi. Perbaikan kapasitas Puskesmas perlu berjalan bersama peningkatan cakupan program preventif.
                </p>
              </div>
            </article>
            <div className="overview-insight-list">
              {[
                ["Akses layanan", "Prioritaskan penguatan Puskesmas dan sistem rujukan di wilayah dengan bed ratio rendah."],
                ["KIA dan stunting", "Perluas Posyandu aktif, MBG kelompok 3B, dan Tim Pendamping Keluarga."],
                ["Beban penyakit", "Perkuat skrining PTM, penemuan kasus TBC, dan tindak lanjut pengobatan."],
              ].map(([title, description], index) => (
                <div className="overview-insight-item" key={title}>
                  <span>{index + 1}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="overview-footer">
          <div>
            <strong>Tilik Jatim — HealthTrust Jawa Timur</strong>
            <span>Dashboard intelijen kesehatan publik untuk 38 kabupaten/kota.</span>
          </div>
          <span>Data simulasi analitik · Tahun {year}</span>
        </footer>
      </div>

      {/* ── Mobile bottom sheet ── */}
      {mobileSheetOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={() => setMobileSheetOpen(false)}
        >
          {/* Backdrop */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />

          {/* Sheet */}
          <div
            style={{
              position: "relative",
              background: "var(--color-white)",
              borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
              maxHeight: "80vh",
              display: "flex", flexDirection: "column",
              animation: "slideInUp 0.2s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "var(--spacing-lg)", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: "var(--font-size-heading-sm)", color: "var(--color-navy)", fontFamily: "var(--font-family-base)" }}>
                Pilih Wilayah
              </span>
              <button onClick={() => setMobileSheetOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4, display: "flex" }}>
                <X size={20} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: "var(--spacing-md) var(--spacing-lg)", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
                <input
                  ref={mobileSearchRef}
                  type="text"
                  placeholder="Cari kabupaten/kota..."
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  className="cura-select"
                  style={{ width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {/* "Semua" option */}
              <button
                onClick={clearRegion}
                style={{
                  width: "100%", padding: "12px var(--spacing-lg)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: region === "all" ? "var(--color-light-blue)" : "transparent",
                  border: "none", borderBottom: "1px solid var(--color-border)",
                  cursor: "pointer", fontFamily: "var(--font-family-base)",
                  fontSize: "var(--font-size-body-sm)", color: region === "all" ? "var(--color-medical-blue)" : "var(--color-text-primary)",
                  fontWeight: region === "all" ? 700 : 500, textAlign: "left",
                }}
              >
                Semua Kabupaten/Kota
                {region === "all" && <span style={{ fontSize: 10, background: "var(--color-medical-blue)", color: "white", borderRadius: 99, padding: "1px 6px" }}>Aktif</span>}
              </button>

              {filteredSheet.map((r) => {
                const isActive = r.id === region;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRegion(r.id)}
                    style={{
                      width: "100%", padding: "11px var(--spacing-lg)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: isActive ? "var(--color-light-blue)" : "transparent",
                      border: "none", borderBottom: "1px solid var(--color-border)",
                      cursor: "pointer", fontFamily: "var(--font-family-base)",
                      fontSize: "var(--font-size-body-sm)",
                      color: isActive ? "var(--color-medical-blue)" : "var(--color-text-primary)",
                      fontWeight: isActive ? 700 : 400, textAlign: "left",
                    }}
                  >
                    <div>
                      <div>{regionLabel(r)}</div>
                      <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 1 }}>
                        Bed ratio: {r.bedRatio.toFixed(2)} · Stunting: {r.stuntingRate.toFixed(1)}%
                      </div>
                    </div>
                    {isActive && <span style={{ fontSize: 10, background: "var(--color-medical-blue)", color: "white", borderRadius: 99, padding: "1px 6px", flexShrink: 0 }}>Aktif</span>}
                  </button>
                );
              })}

              {filteredSheet.length === 0 && (
                <div style={{ padding: "var(--spacing-xl)", textAlign: "center", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)", fontSize: "var(--font-size-body-sm)" }}>
                  Tidak ditemukan
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
