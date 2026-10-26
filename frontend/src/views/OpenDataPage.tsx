import { useState } from "react";
import TopBar from "../components/TopBar";
import { Download, FileText, CheckCircle, X } from "lucide-react";

interface Dataset {
  file: string;
  name: string;
  desc: string;
  format: string;
  size: string;
  rows: string;
  lastUpdated: string;
}

const DATASETS: Dataset[] = [
  {
    file: "regional_health_index_scores.csv",
    name: "Skor Indeks Kesehatan Wilayah",
    desc: "Skor kesehatan komposit dan pilar indikator untuk 38 kabupaten/kota",
    format: "CSV",
    size: "5 KB",
    rows: "38 baris",
    lastUpdated: "Ekspor tersedia",
  },
  {
    file: "regional_program_recommendations.csv",
    name: "Rekomendasi Program Wilayah",
    desc: "Aksi intervensi, urgensi, dan target program per wilayah",
    format: "CSV",
    size: "16 KB",
    rows: "38 baris",
    lastUpdated: "Ekspor tersedia",
  },
  {
    file: "regional_clusters.csv",
    name: "Klaster Ketahanan Wilayah",
    desc: "Hasil klasifikasi klaster resiliensi layanan kesehatan",
    format: "CSV",
    size: "14 KB",
    rows: "38 baris",
    lastUpdated: "Ekspor tersedia",
  },
  {
    file: "bed_demand_forecast_2026.csv",
    name: "Proyeksi Kebutuhan Tempat Tidur 2026",
    desc: "Proyeksi kapasitas, rasio WHO, dan gap tempat tidur per wilayah",
    format: "CSV",
    size: "8 KB",
    rows: "38 baris",
    lastUpdated: "Ekspor tersedia",
  },
  {
    file: "disease_morbidity_trends.csv",
    name: "Tren Morbiditas Penyakit",
    desc: "Tren penyakit per wilayah dan periode pelaporan",
    format: "CSV",
    size: "201 KB",
    rows: "Lihat file",
    lastUpdated: "Ekspor tersedia",
  },
];

const FORMAT_FILTERS = ["Semua", "CSV"];
const PAGE_SIZE = 5;

interface OpenDataPageProps {
  onAIPanel?: () => void;
  year?: string;
}

