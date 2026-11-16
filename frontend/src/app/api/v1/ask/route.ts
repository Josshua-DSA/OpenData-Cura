import { NextResponse } from "next/server";
import {
  detectRegion,
  detectIndicatorKeys,
  detectDirections,
  detectRankingLimit,
  isRankingQuery,
  type IndicatorKey,
  type RawDirection,
} from "@/lib/regionDetector";
import {
  ACTIVE_YEAR,
  buildProvinceSummary,
  buildRankingContext,
  getRegionContext,
  type RegionContext,
} from "@/lib/chatbotData";

const OUT_OF_SCOPE_RESPONSE =
  "Maaf, saya hanya dapat membantu pertanyaan seputar data kesehatan Jawa Timur di Tilik Jatim, seperti wilayah prioritas, beban penyakit, fasilitas, skor kesehatan, stunting, dan rekomendasi program.";

const UNRECOGNIZED_REGION_RESPONSE =
  "Wilayah yang Anda sebutkan belum ditemukan di data Tilik Jatim. Periksa penulisan nama kabupaten/kota, lalu coba lagi.";

const DATA_UNAVAILABLE_RESPONSE = "Data tersebut belum tersedia di Tilik Jatim.";

const AI_UNAVAILABLE_RESPONSE = "Layanan AI sedang tidak tersedia, coba lagi.";

const QUOTA_EXHAUSTED_RESPONSE = "Kuota layanan AI sedang habis, silakan coba lagi nanti.";

const RATE_LIMITED_RESPONSE = "Mohon tunggu sebentar sebelum bertanya lagi.";

const TEMPLATE_SUFFIX = "Jawaban ini disusun otomatis dari data Tilik Jatim.";

// Daftar model teks yang valid untuk API key ini (hasil ListModels).
const VALID_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-pro-latest",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.1-pro-preview-customtools",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-4-argon",
  "gemini-4-carbon",
  "gemini-4-hydrogen",
]);

// Urutan default: kuota besar lebih dulu, model 20 RPD di belakang.
const DEFAULT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

// Model yang menerima thinkingConfig. Model lite menolak parameter ini (400).
const THINKING_CONFIG_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.1-pro-preview-customtools",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-pro-latest",
]);

const SHORTCUT_QUERIES = [
  "Wilayah mana yang menjadi prioritas intervensi?",
  "Apa tren penyakit yang paling perlu diperhatikan?",
  "Wilayah mana yang kekurangan akses fasilitas kesehatan?",
  "Jelaskan cara membaca skor kesehatan wilayah.",
  "Apa pola stunting di wilayah prioritas?",
  "Program apa yang direkomendasikan untuk Kabupaten Probolinggo?",
];

const CACHE_TTL_MS = 10 * 60 * 1000;
const SHORTCUT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 60_000;

const MAX_CONCURRENT_GEMINI = 3;
const QUEUE_TIMEOUT_MS = 8000;

function getModelChain(): string[] {
  const raw = (process.env.GEMINI_MODELS || "").trim();
  const requested = raw
    ? raw.split(",").map((item) => item.trim()).filter(Boolean)
    : DEFAULT_MODELS;
  const valid = requested.filter((model) => VALID_MODELS.has(model));
  return valid.length > 0 ? valid : DEFAULT_MODELS.filter((model) => VALID_MODELS.has(model));
}

function getApiKeys(): Array<{ label: string; key: string }> {
  const multi = (process.env.GEMINI_API_KEYS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (multi.length > 0) {
    return multi.map((key, index) => ({ label: `key-${index + 1}`, key }));
  }

  const keys: Array<{ label: string; key: string }> = [];
  if (process.env.GEMINI_API_KEY) {
    keys.push({ label: "key-1", key: process.env.GEMINI_API_KEY });
  }
  if (process.env.GEMINI_API_KEY_2) {
    keys.push({ label: "key-2", key: process.env.GEMINI_API_KEY_2 });
  }
  return keys;
}

// Pasangan (key, model) yang sedang kena limit, disimpan di memori server.
const limitedPairs = new Map<string, number>();

function pairId(keyLabel: string, model: string): string {
  return `${keyLabel}:${model}`;
}

function isPairLimited(keyLabel: string, model: string): boolean {
  const id = pairId(keyLabel, model);
  const expiresAt = limitedPairs.get(id);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    limitedPairs.delete(id);
    return false;
  }
  return true;
}

