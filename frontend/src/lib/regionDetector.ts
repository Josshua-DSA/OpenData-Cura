import { regionHealth, type RegionHealth } from "../data/healthData.ts";
import { regionScoreRows, type RegionScoreRow } from "../data/regionScoreData.ts";

export interface EnrichedRegion {
  id: string;
  name: string; // contoh: "Kabupaten Tulungagung" atau "Kota Surabaya"
  baseName: string; // contoh: "tulungagung", "blitar"
  baseNameNoSpace: string;
  type: "kabupaten" | "kota";
  isTwin: boolean;
  score: number;
  status: string;
  stunting: number;
  bedRatio: number;
  nakesScore: number;
  facilityCount: number;
  tb: number;
  dbd: number;
  pneumonia: number;
  weakness: string;
  recommendation: string;
  topRecommendations: string[];
}

/**
 * Normalisasi teks: huruf kecil, hapus kata kabupaten/kota, tanda baca, dan spasi ganda.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\b(kabupaten|kab\.?|kota)\b/gi, " ")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Membangun data 38 kabupaten/kota secara dinamis langsung dari data sumber.
 */
export function buildEnrichedRegions(): {
  regions: EnrichedRegion[];
  baseNameMap: Map<string, EnrichedRegion[]>;
  sortedBaseNames: string[];
} {
  // Hitung frekuensi baseName untuk mendeteksi nama kembar (twin) secara otomatis
  const baseCount = new Map<string, number>();
  for (const h of regionHealth) {
    const rawBase = h.name.replace(/^(kab\.?|kota)\s*/i, "");
    const base = normalize(rawBase);
    baseCount.set(base, (baseCount.get(base) || 0) + 1);
  }

  const scoreMap = new Map<string, RegionScoreRow>();
  for (const row of regionScoreRows) {
    scoreMap.set(row.id, row);
  }

  const regions: EnrichedRegion[] = regionHealth.map((h: RegionHealth) => {
    const scoreRow = scoreMap.get(h.id);
    const rawBase = h.name.replace(/^(kab\.?|kota)\s*/i, "").trim();
    const base = normalize(rawBase);
    const baseNoSpace = base.replace(/\s+/g, "");
    const isTwin = (baseCount.get(base) || 0) > 1;

    const prefix = h.type === "kota" ? "Kota" : "Kabupaten";
    const name = `${prefix} ${rawBase}`;

    const nakesScore =
      scoreRow?.indicatorScores.find((i) => i.label === "Tenaga Kesehatan")?.value ??
      Math.min(96, Math.max(24, Math.round(48 + h.facilityCount / 2.2)));

    const programs = scoreRow?.topRecommendations ?? [scoreRow?.recommendation || "Pemerataan layanan"];
    const recommendation = scoreRow?.recommendation || programs.slice(0, 2).join(" dan ");

    return {
      id: h.id,
      name,
      baseName: base,
      baseNameNoSpace: baseNoSpace,
      type: h.type,
      isTwin,
      score: scoreRow?.score ?? 50,
      status: scoreRow?.status ?? (h.priorityLevel === "high" ? "Prioritas Tinggi" : "Perlu Dipantau"),
      stunting: h.stuntingRate,
      bedRatio: h.bedRatio,
      nakesScore,
      facilityCount: h.facilityCount,
      tb: h.tb,
      dbd: h.dbd,
      pneumonia: h.pneumonia,
      weakness: scoreRow?.priorityIssue ?? "Akses dan fasilitas kesehatan",
      recommendation,
      topRecommendations: programs,
    };
  });

  const baseNameMap = new Map<string, EnrichedRegion[]>();
  for (const reg of regions) {
    const list = baseNameMap.get(reg.baseName) || [];
    list.push(reg);
    baseNameMap.set(reg.baseName, list);
  }

  // Urutkan nama dasar dari yang terpanjang ke terpendek
  const sortedBaseNames = Array.from(baseNameMap.keys()).sort(
    (a, b) => b.length - a.length || b.localeCompare(a)
  );

  return { regions, baseNameMap, sortedBaseNames };
}

// Inisialisasi registry dari data sumber
const REGISTRY = buildEnrichedRegions();

export function getAllEnrichedRegions(): EnrichedRegion[] {
  return REGISTRY.regions;
}

