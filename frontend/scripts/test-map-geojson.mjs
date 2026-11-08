// Test script: konsistensi peta choropleth Jawa Timur
// Memastikan GeoJSON publik (public/geo/jatim-kabkota.geojson) cocok dengan
// data kesehatan, geometrinya aman untuk Leaflet, dan konfigurasi warna
// (METRIC_CONFIG) selalu memberi klaster untuk seluruh 38 kabupaten/kota.
import { readFileSync } from "node:fs";
import path from "node:path";
import { register } from "node:module";

// Hook resolver: menangani alias "@/..." dan import relatif tanpa ekstensi
// (mapConfig.ts memakai `import ... from "./healthData"` seperti komponen Next.js).
register("./alias-loader.mjs", import.meta.url);

const { regionHealth } = await import("../src/data/healthData.ts");
const { regionScoreRows } = await import("../src/data/regionScoreData.ts");
const { BED_RATIO_THRESHOLDS, CLUSTER_STYLES, DEFAULT_LAYERS, METRIC_CONFIG } = await import(
  "../src/data/mapConfig.ts"
);
const { extractPolygons } = await import("../src/lib/geoUtils.ts");

const GEO_PATH = path.join(process.cwd(), "public", "geo", "jatim-kabkota.geojson");

// Harus sama dengan GEO_CLIP di src/components/EastJavaMarkerMap.tsx
const GEO_CLIP = { maxLng: 114.6, maxLat: -5.5 };
// Harus sama dengan MAX_BOUNDS di src/components/EastJavaMarkerMap.tsx
const MAP_MAX_BOUNDS = { west: 109.4, south: -10.4, east: 116.6, north: -5.1 };

const geo = JSON.parse(readFileSync(GEO_PATH, "utf8"));
const features = geo.features ?? [];

let passCount = 0;
let failCount = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(label, fn) {
  try {
    const detail = fn();
    passCount++;
    console.log(`[PASS] ${label}${detail ? ` -> ${detail}` : ""}`);
  } catch (error) {
    failCount++;
    failures.push(label);
    console.error(`[FAIL] ${label} -> ${error.message}`);
  }
}

const propsOf = (feature) => feature.properties ?? {};
const idOf = (feature) => String(propsOf(feature).id ?? "");

// Daftar poligon (array of rings) untuk Polygon maupun MultiPolygon.
function polygonsOf(feature) {
  const geometry = feature.geometry ?? {};
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function bboxOfPolygon(polygon) {
  const box = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity };
  for (const ring of polygon) {
    for (const [lng, lat] of ring) {
      box.west = Math.min(box.west, lng);
      box.east = Math.max(box.east, lng);
      box.south = Math.min(box.south, lat);
      box.north = Math.max(box.north, lat);
    }
  }
  return box;
}

function bboxOfFeature(feature, polygons = polygonsOf(feature)) {
  const box = { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity };
  for (const polygon of polygons) {
    const b = bboxOfPolygon(polygon);
    box.west = Math.min(box.west, b.west);
    box.east = Math.max(box.east, b.east);
    box.south = Math.min(box.south, b.south);
    box.north = Math.max(box.north, b.north);
  }
  return box;
}

// Aturan clip yang dipakai peta: buang pulau yang terlalu jauh (Bali/NTB/pulau terluar).
const isClippedAway = (box) => box.west > GEO_CLIP.maxLng || box.north > GEO_CLIP.maxLat;
const keptPolygonsOf = (feature) => polygonsOf(feature).filter((p) => !isClippedAway(bboxOfPolygon(p)));

const healthById = new Map(regionHealth.map((r) => [r.id, r]));
const geoById = new Map(features.map((f) => [idOf(f), f]));

console.log("=====================================================================");
console.log("UJIAN KONSISTENSI PETA CHOROPLETH JAWA TIMUR (GeoJSON <-> DATA)");
console.log("=====================================================================\n");