function markPairLimited(keyLabel: string, model: string, ttlMs: number): void {
  limitedPairs.set(pairId(keyLabel, model), Date.now() + ttlMs);
}

// Cache jawaban di memori server.
const responseCache = new Map<
  string,
  { answer: string; model: string; keyLabel: string; expires: number }
>();

function buildCacheKey(query: string, regionNames: string[], year: number): string {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, " ").trim();
  return `${normalizedQuery}|${regionNames.join(",")}|${year}`;
}

function isShortcutQuery(query: string): boolean {
  const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
  return SHORTCUT_QUERIES.some(
    (item) => item.toLowerCase().replace(/\s+/g, " ").trim() === normalized
  );
}

// Pembatas laju per pengunjung.
const rateLimitMap = new Map<string, number[]>();

function getClientId(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(clientId) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(clientId, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(clientId, timestamps);
  return false;
}

// Antrean ringan: maksimal 3 panggilan Gemini bersamaan.
let activeGeminiCalls = 0;
const geminiWaiters: Array<() => void> = [];

function acquireGeminiSlot(): Promise<boolean> {
  if (activeGeminiCalls < MAX_CONCURRENT_GEMINI) {
    activeGeminiCalls += 1;
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const onRelease = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeGeminiCalls += 1;
      resolve(true);
    };
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const index = geminiWaiters.indexOf(onRelease);
      if (index >= 0) geminiWaiters.splice(index, 1);
      resolve(false);
    }, QUEUE_TIMEOUT_MS);
    geminiWaiters.push(onRelease);
  });
}

function releaseGeminiSlot(): void {
  activeGeminiCalls = Math.max(0, activeGeminiCalls - 1);
  const next = geminiWaiters.shift();
  if (next) next();
}

const SYSTEM_INSTRUCTION = `
Anda adalah Tilik Jatim AI, asisten analitik data kesehatan Jawa Timur.

Tugas Anda menjawab pertanyaan pengguna HANYA berdasarkan DATA yang diberikan.

Aturan:
1. Jawab hanya dari DATA yang diberikan. Jangan mengarang angka, wilayah, atau fakta.
2. Jika data yang diminta tidak ada, misalnya tahun di luar data atau wilayah tidak ditemukan, katakan terus terang bahwa data tidak tersedia.
3. Untuk pertanyaan yang meminta penjelasan sebab-akibat, jelaskan hubungannya secara umum berdasarkan data yang tersedia dan pengetahuan kesehatan dasar, tanpa menambahkan angka atau data baru.
4. Jawab langsung pertanyaan yang diajukan terlebih dahulu, baru tambahkan konteks singkat.
5. Jangan menampilkan ranking jika tidak diminta.
6. Selalu sebut wilayah dan tahun yang dimaksud.
7. Jika pertanyaan di luar topik kesehatan atau data Jawa Timur, tolak dengan sopan dan arahkan kembali ke topik.
8. Jawaban ringkas, bahasa Indonesia, tanpa format markdown berlebihan.
9. Tambahkan kalimat bahwa insight perlu divalidasi dengan konteks program daerah hanya bila relevan.
`;

const NON_JATIM_AREAS = [
  "bandung", "jakarta", "semarang", "medan", "yogyakarta", "jogja", "solo", "surakarta",
  "denpasar", "bali", "bekasi", "depok", "tangerang", "bogor", "makassar", "palembang",
  "padang", "pekanbaru", "lampung", "aceh", "banjarmasin", "pontianak", "balikpapan",
  "samarinda", "mataram", "kupang", "ambon", "jayapura", "manado", "jawa tengah", "jateng",
  "jawa barat", "jabar", "banten", "diy", "sumatera", "kalimantan", "sulawesi", "papua"
];