export function getTopRegions(limit = 3): EnrichedRegion[] {
  return [...REGISTRY.regions].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getBottomRegions(limit = 5): EnrichedRegion[] {
  return [...REGISTRY.regions].sort((a, b) => a.score - b.score).slice(0, limit);
}

export interface DetectResult {
  region?: EnrichedRegion;
  regions?: EnrichedRegion[];
  unrecognizedMention?: boolean;
}

/**
 * Mendeteksi wilayah dari pertanyaan pengguna sesuai seluruh aturan:
 * - Urutkan dari nama terpanjang
 * - Normalisasi teks dan dukung salah ketik spasi (misal 'tulung agung' -> 'tulungagung')
 * - Tangani nama kembar kota/kabupaten
 * - Deteksi multi-wilayah jika ada perbandingan (contoh: 'bandingkan surabaya dan sampang')
 * - Deteksi jika pertanyaan menyebut kabupaten/kota tetapi wilayah tidak ditemukan
 */
export function detectRegion(query: string): DetectResult {
  const rawLower = query.toLowerCase();
  const normQuery = normalize(query);
  const noSpaceQuery = normQuery.replace(/\s+/g, "");

  const wantsKota = /\bkota\b/i.test(rawLower);
  const wantsKab = /\b(kabupaten|kab\.?)\b/i.test(rawLower);

  const matchedBases: string[] = [];

  for (const base of REGISTRY.sortedBaseNames) {
    const baseNoSpace = base.replace(/\s+/g, "");

    // Cek kecocokan kata utuh atau variasi tanpa spasi (misal tulung agung -> tulungagung)
    const wordRegex = new RegExp(`\\b${base}\\b`, "i");
    if (wordRegex.test(normQuery) || noSpaceQuery.includes(baseNoSpace)) {
      if (!matchedBases.includes(base)) {
        matchedBases.push(base);
      }
    }
  }

  const detectedRegions: EnrichedRegion[] = [];

  for (const base of matchedBases) {
    const candidates = REGISTRY.baseNameMap.get(base) || [];

    if (candidates.length === 1) {
      detectedRegions.push(candidates[0]);
    } else if (candidates.length > 1) {
      // Nama kembar: Kediri, Malang, Blitar, Madiun, Mojokerto, Pasuruan, Probolinggo
      const kotaRegex = new RegExp(`\\bkota\\s+${base}\\b|\\b${base}\\s+kota\\b`, "i");
      const kabRegex = new RegExp(`\\b(kabupaten|kab\\.?)\\s+${base}\\b|\\b${base}\\s+(kabupaten|kab\\.?)\\b`, "i");

      if (kotaRegex.test(rawLower)) {
        const kotaMatch = candidates.find((c) => c.type === "kota");
        detectedRegions.push(kotaMatch || candidates[0]);
      } else if (kabRegex.test(rawLower)) {
        const kabMatch = candidates.find((c) => c.type === "kabupaten");
        detectedRegions.push(kabMatch || candidates[0]);
      } else if (wantsKota && !wantsKab) {
        const kotaMatch = candidates.find((c) => c.type === "kota");
        detectedRegions.push(kotaMatch || candidates[0]);
      } else {
        const defaultKab = candidates.find((c) => c.type === "kabupaten");
        detectedRegions.push(defaultKab || candidates[0]);
      }
    }
  }

  if (detectedRegions.length > 0) {
    return {
      region: detectedRegions[0],
      regions: detectedRegions,
    };
  }

  // Cek apakah pertanyaan menyebut 'kabupaten' atau 'kota' diikuti kata tertentu tetapi tidak terdaftar
  const mentionsGovType = /\b(kabupaten|kab\.?|kota)\s+([a-zA-Z]+)/i.test(query);
  if (mentionsGovType) {
    return { unrecognizedMention: true };
  }

  return {};
}

/**
 * Menyusun blok teks "DATA WILAYAH [nama]" untuk prompt Gemini.
 * Mendukung objek tunggal maupun array wilayah.
 */
export function buildDataWilayahBlock(regionOrRegions: EnrichedRegion | EnrichedRegion[]): string {
  const list = Array.isArray(regionOrRegions) ? regionOrRegions : [regionOrRegions];
  return list
    .map((region) =>
      [
        `DATA WILAYAH ${region.name}:`,
        `- Skor Kesehatan: ${region.score}/100 (Status: ${region.status})`,
        `- Prevalensi Stunting: ${region.stunting.toFixed(1).replace(".", ",")}%`,
        `- Rasio Tempat Tidur: ${region.bedRatio.toFixed(2).replace(".", ",")} per 1.000 penduduk`,
        `- Rasio Tenaga Kesehatan: ${region.nakesScore}/100`,
        `- Jumlah Fasilitas Kesehatan: ${region.facilityCount} faskes aktif`,
        `- Penyakit Utama: Tuberkulosis (${region.tb} kasus), DBD (${region.dbd} kasus), Pneumonia (${region.pneumonia} kasus)`,
        `- Kelemahan Indikator: ${region.weakness}`,
        `- Rekomendasi Program Terpilih: ${region.recommendation}`,
      ].join("\n")
    )
    .join("\n\n");
}

/* =========================================================================
 * PEMISAHAN DETEKSI INDIKATOR, ARAH, DAN PENYUSUNAN BLOK PERINGKAT
 * ========================================================================= */

export type IndicatorKey = "stunting" | "bedRatio" | "nakes" | "facilities" | "score";

export interface IndicatorMeta {
  key: IndicatorKey;
  name: string;
  unit: string;
  worstIs: "high" | "low"; // 'high' jika angka tinggi = buruk (stunting), 'low' jika angka rendah = buruk (skor/tempat tidur/nakes/faskes)
  getValue: (r: EnrichedRegion) => number;
  formatValue: (r: EnrichedRegion) => string;
}

export const INDICATOR_METAS: Record<IndicatorKey, IndicatorMeta> = {
  stunting: {
    key: "stunting",
    name: "Prevalensi Stunting",
    unit: "%",
    worstIs: "high",
    getValue: (r) => r.stunting,
    formatValue: (r) => `${r.stunting.toFixed(1).replace(".", ",")}%`,
  },
  bedRatio: {
    key: "bedRatio",
    name: "Rasio Tempat Tidur",
    unit: "per 1.000 penduduk",
    worstIs: "low",
    getValue: (r) => r.bedRatio,
    formatValue: (r) => `${r.bedRatio.toFixed(2).replace(".", ",")} per 1.000 penduduk`,
  },
  nakes: {
    key: "nakes",
    name: "Rasio Tenaga Kesehatan",
    unit: "/100",
    worstIs: "low",
    getValue: (r) => r.nakesScore,
    formatValue: (r) => `${r.nakesScore}/100`,
  },
  facilities: {
    key: "facilities",
    name: "Jumlah Fasilitas Kesehatan",
    unit: "faskes aktif",
    worstIs: "low",
    getValue: (r) => r.facilityCount,
    formatValue: (r) => `${r.facilityCount} faskes aktif`,
  },
  score: {
    key: "score",
    name: "Skor Kesehatan",
    unit: "/100",
    worstIs: "low",
    getValue: (r) => r.score,
    formatValue: (r) => `${r.score}/100 (Status: ${r.status})`,
  },
};

/**
 * Mendeteksi indikator yang dimaksud dalam teks pertanyaan.
 * Jika tidak ada indikator spesifik, mengembalikan skor kesehatan.
 */
/**
 * Mendeteksi SEMUA indikator yang dimaksud dalam teks pertanyaan (array).
 * Jika tidak ada indikator spesifik, mengembalikan [skor kesehatan].
 */
/**
 * Versi strict: mengembalikan array KOSONG jika tidak ada kata kunci indikator
 * (tanpa default skor). Dipakai oleh resolveContext untuk membedakan
 * "pengguna menyebut indikator baru" vs "warisi dari riwayat".
 */
export function detectIndicatorsStrict(text: string): IndicatorMeta[] {
  const q = text.toLowerCase();
  const found: IndicatorMeta[] = [];

  // 1. Stunting / Gizi Balita
  if (/\b(stunting|tengkes|gizi\s+buruk|gizi\s+kurang|gizi\s+balita)\b/i.test(q)) {
    found.push(INDICATOR_METAS.stunting);
  }

  // 2. Rasio Tempat Tidur / Ranjang / Kapasitas Rawat Inap
  if (/\b(tempat\s+tidur|ranjang|bed\s*ratio|kapasitas\s+rawat\s+inap|daya\s+tampung|rasio\s+tt)\b/i.test(q)) {
    found.push(INDICATOR_METAS.bedRatio);
  }

  // 3. Tenaga Kesehatan / Dokter / Medis
  if (/\b(tenaga\s+kesehatan|nakes|dokter|tenaga\s+medis|paramedis|medis)\b/i.test(q)) {
    found.push(INDICATOR_METAS.nakes);
  }

  // 4. Jumlah Fasilitas Kesehatan / Puskesmas / Rumah Sakit
  if (/\b(jumlah\s+fasilitas|fasilitas\s+kesehatan|faskes|puskesmas|rumah\s+sakit|sarana\s+kesehatan)\b/i.test(q)) {
    found.push(INDICATOR_METAS.facilities);
  }

  // 5. Skor Kesehatan disebut eksplisit, atau default jika tidak ada indikator spesifik
  if (/\b(skor|nilai\s+kesehatan|indeks\s+kesehatan)\b/i.test(q)) {
    found.push(INDICATOR_METAS.score);
  }

  // Hapus duplikat (pertahankan urutan)
  return found.filter((m, i) => found.findIndex((x) => x.key === m.key) === i);
}

/**
 * Mendeteksi SEMUA indikator yang dimaksud dalam teks pertanyaan (array).
 * Jika tidak ada indikator spesifik, mengembalikan [skor kesehatan].
 */
export function detectIndicators(text: string): IndicatorMeta[] {
  const found = detectIndicatorsStrict(text);
  if (found.length === 0) {
    found.push(INDICATOR_METAS.score);
  }
  return found;
}

/** Kompatibilitas mundur: indikator pertama yang terdeteksi. */
export function detectIndicator(text: string): IndicatorMeta {
  return detectIndicators(text)[0];
}

export type RawDirection = "high" | "low" | "worst" | "best" | "default";

/**
 * Mendeteksi SEMUA arah pemeringkatan dalam teks pertanyaan (array).
 * Definisi istilah (sesuai spesifikasi):
 * - "prioritas tertinggi" = skor kesehatan TERENDAH (paling butuh intervensi) -> arah "low"
 * - "prioritas terendah"  = skor kesehatan TERTINGGI -> arah "high"
 * - "skor tertinggi/terendah" = arti harfiah nilai skor.
 */
export function detectDirectionsStrict(text: string): RawDirection[] {
  const q = text.toLowerCase();
  const dirs: RawDirection[] = [];

  // --- Klausa "prioritas ..." diproses lebih dulu agar kata arah di dalamnya
  // --- tidak salah dipetakan (misal "prioritas tertinggi" = skor TERENDAH).
  let qStripped = q;
  const prioMatch = q.match(/\bprioritas\b([^\n.,;?]{0,80})/i);
  if (prioMatch) {
    const clause = prioMatch[1];
    const prioHighHits = clause.match(/\b(tertinggi|terbanyak|terbesar|teratas|tinggi|utama)\b/gi) || [];
    const prioLowHits = clause.match(/\b(terendah|tersedikit|terkecil|terbawah|rendah)\b/gi) || [];
    if (prioHighHits.length > 0) {
      // Prioritas tertinggi = skor kesehatan TERENDAH (paling butuh intervensi)
      dirs.push("low");
    }
    if (prioLowHits.length > 0) {
      // Prioritas terendah = skor kesehatan TERTINGGI
      dirs.push("high");
    }
    if (prioHighHits.length === 0 && prioLowHits.length === 0) {
      // "prioritas" tanpa arah -> dianggap paling kritis
      dirs.push("worst");
    }
    // Hapus seluruh klausa prioritas agar kata arahnya tidak terdeteksi ulang
    qStripped = q.replace(prioMatch[0], " ");
  }

  if (/\b(tertinggi|terbanyak|terbesar|teratas|paling\s+tinggi|paling\s+banyak|paling\s+besar)\b/i.test(qStripped)) {
    if (!dirs.includes("high")) dirs.push("high");
  }

  if (/\b(terendah|tersedikit|terkecil|terbawah|paling\s+rendah|paling\s+sedikit|paling\s+kecil)\b/i.test(qStripped)) {
    if (!dirs.includes("low")) dirs.push("low");
  }

  if (
    /\b(terparah|terburuk|paling\s+parah|paling\s+buruk|paling\s+kritis|paling\s+rentan|perlu\s+diperhatikan|perlu\s+dibantu|paling\s+bermasalah)\b/i.test(qStripped)
  ) {
    if (!dirs.includes("worst")) dirs.push("worst");
  }

  if (/\b(terbaik|paling\s+baik|paling\s+bagus|paling\s+sehat|juara|unggul)\b/i.test(qStripped)) {
    if (!dirs.includes("best")) dirs.push("best");
  }

  return dirs;
}

/**
 * Versi non-strict: mengembalikan ["default"] jika tidak ada arah terdeteksi.
 */
export function detectDirections(text: string): RawDirection[] {
  const dirs = detectDirectionsStrict(text);
  return dirs.length === 0 ? ["default"] : dirs;
}

/** Kompatibilitas mundur: arah pertama yang terdeteksi. */
export function detectDirection(text: string): RawDirection {
  return detectDirections(text)[0];
}

/** Peta kata bilangan bahasa Indonesia 1 sampai 10. */
const NUMBER_WORDS: Record<string, number> = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
};