console.log("--- 1. STRUKTUR GEOJSON ---");
check("GeoJSON berisi tepat 38 fitur kabupaten/kota", () => {
  assert(features.length === 38, `jumlah fitur = ${features.length}`);
  return `${features.length} fitur`;
});
check("Setiap fitur punya id unik (tidak ada duplikat)", () => {
  const duplicates = features.map(idOf).filter((id, i, all) => all.indexOf(id) !== i);
  assert(duplicates.length === 0, `id duplikat: ${duplicates.join(", ")}`);
  const blank = features.filter((f) => !idOf(f) || !propsOf(f).name);
  assert(blank.length === 0, `fitur tanpa id/nama: ${blank.length}`);
  return `${new Set(features.map(idOf)).size} id unik`;
});
check("Tipe geometri hanya Polygon / MultiPolygon", () => {
  const invalid = features.filter(
    (f) => f.geometry?.type !== "Polygon" && f.geometry?.type !== "MultiPolygon",
  );
  assert(invalid.length === 0, `tipe tidak valid: ${invalid.map(idOf).join(", ")}`);
  return `${features.filter((f) => f.geometry.type === "MultiPolygon").length} MultiPolygon, ${features.filter((f) => f.geometry.type === "Polygon").length} Polygon`;
});
check("Properti type hanya 'kabupaten' / 'kota'", () => {
  const invalid = features.filter((f) => !["kabupaten", "kota"].includes(propsOf(f).type));
  assert(invalid.length === 0, `type tidak valid: ${invalid.map(idOf).join(", ")}`);
  return `${features.filter((f) => propsOf(f).type === "kota").length} kota`;
});

console.log("\n--- 2. KECOCOKAN DENGAN DATA KESEHATAN (healthData) ---");
check("Semua 38 wilayah peta ada di data kesehatan", () => {
  const missing = features.map(idOf).filter((id) => !healthById.has(id));
  assert(missing.length === 0, `id tanpa data: ${missing.join(", ")}`);
  return "38/38 cocok";
});
check("Semua wilayah data kesehatan ada di peta (tidak ada wilayah hilang)", () => {
  const missing = regionHealth.filter((r) => !geoById.has(r.id));
  assert(missing.length === 0, `wilayah tanpa geometri: ${missing.map((r) => r.id).join(", ")}`);
  return "38/38 tergambar";
});
check("Nama wilayah di peta sama dengan data kesehatan", () => {
  const mismatched = regionHealth
    .filter((r) => geoById.get(r.id) && propsOf(geoById.get(r.id)).name !== r.name)
    .map((r) => `${r.id}: "${propsOf(geoById.get(r.id)).name}" != "${r.name}"`);
  assert(mismatched.length === 0, mismatched.join("; "));
  return 'contoh: "Kab. Bangkalan", "Kota Surabaya"';
});
check("Tipe wilayah (kabupaten/kota) di peta sama dengan data kesehatan", () => {
  const mismatched = regionHealth
    .filter((r) => geoById.get(r.id) && propsOf(geoById.get(r.id)).type !== r.type)
    .map((r) => `${r.id}: peta=${propsOf(geoById.get(r.id)).type}, data=${r.type}`);
  assert(mismatched.length === 0, mismatched.join("; "));
  return "semua tipe konsisten";
});

