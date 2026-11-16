import { regionHealth } from "./healthData.ts";
import { regionScoreCsv } from "./regionScoreCsvData.ts";

export type RegionScoreStatus =
  | "Baik"
  | "Perlu Dipantau"
  | "Perlu Intervensi"
  | "Prioritas Tinggi";

export interface IndicatorScore {
  label: string;
  value: number;
}

export interface RegionScoreRow {
  id: string;
  name: string;
  type: "Kabupaten" | "Kota";
  score: number;
  status: RegionScoreStatus;
  lowestIndicator: string;
  priorityIssue: string;
  recommendation: string;
  topRecommendations: string[];
  indicatorScores: IndicatorScore[];
}

// Skor dan status dibaca dari regional_health_index_scores.csv lewat regionScoreCsvData.ts.
// Tidak ada lagi override skor hardcoded di sini.

const ANALYTIC_OVERRIDES: Record<string, {
  indicator: string;
  issue: string;
  recommendation: string;
  topRecommendations?: string[];
}> = {
  surabaya: {
    indicator: "Beban Penyakit PTM",
    issue: "Hipertensi dan diabetes",
    recommendation: "Skrining PTM dan tindak lanjut CKG",
    topRecommendations: ["Cek Kesehatan Gratis (CKG)", "Posbindu PTM", "Tindak lanjut obat di Puskesmas"],
  },
  "malang-kota": {
    indicator: "Beban Penyakit",
    issue: "Penguatan pencegahan PTM",
    recommendation: "CKG dan Posbindu PTM",
    topRecommendations: ["Cek Kesehatan Gratis (CKG)", "Posbindu PTM", "Edukasi gaya hidup sehat"],
  },
  sidoarjo: {
    indicator: "Rasio Tempat Tidur",
    issue: "Kapasitas layanan meningkat",
    recommendation: "Integrasi Layanan Primer dan penguatan rujukan",
    topRecommendations: ["Integrasi Layanan Primer", "Penguatan sistem rujukan", "Optimalisasi kapasitas tempat tidur"],
  },
  jember: {
    indicator: "KIA dan Stunting",
    issue: "Cakupan imunisasi dan gizi balita",
    recommendation: "Posyandu rutin, MBG, dan pendampingan keluarga",
    topRecommendations: ["Penimbangan Bulanan Posyandu", "MBG kelompok 3B", "Tim Pendamping Keluarga"],
  },
  "probolinggo-kab": {
    indicator: "Stunting",
    issue: "Stunting tinggi dan status gizi balita rendah",
    recommendation: "Percepatan Penurunan Stunting dan MBG",
    topRecommendations: ["Percepatan Penurunan Stunting", "MBG kelompok 3B", "Tim Pendamping Keluarga"],
  },
  sampang: {
    indicator: "Akses Fasilitas",
    issue: "Akses layanan kesehatan rendah",
    recommendation: "Penguatan Puskesmas dan layanan kesehatan primer",
    topRecommendations: ["Integrasi Layanan Primer", "Penguatan Puskesmas", "Penguatan sistem rujukan"],
  },
  bangkalan: {
    indicator: "KIA dan Stunting",
    issue: "Risiko kesehatan ibu dan anak",
    recommendation: "Tim Pendamping Keluarga dan Posyandu aktif",
    topRecommendations: ["Tim Pendamping Keluarga", "Penimbangan Bulanan Posyandu", "Penguatan layanan KIA"],
  },
  pamekasan: {
    indicator: "Cakupan Program",
    issue: "Pemantauan balita belum optimal",
    recommendation: "Penimbangan Posyandu dan penguatan pencatatan data",
    topRecommendations: ["Penimbangan Bulanan Posyandu", "Penguatan pencatatan gizi", "Tim Pendamping Keluarga"],
  },
};