/**
 * Membaca jumlah N dari pertanyaan secara strict.
 * Mengembalikan null jika tidak ada angka/kata bilangan (tanpa default).
 * Mendukung: "top 10", "10 nya", "sepuluh", "lima besar", "tiga wilayah", dll.
 * Hasil dibatasi maksimal 38 (jumlah kabupaten/kota di Jawa Timur).
 */
export function detectNStrict(text: string): number | null {
  const q = text.toLowerCase();

  // 1. Angka eksplisit: "top 10", "10 nya", "5 besar", "3 daerah", "tambah jadi 8"
  const matchDigits = q.match(
    /\b(?:top\s*(\d+)|(\d+)\s*(?:nya|besar|wilayah|kabupaten|kota|daerah|teratas|terbawah|tertinggi|terendah|terbanyak|tersedikit|terbaik|terburuk))\b/i
  );
  if (matchDigits) {
    const n = parseInt(matchDigits[1] || matchDigits[2], 10);
    if (n >= 1) return Math.min(n, 38);
  }

  // 1b. Angka telanjang pada pesan singkat: "tambah jadi 8", "8 dong"
  const bareDigits = q.match(/\b(\d{1,2})\b/);
  if (bareDigits) {
    const n = parseInt(bareDigits[1], 10);
    if (n >= 1) return Math.min(n, 38);
  }

  // 2. Kata bilangan 1-10: "sepuluh", "lima besar", "tiga wilayah"
  const wordMatch = q.match(
    /\b(sepuluh|sembilan|delapan|tujuh|enam|lima|empat|tiga|dua|satu)\s*(?:besar|nya|wilayah|kabupaten|kota|daerah|teratas|terbawah|tertinggi|terendah|terbanyak|tersedikit|terbaik|terburuk)?\b/i
  );
  if (wordMatch) {
    const n = NUMBER_WORDS[wordMatch[1].toLowerCase()];
    if (n) return Math.min(n, 38);
  }

  return null;
}