console.log("\n--- 3. GEOMETRI & CLIP PETA ---");
check("Setiap fitur menyisakan minimal 1 poligon setelah clip", () => {
  const empty = features.filter((f) => keptPolygonsOf(f).length === 0);
  assert(empty.length === 0, `fitur hilang total: ${empty.map(idOf).join(", ")}`);
  const total = features.reduce((sum, f) => sum + polygonsOf(f).length, 0);
  const kept = features.reduce((sum, f) => sum + keptPolygonsOf(f).length, 0);
  return `${kept}/${total} poligon dipakai`;
});
check("Ring poligon valid untuk Leaflet (>= 4 titik & tertutup)", () => {
  const problems = [];
  for (const feature of features) {
    for (const polygon of polygonsOf(feature)) {
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4) {
          problems.push(`${idOf(feature)} ring ${ring?.length ?? 0} titik`);
          continue;
        }
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) problems.push(`${idOf(feature)} ring tidak tertutup`);
      }
    }
  }
  assert(problems.length === 0, problems.slice(0, 5).join("; "));
  return "semua ring tertutup";
});
check("Semua koordinat berada di rentang Jawa Timur", () => {
  const problems = [];
  for (const feature of features) {
    for (const polygon of polygonsOf(feature)) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) problems.push(`${idOf(feature)} koordinat tidak valid`);
          else if (lng < 110.5 || lng > 116.0 || lat < -9.2 || lat > -4.9) problems.push(`${idOf(feature)} di luar Jatim (${lng}, ${lat})`);
        }
      }
    }
  }
  assert(problems.length === 0, problems.slice(0, 5).join("; "));
  return "rentang 110,5-116,0 BT / 4,9-9,2 LS";
});
check("Pulau terluar (Sumenep, Gresik, Banyuwangi) ter-clip agar peta tidak melebar", () => {
  const sumenep = geoById.get("sumenep");
  assert(sumenep, "fitur sumenep tidak ada");
  const all = polygonsOf(sumenep).length;
  const kept = keptPolygonsOf(sumenep).length;
  assert(kept >= 1 && kept < all, `sumenep: ${kept}/${all} poligon dipakai`);
  const gresik = bboxOfFeature(geoById.get("gresik"), keptPolygonsOf(geoById.get("gresik")));
  assert(gresik.north < -5.6, `gresik utara = ${gresik.north}`);
  return `sumenep ${kept}/${all} poligon, Bawean tetap tampil`;
});
check("Batas gabungan hasil clip masih di dalam MAX_BOUNDS peta", () => {
  const keptBoxes = features.flatMap((f) => keptPolygonsOf(f).map(bboxOfPolygon));
  const west = Math.min(...keptBoxes.map((b) => b.west));
  const east = Math.max(...keptBoxes.map((b) => b.east));
  const south = Math.min(...keptBoxes.map((b) => b.south));
  const north = Math.max(...keptBoxes.map((b) => b.north));
  assert(
    west >= MAP_MAX_BOUNDS.west && east <= MAP_MAX_BOUNDS.east && south >= MAP_MAX_BOUNDS.south && north <= MAP_MAX_BOUNDS.north,
    `bbox ${west},${south} -> ${east},${north} keluar MAX_BOUNDS`,
  );
  return `bbox ${west.toFixed(3)},${south.toFixed(3)} -> ${east.toFixed(3)},${north.toFixed(3)}`;
});
check("extractPolygons membalik (lng, lat) GeoJSON menjadi (lat, lng) Leaflet", () => {
  const polygon = {
    type: "Feature",
    properties: { name: "Uji", id: "uji", type: "kabupaten" },
    geometry: { type: "Polygon", coordinates: [[[112.5, -7.5], [112.6, -7.5], [112.6, -7.6], [112.5, -7.5]]] },
  };
  const multi = {
    type: "Feature",
    properties: { name: "Uji", id: "uji", type: "kota" },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [[[112.5, -7.5], [112.6, -7.5], [112.6, -7.6], [112.5, -7.5]]],
        [[[114.0, -7.0], [114.1, -7.0], [114.1, -7.1], [114.0, -7.0]]],
      ],
    },
  };
  const single = extractPolygons(polygon);
  const plural = extractPolygons(multi);
  assert(single.length === 1 && single[0].length === 4, `Polygon -> ${single.length} ring`);
  assert(single[0][0][0] === -7.5 && single[0][0][1] === 112.5, `urutan koordinat salah: ${single[0][0]}`);
  assert(plural.length === 2, `MultiPolygon -> ${plural.length} ring`);
  return "Polygon 1 ring, MultiPolygon 2 ring";
});

