import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  HeartPulse,
  ShieldAlert,
  Target,
  X,
} from "lucide-react";
import TopBar from "../components/TopBar";
import {
  regionScoreRows,
  regionStatusClass,
  type RegionScoreRow,
} from "../data/regionScoreData";

interface ProgramRecommendationPageProps {
  onAIPanel?: () => void;
  year?: string;
  initialRegion?: string | null;
}

interface RecommendationCard {
  name: string;
  category: string;
  period: string;
  problem: string;
  action: string;
  target: string;
  status: string;
}

interface ProgramExportRow {
  nama_wilayah: string;
  skor_kesehatan: string;
  tingkat_urgensi: string;
  masalah_utama: string;
  program_rekomendasi_jatim: string;
  rekomendasi_tindakan: string;
  target_capaian: string;
  status_pelaksanaan: string;
}

function parseCsvRow(line: string): string[] {
  return [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)]
    .map((match) => (match[1] ?? match[2] ?? "").replace(/""/g, '"'));
}

const PROGRAM_CATALOG: Record<string, RecommendationCard> = {
  stunting: {
    name: "Percepatan Penurunan Stunting",
    category: "Gizi & KIA",
    period: "Jangka Menengah · 1–3 tahun",
    problem: "Prevalensi stunting tinggi dan masih berada di atas target.",
    action: "Penguatan Posyandu, pemantauan balita berisiko, edukasi gizi keluarga, pemberian makanan tambahan, dan pendampingan ibu hamil.",
    target: "Menurunkan angka stunting dan meningkatkan cakupan pemantauan balita.",
    status: "Perlu Tindak Lanjut",
  },
  mbg: {
    name: "MBG untuk Ibu Hamil, Ibu Menyusui, dan Balita",
    category: "Intervensi Gizi",
    period: "Segera–Jangka Pendek · 0–12 bulan",
    problem: "Risiko kekurangan gizi pada ibu dan balita.",
    action: "Penyaluran makanan bergizi untuk kelompok 3B yang tepat sasaran.",
    target: "Meningkatkan status gizi ibu hamil, ibu menyusui, dan balita.",
    status: "Direkomendasikan",
  },
  family: {
    name: "Tim Pendamping Keluarga",
    category: "Pendampingan",
    period: "Jangka Pendek · 3–12 bulan",
    problem: "Keluarga berisiko stunting membutuhkan pendampingan langsung.",
    action: "Pendampingan keluarga, edukasi kesehatan, pemantauan penerima bantuan, dan verifikasi kelompok berisiko.",
    target: "Meningkatkan ketepatan sasaran program dan kepatuhan pemantauan.",
    status: "Direkomendasikan",
  },
  posyandu: {
    name: "Penimbangan Bulanan Posyandu",
    category: "Layanan Komunitas",
    period: "Berkelanjutan · Rutin",
    problem: "Data pertumbuhan balita dan deteksi dini belum optimal.",
    action: "Penimbangan rutin, pencatatan pertumbuhan, pelaporan balita berisiko, dan tindak lanjut oleh Puskesmas.",
    target: "Meningkatkan cakupan pemantauan balita.",
    status: "Monitoring Rutin",
  },
  tbc: {
    name: "Eliminasi TBC",
    category: "Penyakit Menular",
    period: "Segera · 0–3 bulan",
    problem: "Penemuan kasus TBC dan keberhasilan pengobatan masih perlu ditingkatkan.",
    action: "Investigasi kontak, pelacakan kasus, pengobatan sesuai standar, dan pemantauan kepatuhan pasien.",
    target: "Meningkatkan penemuan kasus dan keberhasilan pengobatan TBC.",
    status: "Perlu Tindak Lanjut",
  },
  tbcScreening: {
    name: "Skrining Aktif TBC",
    category: "Deteksi Dini",
    period: "Jangka Pendek · 3–12 bulan",
    problem: "Kelompok berisiko belum seluruhnya mendapatkan pemeriksaan TBC.",
    action: "Skrining kelompok kontak erat dan populasi berisiko melalui Puskesmas serta layanan bergerak.",
    target: "Meningkatkan cakupan skrining dan penemuan kasus lebih dini.",
    status: "Direkomendasikan",
  },
  tbcTreatment: {
    name: "Tindak Lanjut Pengobatan TBC",
    category: "Tata Laksana",
    period: "Berkelanjutan · Rutin",
    problem: "Risiko putus obat dapat menghambat keberhasilan eliminasi TBC.",
    action: "Pendampingan minum obat, pengingat kontrol, dan penelusuran pasien yang tidak hadir.",
    target: "Meningkatkan kepatuhan dan keberhasilan pengobatan.",
    status: "Monitoring Rutin",
  },
  ckg: {
    name: "Cek Kesehatan Gratis (CKG)",
    category: "Penyakit Tidak Menular",
    period: "Segera · 0–3 bulan",
    problem: "Deteksi dini hipertensi, diabetes, dan kolesterol belum merata.",
    action: "Memperluas skrining faktor risiko PTM dan memastikan hasil pemeriksaan tercatat.",
    target: "Meningkatkan cakupan skrining penduduk sasaran.",
    status: "Direkomendasikan",
  },
  posbindu: {
    name: "Posbindu PTM",
    category: "Pencegahan PTM",
    period: "Berkelanjutan · Rutin",
    problem: "Pemantauan faktor risiko penyakit tidak menular belum konsisten.",
    action: "Pemeriksaan tekanan darah, gula darah, edukasi, dan pemantauan faktor risiko secara rutin.",
    target: "Meningkatkan kendali faktor risiko PTM di masyarakat.",
    status: "Monitoring Rutin",
  },
  medicine: {
    name: "Tindak Lanjut Obat di Puskesmas",
    category: "Tata Laksana PTM",
    period: "Segera–Jangka Pendek · 0–12 bulan",
    problem: "Pasien hasil skrining positif memerlukan tata laksana tanpa jeda.",
    action: "Pemberian obat, konseling, kontrol berkala, dan integrasi pembiayaan JKN.",
    target: "Meningkatkan pasien hipertensi dan diabetes yang terkendali.",
    status: "Perlu Tindak Lanjut",
  },
  primary: {
    name: "Integrasi Layanan Primer",
    category: "Akses Layanan",
    period: "Jangka Menengah · 1–3 tahun",
    problem: "Akses dan kesinambungan layanan dasar belum merata.",
    action: "Mengintegrasikan layanan berbasis siklus hidup di Puskesmas, Pustu, dan Posyandu.",
    target: "Meningkatkan akses serta kontinuitas layanan kesehatan primer.",
    status: "Direkomendasikan",
  },
  puskesmas: {
    name: "Penguatan Kapasitas Puskesmas",
    category: "Fasilitas Kesehatan",
    period: "Jangka Menengah · 1–3 tahun",
    problem: "Kapasitas fasilitas dan tenaga layanan primer belum memadai.",
    action: "Pemenuhan alat, tenaga, jam layanan, dan dukungan layanan bergerak untuk daerah sulit.",
    target: "Meningkatkan ketersediaan dan mutu layanan primer.",
    status: "Perlu Tindak Lanjut",
  },
  referral: {
    name: "Penguatan Sistem Rujukan",
    category: "Sistem Rujukan",
    period: "Jangka Pendek · 3–12 bulan",
    problem: "Keterlambatan rujukan dan ketidakseimbangan kapasitas layanan masih terjadi.",
    action: "Pemetaan kapasitas, koordinasi rujukan, dan pemantauan waktu respons pasien.",
    target: "Mempercepat rujukan dan meningkatkan utilisasi kapasitas layanan.",
    status: "Direkomendasikan",
  },
  immunization: {
    name: "Penguatan Imunisasi Dasar",
    category: "KIA & Imunisasi",
    period: "Segera–Jangka Pendek · 0–12 bulan",
    problem: "Cakupan imunisasi dasar belum mencapai target wilayah.",
    action: "Pelayanan imunisasi terjadwal, sweeping sasaran, dan edukasi keluarga.",
    target: "Meningkatkan cakupan imunisasi dasar lengkap.",
    status: "Perlu Tindak Lanjut",
  },
  tracking: {
    name: "Pelacakan Anak Belum Imunisasi",
    category: "Surveilans Program",
    period: "Segera · 0–3 bulan",
    problem: "Anak yang belum lengkap imunisasi belum seluruhnya teridentifikasi.",
    action: "Pemadanan data, kunjungan rumah, dan tindak lanjut melalui kader serta Puskesmas.",
    target: "Mengurangi jumlah anak nol dosis dan imunisasi tidak lengkap.",
    status: "Direkomendasikan",
  },
};