/**
 * Membaca jumlah N dari pertanyaan (non-strict, default 5).
 */
export function detectLimit(text: string, defaultLimit = 5): number {
  return detectNStrict(text) ?? defaultLimit;
}

export interface HistoryMessage {
  role: string;
  /** Mendukung field 'content' atau 'text' sesuai format riwayat klien. */
  content?: string;
  text?: string;
}

export interface ResolvedContext {
  /** Indikator yang berlaku (sudah digabung riwayat; default skor jika riwayat kosong). */
  indicators: IndicatorMeta[];
  /** Arah yang berlaku (sudah digabung riwayat; default ["default"]). */
  directions: RawDirection[];
  /** Wilayah yang berlaku (pesan terbaru jika menyebut wilayah baru, jika tidak warisan riwayat). */
  regions: EnrichedRegion[];
  /** Wilayah yang disebut EKSPLISIT pada pesan terbaru (kosong jika tidak ada). */
  explicitRegions: EnrichedRegion[];
  /** Jumlah N yang berlaku (pesan terbaru > riwayat > null). */
  n: number | null;
  /** Nama indikator + label arah gabungan, untuk kebutuhan prompt. */
  contextLabel: string;
}

/**
 * Menyelesaikan konteks pertanyaan lanjutan:
 * - Deteksi indikator/arah/wilayah/N dari pesan terbaru.
 * - Untuk elemen yang kosong, telusuri pesan pengguna sebelumnya (terbaru -> lama)
 *   dan warisi nilainya.
 * - Jika pengguna menyebut indikator/wilayah baru secara eksplisit, elemen itu
 *   TIDAK mewarisi konteks lama (topik berganti).
 * - Default skor kesehatan hanya dipakai jika seluruh riwayat tidak memuat indikator.
 */