export default function OpenDataPage({ onAIPanel }: OpenDataPageProps) {
  const [downloadModal, setDownloadModal] = useState<Dataset | null>(null);
  const [successToast, setSuccessToast]   = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [activeFormat, setActiveFormat]   = useState("Semua");
  const [page, setPage]                   = useState(0);

  function handleDownloadConfirm() {
    if (downloadModal) window.location.href = `/data/${downloadModal.file}`;
    setDownloadModal(null);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  }

  const filtered = DATASETS.filter((ds) => {
    const matchesSearch =
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = activeFormat === "Semua" || ds.format === activeFormat;
    return matchesSearch && matchesFormat;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="cura-page">
      <TopBar title="Open Data Kesehatan" onAIPanel={onAIPanel} />

      <div className="cura-page-content">
        <div style={{ marginBottom: "var(--spacing-xl)" }}>
          <h2 className="cura-section-title">Dataset Kesehatan Jawa Timur 2024</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-body-sm)", marginTop: "var(--spacing-xs)", lineHeight: 1.65, fontFamily: "var(--font-family-base)" }}>
            Data resmi kesehatan Jawa Timur tersedia untuk diunduh secara gratis. Semua dataset
            berlisensi terbuka dan dapat digunakan untuk penelitian, analisis, maupun pengembangan
            layanan publik.
          </p>
        </div>

        {/* ── Search + format filter bar ── */}
        <div style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap", alignItems: "center", marginBottom: "var(--spacing-xl)" }}>
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <FileText
              size={15}
              style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-secondary)", pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Cari dataset..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="cura-select"
              style={{
                width: "100%", paddingLeft: 32,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
            {FORMAT_FILTERS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => { setActiveFormat(fmt); setPage(0); }}
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "6px var(--spacing-md)",
                  borderRadius: 99,
                  fontFamily: "var(--font-family-base)",
                  fontSize: "var(--font-size-body-sm)",
                  fontWeight: activeFormat === fmt ? 700 : 500,
                  border: activeFormat === fmt
                    ? "1px solid var(--color-medical-blue)"
                    : "1px solid var(--color-border)",
                  background: activeFormat === fmt
                    ? "var(--color-light-blue)"
                    : "var(--color-white)",
                  color: activeFormat === fmt
                    ? "var(--color-medical-blue)"
                    : "var(--color-text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="data-table-card">
          <div className="data-table-scroll">
            <table className="data-table open-data-table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Format</th>
                  <th>Ukuran</th>
                  <th>Jumlah Data</th>
                  <th>Pembaruan Terakhir</th>
                  <th>Sumber</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length ? paginated.map((ds) => (
                  <tr key={ds.name}>
                    <td><strong>{ds.name}</strong><small>{ds.desc}</small></td>
                    <td><span className="monitoring-badge">{ds.format}</span></td>
                    <td>{ds.size}</td>
                    <td>{ds.rows}</td>
                    <td>{ds.lastUpdated}</td>
                    <td>Dinas Kesehatan Jawa Timur</td>
                    <td>
                      <button className="data-link-action" onClick={() => setDownloadModal(ds)}>
                        <Download size={14} /> Unduh
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="analysis-empty-state" colSpan={7}>Tidak ada dataset yang cocok dengan pencarian Anda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="data-pagination">
            <span>Menampilkan {filtered.length ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} dari {filtered.length} dataset</span>
            <div>
              <button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button>
              <span>Halaman {page + 1} dari {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}>Berikutnya</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Download confirmation modal ── */}
      {downloadModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "var(--color-overlay)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setDownloadModal(null)}
        >
          <div
            style={{
              background: "var(--color-white)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--spacing-2xl)",
              width: "100%", maxWidth: 420,
              margin: "var(--spacing-lg)",
              boxShadow: "var(--shadow-modal)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--spacing-xl)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "var(--font-size-heading-sm)", color: "var(--color-navy)", margin: 0, fontFamily: "var(--font-family-base)" }}>
                Konfirmasi Unduhan
              </h3>
              <button
                onClick={() => setDownloadModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 4, display: "flex" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: "var(--color-page-bg)",
              borderRadius: "var(--radius-md)",
              padding: "var(--spacing-md) var(--spacing-lg)",
              marginBottom: "var(--spacing-md)",
            }}>
              <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "var(--spacing-xs)", fontSize: "var(--font-size-body-sm)", fontFamily: "var(--font-family-base)" }}>
                {downloadModal.name}
              </div>
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
                Format: {downloadModal.format} · {downloadModal.size}
              </div>
            </div>

            <div style={{
              fontSize: "var(--font-size-caption)",
              color: "var(--color-text-secondary)",
              lineHeight: 1.65,
              marginBottom: "var(--spacing-xl)",
              padding: "var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-lg)",
              background: "var(--color-light-blue)",
              borderRadius: "var(--radius-sm)",
              borderLeft: "3px solid var(--color-medical-blue)",
              fontFamily: "var(--font-family-base)",
            }}>
              Data ini tersedia di bawah lisensi Creative Commons CC-BY 4.0. Anda bebas
              menggunakan, berbagi, dan mengadaptasi data ini dengan mencantumkan atribusi yang
              sesuai.
            </div>

            <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
              <button
                className="cura-btn cura-btn-secondary"
                onClick={() => setDownloadModal(null)}
                style={{ flex: 1, justifyContent: "center" }}
              >
                Batal
              </button>
              <button
                className="cura-btn cura-btn-primary"
                onClick={handleDownloadConfirm}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <Download size={15} />
                Unduh Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {successToast && (
        <div style={{
          position: "fixed", bottom: "var(--spacing-xl)", right: "var(--spacing-xl)",
          background: "var(--color-safe)",
          color: "white",
          borderRadius: "var(--radius-md)",
          padding: "var(--spacing-md) var(--spacing-xl)",
          display: "flex", alignItems: "center", gap: "var(--spacing-sm)",
          boxShadow: "var(--shadow-floating)",
          zIndex: 1100,
          fontWeight: 600,
          fontSize: "var(--font-size-body-sm)",
          fontFamily: "var(--font-family-base)",
        }}>
          <CheckCircle size={18} />
          Berhasil diunduh!
        </div>
      )}
    </div>
  );
}
