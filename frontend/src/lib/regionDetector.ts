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

  // Cek hanya bila 'kabupaten' atau 'kota' diikuti nama wilayah yang benar-benar asing.
  const genericWords = new Set([
    "yang", "mana", "apa", "dengan", "paling", "di", "dan", "atau", "berapa",
    "dalam", "untuk", "ter", "sebagai", "tersebut", "ini", "itu", "kota",
    "kabupaten", "kab", "paling", "perlu", "memiliki", "tertinggi", "terendah",
  ]);
  const govMatches = [...query.matchAll(/\b(?:kabupaten|kab\.?|kota)\s+([a-zA-Z]+)/gi)];
  const mentionsUnknownRegion = govMatches.some((match) => {
    const candidate = match[1].toLowerCase();
    return !genericWords.has(candidate);
  });

  if (mentionsUnknownRegion) {
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
 * Mendeteksi seluruh indikator eksplisit yang dimaksud dalam pertanyaan.
 * Mengembalikan array kosong bila pertanyaan tidak menyebut indikator.
 */
export function detectIndicatorKeys(text: string): IndicatorKey[] {
  const q = text.toLowerCase();
  const keys: IndicatorKey[] = [];

  if (/\b(stunting|tengkes|gizi\s+buruk|gizi\s+kurang|gizi\s+balita)\b/i.test(q)) {
    keys.push("stunting");
  }

  if (/\b(tempat\s+tidur|ranjang|bed\s*ratio|kapasitas\s+rawat\s+inap|daya\s+tampung|rasio\s+tt)\b/i.test(q)) {
    keys.push("bedRatio");
  }

  if (/\b(tenaga\s+kesehatan|nakes|dokter|tenaga\s+medis|paramedis)\b/i.test(q)) {
    keys.push("nakes");
  }

  if (/\b(jumlah\s+fasilitas|fasilitas|faskes|puskesmas|rumah\s+sakit|sarana\s+kesehatan)\b/i.test(q)) {
    keys.push("facilities");
  }

  if (/\b(skor(?:\s+kesehatan)?|nilai\s+kesehatan)\b/i.test(q)) {
    keys.push("score");
  }

  return keys;
}

/**
 * Mendeteksi indikator utama. Bila tidak ada indikator eksplisit,
 * skor kesehatan menjadi indikator default.
 */
export function detectIndicator(text: string): IndicatorMeta {
  const keys = detectIndicatorKeys(text);
  return INDICATOR_METAS[keys[0] ?? "score"];
}

export type RawDirection = "high" | "low" | "worst" | "best" | "default";

const DIRECTION_PATTERN =
  /\b(prioritas\s+tertinggi|prioritas\s+terendah|paling\s+tinggi|paling\s+banyak|paling\s+besar|paling\s+rendah|paling\s+sedikit|paling\s+kecil|paling\s+parah|paling\s+buruk|paling\s+kritis|paling\s+rentan|paling\s+baik|paling\s+bagus|paling\s+sehat|paling\s+bermasalah|tertinggi|terbanyak|terbesar|teratas|terendah|tersedikit|terkecil|terbawah|terparah|terburuk|terbaik|juara|unggul|perlu\s+diperhatikan|perlu\s+dibantu|bermasalah|prioritas)\b/gi;

function mapDirectionPhrase(phrase: string): RawDirection {
  if (/^prioritas\s+tertinggi$/.test(phrase)) return "low";
  if (/^prioritas\s+terendah$/.test(phrase)) return "high";
  if (/^(terparah|terburuk|paling\s+parah|paling\s+buruk|paling\s+kritis|paling\s+rentan|perlu\s+diperhatikan|perlu\s+dibantu|bermasalah|prioritas)$/.test(phrase)) {
    return "worst";
  }
  if (/^(terbaik|paling\s+baik|paling\s+bagus|paling\s+sehat|juara|unggul)$/.test(phrase)) {
    return "best";
  }
  if (/^(tertinggi|terbanyak|terbesar|teratas|paling\s+tinggi|paling\s+banyak|paling\s+besar)$/.test(phrase)) {
    return "high";
  }
  return "low";
}

/**
 * Mendeteksi seluruh arah yang disebut, sesuai urutan kemunculan.
 */
export function detectDirections(text: string): RawDirection[] {
  const q = text.toLowerCase();
  const directions: RawDirection[] = [];
  let match: RegExpExecArray | null;

  DIRECTION_PATTERN.lastIndex = 0;
  while ((match = DIRECTION_PATTERN.exec(q)) !== null) {
    const direction = mapDirectionPhrase(match[1].trim());
    if (!directions.includes(direction)) {
      directions.push(direction);
    }
  }

  return directions;
}

/**
 * Mendeteksi satu arah utama untuk kompatibilitas pemanggil lama.
 */
export function detectDirection(text: string): RawDirection {
  return detectDirections(text)[0] ?? "default";
}

const WORD_NUMBERS: Record<string, number> = {
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
};

function parseNumberToken(token: string): number | undefined {
  const normalized = token.toLowerCase().trim();
  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }
  return WORD_NUMBERS[normalized];
}