export function resolveContext(
  userMessage: string,
  history: HistoryMessage[] = []
): ResolvedContext {
  const userTurns = history
    .filter((m) => m && m.role === "user")
    .map((m) => (typeof m.content === "string" ? m.content : m.text) || "")
    .filter((t) => t.trim().length > 0);

  // --- Indikator: pesan terbaru dulu; jika kosong, warisi dari riwayat (terbaru -> lama).
  let indicators = detectIndicatorsStrict(userMessage);
  if (indicators.length === 0) {
    for (let i = userTurns.length - 1; i >= 0; i--) {
      const prev = detectIndicatorsStrict(userTurns[i]);
      if (prev.length > 0) {
        indicators = prev;
        break;
      }
    }
  }
  if (indicators.length === 0) {
    indicators = [INDICATOR_METAS.score];
  }

  // --- Arah: pesan terbaru dulu; jika kosong, warisi dari riwayat.
  let directions = detectDirectionsStrict(userMessage);
  if (directions.length === 0) {
    for (let i = userTurns.length - 1; i >= 0; i--) {
      const prev = detectDirectionsStrict(userTurns[i]);
      if (prev.length > 0) {
        directions = prev;
        break;
      }
    }
  }
  if (directions.length === 0) {
    directions = ["default"];
  }

  // --- Wilayah: pesan terbaru menang jika menyebut wilayah baru; jika tidak, warisi.
  const explicitResult = detectRegion(userMessage);
  const explicitRegions = explicitResult.regions ?? [];
  let regions: EnrichedRegion[] = explicitRegions;
  if (regions.length === 0) {
    for (let i = userTurns.length - 1; i >= 0; i--) {
      const prevRegions = detectRegion(userTurns[i]).regions ?? [];
      if (prevRegions.length > 0) {
        regions = prevRegions;
        break;
      }
    }
  }

  // --- N: pesan terbaru dulu; jika kosong, warisi dari riwayat.
  let n = detectNStrict(userMessage);
  if (n === null) {
    for (let i = userTurns.length - 1; i >= 0; i--) {
      const prev = detectNStrict(userTurns[i]);
      if (prev !== null) {
        n = prev;
        break;
      }
    }
  }

  const indicatorLabel = indicators.map((i) => i.name).join(" dan ");
  const contextLabel = `Indikator aktif: ${indicatorLabel}; arah: ${directions.join(", ")}` +
    (regions.length > 0 ? `; wilayah: ${regions.map((r) => r.name).join(", ")}` : "") +
    (n !== null ? `; jumlah: ${n}` : "");

  return {
    indicators,
    directions,
    regions,
    explicitRegions,
    n,
    contextLabel,
  };
}

