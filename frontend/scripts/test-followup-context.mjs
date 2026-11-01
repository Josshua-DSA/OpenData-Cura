// Uji otomatis: pertanyaan lanjutan yang mewarisi konteks riwayat
import {
  buildRanking,
  resolveContext,
  detectNStrict,
  getAllEnrichedRegions,
} from "../src/lib/regionDetector.ts";

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}${detail ? "\n" + detail : ""}`); }
}

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
  const expected = truth(indicatorKey, dir, n);
  const gotNames = section.items.map(it => it.region.name);
  const expNames = expected.map(e => e.name);
  check(`${label}: indikator=${indicatorKey}`, section.indicator.key === indicatorKey);
  check(`${label}: jumlah item = ${n}`, section.items.length === n, `got ${section.items.length}`);
  check(`${label}: urutan nama benar`, JSON.stringify(gotNames) === JSON.stringify(expNames),
    `  expected: ${expNames.join(", ")}\n  got:      ${gotNames.join(", ")}`);
  const valsOk = section.items.every((it, i) => Math.abs(it.value - expected[i].value) < 1e-9);
  check(`${label}: nilai sesuai data asli`, valsOk,
    `  expected: ${expected.map(e => e.value).join(", ")}\n  got:      ${section.items.map(i => i.value).join(", ")}`);
}

// Util: simulasikan pipeline route (resolveContext + buildRanking)
function rankedReply(userMessage, history) {
  const ctx = resolveContext(userMessage, history);
  const ranking = buildRanking(userMessage, undefined, 5, {
    indicators: ctx.indicators,
    directions: ctx.directions,
    limit: ctx.n ?? undefined,
  });
  return { ctx, ranking };
}
const H = (msgs) => msgs.map((text) => ({ role: "user", text }));

console.log("=".repeat(80));
console.log("DETEKSI N STRICT");
console.log("=".repeat(80));
check("N 'top 10' = 10", detectNStrict("kalau top 10 nya") === 10);
check("N '10 nya' = 10", detectNStrict("10 nya dong") === 10);
check("N 'sepuluh' = 10", detectNStrict("sepuluh wilayah") === 10);
check("N 'lima besar' = 5", detectNStrict("lima besar stunting") === 5);
check("N 'tambah jadi 8' = 8", detectNStrict("tambah jadi 8") === 8);
check("N kosong = null", detectNStrict("kalau yang terendah") === null);
check("N maksimal 38", detectNStrict("top 100 daerah") === 38);

console.log("\n" + "=".repeat(80));
console.log("SKENARIO A: 'top 5 stunting tertinggi' -> 'kalau top 10 nya'");
console.log("=".repeat(80));
{
  const h = H(["top 5 stunting tertinggi"]);
  const { ctx, ranking } = rankedReply("kalau top 10 nya", h);
  console.log("\nKonteks: " + ctx.contextLabel + "\n");
  check("A: indikator warisan = stunting", ctx.indicators[0].key === "stunting");
  check("A: arah warisan = high", ctx.directions.includes("high"));
  verifySection(ranking.sections[0], "stunting", "desc", 10, "A");
}

console.log("\n" + "=".repeat(80));
console.log("SKENARIO B: 'top 5 stunting tertinggi' -> 'kalau yang terendah'");
console.log("=".repeat(80));
{
  const h = H(["top 5 stunting tertinggi"]);
  const { ctx, ranking } = rankedReply("kalau yang terendah", h);
  console.log("\nKonteks: " + ctx.contextLabel + "\n");
  check("B: indikator warisan = stunting", ctx.indicators[0].key === "stunting");
  check("B: arah berubah = low", ctx.directions.includes("low"));
  // N tidak disebut pada pesan lanjutan; mewarisi 5 dari pesan sebelumnya
  verifySection(ranking.sections[0], "stunting", "asc", 5, "B");
}

console.log("\n" + "=".repeat(80));
console.log("SKENARIO C: 'rasio tempat tidur terendah' -> 'tambah jadi 8'");
console.log("=".repeat(80));
{
  const h = H(["rasio tempat tidur terendah"]);
  const { ctx, ranking } = rankedReply("tambah jadi 8", h);
  console.log("\nKonteks: " + ctx.contextLabel + "\n");
  check("C: indikator warisan = bedRatio", ctx.indicators[0].key === "bedRatio");
  check("C: N baru = 8", ctx.n === 8);
  verifySection(ranking.sections[0], "bedRatio", "asc", 8, "C");
}

console.log("\n" + "=".repeat(80));
console.log("SKENARIO D: 'program di kabupaten Trenggalek' -> 'kalau Sampang?'");
console.log("=".repeat(80));
{
  const h = H(["program di kabupaten Trenggalek"]);
  const ctxPrev = resolveContext("program di kabupaten Trenggalek", []);
  check("D: wilayah awal = Kabupaten Trenggalek", ctxPrev.regions[0]?.name === "Kabupaten Trenggalek",
    `got ${ctxPrev.regions[0]?.name}`);
  const { ctx } = rankedReply("kalau Sampang?", h);
  console.log("\nKonteks: " + ctx.contextLabel + "\n");
  check("D: wilayah eksplisit baru = Kabupaten Sampang", ctx.explicitRegions[0]?.name === "Kabupaten Sampang",
    `got ${ctx.explicitRegions[0]?.name}`);
  check("D: wilayah efektif = Sampang (bukan Trenggalek)", ctx.regions[0]?.name === "Kabupaten Sampang");
}

console.log("\n" + "=".repeat(80));
console.log("SKENARIO E: 'stunting tertinggi' -> 'sekarang skor kesehatan terendah'");
console.log("=".repeat(80));
{
  const h = H(["stunting tertinggi"]);
  const { ctx, ranking } = rankedReply("sekarang skor kesehatan terendah", h);
  console.log("\nKonteks: " + ctx.contextLabel + "\n");
  check("E: topik berganti -> indikator = score", ctx.indicators[0].key === "score",
    `got ${ctx.indicators[0].key}`);
  check("E: TIDAK mewarisi stunting", !ctx.indicators.some(i => i.key === "stunting"));
  check("E: arah = low", ctx.directions.includes("low"));
  verifySection(ranking.sections[0], "score", "asc", 5, "E");
}

console.log("\n" + "=".repeat(80));
console.log(`HASIL: ${pass} lolos, ${fail} gagal`);
console.log("=".repeat(80));
process.exit(fail > 0 ? 1 : 0);
