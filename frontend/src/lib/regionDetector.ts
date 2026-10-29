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
export function detectIndicator(text: string): IndicatorMeta {
  const q = text.toLowerCase();

  // 1. Stunting / Gizi Balita
  if (/\b(stunting|tengkes|gizi\s+buruk|gizi\s+kurang|gizi\s+balita)\b/i.test(q)) {
    return INDICATOR_METAS.stunting;
  }

  // 2. Rasio Tempat Tidur / Ranjang / Kapasitas Rawat Inap
  if (/\b(tempat\s+tidur|ranjang|bed\s*ratio|kapasitas\s+rawat\s+inap|daya\s+tampung|rasio\s+tt)\b/i.test(q)) {
    return INDICATOR_METAS.bedRatio;
  }

  // 3. Tenaga Kesehatan / Dokter / Medis
  if (/\b(tenaga\s+kesehatan|nakes|dokter|tenaga\s+medis|paramedis|medis)\b/i.test(q)) {
    return INDICATOR_METAS.nakes;
  }

  // 4. Jumlah Fasilitas Kesehatan / Puskesmas / Rumah Sakit
  if (/\b(jumlah\s+fasilitas|fasilitas\s+kesehatan|faskes|puskesmas|rumah\s+sakit|sarana\s+kesehatan)\b/i.test(q)) {
    return INDICATOR_METAS.facilities;
  }

  // 5. Default: Skor Kesehatan
  return INDICATOR_METAS.score;
}

export type RawDirection = "high" | "low" | "worst" | "best" | "default";

/**
 * Mendeteksi arah pemeringkatan dalam teks pertanyaan secara terpisah dari indikator.
 */
export function detectDirection(text: string): RawDirection {
  const q = text.toLowerCase();

  if (/\b(tertinggi|terbanyak|terbesar|teratas|paling\s+tinggi|paling\s+banyak|paling\s+besar)\b/i.test(q)) {
    return "high";
  }

  if (/\b(terendah|tersedikit|terkecil|terbawah|paling\s+rendah|paling\s+sedikit|paling\s+kecil)\b/i.test(q)) {
    return "low";
  }

  if (
    /\b(terparah|terburuk|paling\s+parah|paling\s+buruk|paling\s+kritis|paling\s+rentan|perlu\s+diperhatikan|perlu\s+dibantu|prioritas|paling\s+bermasalah)\b/i.test(
      q
    )
  ) {
    return "worst";
  }

  if (/\b(terbaik|paling\s+baik|paling\s+bagus|paling\s+sehat|juara|unggul)\b/i.test(q)) {
    return "best";
  }

  return "default";
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

export interface RankingResult {
  indicator: IndicatorMeta;
  directionLabel: string;
  order: "asc" | "desc";
  limit: number;
  items: RankedItem[];
  rankingBlock: string;
}

/**
 * Membangun data dan teks blok "PERINGKAT" sesuai indikator, arah, dan worstIs.
 */
export function buildRanking(
  text: string,
  regions: EnrichedRegion[] = REGISTRY.regions,
  defaultLimit = 5
): RankingResult {
  const q = text.toLowerCase();
  const indicator = detectIndicator(q);
  const rawDir = detectDirection(q);

  // Deteksi jumlah limit N (misal "top 3", "5 terbawah", "10 wilayah")
  const matchLimit = q.match(/\b(?:top\s*(\d+)|\b(\d+)\s*(?:wilayah|kabupaten|kota|teratas|terbawah|tertinggi|terendah))\b/i);
  let limit = matchLimit ? parseInt(matchLimit[1] || matchLimit[2], 10) : defaultLimit;
  if (!limit || limit < 1) limit = defaultLimit;
  if (limit > regions.length) limit = regions.length;

  // Pemetaan Arah dan Urutan berdasarkan worstIs
  let order: "asc" | "desc" = "desc";
  let directionLabel = "Tertinggi";

  if (rawDir === "high") {
    order = "desc";
    directionLabel = indicator.key === "facilities" ? "Terbanyak" : "Tertinggi";
  } else if (rawDir === "low") {
    order = "asc";
    directionLabel = indicator.key === "facilities" || indicator.key === "nakes" ? "Tersedikit" : "Terendah";
  } else if (rawDir === "worst") {
    if (indicator.worstIs === "high") {
      // Stunting tinggi = paling parah (worst)
      order = "desc";
      directionLabel = "Tertinggi (Paling Parah / Prioritas Intervensi)";
    } else {
      // Skor / TT / nakes / faskes rendah = paling parah (worst)
      order = "asc";
      directionLabel = "Terendah (Paling Kritis / Perlu Diperhatikan)";
    }
  } else if (rawDir === "best") {
    if (indicator.worstIs === "high") {
      // Stunting rendah = terbaik
      order = "asc";
      directionLabel = "Terendah (Terbaik)";
    } else {
      // Skor / TT / nakes / faskes tinggi = terbaik
      order = "desc";
      directionLabel = "Tertinggi (Terbaik)";
    }
  } else {
    // Default jika arah tidak spesifik
    if (indicator.worstIs === "high") {
      order = "desc";
      directionLabel = "Tertinggi";
    } else {
      order = "asc";
      directionLabel = "Terendah (Prioritas)";
    }
  }

  // Urutkan regions sesuai nilai indikator dan arah
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

  const rankingBlock = [
    `BLOK PERINGKAT (Wajib Digunakan Sebagai Acuan Jawaban):`,
    `Indikator: ${indicator.name}`,
    `Arah Urutan: ${directionLabel}`,
    `Daftar ${items.length} Wilayah Berdasarkan Data Resmi Jawa Timur 2024:`,
    ...items.map((it) => `${it.rank}. ${it.region.name}: ${it.formattedValue}`),
  ].join("\n");

  return {
    indicator,
    directionLabel,
    order,
    limit,
    items,
    rankingBlock,
  };
}