console.log("\n--- 4. KONFIGURASI WARNA & LEGENDA (METRIC_CONFIG) ---");
const metricKeys = Object.keys(METRIC_CONFIG);
check("Tersedia 3 metrik peta (bedRatio, stuntingRate, disease)", () => {
  const expected = ["bedRatio", "stuntingRate", "disease"];
  const missing = expected.filter((k) => !metricKeys.includes(k));
  assert(missing.length === 0, `metrik hilang: ${missing.join(", ")}`);
  return metricKeys.join(", ");
});
check("Layer default: choropleth aktif, label tampil", () => {
  assert(DEFAULT_LAYERS.fill === true, "layer fill harus aktif");
  assert(DEFAULT_LAYERS.boundaries === true, "layer boundaries harus aktif");
  assert(DEFAULT_LAYERS.labels === true, "layer labels harus aktif");
  return "fill + boundaries + labels";
});
check("Ambang rasio tempat tidur berurutan menurun (adequate > stable > watch)", () => {
  assert(
    BED_RATIO_THRESHOLDS.adequate > BED_RATIO_THRESHOLDS.stable &&
      BED_RATIO_THRESHOLDS.stable > BED_RATIO_THRESHOLDS.watch,
    `ambang tidak urut: ${JSON.stringify(BED_RATIO_THRESHOLDS)}`,
  );
  return `${BED_RATIO_THRESHOLDS.adequate} > ${BED_RATIO_THRESHOLDS.stable} > ${BED_RATIO_THRESHOLDS.watch}`;
});

