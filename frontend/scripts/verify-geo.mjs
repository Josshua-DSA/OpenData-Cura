/**
 * Verifikasi GeoJSON Jawa Timur vs data wilayah aplikasi.
 *
 * Jalankan: node scripts/verify-geo.mjs
 *
 * Memeriksa:
 *  1. Jumlah fitur (harus 38) + daftar name/type.
 *  2. Bounding box total + fitur yang keluar dari rentang Jawa Timur.
 *  3. Pencocokan setiap fitur ke data wilayah memakai normalize() dari
 *     src/lib/regionDetector.ts (fungsi yang sama dengan aplikasi).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// --- Normalize identik dengan src/lib/regionDetector.ts -----------------------
function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/\b(kabupaten|kab\.?|kota)\b/gi, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Baca GeoJSON ------------------------------------------------------------
const geoPath = path.join(root, "public", "geo", "jatim-kabkota.geojson");
const geo = JSON.parse(fs.readFileSync(geoPath, "utf8"));

if (geo.type !== "FeatureCollection") {
  console.error(`GAGAL: type bukan FeatureCollection (${geo.type})`);
  process.exitCode = 1;
}

const features = geo.features ?? [];

// --- 1. Jumlah fitur + name/type --------------------------------------------
console.log("=== 1. Fitur ===");
console.log(`Jumlah fitur: ${features.length} (target 38)`);
if (features.length !== 38) process.exitCode = 1;
for (const f of features) {
  console.log(`  - ${f.properties?.id} | ${f.properties?.name} | ${f.properties?.type}`);
}

// --- 2. Bounding box ---------------------------------------------------------
function collectCoords(geometry, out) {
  if (!geometry) return;
  const walk = (node) => {
    if (typeof node?.[0] === "number") out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
  };
  walk(geometry.coordinates);
}

function bboxOf(feature) {
  const coords = [];
  collectCoords(feature.geometry, coords);
  const box = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  for (const [lon, lat] of coords) {
    if (lon < box.minLon) box.minLon = lon;
    if (lon > box.maxLon) box.maxLon = lon;
    if (lat < box.minLat) box.minLat = lat;
    if (lat > box.maxLat) box.maxLat = lat;
  }
  return box;
}

const LIMIT = { minLon: 110.0, maxLon: 115.0, minLat: -9.2, maxLat: -6.3 };

console.log("\n=== 2. Bounding Box ===");
const total = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
const outOfRange = [];
for (const f of features) {
  const box = bboxOf(f);
  total.minLon = Math.min(total.minLon, box.minLon);
  total.maxLon = Math.max(total.maxLon, box.maxLon);
  total.minLat = Math.min(total.minLat, box.minLat);
  total.maxLat = Math.max(total.maxLat, box.maxLat);
  const bad =
    box.minLon < LIMIT.minLon ||
    box.maxLon > LIMIT.maxLon ||
    box.minLat < LIMIT.minLat ||
    box.maxLat > LIMIT.maxLat;
  if (bad) outOfRange.push({ id: f.properties?.id, name: f.properties?.name, box });
}
console.log(
  `Total: lon ${total.minLon.toFixed(4)}..${total.maxLon.toFixed(4)}, ` +
    `lat ${total.minLat.toFixed(4)}..${total.maxLat.toFixed(4)}`
);
console.log("  (target lon ~110.9..114.6, lat ~-8.8..-6.7)");
if (outOfRange.length === 0) {
  console.log("Tidak ada fitur di luar rentang Jawa Timur.");
} else {
  console.log("Fitur di luar rentang:");
  for (const o of outOfRange) {
    console.log(
      `  - ${o.id} (${o.name}) lon ${o.box.minLon.toFixed(3)}..${o.box.maxLon.toFixed(3)}, ` +
        `lat ${o.box.minLat.toFixed(3)}..${o.box.maxLat.toFixed(3)}`
    );
  }
}

// --- 3. Cocokkan dengan data wilayah aplikasi -------------------------------
const healthPath = path.join(root, "src", "data", "healthData.ts");
const healthSrc = fs.readFileSync(healthPath, "utf8");
const regionHealth = [];
const entryRe = /id:\s*["']([a-z0-9-]+)["'][\s\S]*?name:\s*["']([^"']+)["']/g;
let m;
while ((m = entryRe.exec(healthSrc)) !== null) {
  const [, id, name] = m;
  if (!regionHealth.some((r) => r.id === id)) regionHealth.push({ id, name });
}

const byId = new Map(regionHealth.map((r) => [r.id, r]));
const byNorm = new Map();
for (const r of regionHealth) {
  const base = normalize(r.name.replace(/^(kab\.?|kota)\s*/i, ""));
  byNorm.set(base, r);
}

console.log(`\n=== 3. Pencocokan (${regionHealth.length} wilayah di data) ===`);
const unmatched = [];
const matches = [];
for (const f of features) {
  const id = f.properties?.id;
  const name = f.properties?.name ?? "";
  const norm = normalize(name.replace(/^(kab\.?|kota)\s*/i, ""));
  const hit = byId.get(id) || byNorm.get(norm) || null;
  if (hit) matches.push({ geo: id, app: hit.id, name });
  else unmatched.push({ geo: id, name, norm });
}

console.log(`Cocok: ${matches.length} / ${features.length}`);
console.log(`Tidak cocok: ${unmatched.length}`);
for (const u of unmatched) {
  console.log(`  - ${u.geo} (${u.name}) -> normalize "${u.norm}" tidak ada di data wilayah`);
}

const missingInGeo = regionHealth.filter((r) => !matches.some((x) => x.app === r.id));
if (missingInGeo.length) {
  console.log(`Wilayah data tanpa poligon: ${missingInGeo.length}`);
  for (const r of missingInGeo) console.log(`  - ${r.id} (${r.name})`);
}

if (matches.length !== features.length) process.exitCode = 1;
