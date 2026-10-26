import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MapPinned,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import {
  regionScoreRows,
  regionStatusClass,
  type RegionScoreRow,
} from "../data/regionScoreData";

interface AllRegionsPageProps {
  onAIPanel?: () => void;
  year?: string;
  onYearChange?: (year: string) => void;
  onRecommendationNavigate?: (regionName: string) => void;
}

interface RegionFilters {
  year: string;
  region: string;
  status: string;
  indicator: string;
  query: string;
}

const DEFAULT_FILTERS: RegionFilters = {
  year: "Semua Tahun",
  region: "Semua Wilayah",
  status: "Semua Status",
  indicator: "Semua Indikator",
  query: "",
};

const PAGE_SIZE = 5;
type RegionSortOrder = "priority" | "score-asc" | "score-desc" | "name";

const STATUS_PRIORITY: Record<RegionScoreRow["status"], number> = {
  "Prioritas Tinggi": 0,
  "Perlu Intervensi": 1,
  "Perlu Dipantau": 2,
  Baik: 3,
};

const SCORE_LEGEND = [
  { range: "80–100", label: "Baik", level: "good" },
  { range: "60–79", label: "Perlu Dipantau", level: "watch" },
  { range: "40–59", label: "Perlu Intervensi", level: "intervention" },
  { range: "0–39", label: "Prioritas Tinggi", level: "critical" },
];

