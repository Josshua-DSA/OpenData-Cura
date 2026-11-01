import { regionHealth } from "./healthData.ts";

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

const STATUS_GROUPS: Record<RegionScoreStatus, string[]> = {
  Baik: [
    "surabaya", "batu", "blitar-kota", "kediri-kota", "madiun-kota",
    "mojokerto-kota", "pasuruan-kota", "probolinggo-kota", "banyuwangi",
    "gresik", "tulungagung", "jombang",
  ],
  "Perlu Dipantau": [
    "malang-kota", "sidoarjo", "kediri-kab", "mojokerto-kab", "lamongan",
    "madiun-kab", "magetan", "pasuruan-kab", "ponorogo", "nganjuk",
    "ngawi", "blitar-kab", "tuban", "malang-kab",
  ],
  "Perlu Intervensi": [
    "jember", "pamekasan", "bondowoso", "lumajang", "situbondo",
    "sumenep", "trenggalek", "bojonegoro",
  ],
  "Prioritas Tinggi": ["probolinggo-kab", "sampang", "bangkalan", "pacitan"],
};

const SCORE_OVERRIDES: Record<string, number> = {
  surabaya: 84,
  "malang-kota": 79,
  sidoarjo: 71,
  jember: 57,
  "probolinggo-kab": 43,
  sampang: 41,
  bangkalan: 48,
  pamekasan: 54,
};

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

function statusFor(id: string): RegionScoreStatus {
  return (Object.keys(STATUS_GROUPS) as RegionScoreStatus[]).find((status) =>
    STATUS_GROUPS[status].includes(id),
  )!;
}

function scoreFor(status: RegionScoreStatus, index: number) {
  if (status === "Baik") return 88 - (index % 8);
  if (status === "Perlu Dipantau") return 78 - (index % 9);
  if (status === "Perlu Intervensi") return 58 - (index % 10);
  return 39 - (index % 7);
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
    const status = statusFor(region.id);
    const score = SCORE_OVERRIDES[region.id] ?? scoreFor(status, index);
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