function programsFor(region: RegionScoreRow): RecommendationCard[] {
  if (region.id === "probolinggo-kab") {
    return [PROGRAM_CATALOG.stunting, PROGRAM_CATALOG.mbg, PROGRAM_CATALOG.family, PROGRAM_CATALOG.posyandu];
  }
  const context = `${region.lowestIndicator} ${region.priorityIssue}`.toLowerCase();
  if (context.includes("tbc")) {
    return [PROGRAM_CATALOG.tbc, PROGRAM_CATALOG.tbcScreening, PROGRAM_CATALOG.tbcTreatment, PROGRAM_CATALOG.ckg];
  }
  if (context.includes("ptm") || context.includes("hipertensi") || context.includes("diabetes")) {
    return [PROGRAM_CATALOG.ckg, PROGRAM_CATALOG.posbindu, PROGRAM_CATALOG.medicine, PROGRAM_CATALOG.primary];
  }
  if (context.includes("akses") || context.includes("tempat tidur") || context.includes("rujukan")) {
    return [PROGRAM_CATALOG.primary, PROGRAM_CATALOG.puskesmas, PROGRAM_CATALOG.referral, PROGRAM_CATALOG.ckg];
  }
  if (context.includes("imunisasi") || context.includes("kia")) {
    return [PROGRAM_CATALOG.immunization, PROGRAM_CATALOG.tracking, PROGRAM_CATALOG.posyandu, PROGRAM_CATALOG.family];
  }
  if (context.includes("stunting") || context.includes("gizi") || context.includes("balita")) {
    return [PROGRAM_CATALOG.stunting, PROGRAM_CATALOG.mbg, PROGRAM_CATALOG.family, PROGRAM_CATALOG.posyandu];
  }
  return [PROGRAM_CATALOG.ckg, PROGRAM_CATALOG.primary, PROGRAM_CATALOG.posbindu, PROGRAM_CATALOG.referral];
}

