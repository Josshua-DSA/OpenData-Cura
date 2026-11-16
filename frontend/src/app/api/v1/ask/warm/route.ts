import { NextResponse } from "next/server";
import { POST as askPost } from "../route";

const SHORTCUT_QUERIES = [
  "Wilayah mana yang menjadi prioritas intervensi?",
  "Apa tren penyakit yang paling perlu diperhatikan?",
  "Wilayah mana yang kekurangan akses fasilitas kesehatan?",
  "Jelaskan cara membaca skor kesehatan wilayah.",
  "Apa pola stunting di wilayah prioritas?",
  "Program apa yang direkomendasikan untuk Kabupaten Probolinggo?",
];

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, message: "Pemanasan cache hanya tersedia di development." },
      { status: 404 }
    );
  }

  const results: Array<{ query: string; answer?: string; model?: string }> = [];

  for (const query of SHORTCUT_QUERIES) {
    const res = await askPost(
      new Request("http://localhost/api/v1/ask", {
        method: "POST",
        headers: { "content-type": "application/json", "x-warm-cache": "1" },
        body: JSON.stringify({ query, history: [] }),
      })
    );
    const payload = await res.json();
    results.push({ query, answer: payload?.data?.answer, model: payload?.data?.model });
  }

  return NextResponse.json({ success: true, data: results });
}