function checkNonJatim(query: string): string | null {
  const q = query.toLowerCase();
  for (const nonJatim of NON_JATIM_AREAS) {
    const regex = new RegExp(`\\b${nonJatim}\\b`, "i");
    if (regex.test(q)) {
      return nonJatim.charAt(0).toUpperCase() + nonJatim.slice(1);
    }
  }
  return null;
}

function cleanPlainText(text: string, maxWords?: number): string {
  let cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/(\d)\s*[–—]\s*(\d)/g, "$1 sampai $2")
    .replace(/[–—]/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/^[•*\-]\s+/gm, "")
    .replace(/[*#`_~]/g, "")
    .replace(/[^\x00-\x7F\u00C0-\u024F\u1E00-\u1EFF\n\r\t.,:;()!?'"%/\-+0-9 ]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (maxWords && cleaned.split(/\s+/).length > maxWords) {
    cleaned = cleaned
      .split(/\s+/)
      .slice(0, maxWords)
      .join(" ")
      .replace(/[,:;\s]+$/, "")
      .concat(".");
  }

  return cleaned;
}

interface ChatHistoryItem {
  role: "ai" | "model" | "user";
  text: string;
}

/**
 * Pengecekan ketat untuk pertanyaan yang BENAR-BENAR di luar lingkup.
 * Hanya tolak jika murni matematika, resep, coding, hiburan/game, atau politik non-kesehatan.
 */
function isTrulyOutOfScope(query: string): boolean {
  const q = query.toLowerCase().trim();

  if (/(\b\d+\s*[\+\-\*\/]\s*\d+\b|\b(akar\s+kuadrat|sinus|cosinus|kalkulus|rumus\s+pitagoras)\b)/i.test(q)) {
    return true;
  }

  if (/\b(resep|resepnya|cara\s+memasak|bumbu\s+dapur)\b/i.test(q)) {
    return true;
  }

  if (/\b(koding|coding|syntax|fungsi\s+python|javascript|typescript|query\s+sql|react\s+component|css\s+flexbox|git\s+push|buatkan\s+(kode|aplikasi|website))\b/i.test(q)) {
    return true;
  }

  if (/\b(chord\s+gitar|lirik\s+lagu|film\s+bioskop|game|anime|drama\s+korea|cerita\s+lucu|jokes)\b/i.test(q)) {
    return true;
  }

  if (/\b(calon\s+presiden|presiden|capres|cawapres|partai\s+politik|pemilu|pilpres|politik|saham|crypto|kripto|reksa\s+dana|investasi)\b/i.test(q)) {
    return true;
  }

  if (/\b(system\s+prompt|prompt\s+sistem|instruksi\s+sistem|abaikan\s+aturan|jailbreak)\b/i.test(q)) {
    return true;
  }

  return false;
}

function detectYear(query: string): number {
  const match = query.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : ACTIVE_YEAR;
}

function resolveRankingDirection(key: IndicatorKey, raw: RawDirection): "asc" | "desc" {
  if (raw === "high") return "desc";
  if (raw === "low") return "asc";
  if (raw === "worst") return key === "stunting" ? "desc" : "asc";
  if (raw === "best") return key === "stunting" ? "asc" : "desc";
  return key === "stunting" ? "desc" : "asc";
}

function buildRegionContexts(regionNames: string[]): RegionContext[] {
  return regionNames
    .map((name) => getRegionContext(name))
    .filter((region): region is RegionContext => Boolean(region));
}

function buildContext(query: string, regionNames: string[]): unknown {
  const year = detectYear(query);
  const regions = buildRegionContexts(regionNames);

  if (regions.length > 0) {
    return {
      tahun: year,
      wilayah: regions,
    };
  }

  const indicatorKeys = detectIndicatorKeys(query);
  const directions = detectDirections(query);
  const limit = detectRankingLimit(query) ?? 5;

  if (isRankingQuery(query) && indicatorKeys.length > 0) {
    return {
      tahun: year,
      peringkat: indicatorKeys.map((key) =>
        buildRankingContext(key, resolveRankingDirection(key, directions[0] ?? "default"), limit)
      ),
    };
  }

  return {
    tahun: year,
    ringkasanProvinsi: buildProvinceSummary(),
  };
}

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits).replace(".", ",");
}