export default function AllRegionsPage({
  onAIPanel,
  year = "2024",
  onYearChange,
  onRecommendationNavigate,
}: AllRegionsPageProps) {
  const [draftFilters, setDraftFilters] = useState<RegionFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<RegionFilters>(DEFAULT_FILTERS);
  const [sortOrder, setSortOrder] = useState<RegionSortOrder>("priority");
  const [page, setPage] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState<RegionScoreRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(
    () => {
      const indicatorQuery = appliedFilters.indicator.toLowerCase();
      return regionScoreRows.filter((row) => {
        const context = `${row.lowestIndicator} ${row.priorityIssue} ${row.recommendation}`.toLowerCase();
        const lowestIndicators = row.indicatorScores
          .slice()
          .sort((a, b) => a.value - b.value)
          .slice(0, 3)
          .map((item) => item.label.toLowerCase());
        const matchesIndicator =
          appliedFilters.indicator === "Semua Indikator" ||
          appliedFilters.indicator === "Skor Kesehatan" ||
          context.includes(indicatorQuery) ||
          lowestIndicators.some((item) => item.includes(indicatorQuery)) ||
          (appliedFilters.indicator === "Rasio Tempat Tidur" && context.includes("akses"));
        const matchesRegion =
          appliedFilters.region === "Semua Wilayah" ||
          row.type === appliedFilters.region ||
          row.name === appliedFilters.region;
        return (
          row.name.toLowerCase().includes(appliedFilters.query.toLowerCase()) &&
          matchesRegion &&
          (appliedFilters.status === "Semua Status" || row.status === appliedFilters.status) &&
          matchesIndicator
        );
      }).sort((a, b) => {
        if (sortOrder === "priority") {
          return STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.score - b.score;
        }
        if (sortOrder === "score-asc") return a.score - b.score;
        if (sortOrder === "score-desc") return b.score - a.score;
        return a.name.localeCompare(b.name, "id");
      });
    },
    [appliedFilters, sortOrder],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectedAnalysisRegion =
    appliedFilters.region !== "Semua Wilayah" &&
    appliedFilters.region !== "Kabupaten" &&
    appliedFilters.region !== "Kota"
      ? filtered.find((row) => row.name === appliedFilters.region) ?? null
      : null;

  const yearAdjustment =
    appliedFilters.year === "2024" ? -2 : appliedFilters.year === "2025" ? -1 : 0;

  const scoreForView = (row: RegionScoreRow) => {
    if (appliedFilters.indicator === "Semua Indikator" || appliedFilters.indicator === "Skor Kesehatan") {
      return Math.max(0, Math.min(100, row.score + yearAdjustment));
    }
    const mappedIndicator =
      appliedFilters.indicator === "Rasio Tempat Tidur" ? "Akses Fasilitas" : appliedFilters.indicator;
    return row.indicatorScores.find((item) => item.label === mappedIndicator)?.value ?? row.score;
  };

  const updateDraftFilter = (key: keyof RegionFilters, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    setIsLoading(true);
    setShowSuccess(false);
    loadingTimer.current = setTimeout(() => {
      setAppliedFilters(draftFilters);
      setIsLoading(false);
      setShowSuccess(true);
      setPage(0);
    }, 650);
  };

  const resetFilters = () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setIsLoading(false);
    setShowSuccess(false);
    setSortOrder("priority");
    setPage(0);
  };

  useEffect(() => () => {
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
  }, []);

  const statusDistribution = [
    { label: "Baik", level: "good", count: filtered.filter((row) => row.status === "Baik").length },
    { label: "Perlu Dipantau", level: "watch", count: filtered.filter((row) => row.status === "Perlu Dipantau").length },
    { label: "Perlu Intervensi", level: "intervention", count: filtered.filter((row) => row.status === "Perlu Intervensi").length },
    { label: "Prioritas Tinggi", level: "critical", count: filtered.filter((row) => row.status === "Prioritas Tinggi").length },
  ];
  const largestStatusCount = Math.max(1, ...statusDistribution.map((item) => item.count));

  const issueForView = (row: RegionScoreRow) => {
    if (appliedFilters.indicator === "Stunting") return "Masalah gizi balita dan risiko stunting";
    return row.priorityIssue;
  };

  const recommendationForView = (row: RegionScoreRow) => {
    if (appliedFilters.indicator === "Stunting") {
      return "Percepatan Penurunan Stunting, MBG, Tim Pendamping Keluarga, dan Posyandu";
    }
    return row.recommendation;
  };

  return (
    <div className="cura-page">
      <TopBar
        title="Seluruh Wilayah Jawa Timur"
        year={year}
        onYearChange={onYearChange}
        onAIPanel={onAIPanel}
      />
      <div className="cura-page-content data-page-content">
        <div className="data-page-heading">
          <div>
            <div className="data-page-title">Seluruh Wilayah Jawa Timur</div>
            <div className="data-page-subtitle">
              Analisis kondisi kesehatan 38 kabupaten/kota berdasarkan skor kesehatan, akses layanan, beban penyakit, KIA, stunting, dan cakupan program.
            </div>
          </div>
        </div>

        <div className="interactive-filter-panel">
          <div className="interactive-filter-fields">
            <label className="data-filter-field">
              <span>Tahun</span>
              <select value={draftFilters.year} onChange={(event) => updateDraftFilter("year", event.target.value)}>
                {["Semua Tahun", "2024", "2025", "2026"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="data-filter-field">
              <span>Wilayah</span>
              <select value={draftFilters.region} onChange={(event) => updateDraftFilter("region", event.target.value)}>
                <option>Semua Wilayah</option>
                <option>Kabupaten</option>
                <option>Kota</option>
                {regionScoreRows.map((row) => <option key={row.id}>{row.name}</option>)}
              </select>
            </label>
            <label className="data-filter-field">
              <span>Status</span>
              <select value={draftFilters.status} onChange={(event) => updateDraftFilter("status", event.target.value)}>
                {["Semua Status", "Baik", "Perlu Dipantau", "Perlu Intervensi", "Prioritas Tinggi"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="data-filter-field">
              <span>Indikator</span>
              <select value={draftFilters.indicator} onChange={(event) => updateDraftFilter("indicator", event.target.value)}>
                {["Semua Indikator", "Skor Kesehatan", "Akses Fasilitas", "Rasio Tempat Tidur", "Beban Penyakit", "KIA", "Stunting", "Tenaga Kesehatan", "Cakupan Program"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="data-filter-field">
              <span>Pencarian</span>
              <div className="data-search data-search-control">
                <Search size={16} />
                <input
                  value={draftFilters.query}
                  onChange={(event) => updateDraftFilter("query", event.target.value)}
                  placeholder="Cari kabupaten atau kota"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters();
                  }}
                />
              </div>
            </label>
          </div>
          <div className="interactive-filter-actions">
            <button className="data-primary-action" type="button" onClick={applyFilters} disabled={isLoading}>
              {isLoading ? <LoaderCircle className="filter-loading-icon" size={16} /> : <BarChart3 size={16} />}
              {isLoading ? "Memperbarui..." : "Tampilkan Analisis"}
            </button>
            <button className="data-outline-action" type="button" onClick={resetFilters}>
              <RotateCcw size={15} /> Reset Filter
            </button>
          </div>
        </div>

        {showSuccess && !isLoading && (
          <div className="analysis-success-message">
            <CheckCircle2 size={15} />
            Data berhasil diperbarui berdasarkan filter yang dipilih.
          </div>
        )}

        {isLoading ? (
          <div className="analysis-loading" aria-label="Memperbarui data analitik">
            <div className="analysis-skeleton-row">
              {[1, 2, 3, 4, 5].map((item) => <span key={item} />)}
            </div>
            <div className="analysis-skeleton-table" />
          </div>
        ) : (
          <div className="analysis-results">
        <div className="data-summary-grid data-summary-grid-5">
          {[
            { value: filtered.length.toString(), label: "Wilayah Dianalisis", icon: MapPinned, tone: "blue" },
            { value: filtered.filter((row) => row.status === "Baik").length.toString(), label: "Wilayah Baik", icon: ShieldCheck, tone: "green" },
            { value: filtered.filter((row) => row.status === "Perlu Dipantau").length.toString(), label: "Wilayah Perlu Dipantau", icon: UsersRound, tone: "yellow" },
            { value: filtered.filter((row) => row.status === "Perlu Intervensi").length.toString(), label: "Wilayah Perlu Intervensi", icon: TriangleAlert, tone: "orange" },
            { value: filtered.filter((row) => row.status === "Prioritas Tinggi").length.toString(), label: "Wilayah Prioritas Tinggi", icon: TriangleAlert, tone: "red" },
          ].map(({ value, label, icon: Icon, tone }) => (
            <div className="data-summary-card" key={label}>
              <div className={`data-summary-icon tone-${tone}`}><Icon size={18} /></div>
              <div>
                <div className="data-summary-value">{value}</div>
                <div className="data-summary-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="analysis-overview-grid">
          <div className="analysis-chart-card">
            <div>
              <div className="data-panel-title">Perbandingan status kesehatan wilayah terfilter</div>
              <div className="data-page-subtitle">Jumlah wilayah pada setiap kategori berdasarkan filter analisis aktif.</div>
            </div>
            <div className="analysis-status-chart">
              {statusDistribution.map((item) => (
                <div className="analysis-status-row" key={item.label}>
                  <div><span>{item.label}</span><strong>{item.count}</strong></div>
                  <div className="analysis-status-track">
                    <div
                      className={`analysis-status-value score-${item.level}`}
                      style={{ "--status-width": `${(item.count / largestStatusCount) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedAnalysisRegion ? (
            <div className="selected-region-result">
              <div className="selected-region-result-header">
                <div>
                  <span>Hasil Analisis Wilayah</span>
                  <div className="data-panel-title">{selectedAnalysisRegion.name}</div>
                </div>
                <span className={`regional-status-badge status-${regionStatusClass[selectedAnalysisRegion.status]}`}>
                  {selectedAnalysisRegion.status}
                </span>
              </div>
              <div className="selected-region-metrics">
                <div><span>Skor Kesehatan</span><strong>{scoreForView(selectedAnalysisRegion)}/100</strong></div>
                <div><span>Indikator Rendah</span><strong>{selectedAnalysisRegion.lowestIndicator}</strong></div>
                <div><span>Masalah Utama</span><strong>{issueForView(selectedAnalysisRegion)}</strong></div>
              </div>
              <div className="selected-region-mini-chart">
                {selectedAnalysisRegion.indicatorScores.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <div><i style={{ "--mini-score": `${item.value}%` } as React.CSSProperties} /></div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="selected-region-program">
                <span>Rekomendasi Utama</span>
                <strong>{recommendationForView(selectedAnalysisRegion)}</strong>
              </div>
            </div>
          ) : (
            <div className="analysis-scope-card">
              <div className="data-panel-title">Cakupan Analisis Aktif</div>
              <div>
                <span>Tahun</span><strong>{appliedFilters.year}</strong>
              </div>
              <div>
                <span>Wilayah</span><strong>{appliedFilters.region}</strong>
              </div>
              <div>
                <span>Status</span><strong>{appliedFilters.status}</strong>
              </div>
              <div>
                <span>Indikator</span><strong>{appliedFilters.indicator}</strong>
              </div>
            </div>
          )}
        </div>

        <div className="data-table-card">
          <div className="data-table-toolbar">
            <div>
              <div className="data-panel-title">Daftar Kondisi Kesehatan Wilayah</div>
              <div className="data-page-subtitle">Data kabupaten dan kota berdasarkan skor kesehatan komposit.</div>
            </div>
            <div className="data-table-tools">
              <label className="data-table-sort">
                <span>Urutkan</span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as RegionSortOrder);
                    setPage(0);
                  }}
                  aria-label="Urutkan daftar wilayah"
                >
                  <option value="priority">Prioritas tertinggi</option>
                  <option value="score-asc">Skor terendah</option>
                  <option value="score-desc">Skor tertinggi</option>
                  <option value="name">Nama A–Z</option>
                </select>
              </label>
              <span>{filtered.length} wilayah ditemukan</span>
            </div>
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Wilayah</th>
                  <th>{appliedFilters.indicator === "Semua Indikator" ? "Skor Kesehatan" : `Skor ${appliedFilters.indicator}`}</th>
                  <th>Status Wilayah</th>
                  <th>Indikator Terendah</th>
                  <th>Masalah Utama</th>
                  <th>Rekomendasi Program</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td className="analysis-empty-state" colSpan={8}>
                      Tidak ada wilayah yang sesuai dengan kombinasi filter. Ubah pilihan atau gunakan Reset Filter.
                    </td>
                  </tr>
                ) : paginated.map((row) => {
                  const level = regionStatusClass[row.status];
                  const rowNumber = page * PAGE_SIZE + paginated.indexOf(row) + 1;
                  return (
                    <tr key={row.id}>
                      <td><span className="data-rank">{rowNumber}</span></td>
                      <td><strong>{row.name}</strong><small>{row.type}</small></td>
                      <td>
                        <div className="table-score">
                          <strong>{scoreForView(row)}<small>/100</small></strong>
                          <div className="table-score-track">
                            <div
                              className={`table-score-value score-${level}`}
                              style={{ "--table-score": `${scoreForView(row)}%` } as React.CSSProperties}
                            />
                          </div>
                        </div>
                      </td>
                      <td><span className={`regional-status-badge status-${level}`}>{row.status}</span></td>
                      <td>{row.lowestIndicator}</td>
                      <td>{issueForView(row)}</td>
                      <td><span className="table-recommendation">{recommendationForView(row)}</span></td>
                      <td>
                        <button className="data-link-action" type="button" onClick={() => setSelectedRegion(row)}>
                          Lihat Analisis <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="data-pagination">
            <span>
              Menampilkan {filtered.length ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length} wilayah
            </span>
            <div>
              <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft size={14} /> Sebelumnya
              </button>
              <span>Halaman {page + 1} dari {totalPages}</span>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}>
                Berikutnya <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="score-category-panel">
          <div>
            <div className="data-panel-title">Kategori Skor Wilayah</div>
            <div className="data-page-subtitle">Interpretasi kondisi kesehatan berdasarkan skor komposit wilayah.</div>
          </div>
          <div className="score-category-list">
            {SCORE_LEGEND.map((item) => (
              <div key={item.range}>
                <strong>{item.range}</strong>
                <span className={`regional-status-badge status-${item.level}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
          </div>
        )}
      </div>

      {selectedRegion && (
        <div className="drawer-layer">
          <div className="cura-drawer-overlay" onClick={() => setSelectedRegion(null)} />
          <aside className="cura-drawer region-detail-drawer" aria-label="Detail kesehatan wilayah">
            <div className="cura-drawer-header">
              <div>
                <div className="data-panel-title">Detail Wilayah</div>
                <div className="data-page-subtitle">{selectedRegion.name}</div>
              </div>
              <button className="drawer-close" type="button" onClick={() => setSelectedRegion(null)} aria-label="Tutup detail">
                <X size={17} />
              </button>
            </div>
            <div className="cura-drawer-body region-detail-body">
              <div className="drawer-score-card">
                <div>
                  <span>Skor kesehatan</span>
                  <strong>{selectedRegion.score}<small>/100</small></strong>
                </div>
                <span className={`regional-status-badge status-${regionStatusClass[selectedRegion.status]}`}>
                  {selectedRegion.status}
                </span>
              </div>

              <div className="region-problem-card">
                <span>Ringkasan masalah utama</span>
                <strong>{selectedRegion.priorityIssue}</strong>
                <p>
                  Indikator {selectedRegion.lowestIndicator.toLowerCase()} memerlukan penguatan program dan pemantauan lintas layanan.
                </p>
              </div>

              <div className="drawer-detail-row">
                <span>Indikator yang perlu ditingkatkan</span>
                <strong>{selectedRegion.lowestIndicator}</strong>
              </div>

              <div className="region-indicator-chart">
                <div className="data-panel-title">Skor Enam Indikator Kesehatan</div>
                {selectedRegion.indicatorScores.map((indicatorScore) => (
                  <div className="region-indicator-row" key={indicatorScore.label}>
                    <div><span>{indicatorScore.label}</span><strong>{indicatorScore.value}</strong></div>
                    <div className="region-indicator-track">
                      <div
                        className="region-indicator-value"
                        style={{ "--indicator-score": `${indicatorScore.value}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="region-top-programs">
                <div className="data-panel-title">Tiga Rekomendasi Program Teratas</div>
                {selectedRegion.topRecommendations.map((program, index) => (
                  <div key={program}>
                    <span>{index + 1}</span>
                    <strong>{program}</strong>
                  </div>
                ))}
              </div>

              <button
                className="data-primary-action region-recommendation-action"
                type="button"
                onClick={() => onRecommendationNavigate?.(selectedRegion.name)}
              >
                Lihat Rekomendasi Program <ArrowRight size={15} />
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
