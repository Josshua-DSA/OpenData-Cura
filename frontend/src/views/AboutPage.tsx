import { Map, Database, BrainCircuit } from "lucide-react";

interface AboutPageProps {
  onNavigate: (page: string) => void;
  onAIPanel?: () => void;
}

const PURPOSE_CARDS = [
  {
    title: "Transparansi Data",
    body: "Menyajikan informasi kesehatan Jawa Timur dalam bentuk yang lebih mudah diakses dan dipahami.",
    bg: "#EAF4FB",
    color: "var(--color-medical-blue)",
  },
  {
    title: "Analisis Wilayah",
    body: "Membantu melihat perbedaan kondisi dan kapasitas kesehatan antar kabupaten/kota.",
    bg: "#E8F7F0",
    color: "var(--color-safe)",
  },
  {
    title: "Eksplorasi Data",
    body: "Memungkinkan pengguna mengeksplorasi peta, tren historis, fasilitas kesehatan, dan indikator kesehatan secara interaktif.",
    bg: "#FEF5E4",
    color: "var(--color-warning)",
  },
  {
    title: "Data untuk Keputusan",
    body: "Mendukung pemanfaatan data sebagai dasar penelitian, evaluasi, dan perencanaan kesehatan.",
    bg: "#FDEAEA",
    color: "var(--color-critical)",
  },
];

