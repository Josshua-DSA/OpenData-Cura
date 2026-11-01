// Uji otomatis: pertanyaan majemuk (banyak arah / banyak indikator / jumlah N)
// Verifikasi dilakukan terhadap data asli melalui getAllEnrichedRegions()
import {
  buildRanking,
  detectDirections,
  detectIndicators,
  detectLimit,
  getAllEnrichedRegions,
} from "../src/lib/regionDetector.ts";

let pass = 0, fail = 0;

function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}${detail ? "\n" + detail : ""}`); }
}

// Kebenaran: sortir langsung pada data asli (sama dengan sumber buildRanking)
const ALL = getAllEnrichedRegions();
const GETTERS = {
  score: (r) => r.score,
  stunting: (r) => r.stunting,
  bedRatio: (r) => r.bedRatio,
  nakes: (r) => r.nakesScore,
  facilities: (r) => r.facilityCount,
};

function truth(indicator, dir, n) {
  const get = GETTERS[indicator];
  const sorted = [...ALL].sort((a, b) => dir === "desc" ? get(b) - get(a) : get(a) - get(b));
  return sorted.slice(0, n).map(r => ({ name: r.name, value: get(r) }));
}

function verifySection(section, indicatorKey, dir, n, label) {
  if (!section) { check(`${label}: bagian ada`, false, "bagian tidak ditemukan"); return; }
  const expected = truth(indicatorKey, dir, n);
  const gotNames = section.items.map(it => it.region.name);
  const expNames = expected.map(e => e.name);
  check(`${label}: jumlah item = ${n}`, section.items.length === n, `got ${section.items.length}`);
  check(`${label}: urutan nama benar`, JSON.stringify(gotNames) === JSON.stringify(expNames),
    `  expected: ${expNames.join(", ")}\n  got:      ${gotNames.join(", ")}`);
  const valsOk = section.items.every((it, i) => Math.abs(it.value - expected[i].value) < 1e-9);
  check(`${label}: nilai sesuai data asli`, valsOk,
    `  expected: ${expected.map(e => e.value).join(", ")}\n  got:      ${section.items.map(i => i.value).join(", ")}`);
}

console.log("=".repeat(80));
console.log("DETEKSI ARAH (array)");
console.log("=".repeat(80));
check("directions 'tertinggi dan terendah' = [high, low]",
  JSON.stringify(detectDirections("sebutkan 3 daerah dengan skor tertinggi dan terendah")) === JSON.stringify(["high", "low"]));
check("directions 'kalau yang terendah' = [low]",
  JSON.stringify(detectDirections("kalau yang terendah")) === JSON.stringify(["low"]));
check("directions 'prioritas tertinggi' = [low] (skor kesehatan terendah)",
  JSON.stringify(detectDirections("wilayah dengan prioritas tertinggi")) === JSON.stringify(["low"]));
check("directions 'prioritas tertinggi dan terendah' = [low, high]",
  JSON.stringify(detectDirections("berikan wilayah dengan prioritas tertinggi dan terendah")) === JSON.stringify(["low", "high"]));

console.log("\n" + "=".repeat(80));
console.log("DETEKSI INDIKATOR (array)");
console.log("=".repeat(80));
check("indikator 'stunting dan rasio tempat tidur' = [stunting, bedRatio]",
  JSON.stringify(detectIndicators("stunting dan rasio tempat tidur terendah").map(i => i.key)) === JSON.stringify(["stunting", "bedRatio"]));
check("indikator default = [score]",
  JSON.stringify(detectIndicators("daerah terendah").map(i => i.key)) === JSON.stringify(["score"]));

console.log("\n" + "=".repeat(80));
console.log("DETEKSI JUMLAH N");
console.log("=".repeat(80));
check("N '3 daerah' = 3", detectLimit("sebutkan 3 daerah dengan skor tertinggi dan terendah") === 3);
check("N 'top 5' = 5", detectLimit("top 5 stunting") === 5);
check("N 'tiga wilayah' = 3", detectLimit("tiga wilayah stunting tertinggi") === 3);
check("N 'lima daerah' = 5", detectLimit("lima daerah terendah") === 5);
check("N '10 teratas' = 10", detectLimit("10 teratas skor kesehatan") === 10);
check("N default = 5", detectLimit("daerah stunting tertinggi") === 5);

console.log("\n" + "=".repeat(80));
console.log("BUILD RANKING - KASUS BUG UTAMA");
console.log("=".repeat(80));
{
  const q = "sebutkan 3 daerah dengan skor tertinggi dan terendah";
  const r = buildRanking(q);
  console.log("\nBLOK PERINGKAT yang dikirim ke Gemini:\n" + r.rankingBlock + "\n");
  check("kasus bug: 2 bagian (high & low)", r.sections.length === 2, `got ${r.sections.length}`);
  check("kasus bug: limit = 3", r.limit === 3, `got ${r.limit}`);
  verifySection(r.sections[0], "score", "desc", 3, "kasus bug [high]");
  verifySection(r.sections[1], "score", "asc", 3, "kasus bug [low]");
}

console.log("\n" + "=".repeat(80));
console.log("KASUS LAIN");
console.log("=".repeat(80));
{
  const r = buildRanking("berikan wilayah dengan prioritas tertinggi dan terendah");
  check("prioritas: 2 bagian", r.sections.length === 2, `got ${r.sections.length}`);
  verifySection(r.sections[0], "score", "asc", 5, "prioritas [tertinggi=>low]");
  verifySection(r.sections[1], "score", "desc", 5, "prioritas [terendah=>high]");
}
{
  const r = buildRanking("stunting tertinggi dan terendah");
  check("stunting: 2 bagian", r.sections.length === 2, `got ${r.sections.length}`);
  verifySection(r.sections[0], "stunting", "desc", 5, "stunting [high]");
  verifySection(r.sections[1], "stunting", "asc", 5, "stunting [low]");
}
{
  const r = buildRanking("stunting dan rasio tempat tidur terendah");
  check("dua indikator: 2 bagian", r.sections.length === 2, `got ${r.sections.length}`);
  verifySection(r.sections[0], "stunting", "asc", 5, "multi-indikator [stunting low]");
  verifySection(r.sections[1], "bedRatio", "asc", 5, "multi-indikator [bedRatio low]");
}
{
  const r = buildRanking("top 3 terbaik dan terburuk");
  check("top 3 terbaik & terburuk: 2 bagian, N=3", r.sections.length === 2 && r.limit === 3,
    `sections=${r.sections.length} limit=${r.limit}`);
  // Urutan bagian mengikuti urutan kata dalam pertanyaan: "terburuk" terdeteksi lebih dulu
  verifySection(r.sections[0], "score", "asc", 3, "top3 [terburuk]");
  verifySection(r.sections[1], "score", "desc", 3, "top3 [terbaik]");
}
{
  const r = buildRanking("kalau yang terendah");
  check("lanjutan 'terendah': 1 bagian asc, indikator default skor",
    r.sections.length === 1 && r.indicator.key === "score");
  verifySection(r.sections[0], "score", "asc", 5, "lanjutan [low]");
}
{
  // Kompatibilitas: kasus lama tetap benar
  const r = buildRanking("10 daerah dengan skor kesehatan terendah");
  verifySection(r.sections[0], "score", "asc", 10, "lama [skor low N=10]");
  const r2 = buildRanking("tiga wilayah stunting tertinggi");
  check("lama: N kata bilangan 'tiga' = 3", r2.limit === 3, `got ${r2.limit}`);
  verifySection(r2.sections[0], "stunting", "desc", 3, "lama [stunting high N=3]");
}

console.log("\n" + "=".repeat(80));
console.log(`HASIL: ${pass} lolos, ${fail} gagal`);
console.log("=".repeat(80));
process.exit(fail > 0 ? 1 : 0);