/**
 * Mengetahui apakah pertanyaan meminta pemeringkatan / urutan wilayah.
 */
export function isRankingQuery(text: string): boolean {
  const q = text.toLowerCase();
  return (
    /\b(top\s*\d+|\d+\s*terbawah|\d+\s*teratas|\d+\s*tertinggi|\d+\s*terendah)\b/i.test(q) ||
    /\b(tertinggi|terendah|terbanyak|tersedikit|terparah|terburuk|terbaik|juara)\b/i.test(q) ||
    /\b(paling\s+(tinggi|rendah|banyak|sedikit|parah|buruk|kritis|baik|bagus|sehat))\b/i.test(q) ||
    /\b(ranking|peringkat|urutan)\b/i.test(q) ||
    /\b(mana\s+wilayah\s+(yang\s+)?(memiliki|dengan|paling))\b/i.test(q) ||
    /\b(wilayah\s+(mana\s+)?(yang\s+)?(paling|perlu\s+diperhatikan|perlu\s+dibantu|prioritas))\b/i.test(q)
  );
}

export interface RankedItem {
  rank: number;
  region: EnrichedRegion;
  value: number;
  formattedValue: string;
}

export interface RankingSection {
  indicator: IndicatorMeta;
  directionLabel: string;
  order: "asc" | "desc";
  items: RankedItem[];
  block: string;
}

