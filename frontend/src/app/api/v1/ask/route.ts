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

  if (/\b(calon\s+presiden|capres|cawapres|partai\s+politik|pemilu|pilpres|politik|saham|crypto|kripto|reksa\s+dana|investasi)\b/i.test(q)) {
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

async function callGemini(
  apiKey: string,
  query: string,
  context: unknown,
  history: ChatHistoryItem[],
  timeoutMs = 15000
): Promise<string> {
  const models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];

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

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        continue;
      }

      const json = await res.json();
      const rawAnswer = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawAnswer && rawAnswer.trim()) {
        return cleanPlainText(rawAnswer);
      }
    } catch {
      continue;
    }
  }

  throw new Error("Gemini API call timed out or failed");
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

    // 1. Tolak pertanyaan di luar lingkup sebelum memanggil layanan AI.
    if (isTrulyOutOfScope(query)) {
      return NextResponse.json({
        success: true,
        data: {
          answer: OUT_OF_SCOPE_RESPONSE,
          model: "tilik-jatim-scope",
        },
      });
    }

    // 2. Tahun di luar data aktif.
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

    // 3. Deteksi wilayah secara dinamis (mendukung multi-wilayah).
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

    // 4. Susun data terstruktur dari sumber yang sama dengan dashboard.
    const regionNames = regions.map((region) => region.name);
    const context = buildContext(query, regionNames);

    // 5. Gunakan layanan AI hanya jika API key tersedia di sisi server.
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        data: {
          answer: AI_UNAVAILABLE_RESPONSE,
          model: "tilik-jatim-error",
        },
      });
    }

    try {
      const answer = await callGemini(apiKey, query, context, history, 15000);
      return NextResponse.json({
        success: true,
        data: {
          answer,
          model: "tilik-jatim-live",
        },
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          answer: AI_UNAVAILABLE_RESPONSE,
          model: "tilik-jatim-error",
        },
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server", error: errorMsg },
      { status: 500 }
    );
  }
}