export default function ProgramRecommendationPage({
  onAIPanel,
  initialRegion,
}: ProgramRecommendationPageProps) {
  const defaultRegion = initialRegion ?? "Kabupaten Probolinggo";
  const [regionName, setRegionName] = useState(defaultRegion);
  const [selectedProgram, setSelectedProgram] = useState<RecommendationCard | null>(null);
  const [exportRows, setExportRows] = useState<ProgramExportRow[]>([]);

  useEffect(() => {
    fetch("/data/regional_program_recommendations.csv")
      .then((response) => response.text())
      .then((csv) => {
        const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
        const headers = parseCsvRow(headerLine);
        setExportRows(lines.map((line) => Object.fromEntries(parseCsvRow(line).map((value, index) => [headers[index], value])) as unknown as ProgramExportRow));
      })
      .catch(() => setExportRows([]));
  }, []);

  useEffect(() => {
    setRegionName(initialRegion ?? "Kabupaten Probolinggo");
  }, [initialRegion]);

  const selectedRegion = regionScoreRows.find((region) => region.name === regionName) ?? regionScoreRows[0];
  const selectedExport = exportRows.find((row) => row.nama_wilayah === selectedRegion.name);
  const recommendations = useMemo(() => selectedExport ? [{
    name: selectedExport.program_rekomendasi_jatim,
    category: "Program Rekomendasi Jatim",
    period: "Rencana Kerja TA 2026",
    problem: selectedExport.masalah_utama,
    action: selectedExport.rekomendasi_tindakan,
    target: selectedExport.target_capaian,
    status: selectedExport.status_pelaksanaan,
  }] : programsFor(selectedRegion), [selectedExport, selectedRegion]);
  const isProbolinggo = selectedRegion.id === "probolinggo-kab";
  const urgency = selectedExport?.tingkat_urgensi ?? (selectedRegion.status === "Baik" ? "Rendah" : selectedRegion.status === "Perlu Dipantau" ? "Sedang" : "Tinggi");
  const lowIndicators = isProbolinggo
    ? "Stunting, KIA, dan Cakupan Program"
    : selectedRegion.indicatorScores
        .slice()
        .sort((a, b) => a.value - b.value)
        .slice(0, 3)
        .map((item) => item.label)
        .join(", ");

  return (
    <div className="cura-page">
      <TopBar title="Rekomendasi Program Penanganan Kesehatan" onAIPanel={onAIPanel} />
      <div className="cura-page-content program-page-content">
        <div className="data-page-heading">
          <div>
            <div className="data-page-title">Rekomendasi Program Penanganan Kesehatan</div>
            <div className="data-page-subtitle">
              Rekomendasi tindakan disusun berdasarkan status wilayah, skor kesehatan, masalah utama, indikator rendah, dan kebutuhan layanan kesehatan.
            </div>
          </div>
          <label className="program-region-selector">
            <span>Pilih Wilayah</span>
            <select value={selectedRegion.name} onChange={(event) => setRegionName(event.target.value)}>
              {regionScoreRows.map((region) => <option key={region.id}>{region.name}</option>)}
            </select>
          </label>
        </div>

        <div className="program-profile-grid">
          <div className="program-profile-score">
            <span>Skor Kesehatan</span>
            <strong>{selectedExport?.skor_kesehatan ?? selectedRegion.score}<small>/100</small></strong>
            <span className={`regional-status-badge status-${regionStatusClass[selectedRegion.status]}`}>
              {selectedRegion.status}
            </span>
          </div>
          <div className="program-profile-item">
            <HeartPulse size={18} />
            <span>Masalah Utama</span>
            <strong>{selectedExport?.masalah_utama ?? selectedRegion.priorityIssue}</strong>
          </div>
          <div className="program-profile-item">
            <Target size={18} />
            <span>Indikator Rendah</span>
            <strong>{lowIndicators}</strong>
          </div>
          <div className="program-profile-item">
            <ShieldAlert size={18} />
            <span>Tingkat Urgensi</span>
            <strong>{urgency}</strong>
          </div>
          <div className="program-profile-item">
            <CheckCircle2 size={18} />
            <span>Rekomendasi Aktif</span>
            <strong>{recommendations.length} Program</strong>
          </div>
        </div>

        <div className="program-layout">
          <div>
            <div className="program-section-heading">
              <div className="data-page-title">{recommendations.length} Program Prioritas untuk {selectedRegion.name}</div>
              <div className="data-page-subtitle">Urutan program disesuaikan dengan masalah dan indikator terendah wilayah.</div>
            </div>
            <div className="program-card-grid">
              {recommendations.map((program, index) => (
                <article className="program-recommendation-card" key={program.name}>
                  <div className="program-card-header">
                    <span className="program-card-number">{index + 1}</span>
                    <div>
                      <div className="program-card-title">{program.name}</div>
                      <div className="program-badge-row">
                        <span className="program-category-badge">{program.category}</span>
                        <span className="program-time-badge"><Clock3 size={12} />{program.period}</span>
                      </div>
                    </div>
                  </div>
                  <div className="program-card-detail">
                    <span>Masalah</span>
                    <p>{program.problem}</p>
                  </div>
                  <div className="program-card-detail">
                    <span>Target Indikator</span>
                    <p>{program.target}</p>
                  </div>
                  <div className="program-card-footer">
                    <span className="program-followup-badge">{program.status}</span>
                    <button className="data-link-action" type="button" onClick={() => setSelectedProgram(program)}>
                      Detail <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="recommendation-basis-panel">
            <div className="data-panel-title">Dasar Rekomendasi</div>
            <div className="data-page-subtitle">Rekomendasi dibuat dari:</div>
            {[
              "Skor kesehatan wilayah",
              "Status prioritas wilayah",
              "Indikator dengan nilai rendah",
              "Beban penyakit",
              "Kondisi fasilitas kesehatan",
              "Capaian program kesehatan",
            ].map((item) => (
              <div key={item}><Check size={14} /><span>{item}</span></div>
            ))}
          </aside>
        </div>

        <div className="program-monitoring-section">
          <div>
            <div className="data-page-title">Monitoring Pelaksanaan Program</div>
            <div className="data-page-subtitle">Ringkasan kesiapan tindak lanjut untuk rekomendasi aktif di {selectedRegion.name}.</div>
          </div>
          <div className="program-monitoring-grid">
            {recommendations.map((program, index) => (
              <div className="program-monitoring-item" key={program.name}>
                <CheckCircle2 size={17} />
                <div>
                  <strong>{program.name}</strong>
                  <span>{program.status} · Tahap {index + 1} dari {recommendations.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="program-page-note">
          <ShieldAlert size={18} />
          <div>
            <strong>Catatan Pelaksanaan</strong>
            <span>
              Rekomendasi membantu penentuan prioritas program. Keputusan pelaksanaan, penetapan target, dan alokasi sumber daya tetap dilakukan oleh pemerintah daerah dan Dinas Kesehatan.
            </span>
          </div>
        </div>
      </div>

      {selectedProgram && (
        <>
          <div className="cura-drawer-overlay" onClick={() => setSelectedProgram(null)} />
          <aside className="cura-drawer recommendation-drawer" aria-label="Detail program">
            <div className="cura-drawer-header">
              <div>
                <div className="data-panel-title">Detail Program</div>
                <div className="data-page-subtitle">{selectedRegion.name}</div>
              </div>
              <button className="drawer-close" type="button" onClick={() => setSelectedProgram(null)} aria-label="Tutup detail">
                <X size={17} />
              </button>
            </div>
            <div className="cura-drawer-body">
              <div className="program-detail-title">{selectedProgram.name}</div>
              {[
                ["Kategori", selectedProgram.category],
                ["Waktu Pelaksanaan", selectedProgram.period],
                ["Latar Belakang Masalah", selectedProgram.problem],
                ["Tindakan yang Dilakukan", selectedProgram.action],
                ["Target Indikator", selectedProgram.target],
                ["Status Tindak Lanjut", selectedProgram.status],
              ].map(([label, value]) => (
                <div className="drawer-detail-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
