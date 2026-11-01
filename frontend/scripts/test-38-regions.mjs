// Test script for 38 East Java regions detection
import { regionHealth } from "../src/data/healthData.ts";
import { regionScoreRows } from "../src/data/regionScoreData.ts";
import { detectRegion, normalize, buildDataWilayahBlock } from "../src/lib/regionDetector.ts";

console.log("=================================================");
console.log("UJIAN PENDETEKSI WILAYAH (38 KABUPATEN/KOTA JATIM)");
console.log("=================================================\n");

let passedCount = 0;
let failedCount = 0;
const failedList = [];

// 1. Uji seluruh 29 Kabupaten
console.log("--- PENGUJIAN 29 KABUPATEN ---");
const kabList = regionHealth.filter((r) => r.type === "kabupaten");
for (const kab of kabList) {
  const rawBase = kab.name.replace(/^(kab\.?|kota)\s*/i, "").trim();
  const query = `program di kabupaten ${rawBase}`;
  const result = detectRegion(query);

  if (result.region && result.region.id === kab.id) {
    passedCount++;
    console.log(`[PASS] "${query}" -> ${result.region.name} (id: ${result.region.id})`);
  } else {
    failedCount++;
    const got = result.region ? `${result.region.name} (id: ${result.region.id})` : "TIDAK TERDETEKSI";
    failedList.push({ query, expected: kab.id, got });
    console.error(`[FAIL] "${query}" -> Expected id ${kab.id}, but got ${got}`);
  }
}

// 2. Uji seluruh 9 Kota
console.log("\n--- PENGUJIAN 9 KOTA ---");
const kotaList = regionHealth.filter((r) => r.type === "kota");
for (const kota of kotaList) {
  const rawBase = kota.name.replace(/^(kab\.?|kota)\s*/i, "").trim();
  const query = `program di kota ${rawBase}`;
  const result = detectRegion(query);

  if (result.region && result.region.id === kota.id) {
    passedCount++;
    console.log(`[PASS] "${query}" -> ${result.region.name} (id: ${result.region.id})`);
  } else {
    failedCount++;
    const got = result.region ? `${result.region.name} (id: ${result.region.id})` : "TIDAK TERDETEKSI";
    failedList.push({ query, expected: kota.id, got });
    console.error(`[FAIL] "${query}" -> Expected id ${kota.id}, but got ${got}`);
  }
}

// 3. Uji Kasus Khusus & Nama Kembar (Default tanpa kata kota/kabupaten -> Kabupaten)
console.log("\n--- PENGUJIAN KASUS KHUSUS & NAMA KEMBAR ---");
const edgeCases = [
  { q: "rekomendasi program di kabupaten tulungagung", expectedId: "tulungagung" },
  { q: "program di tulung agung", expectedId: "tulungagung" },
  { q: "program di Tulung Agung", expectedId: "tulungagung" },
  { q: "rekomendasi di malang", expectedId: "malang-kab" }, // default kabupaten
  { q: "rekomendasi di kota malang", expectedId: "malang-kota" },
  { q: "rekomendasi di kabupaten malang", expectedId: "malang-kab" },
  { q: "program di kediri", expectedId: "kediri-kab" }, // default kabupaten
  { q: "program di kota kediri", expectedId: "kediri-kota" },
  { q: "rekomendasi blitar", expectedId: "blitar-kab" },
  { q: "rekomendasi kota blitar", expectedId: "blitar-kota" },
];

for (const ec of edgeCases) {
  const result = detectRegion(ec.q);
  if (result.region && result.region.id === ec.expectedId) {
    passedCount++;
    console.log(`[PASS] "${ec.q}" -> ${result.region.name} (id: ${result.region.id})`);
  } else {
    failedCount++;
    const got = result.region ? `${result.region.name} (id: ${result.region.id})` : "TIDAK TERDETEKSI";
    failedList.push({ query: ec.q, expected: ec.expectedId, got });
    console.error(`[FAIL] "${ec.q}" -> Expected id ${ec.expectedId}, but got ${got}`);
  }
}

// 4. Uji Wilayah yang Tidak Ditemukan
console.log("\n--- PENGUJIAN WILAYAH TIDAK TERDAFTAR ---");
const unknownQueries = [
  "program di kabupaten antahberantah",
  "rekomendasi di kota bandung",
  "kondisi faskes di kabupaten cianjur",
];

for (const uq of unknownQueries) {
  const result = detectRegion(uq);
  if (result.unrecognizedMention && !result.region) {
    passedCount++;
    console.log(`[PASS] "${uq}" -> Terdeteksi menyebut kabupaten/kota asing (unrecognizedMention: true)`);
  } else {
    failedCount++;
    console.error(`[FAIL] "${uq}" -> Seharusnya unrecognizedMention: true`);
  }
}

console.log("\n=================================================");
console.log(`TOTAL SUKSES : ${passedCount}`);
console.log(`TOTAL GAGAL  : ${failedCount}`);
if (failedList.length > 0) {
  console.log("DAFTAR GAGAL :", failedList);
} else {
  console.log("SEMUA 38 WILAYAH & KASUS KHUSUS BERHASIL 100%!");
}
console.log("=================================================");