export interface RankingResult {
  indicator: IndicatorMeta; // indikator pertama (kompatibilitas mundur)
  directionLabel: string; // label arah pertama (kompatibilitas mundur)
  order: "asc" | "desc"; // urutan pertama (kompatibilitas mundur)
  limit: number;
  items: RankedItem[]; // item bagian pertama (kompatibilitas mundur)
  sections: RankingSection[];
  rankingBlock: string;
}

/** Pemetaan arah mentah -> urutan sortir dan label, berdasarkan worstIs indikator. */
function resolveDirection(
  rawDir: RawDirection,
  indicator: IndicatorMeta
): { order: "asc" | "desc"; directionLabel: string } {
  if (rawDir === "high") {
    return {
      order: "desc",
      directionLabel: indicator.key === "facilities" ? "Terbanyak" : "Tertinggi",
    };
  }
  if (rawDir === "low") {
    return {
      order: "asc",
      directionLabel:
        indicator.key === "facilities" || indicator.key === "nakes" ? "Tersedikit" : "Terendah",
    };
  }
  if (rawDir === "worst") {
    if (indicator.worstIs === "high") {
      return { order: "desc", directionLabel: "Tertinggi (Paling Parah / Prioritas Intervensi)" };
    }
    return { order: "asc", directionLabel: "Terendah (Paling Kritis / Perlu Diperhatikan)" };
  }
  if (rawDir === "best") {
    if (indicator.worstIs === "high") {
      return { order: "asc", directionLabel: "Terendah (Terbaik)" };
    }
    return { order: "desc", directionLabel: "Tertinggi (Terbaik)" };
  }
  // Default jika arah tidak spesifik
  if (indicator.worstIs === "high") {
    return { order: "desc", directionLabel: "Tertinggi" };
  }
  return { order: "asc", directionLabel: "Terendah (Prioritas)" };
}

/**
 * Membangun data dan teks blok "PERINGKAT" untuk SETIAP kombinasi
 * indikator x arah yang terdeteksi, lalu menggabungkannya.
 */
export function buildRanking(
  text: string,
  regions: EnrichedRegion[] = REGISTRY.regions,
  defaultLimit = 5,
  options?: { indicators?: IndicatorMeta[]; directions?: RawDirection[]; limit?: number }
): RankingResult {
  const q = text.toLowerCase();
  const indicators = options?.indicators ?? detectIndicators(q);
  const directions = options?.directions ?? detectDirections(q);

  // Baca jumlah N: eksplisit dari opsi (hasil resolveContext) > pesan > default.
  let limit = options?.limit ?? detectLimit(q, defaultLimit);
  if (!limit || limit < 1) limit = defaultLimit;
  if (limit > regions.length) limit = regions.length;

  const sections: RankingSection[] = [];

  for (const indicator of indicators) {
    for (const rawDir of directions) {
      const { order, directionLabel } = resolveDirection(rawDir, indicator);

      const sorted = [...regions].sort((a, b) => {
        const valA = indicator.getValue(a);
        const valB = indicator.getValue(b);
        return order === "desc" ? valB - valA : valA - valB;
      });

      const items: RankedItem[] = sorted.slice(0, limit).map((r, i) => ({
        rank: i + 1,
        region: r,
        value: indicator.getValue(r),
        formattedValue: indicator.formatValue(r),
      }));

      const block = [
        `Indikator: ${indicator.name}`,
        `Arah Urutan: ${directionLabel}`,
        `Daftar ${items.length} Wilayah Berdasarkan Data Resmi Jawa Timur 2024:`,
        ...items.map((it) => `${it.rank}. ${it.region.name}: ${it.formattedValue}`),
      ].join("\n");

      sections.push({ indicator, directionLabel, order, items, block });
    }
  }

  const first = sections[0];
  const rankingBlock =
    `BLOK PERINGKAT (Wajib Digunakan Sebagai Acuan Jawaban; jawab SEMUA bagian):\n` +
    sections.map((s, i) => `[Bagian ${i + 1}]\n${s.block}`).join("\n\n");

  return {
    indicator: first.indicator,
    directionLabel: first.directionLabel,
    order: first.order,
    limit,
    items: first.items,
    sections,
    rankingBlock,
  };
}