const PROGRAMS_BY_ISSUE = {
  stunting: [
    "Percepatan Penurunan Stunting",
    "MBG kelompok 3B",
    "Tim Pendamping Keluarga",
  ],
  access: [
    "Integrasi Layanan Primer",
    "Penguatan Puskesmas",
    "Penguatan sistem rujukan",
  ],
  tbc: [
    "Eliminasi TBC",
    "Skrining aktif TBC",
    "Tindak lanjut pengobatan TBC",
  ],
  ptm: [
    "Cek Kesehatan Gratis (CKG)",
    "Posbindu PTM",
    "Tindak lanjut obat di Puskesmas",
  ],
  kia: [
    "Penguatan imunisasi dasar",
    "Pelacakan anak belum imunisasi",
    "Penimbangan Bulanan Posyandu",
  ],
  program: [
    "Cek Kesehatan Gratis (CKG)",
    "Integrasi Layanan Primer",
    "Penguatan pencatatan program",
  ],
};

function displayName(name: string) {
  return name.replace(/^Kab\.\s/, "Kabupaten ");
}

function statusFromScore(score: number): RegionScoreStatus {
  if (score >= 80) return "Baik";
  if (score >= 60) return "Perlu Dipantau";
  if (score >= 40) return "Perlu Intervensi";
  return "Prioritas Tinggi";
}

function issueProfile(region: (typeof regionHealth)[number]) {
  if (region.stuntingRate >= 24) {
    return {
      key: "stunting" as const,
      indicator: "Stunting",
      issue: `Prevalensi stunting ${region.stuntingRate.toFixed(1).replace(".", ",")}%`,
    };
  }
  if (region.bedRatio < 0.8) {
    return {
      key: "access" as const,
      indicator: "Akses Fasilitas",
      issue: "Kapasitas layanan dan rujukan terbatas",
    };
  }
  if (region.tb >= 550) {
    return {
      key: "tbc" as const,
      indicator: "Beban Penyakit",
      issue: "Penemuan dan pengobatan kasus TBC",
    };
  }
  if (region.aki >= 115) {
    return {
      key: "kia" as const,
      indicator: "KIA dan Imunisasi",
      issue: "Layanan ibu-anak dan imunisasi belum optimal",
    };
  }
  if (region.dbd >= 95) {
    return {
      key: "ptm" as const,
      indicator: "Beban Penyakit",
      issue: "Pengendalian penyakit dan deteksi dini",
    };
  }
  return {
    key: "program" as const,
    indicator: "Cakupan Program",
    issue: "Pemerataan cakupan layanan preventif",
  };
}

function clamp(value: number) {
  return Math.max(24, Math.min(96, Math.round(value)));
}

export const regionScoreRows: RegionScoreRow[] = regionHealth
  .map((region, index) => {
    const score = regionScoreCsv[displayName(region.name)]?.score ?? 0;
    const status = statusFromScore(score);
    const profile = issueProfile(region);
    const override = ANALYTIC_OVERRIDES[region.id];
    const programs = override?.topRecommendations ?? PROGRAMS_BY_ISSUE[profile.key];

    return {
      id: region.id,
      name: displayName(region.name),
      type: (region.type === "kota" ? "Kota" : "Kabupaten") as "Kota" | "Kabupaten",
      score,
      status,
      lowestIndicator: override?.indicator ?? profile.indicator,
      priorityIssue: override?.issue ?? profile.issue,
      recommendation: override?.recommendation ?? programs.slice(0, 2).join(" dan "),
      topRecommendations: programs,
      indicatorScores: [
        { label: "Akses Fasilitas", value: clamp(44 + region.bedRatio * 24) },
        { label: "Beban Penyakit", value: clamp(90 - region.tb / 18 - region.dbd / 28) },
        { label: "KIA", value: clamp(98 - region.aki / 2) },
        { label: "Stunting", value: clamp(100 - region.stuntingRate * 2.1) },
        { label: "Tenaga Kesehatan", value: clamp(48 + region.facilityCount / 2.2) },
        { label: "Cakupan Program", value: clamp(score + ((index % 5) - 2) * 3) },
      ],
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "id"));

export const regionStatusClass: Record<RegionScoreStatus, string> = {
  Baik: "good",
  "Perlu Dipantau": "watch",
  "Perlu Intervensi": "intervention",
  "Prioritas Tinggi": "critical",
};