/**
 * Mendeteksi N dari angka atau kata bilangan Indonesia 1 sampai 10.
 */
export function detectRankingLimit(text: string): number | undefined {
  const q = text.toLowerCase();
  const topMatch = q.match(/\btop\s*(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\b/);
  const countMatch = q.match(
    /\b(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s*(?:wilayah|daerah|kabupaten|kota|teratas|terbawah|tertinggi|terendah|nya)\b/
  );

  const parsed = parseNumberToken(topMatch?.[1] ?? countMatch?.[1] ?? "");
  if (!parsed || parsed < 1) return undefined;
  return Math.min(parsed, 38);
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
  isCritical: boolean;
  scopeLabel: string;
}

function resolveDirection(
  indicator: IndicatorMeta,
  rawDirection: RawDirection
): { order: "asc" | "desc"; directionLabel: string } {
  if (rawDirection === "high") {
    return {
      order: "desc",
      directionLabel: indicator.key === "facilities" ? "Terbanyak" : "Tertinggi",
    };
  }

  if (rawDirection === "low") {
    return {
      order: "asc",
      directionLabel: indicator.key === "facilities" || indicator.key === "nakes" ? "Tersedikit" : "Terendah",
    };
  }

  if (rawDirection === "worst") {
    return {
      order: indicator.worstIs === "high" ? "desc" : "asc",
      directionLabel: "Terburuk",
    };
  }

  if (rawDirection === "best") {
    return {
      order: indicator.worstIs === "high" ? "asc" : "desc",
      directionLabel: "Terbaik",
    };
  }

  return indicator.worstIs === "high"
    ? { order: "desc", directionLabel: "Tertinggi" }
    : { order: "asc", directionLabel: "Terendah" };
}

function createRanking(
  text: string,
  indicator: IndicatorMeta,
  rawDirection: RawDirection,
  regions: EnrichedRegion[],
  defaultLimit: number,
  isCritical: boolean
): RankingResult {
  const limit = Math.min(detectRankingLimit(text) ?? defaultLimit, regions.length);
  const { order, directionLabel } = resolveDirection(indicator, rawDirection);
  const scopeLabel = isCritical ? `${indicator.name} pada Klaster Critical` : indicator.name;

  const sorted = [...regions].sort((a, b) => {
    const valueA = indicator.getValue(a);
    const valueB = indicator.getValue(b);
    return order === "desc" ? valueB - valueA : valueA - valueB;
  });

  const items: RankedItem[] = sorted.slice(0, limit).map((region, index) => ({
    rank: index + 1,
    region,
    value: indicator.getValue(region),
    formattedValue: indicator.formatValue(region),
  }));

  const rankingBlock = [
    `PERINGKAT (${scopeLabel}, ${directionLabel})`,
    `Gunakan blok ini sebagai satu-satunya acuan urutan dan angka. Jangan mengurutkan ulang.`,
    isCritical ? "Cakupan: klaster Critical rasio tempat tidur, yaitu wilayah dengan rasio di bawah 0,75 per 1.000 penduduk." : "",
    `Jumlah wajib: ${items.length} wilayah.`,
    ...items.map((item) => `${item.rank}. ${item.region.name}: ${item.formattedValue}`),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    indicator,
    directionLabel,
    order,
    limit: items.length,
    items,
    rankingBlock,
    isCritical,
    scopeLabel,
  };
}

/**
 * Membangun satu atau beberapa blok peringkat. Arah dan indikator yang
 * disebut bersama akan menghasilkan blok terpisah, tanpa pengurutan oleh model.
 */
export function buildRankings(
  text: string,
  regions: EnrichedRegion[] = REGISTRY.regions,
  defaultLimit = 5
): RankingResult[] {
  const q = text.toLowerCase();
  const isCritical = /\bkritis\b/i.test(q);
  const indicatorKeys = isCritical ? ["bedRatio" as IndicatorKey] : detectIndicatorKeys(q);
  const effectiveKeys = indicatorKeys.length > 0 ? indicatorKeys : (["score"] as IndicatorKey[]);
  const directions = detectDirections(q);
  const effectiveDirections: RawDirection[] = directions.length > 0 ? directions : ["default"];

  const sourceRegions = isCritical
    ? regions.filter((region) => region.bedRatio < 0.75)
    : regions;

  if (sourceRegions.length === 0) {
    return [];
  }

  const results: RankingResult[] = [];
  for (const key of effectiveKeys) {
    for (const direction of effectiveDirections) {
      results.push(
        createRanking(
          q,
          INDICATOR_METAS[key],
          direction,
          sourceRegions,
          Math.max(1, Math.min(defaultLimit, 38)),
          isCritical
        )
      );
    }
  }

  return results;
}

/**
 * Kompatibilitas pemanggil lama: mengambil blok peringkat pertama.
 */
export function buildRanking(
  text: string,
  regions: EnrichedRegion[] = REGISTRY.regions,
  defaultLimit = 5
): RankingResult {
  const rankings = buildRankings(text, regions, defaultLimit);
  return rankings[0] ?? createRanking(text, INDICATOR_METAS.score, "default", regions, defaultLimit, false);
}