for (const key of metricKeys) {
  const config = METRIC_CONFIG[key];

  check(`[${key}] semua 38 wilayah dapat klaster (bukan "nodata")`, () => {
    const nodata = regionHealth.filter((r) => config.getCluster(r) === "nodata");
    assert(nodata.length === 0, `wilayah tanpa data: ${nodata.map((r) => r.id).join(", ")}`);
    return "38/38 berwarna";
  });

  check(`[${key}] ambang terkalibrasi: minimal 3 klaster terpakai, ada wilayah critical`, () => {
    const counts = regionHealth.reduce((acc, r) => {
      const c = config.getCluster(r);
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});
    const used = Object.keys(counts);
    assert(used.length >= 3, `hanya ${used.length} klaster terpakai (${JSON.stringify(counts)})`);
    assert((counts.critical ?? 0) >= 1, "tidak ada wilayah berstatus critical");
    const dominant = Math.max(...Object.values(counts));
    assert(dominant <= 30, `satu klaster mendominasi ${dominant}/38 wilayah`);
    return Object.entries(counts).map(([c, n]) => `${c}=${n}`).join(", ");
  });

  check(`[${key}] klaster & warna sesuai legenda ${config.legend.length} kategori`, () => {
    const legendClusters = config.legend.map((entry) => entry.cluster);
    assert(legendClusters.length === 4, `entri legenda = ${legendClusters.length}`);
    for (const entry of config.legend) {
      assert(entry.label && entry.threshold, `legenda ${entry.cluster} tanpa label/ambang`);
      assert(
        entry.color === CLUSTER_STYLES[entry.cluster].color,
        `warna legenda ${entry.cluster} = ${entry.color} != ${CLUSTER_STYLES[entry.cluster].color}`,
      );
    }
    const used = new Set(regionHealth.map((r) => config.getCluster(r)));
    const unlisted = [...used].filter((c) => !legendClusters.includes(c));
    assert(unlisted.length === 0, `klaster tanpa legenda: ${unlisted.join(", ")}`);
    const counts = regionHealth.reduce((acc, r) => {
      const c = config.getCluster(r);
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([c, n]) => `${c}=${n}`).join(", ");
  });

  check(`[${key}] label status, skor 0-100, dan tooltip valid untuk 38 wilayah`, () => {
    for (const region of regionHealth) {
      const status = config.getStatusLabel(region);
      assert(status?.label && status?.color, `${region.id} tanpa label status`);
      const score = config.getPriorityScore(region);
      assert(Number.isFinite(score) && score >= 0 && score <= 100, `${region.id} skor = ${score}`);
      const rows = config.tooltipRows(region);
      assert(Array.isArray(rows) && rows.length >= 2, `${region.id} tooltip hanya ${rows?.length ?? 0} baris`);
      for (const row of rows) {
        assert(Array.isArray(row) && row.length === 2 && row[0] && row[1], `${region.id} baris tooltip tidak valid`);
      }
      assert(config.getDisplay(region).length > 0, `${region.id} tanpa nilai tampil`);
    }
    return "38/38 valid";
  });
}

check("Urutan keparahan klaster konsisten (rasio tidur tertinggi = adequate)", () => {
  const config = METRIC_CONFIG.bedRatio;
  const sorted = [...regionHealth].sort((a, b) => b.bedRatio - a.bedRatio);
  assert(config.getCluster(sorted[0]) === "adequate", `tertinggi (${sorted[0].id}) bukan adequate`);
  assert(
    config.getCluster(sorted[sorted.length - 1]) === "critical",
    `terendah (${sorted[sorted.length - 1].id}) bukan critical`,
  );
  return `${sorted[0].id} adequate, ${sorted[sorted.length - 1].id} critical`;
});

// Angka pada teks legenda harus berasal dari konstanta ambang (tidak ditulis ulang
// manual), supaya legenda tidak pernah menampilkan rentang yang mustahil dicapai.
const LEGEND_EXPECTED_NUMBERS = {
  bedRatio: ["1,20", "1,00", "1,19", "0,75", "0,99"],
  stuntingRate: ["14,0", "19,9", "20,0", "24,9", "25,0"],
  disease: ["500", "749", "750", "999", "1.000"],
};

for (const [key, expectedNumbers] of Object.entries(LEGEND_EXPECTED_NUMBERS)) {
  check(`[${key}] teks legenda sesuai ambang data (${expectedNumbers.join(", ")})`, () => {
    const text = METRIC_CONFIG[key].legend.map((entry) => entry.threshold).join(" | ");
    const missing = expectedNumbers.filter((n) => !text.includes(n));
    assert(missing.length === 0, `angka tidak ditemukan: ${missing.join(", ")} pada "${text}"`);
    return text;
  });
}

console.log("\n--- 5. KECOCOKAN DENGAN DATA REKOMENDASI (regionScoreData) ---");
check("Semua id peta dipakai di halaman rekomendasi program", () => {
  const scoreIds = new Set(regionScoreRows.map((row) => row.id));
  const missing = features.map(idOf).filter((id) => !scoreIds.has(id));
  assert(missing.length === 0, `id tanpa skor: ${missing.join(", ")}`);
  return `${scoreIds.size} id`;
});
check("Tidak ada id skor yang tidak ada di peta (tidak bisa di-klik)", () => {
  const geoIds = new Set(features.map(idOf));
  const orphan = regionScoreRows.filter((row) => !geoIds.has(row.id));
  assert(orphan.length === 0, `id asing: ${orphan.map((row) => row.id).join(", ")}`);
  return "semua id punya geometri";
});

console.log("\n=====================================================================");
console.log(`TOTAL SUKSES : ${passCount}`);
console.log(`TOTAL GAGAL  : ${failCount}`);
if (failures.length > 0) {
  console.log("DAFTAR GAGAL :", failures);
} else {
  console.log("PETA JAWA TIMUR KONSISTEN: 38 WILAYAH SIAP DITAMPILKAN!");
}
console.log("=====================================================================");

if (failCount > 0) process.exitCode = 1;