function buildTemplateAnswer(query: string, regionNames: string[]): string | null {
  try {
    const regions = buildRegionContexts(regionNames);

    if (regions.length >= 2) {
      const [a, b] = regions;
      const lowestA = a.indikatorPilar
        .slice(0, 3)
        .map((item) => `${item.nama} ${formatNumber(item.nilai)}`)
        .join(", ");
      const lowestB = b.indikatorPilar
        .slice(0, 3)
        .map((item) => `${item.nama} ${formatNumber(item.nilai)}`)
        .join(", ");
      return [
        `Perbandingan ${a.nama} dan ${b.nama} tahun ${ACTIVE_YEAR}:`,
        "",
        `1. ${a.nama}: skor ${formatNumber(a.skorKesehatan)}/100, status ${a.status}.`,
        `2. ${b.nama}: skor ${formatNumber(b.skorKesehatan)}/100, status ${b.status}.`,
        "",
        "Indikator terendah:",
        `${a.nama}: ${lowestA}.`,
        `${b.nama}: ${lowestB}.`,
        "",
        `Rekomendasi ${a.nama}: ${a.rekomendasiProgram || "-"}.`,
        `Rekomendasi ${b.nama}: ${b.rekomendasiProgram || "-"}.`,
        "",
        TEMPLATE_SUFFIX,
      ].join("\n");
    }

    if (regions.length === 1) {
      const region = regions[0];
      const lowest = region.indikatorPilar
        .slice(0, 3)
        .map((item, index) => `${index + 1}. ${item.nama}: ${formatNumber(item.nilai)}`)
        .join("\n");
      return [
        `Skor kesehatan ${region.nama} tahun ${region.tahun} adalah ${formatNumber(region.skorKesehatan)}/100 dengan status ${region.status}.`,
        "",
        "Tiga indikator terendah:",
        lowest,
        "",
        `Rekomendasi program: ${region.rekomendasiProgram || "-"}.`,
        "",
        TEMPLATE_SUFFIX,
      ].join("\n");
    }

    const summary = buildProvinceSummary();
    const lowest = summary.wilayahSkorTerendah
      .map((item, index) => `${index + 1}. ${item.nama}: ${formatNumber(item.skor)}`)
      .join("\n");
    return [
      `Ringkasan Provinsi Jawa Timur tahun ${summary.tahun}:`,
      `Jumlah wilayah: ${summary.jumlahWilayah}.`,
      `Rata-rata skor kesehatan: ${formatNumber(summary.rataRataSkor)}/100.`,
      `Rata-rata prevalensi stunting: ${formatNumber(summary.rataRataStunting)}%.`,
      `Rata-rata rasio tempat tidur: ${formatNumber(summary.rataRataRasioTempatTidur)} per 1.000 penduduk.`,
      `Rata-rata AKI: ${formatNumber(summary.rataRataAki)} per 100.000 kelahiran.`,
      "",
      "Lima wilayah dengan skor terendah:",
      lowest,
      "",
      TEMPLATE_SUFFIX,
    ].join("\n");
  } catch {
    return null;
  }
}

type GeminiCallResult =
  | { ok: true; answer: string; model: string; keyLabel: string }
  | { ok: false; kind: "quota" | "error"; message: string };

