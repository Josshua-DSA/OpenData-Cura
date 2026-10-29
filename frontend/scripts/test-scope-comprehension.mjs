// Test script for scope comprehension rules
import { detectRegion, getTopRegions, getBottomRegions } from "../src/lib/regionDetector.ts";

console.log("=================================================================");
console.log("PENGUJIAN ATURAN PEMAHAMAN PERTANYAAN (SCOPE COMPREHENSION TEST)");
console.log("=================================================================\n");

const tests = [
  // 1. Peringkat / Urutan Wilayah
  { q: "top 3 wilayah dengan skor kesehatan tertinggi", category: "Peringkat / Urutan", expectInScope: true },
  { q: "5 terbawah skor kesehatan di jatim", category: "Peringkat / Urutan", expectInScope: true },
  { q: "wilayah mana yang paling parah?", category: "Peringkat / Urutan", expectInScope: true },
  { q: "daerah mana yang terbaik dan terendah?", category: "Peringkat / Urutan", expectInScope: true },
  { q: "wilayah mana yang perlu diperhatikan dan perlu dibantu?", category: "Peringkat / Urutan", expectInScope: true },
  { q: "wilayah prioritas kesehatan", category: "Peringkat / Urutan", expectInScope: true },

  // 2. Perbandingan Antarwilayah / Antar-indikator
  { q: "bandingkan surabaya dan sampang", category: "Perbandingan", expectInScope: true, expectMultiRegion: 2 },
  { q: "perbandingan faskes surabaya vs probolinggo", category: "Perbandingan", expectInScope: true, expectMultiRegion: 2 },
  { q: "perbandingan stunting dan tempat tidur", category: "Perbandingan", expectInScope: true },

  // 3. Pertanyaan Lanjutan Singkat
  { q: "kalau yang kedua?", category: "Pertanyaan Lanjutan", expectInScope: true },
  { q: "kenapa begitu?", category: "Pertanyaan Lanjutan", expectInScope: true },
  { q: "yang lain?", category: "Pertanyaan Lanjutan", expectInScope: true },

  // 4. Istilah Umum tentang Kondisi Wilayah
  { q: "bagaimana skor kesehatan wilayah?", category: "Istilah Umum", expectInScope: true },
  { q: "ranking kabupaten di jawa timur", category: "Istilah Umum", expectInScope: true },
  { q: "kondisi kesehatan di tulungagung", category: "Istilah Umum", expectInScope: true, expectRegion: "Kabupaten Tulungagung" },
  { q: "apa masalah dan kekurangan di sampang?", category: "Istilah Umum", expectInScope: true, expectRegion: "Kabupaten Sampang" },
  { q: "kelebihan kota surabaya dalam fasilitas", category: "Istilah Umum", expectInScope: true, expectRegion: "Kota Surabaya" },

  // 5. Penolakan Khusus Murni Luar Lingkup
  { q: "hitung 25 * 4", category: "Luar Lingkup (Matematika)", expectInScope: false },
  { q: "resep masak rendang padang", category: "Luar Lingkup (Resep)", expectInScope: false },
  { q: "buatkan fungsi python loop array", category: "Luar Lingkup (Coding)", expectInScope: false },
  { q: "siapa calon presiden pemilu amerika", category: "Luar Lingkup (Politik Non-Kesehatan)", expectInScope: false },

  // 6. Jika Ragu: Tetap Jawab (Dalam Lingkup)
  { q: "bagaimana situasinya sekarang?", category: "Ambiguitas (Wajib Jawab)", expectInScope: true },
  { q: "apa data yang ada?", category: "Ambiguitas (Wajib Jawab)", expectInScope: true },
];

function isTrulyOutOfScope(query) {
  const q = query.toLowerCase().trim();
  if (/(\b\d+\s*[\+\-\*\/]\s*\d+\b|\b(akar\s+kuadrat|sinus|cosinus|kalkulus|rumus\s+pitagoras)\b)/i.test(q)) {
    return true;
  }
  if (/\b(resep\s+masak|cara\s+membuat\s+(kue|nasi|rendang|sambal|makanan|roti)|bumbu\s+dapur)\b/i.test(q)) {
    return true;
  }
  if (/\b(koding|syntax|fungsi\s+python|javascript|typescript|query\s+sql|react\s+component|css\s+flexbox|git\s+push)\b/i.test(q)) {
    return true;
  }
  if (/\b(chord\s+gitar|lirik\s+lagu|film\s+bioskop|game|anime|drama\s+korea|cerita\s+lucu|jokes)\b/i.test(q)) {
    return true;
  }
  if (/\b(calon\s+presiden|capres|cawapres|partai\s+politik|pemilu|pilpres|menteri\s+pertahanan)\b/i.test(q)) {
    return true;
  }
  return false;
}

let passCount = 0;
let failCount = 0;

for (const t of tests) {
  const outOfScope = isTrulyOutOfScope(t.q);
  const inScope = !outOfScope;
  const det = detectRegion(t.q);

  let success = inScope === t.expectInScope;
  if (t.expectMultiRegion && (!det.regions || det.regions.length < t.expectMultiRegion)) {
    success = false;
  }
  if (t.expectRegion && (!det.region || det.region.name !== t.expectRegion)) {
    success = false;
  }

  if (success) {
    passCount++;
    console.log(`[PASS] [${t.category}] "${t.q}" -> inScope: ${inScope}${det.region ? ` (Wilayah: ${det.region.name})` : ""}${det.regions && det.regions.length > 1 ? ` (Multi: ${det.regions.map(r => r.name).join(", ")})` : ""}`);
  } else {
    failCount++;
    console.error(`[FAIL] [${t.category}] "${t.q}"`);
  }
}

console.log("\n=================================================================");
console.log(`TOTAL SUKSES: ${passCount}`);
console.log(`TOTAL GAGAL : ${failCount}`);
console.log("=================================================================");