const COVERAGE_STATS = [
  { value: "38", label: "Kabupaten/Kota" },
  { value: "447", label: "Rumah Sakit" },
  { value: "977", label: "Puskesmas" },
  { value: "10", label: "Kelompok Penyakit Utama" },
  { value: "2021–2024", label: "Periode Data Historis" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Data Kesehatan", desc: "Pengumpulan data dari BPS, Dinas Kesehatan, dan sistem informasi fasilitas Jawa Timur." },
  { step: "02", title: "Integrasi Data", desc: "Normalisasi dan penggabungan dataset dari 38 kabupaten/kota ke dalam satu basis data terintegrasi." },
  { step: "03", title: "Analisis & Pemetaan", desc: "Visualisasi GIS, analisis choropleth, perhitungan indikator, dan deteksi kesenjangan wilayah." },
  { step: "04", title: "Informasi Publik", desc: "Penyajian hasil analisis dalam format yang mudah dipahami oleh masyarakat, peneliti, dan pembuat kebijakan." },
];

const INDICATORS = ["Bed Ratio", "Distribusi Dokter", "Stunting", "AKI", "AKB", "Morbiditas Rawat Inap", "Morbiditas Rawat Jalan"];

export default function AboutPage({ onNavigate, onAIPanel }: AboutPageProps) {
  return (
    <div className="cura-page-content">

      {/* ── Hero ── */}
      <div className="cura-card" style={{
        background: "linear-gradient(135deg, var(--color-navy) 0%, #1a5080 100%)",
        border: "none",
        padding: "var(--spacing-2xl) var(--spacing-2xl)",
        color: "white",
      }}>
        <div style={{ fontSize: "var(--font-size-caption)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7, marginBottom: "var(--spacing-md)", fontFamily: "var(--font-family-base)" }}>
          Tentang Tilik Jatim
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25, margin: "0 0 var(--spacing-lg)", fontFamily: "var(--font-family-base)", color: "white" }}>
          Data Kesehatan Jawa Timur<br />
          Lebih Mudah Dipahami.
        </h1>
        <p style={{ fontSize: "var(--font-size-body)", lineHeight: 1.7, opacity: 0.85, maxWidth: 620, margin: "0 0 var(--spacing-xl)", fontFamily: "var(--font-family-base)" }}>
          Tilik Jatim — HealthTrust Jatim adalah platform informasi kesehatan publik yang dirancang untuk membantu masyarakat,
          peneliti, mahasiswa, dan pemangku kebijakan memahami kondisi kesehatan di Jawa Timur melalui data yang
          terintegrasi, visualisasi interaktif, dan analisis berbasis wilayah.
        </p>
        <p style={{ fontSize: "var(--font-size-body)", lineHeight: 1.7, opacity: 0.8, maxWidth: 620, margin: 0, fontFamily: "var(--font-family-base)" }}>
          Tilik Jatim menggabungkan informasi fasilitas kesehatan, kapasitas tempat tidur, distribusi tenaga kesehatan,
          tren penyakit, stunting, serta indikator kesehatan ibu dan anak dari 38 kabupaten/kota di Jawa Timur.
        </p>
      </div>

      {/* ── Purpose cards ── */}
      <div>
        <div style={{ fontSize: "var(--font-size-heading-sm)", fontWeight: 700, color: "var(--color-navy)", marginBottom: "var(--spacing-lg)", fontFamily: "var(--font-family-base)" }}>
          Tujuan Tilik Jatim
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--spacing-lg)" }}>
          {PURPOSE_CARDS.map((c) => (
            <div key={c.title} className="cura-card" style={{ borderTop: `3px solid ${c.color}` }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--spacing-md)" }}>
                <div style={{ width: 14, height: 14, borderRadius: 2, background: c.color }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: "var(--font-size-body-sm)", color: "var(--color-navy)", marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-family-base)" }}>
                {c.title}
              </div>
              <div style={{ fontSize: "var(--font-size-body-sm)", color: "var(--color-text-secondary)", lineHeight: 1.6, fontFamily: "var(--font-family-base)" }}>
                {c.body}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Data coverage ── */}
      <div className="cura-card">
        <div style={{ fontSize: "var(--font-size-heading-sm)", fontWeight: 700, color: "var(--color-navy)", marginBottom: "var(--spacing-xl)", fontFamily: "var(--font-family-base)" }}>
          Cakupan Data
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--spacing-lg)", marginBottom: "var(--spacing-xl)" }}>
          {COVERAGE_STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-medical-blue)", lineHeight: 1.1, fontFamily: "var(--font-family-base)" }}>{s.value}</div>
              <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "var(--font-family-base)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "var(--spacing-lg)" }}>
          <div style={{ fontSize: "var(--font-size-body-sm)", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "var(--spacing-md)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-family-base)" }}>
            Indikator yang Tersedia
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
            {INDICATORS.map((ind) => (
              <span key={ind} style={{
                padding: "4px 12px",
                borderRadius: 99,
                background: "var(--color-light-blue)",
                color: "var(--color-medical-blue)",
                fontSize: "var(--font-size-caption)",
                fontWeight: 600,
                fontFamily: "var(--font-family-base)",
              }}>{ind}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div>
        <div style={{ fontSize: "var(--font-size-heading-sm)", fontWeight: 700, color: "var(--color-navy)", marginBottom: "var(--spacing-xl)", fontFamily: "var(--font-family-base)" }}>
          Cara Kerja Tilik Jatim
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--spacing-lg)" }}>
          {HOW_IT_WORKS.map((h, i) => (
            <div key={h.step} style={{ display: "flex", gap: "var(--spacing-md)" }}>
              {/* Connector line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--color-medical-blue)",
                  color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  fontFamily: "var(--font-family-base)",
                  flexShrink: 0,
                }}>{h.step}</div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: "var(--border-color)", minHeight: 24, marginTop: 4 }} />
                )}
              </div>
              <div style={{ paddingBottom: "var(--spacing-xl)" }}>
                <div style={{ fontWeight: 700, fontSize: "var(--font-size-body-sm)", color: "var(--color-navy)", marginBottom: 4, fontFamily: "var(--font-family-base)" }}>
                  {h.title}
                </div>
                <div style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", lineHeight: 1.6, fontFamily: "var(--font-family-base)" }}>
                  {h.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Closing CTA ── */}
      <div className="cura-card" style={{ background: "var(--color-light-blue)", border: "1px solid #C3DFF5", textAlign: "center", padding: "var(--spacing-2xl)" }}>
        <div style={{ fontSize: "var(--font-size-heading)", fontWeight: 700, color: "var(--color-navy)", marginBottom: "var(--spacing-sm)", fontFamily: "var(--font-family-base)" }}>
          Jelajahi Data Kesehatan Jawa Timur
        </div>
        <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 var(--spacing-xl)", fontFamily: "var(--font-family-base)", maxWidth: 480, marginInline: "auto" }}>
          Gunakan Tilik Jatim untuk melihat kondisi kesehatan, membandingkan wilayah, menemukan fasilitas,
          dan memahami tren kesehatan Jawa Timur.
        </p>
        <div style={{ display: "flex", gap: "var(--spacing-md)", justifyContent: "center", flexWrap: "wrap" }}>
          <button className="cura-btn cura-btn-primary" onClick={() => onNavigate("healthmap")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px" }}>
            <Map size={16} /> Explore Health Map
          </button>
          <button className="cura-btn cura-btn-secondary" onClick={() => onNavigate("opendata")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px" }}>
            <Database size={16} /> Explore Open Data
          </button>
          <button className="cura-btn cura-btn-secondary" onClick={onAIPanel} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px" }}>
            <BrainCircuit size={16} /> Ask Tilik Jatim AI
          </button>
        </div>
      </div>

      {/* ── Footer note ── */}
      <div style={{ textAlign: "center", padding: "var(--spacing-md) 0 var(--spacing-sm)", fontSize: "var(--font-size-caption)", color: "var(--color-text-secondary)", fontFamily: "var(--font-family-base)" }}>
        Tilik Jatim — HealthTrust Jatim · Platform Informasi Kesehatan Publik · Provinsi Jawa Timur, Indonesia
        <br />Data tersedia: 2021–2024 · 38 Kabupaten/Kota
      </div>
    </div>
  );
}