async function callGemini(
  keys: Array<{ label: string; key: string }>,
  query: string,
  context: unknown,
  history: ChatHistoryItem[],
  timeoutMs = 15000
): Promise<GeminiCallResult> {
  const models = getModelChain();
  const skipped: string[] = [];

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const item of history.slice(-6)) {
      if (!item?.text?.trim()) continue;
      const role: "user" | "model" = item.role === "user" ? "user" : "model";
      if (contents.length === 0 && role === "model") {
        continue;
      }
      const last = contents[contents.length - 1];
      if (last && last.role === role) {
        last.parts[0].text += `\n\n${item.text}`;
      } else {
        contents.push({ role, parts: [{ text: item.text }] });
      }
    }
  }

  contents.push({
    role: "user",
    parts: [
      {
        text: `DATA (JSON):\n${JSON.stringify(context, null, 2)}\n\nPERTANYAAN PENGGUNA:\n${query}\n\nJawab hanya berdasarkan DATA di atas.`,
      },
    ],
  });

  for (const { label, key } of keys) {
    for (const model of models) {
      if (isPairLimited(label, model)) {
        skipped.push(`${label}:${model} (sedang limit)`);
        console.log(`[ask] skip key=${label} model=${model}: sedang ditandai limit`);
        continue;
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const generationConfig: {
          temperature: number;
          maxOutputTokens: number;
          thinkingConfig?: { thinkingBudget: number };
        } = {
          temperature: 0.2,
          maxOutputTokens: 600,
        };
        if (THINKING_CONFIG_MODELS.has(model)) {
          generationConfig.thinkingConfig = { thinkingBudget: 0 };
        }
        const payload = {
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig,
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (res.ok) {
          const json = await res.json();
          const rawAnswer = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawAnswer && rawAnswer.trim()) {
            console.log(
              `[ask] key=${label} model=${model} status=ok skipped=${skipped.length > 0 ? skipped.join("; ") : "-"}`
            );
            return { ok: true, answer: cleanPlainText(rawAnswer), model, keyLabel: label };
          }
          console.log(`[ask] key=${label} model=${model} status=empty`);
          return { ok: false, kind: "error", message: AI_UNAVAILABLE_RESPONSE };
        }

        if (res.status === 429 || res.status === 503) {
          const bodyText = await res.text().catch(() => "");
          const isDaily = /per\s*day|daily|RPD|requests\s*per\s*day/i.test(bodyText);
          const ttlMs = res.status === 429 && !isDaily ? 60_000 : 3_600_000;
          markPairLimited(label, model, ttlMs);
          skipped.push(`${label}:${model} (${res.status}${isDaily ? " harian" : ""})`);
          console.log(
            `[ask] skip key=${label} model=${model}: status=${res.status} ttl=${ttlMs}ms`
          );
          continue;
        }

        console.log(`[ask] key=${label} model=${model} status=${res.status} non-retryable`);
        return { ok: false, kind: "error", message: AI_UNAVAILABLE_RESPONSE };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[ask] key=${label} model=${model} error=${message}`);
        return { ok: false, kind: "error", message: AI_UNAVAILABLE_RESPONSE };
      }
    }
  }

  console.log(
    `[ask] semua pasangan key/model habis/ditandai skipped=${skipped.length > 0 ? skipped.join("; ") : "-"}`
  );
  return { ok: false, kind: "quota", message: QUOTA_EXHAUSTED_RESPONSE };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = (body?.query || "").trim();
    const history: ChatHistoryItem[] = Array.isArray(body?.history) ? body.history : [];

    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query tidak boleh kosong" },
        { status: 400 }
      );
    }

    const isWarmRequest = req.headers.get("x-warm-cache") === "1";
    const clientId = getClientId(req);

    // 1. Pembatas laju per pengunjung.
    if (!isWarmRequest && isRateLimited(clientId)) {
      console.log(`[ask] rate-limited client=${clientId}`);
      return NextResponse.json({
        success: true,
        data: {
          answer: RATE_LIMITED_RESPONSE,
          model: "tilik-jatim-ratelimit",
        },
      });
    }

    // 2. Tolak pertanyaan di luar lingkup sebelum memanggil layanan AI.
    if (isTrulyOutOfScope(query)) {
      return NextResponse.json({
        success: true,
        data: {
          answer: OUT_OF_SCOPE_RESPONSE,
          model: "tilik-jatim-scope",
        },
      });
    }

    // 3. Tahun di luar data aktif.
    const year = detectYear(query);
    if (year !== ACTIVE_YEAR) {
      return NextResponse.json({
        success: true,
        data: {
          answer: `Data tahun ${year} belum tersedia di Tilik Jatim. Data yang tersedia adalah tahun ${ACTIVE_YEAR}.`,
          model: "tilik-jatim-year-guardrail",
        },
      });
    }

    // 4. Deteksi wilayah secara dinamis (mendukung multi-wilayah).
    const { regions = [], unrecognizedMention } = detectRegion(query);

    if (unrecognizedMention) {
      return NextResponse.json({
        success: true,
        data: {
          answer: UNRECOGNIZED_REGION_RESPONSE,
          model: "tilik-jatim-guardrail",
        },
      });
    }

    const nonJatim = checkNonJatim(query);
    if (nonJatim) {
      return NextResponse.json({
        success: true,
        data: {
          answer: DATA_UNAVAILABLE_RESPONSE,
          model: "tilik-jatim-guardrail",
        },
      });
    }

    // 5. Susun data terstruktur dari sumber yang sama dengan dashboard.
    const regionNames = regions.map((region) => region.name);
    const context = buildContext(query, regionNames);
    const cacheKey = buildCacheKey(query, regionNames, year);

    // 6. Cek cache sebelum memanggil Gemini.
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      console.log(
        `[ask] cache=hit key="${cacheKey}" keyLabel=${cached.keyLabel} model=${cached.model}`
      );
      return NextResponse.json({
        success: true,
        data: {
          answer: cached.answer,
          model: cached.model,
          cached: true,
        },
      });
    }
    if (cached) {
      responseCache.delete(cacheKey);
    }
    console.log(`[ask] cache=miss key="${cacheKey}"`);

    // 7. Siapkan key dan antrean.
    const keys = getApiKeys();
    if (keys.length === 0) {
      const template = buildTemplateAnswer(query, regionNames);
      if (template) {
        console.log("[ask] template fallback: tidak ada API key");
        return NextResponse.json({
          success: true,
          data: { answer: template, model: "tilik-jatim-template" },
        });
      }
      return NextResponse.json({
        success: true,
        data: { answer: AI_UNAVAILABLE_RESPONSE, model: "tilik-jatim-error" },
      });
    }

    const acquired = await acquireGeminiSlot();
    if (!acquired) {
      const template = buildTemplateAnswer(query, regionNames);
      if (template) {
        console.log("[ask] template fallback: antrean Gemini penuh");
        return NextResponse.json({
          success: true,
          data: { answer: template, model: "tilik-jatim-template" },
        });
      }
      return NextResponse.json({
        success: true,
        data: { answer: QUOTA_EXHAUSTED_RESPONSE, model: "tilik-jatim-quota" },
      });
    }

    try {
      const result = await callGemini(keys, query, context, history, 15000);
      if (result.ok) {
        const ttl = isShortcutQuery(query) ? SHORTCUT_CACHE_TTL_MS : CACHE_TTL_MS;
        responseCache.set(cacheKey, {
          answer: result.answer,
          model: result.model,
          keyLabel: result.keyLabel,
          expires: Date.now() + ttl,
        });
        return NextResponse.json({
          success: true,
          data: {
            answer: result.answer,
            model: result.model,
            key: result.keyLabel,
            cached: false,
          },
        });
      }

      const template = buildTemplateAnswer(query, regionNames);
      if (template) {
        console.log(`[ask] template fallback: kind=${result.kind}`);
        return NextResponse.json({
          success: true,
          data: { answer: template, model: "tilik-jatim-template" },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          answer: result.message,
          model: result.kind === "quota" ? "tilik-jatim-quota" : "tilik-jatim-error",
        },
      });
    } finally {
      releaseGeminiSlot();
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server", error: errorMsg },
      { status: 500 }
    );
  }
}
