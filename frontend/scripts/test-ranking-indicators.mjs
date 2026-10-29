// Test script for indicator ranking detection and verification
import { buildRanking, isRankingQuery } from "../src/lib/regionDetector.ts";
import { regionHealth } from "../src/data/healthData.ts";
import { regionScoreRows } from "../src/data/regionScoreData.ts";

console.log("================================================================================");
console.log("PENGUJIAN SISTEM PERINGKAT INDIKATOR KESEHATAN TILIK JATIM");
console.log("================================================================================\n");

const testQueries = [
  {
    query: "mana wilayah yang memiliki stunting tertinggi",
    expectedIndicator: "Prevalensi Stunting",
    expectedOrder: "desc",
    expectedCount: 5,
    verifyAgainst: (regions) => [...regions].sort((a, b) => b.stuntingRate - a.stuntingRate),
    valueAccessor: (r) => `${r.stuntingRate.toFixed(1).replace(".", ",")}%`,
  },
  {
    query: "stunting terendah",
    expectedIndicator: "Prevalensi Stunting",
    expectedOrder: "asc",
    expectedCount: 5,
    verifyAgainst: (regions) => [...regions].sort((a, b) => a.stuntingRate - b.stuntingRate),
    valueAccessor: (r) => `${r.stuntingRate.toFixed(1).replace(".", ",")}%`,
  },
  {
    query: "rasio tempat tidur terendah",
    expectedIndicator: "Rasio Tempat Tidur",
    expectedOrder: "asc",
    expectedCount: 5,
    verifyAgainst: (regions) => [...regions].sort((a, b) => a.bedRatio - b.bedRatio),
    valueAccessor: (r) => `${r.bedRatio.toFixed(2).replace(".", ",")} per 1.000 penduduk`,
  },
  {
    query: "tenaga kesehatan paling sedikit",
    expectedIndicator: "Rasio Tenaga Kesehatan",
    expectedOrder: "asc",
    expectedCount: 5,
    verifyAgainst: (regions, scoreRows) => {
      const scoreMap = new Map(scoreRows.map((s) => [s.id, s]));
      return [...regions].sort((a, b) => {
        const nakesA = scoreMap.get(a.id)?.indicatorScores.find((i) => i.label === "Tenaga Kesehatan")?.value ?? Math.round(48 + a.facilityCount / 2.2);
        const nakesB = scoreMap.get(b.id)?.indicatorScores.find((i) => i.label === "Tenaga Kesehatan")?.value ?? Math.round(48 + b.facilityCount / 2.2);
        return nakesA - nakesB;
      });
    },
    valueAccessor: (r, scoreRows) => {
      const scoreMap = new Map(scoreRows.map((s) => [s.id, s]));
      const val = scoreMap.get(r.id)?.indicatorScores.find((i) => i.label === "Tenaga Kesehatan")?.value ?? Math.round(48 + r.facilityCount / 2.2);
      return `${val}/100`;
    },
  },
  {
    query: "skor kesehatan tertinggi",
    expectedIndicator: "Skor Kesehatan",
    expectedOrder: "desc",
    expectedCount: 5,
    verifyAgainst: (regions, scoreRows) => {
      const scoreMap = new Map(scoreRows.map((s) => [s.id, s]));
      return [...regions].sort((a, b) => (scoreMap.get(b.id)?.score ?? 50) - (scoreMap.get(a.id)?.score ?? 50));
    },
    valueAccessor: (r, scoreRows) => {
      const scoreMap = new Map(scoreRows.map((s) => [s.id, s]));
      const sc = scoreMap.get(r.id);
      return `${sc?.score ?? 50}/100 (Status: ${sc?.status ?? "Baik"})`;
    },
  },
  {
    query: "top 3 wilayah yang perlu diperhatikan",
    expectedIndicator: "Skor Kesehatan",
    expectedOrder: "asc",
    expectedCount: 3,
    verifyAgainst: (regions, scoreRows) => {
      const scoreMap = new Map(scoreRows.map((s) => [s.id, s]));
      return [...regions].sort((a, b) => (scoreMap.get(a.id)?.score ?? 50) - (scoreMap.get(b.id)?.score ?? 50));
    },
    valueAccessor: (r, scoreRows) => {
      const scoreMap = new Map(scoreRows.map((s) => [s.id, s]));
      const sc = scoreMap.get(r.id);
      return `${sc?.score ?? 50}/100 (Status: ${sc?.status ?? "Prioritas Tinggi"})`;
    },
  },
];

let allPassed = true;

for (let i = 0; i < testQueries.length; i++) {
  const t = testQueries[i];
  console.log(`[TEST ${i + 1}] Query: "${t.query}"`);

  const isRanking = isRankingQuery(t.query);
  if (!isRanking) {
    console.error(`  [FAIL] isRankingQuery returned false!`);
    allPassed = false;
    continue;
  }

  const result = buildRanking(t.query);
  const indMatch = result.indicator.name === t.expectedIndicator;
  const orderMatch = result.order === t.expectedOrder;
  const countMatch = result.items.length === t.expectedCount;

  console.log(`  - Indikator Terdeteksi : ${result.indicator.name} ${indMatch ? "[OK]" : "[FAIL]"}`);
  console.log(`  - Arah Urutan          : ${result.directionLabel} (order: ${result.order}) ${orderMatch ? "[OK]" : "[FAIL]"}`);
  console.log(`  - Jumlah Hasil        : ${result.items.length} wilayah ${countMatch ? "[OK]" : "[FAIL]"}`);

  // Verifikasi terhadap data asli
  const expectedSorted = t.verifyAgainst(regionHealth, regionScoreRows);
  console.log(`  - Daftar Hasil Urutan:`);

  let listMatch = true;
  for (let j = 0; j < result.items.length; j++) {
    const item = result.items[j];
    const expectedRaw = expectedSorted[j];
    const expectedValStr = t.valueAccessor(expectedRaw, regionScoreRows);

    const idMatch = item.region.id === expectedRaw.id;
    const valMatch = item.formattedValue === expectedValStr;

    if (!idMatch || !valMatch) {
      listMatch = false;
    }
    console.log(`    ${item.rank}. ${item.region.name}: ${item.formattedValue} ${idMatch && valMatch ? "✓" : `✗ (Harusnya: ${expectedRaw.name}: ${expectedValStr})`}`);
  }

  if (indMatch && orderMatch && countMatch && listMatch) {
    console.log(`  -> STATUS PENGUJIAN: [BERHASIL 100%]\n`);
  } else {
    console.error(`  -> STATUS PENGUJIAN: [GAGAL]\n`);
    allPassed = false;
  }
}

console.log("================================================================================");
if (allPassed) {
  console.log("KESIMPULAN: SELURUH 6 PENGUJIAN PERINGKAT INDIKATOR LOLOS VERIFIKASI DATA ASLI!");
} else {
  console.error("KESIMPULAN: TERDAPAT PENGUJIAN YANG GAGAL.");
}
console.log("================================================================================");

