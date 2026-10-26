// East Java (Jawa Timur) administrative boundaries — kabupaten/kota level
// Simplified polygons based on real geographic data (GADM-derived approximations).
// Province spans approx 111.0°E–114.4°E, 6.85°S–8.8°S.
// Madura island: 112.6°E–114.1°E, 6.85°S–7.25°S.

export interface KabupatenFeature {
  type: "Feature";
  properties: { name: string; id: string; type: "kabupaten" | "kota" };
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
}

export interface EastJavaGeoJSON {
  type: "FeatureCollection";
  features: KabupatenFeature[];
}

const eastJavaGeo: EastJavaGeoJSON = {
  type: "FeatureCollection",
  features: [
    // ── MADURA ISLAND ───────────────────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Bangkalan", id: "bangkalan", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.62, -6.89], [112.70, -6.87], [112.82, -6.88], [112.95, -6.93],
          [112.98, -7.00], [112.94, -7.08], [112.85, -7.13], [112.72, -7.15],
          [112.65, -7.10], [112.60, -7.02], [112.58, -6.95], [112.62, -6.89]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Sampang", id: "sampang", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.95, -6.93], [113.10, -6.88], [113.22, -6.88], [113.30, -6.92],
          [113.33, -7.00], [113.28, -7.10], [113.15, -7.16], [113.00, -7.18],
          [112.94, -7.08], [112.98, -7.00], [112.95, -6.93]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Pamekasan", id: "pamekasan", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.30, -6.92], [113.42, -6.87], [113.52, -6.86], [113.58, -6.90],
          [113.60, -6.98], [113.55, -7.08], [113.44, -7.14], [113.30, -7.15],
          [113.15, -7.16], [113.28, -7.10], [113.33, -7.00], [113.30, -6.92]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Sumenep", id: "sumenep", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.58, -6.90], [113.72, -6.85], [113.88, -6.85], [114.05, -6.87],
          [114.10, -6.95], [114.08, -7.05], [113.98, -7.12], [113.80, -7.15],
          [113.60, -7.14], [113.55, -7.08], [113.60, -6.98], [113.58, -6.90]
        ]]
      }
    },

    // ── NORTH COAST (West to East) ──────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Tuban", id: "tuban", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.00, -6.90], [111.30, -6.88], [111.55, -6.88], [111.75, -6.90],
          [111.80, -7.05], [111.75, -7.20], [111.60, -7.28], [111.40, -7.30],
          [111.20, -7.25], [111.05, -7.15], [111.00, -7.02], [111.00, -6.90]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Lamongan", id: "lamongan", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.75, -6.90], [112.00, -6.88], [112.20, -6.90], [112.38, -6.95],
          [112.42, -7.08], [112.38, -7.20], [112.22, -7.28], [112.05, -7.30],
          [111.88, -7.28], [111.75, -7.20], [111.80, -7.05], [111.75, -6.90]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Gresik", id: "gresik", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.38, -6.95], [112.55, -6.92], [112.68, -6.96], [112.72, -7.05],
          [112.68, -7.18], [112.55, -7.25], [112.42, -7.28], [112.38, -7.20],
          [112.42, -7.08], [112.38, -6.95]
        ]]
      }
    },

    // ── SURABAYA METROPOLITAN ──────────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kota Surabaya", id: "surabaya", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.60, -7.12], [112.68, -7.18], [112.72, -7.30], [112.70, -7.38],
          [112.62, -7.40], [112.55, -7.38], [112.50, -7.30], [112.52, -7.20],
          [112.60, -7.12]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Sidoarjo", id: "sidoarjo", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.55, -7.38], [112.62, -7.40], [112.70, -7.38], [112.78, -7.40],
          [112.82, -7.52], [112.78, -7.62], [112.65, -7.65], [112.52, -7.60],
          [112.45, -7.50], [112.48, -7.42], [112.55, -7.38]
        ]]
      }
    },

    // ── MOJOKERTO / JOMBANG ─────────────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Mojokerto", id: "mojokerto-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.22, -7.28], [112.38, -7.20], [112.42, -7.28], [112.55, -7.25],
          [112.60, -7.38], [112.55, -7.38], [112.48, -7.42], [112.35, -7.48],
          [112.22, -7.45], [112.12, -7.38], [112.10, -7.28], [112.22, -7.28]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Mojokerto", id: "mojokerto-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.42, -7.28], [112.48, -7.28], [112.52, -7.35], [112.48, -7.42],
          [112.35, -7.48], [112.30, -7.40], [112.35, -7.32], [112.42, -7.28]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Jombang", id: "jombang", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.05, -7.30], [112.22, -7.28], [112.10, -7.28], [112.12, -7.38],
          [112.22, -7.45], [112.10, -7.55], [111.95, -7.58], [111.82, -7.52],
          [111.80, -7.40], [111.88, -7.28], [112.05, -7.30]
        ]]
      }
    },

    // ── KEDIRI / NGANJUK ────────────────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Nganjuk", id: "nganjuk", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.60, -7.28], [111.75, -7.20], [111.88, -7.28], [111.80, -7.40],
          [111.82, -7.52], [111.70, -7.60], [111.55, -7.62], [111.42, -7.55],
          [111.38, -7.42], [111.45, -7.30], [111.60, -7.28]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Kediri", id: "kediri-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.55, -7.62], [111.70, -7.60], [111.82, -7.52], [111.95, -7.58],
          [112.05, -7.72], [112.00, -7.88], [111.88, -7.98], [111.72, -8.00],
          [111.60, -7.92], [111.52, -7.80], [111.50, -7.68], [111.55, -7.62]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Kediri", id: "kediri-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.95, -7.58], [112.05, -7.58], [112.10, -7.68], [112.05, -7.75],
          [111.98, -7.78], [111.90, -7.72], [111.88, -7.65], [111.95, -7.58]
        ]]
      }
    },

    // ── MADIUN / MAGETAN / NGAWI / PONOROGO ─────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Madiun", id: "madiun-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.20, -7.25], [111.40, -7.30], [111.45, -7.30], [111.38, -7.42],
          [111.25, -7.50], [111.10, -7.52], [111.00, -7.45], [111.00, -7.32],
          [111.10, -7.25], [111.20, -7.25]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Madiun", id: "madiun-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.38, -7.42], [111.48, -7.42], [111.52, -7.52], [111.45, -7.58],
          [111.35, -7.55], [111.25, -7.50], [111.38, -7.42]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Ngawi", id: "ngawi", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.00, -6.90], [111.00, -7.02], [111.00, -7.15], [111.00, -7.25],
          [111.10, -7.25], [111.20, -7.25], [111.30, -7.15], [111.35, -7.02],
          [111.28, -6.95], [111.15, -6.90], [111.00, -6.90]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Magetan", id: "magetan", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.10, -7.25], [111.20, -7.25], [111.20, -7.38], [111.10, -7.52],
          [111.00, -7.58], [111.00, -7.45], [111.00, -7.32], [111.10, -7.25]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Ponorogo", id: "ponorogo", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.25, -7.50], [111.38, -7.42], [111.35, -7.55], [111.42, -7.55],
          [111.50, -7.68], [111.45, -7.85], [111.35, -7.95], [111.18, -7.98],
          [111.05, -7.92], [111.00, -7.80], [111.00, -7.65], [111.00, -7.58],
          [111.10, -7.52], [111.25, -7.50]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Bojonegoro", id: "bojonegoro", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.30, -6.88], [111.55, -6.88], [111.75, -6.90], [111.80, -7.05],
          [111.75, -7.20], [111.60, -7.28], [111.45, -7.30], [111.40, -7.30],
          [111.30, -7.15], [111.35, -7.02], [111.28, -6.95], [111.30, -6.88]
        ]]
      }
    },

    // ── BLITAR / TULUNGAGUNG / TRENGGALEK / PACITAN ─────────────
    {
      type: "Feature",
      properties: { name: "Kab. Blitar", id: "blitar-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.88, -7.98], [112.00, -7.88], [112.08, -7.95], [112.18, -8.00],
          [112.22, -8.15], [112.18, -8.28], [112.05, -8.38], [111.90, -8.40],
          [111.75, -8.35], [111.65, -8.25], [111.62, -8.10], [111.72, -8.00],
          [111.88, -7.98]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Blitar", id: "blitar-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.08, -7.95], [112.18, -8.00], [112.20, -8.08], [112.12, -8.14],
          [112.05, -8.10], [112.02, -8.02], [112.08, -7.95]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Tulungagung", id: "tulungagung", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.60, -7.92], [111.72, -8.00], [111.62, -8.10], [111.65, -8.25],
          [111.55, -8.38], [111.40, -8.42], [111.28, -8.38], [111.18, -8.28],
          [111.15, -8.12], [111.22, -8.00], [111.35, -7.95], [111.50, -7.90],
          [111.60, -7.92]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Trenggalek", id: "trenggalek", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.35, -7.95], [111.50, -7.90], [111.52, -7.80], [111.60, -7.92],
          [111.50, -7.90], [111.35, -7.95], [111.22, -8.00], [111.18, -8.28],
          [111.05, -8.35], [111.00, -8.20], [111.00, -8.00], [111.05, -7.92],
          [111.18, -7.98], [111.35, -7.95]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Pacitan", id: "pacitan", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [111.00, -7.80], [111.05, -7.92], [111.00, -8.00], [111.00, -8.20],
          [111.05, -8.35], [111.00, -8.50], [111.00, -8.70], [111.10, -8.75],
          [111.25, -8.72], [111.38, -8.60], [111.40, -8.42], [111.28, -8.38],
          [111.18, -8.28], [111.15, -8.12], [111.22, -8.00], [111.18, -7.98],
          [111.05, -7.92], [111.00, -7.80]
        ]]
      }
    },

    // ── MALANG REGION ────────────────────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Malang", id: "malang-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.00, -7.88], [112.10, -7.72], [112.22, -7.65], [112.35, -7.72],
          [112.45, -7.82], [112.58, -7.88], [112.65, -7.92], [112.75, -8.05],
          [112.78, -8.20], [112.70, -8.38], [112.55, -8.45], [112.40, -8.48],
          [112.22, -8.42], [112.05, -8.38], [111.90, -8.40], [111.90, -8.28],
          [112.00, -8.15], [112.18, -8.00], [112.08, -7.95], [112.00, -7.88]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Malang", id: "malang-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.35, -7.72], [112.48, -7.72], [112.58, -7.80], [112.60, -7.90],
          [112.52, -7.98], [112.40, -7.98], [112.32, -7.90], [112.30, -7.80],
          [112.35, -7.72]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Batu", id: "batu", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.22, -7.65], [112.35, -7.62], [112.48, -7.65], [112.48, -7.72],
          [112.35, -7.72], [112.22, -7.65]
        ]]
      }
    },

    // ── PASURUAN / PROBOLINGGO ───────────────────────────────────
    {
      type: "Feature",
      properties: { name: "Kab. Pasuruan", id: "pasuruan-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.65, -7.65], [112.78, -7.62], [112.92, -7.60], [113.00, -7.70],
          [113.02, -7.82], [112.92, -7.92], [112.78, -8.00], [112.65, -8.02],
          [112.55, -7.98], [112.52, -7.90], [112.58, -7.80], [112.65, -7.75],
          [112.78, -7.62], [112.65, -7.65]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Pasuruan", id: "pasuruan-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [112.78, -7.62], [112.90, -7.60], [112.95, -7.68], [112.90, -7.76],
          [112.80, -7.78], [112.72, -7.72], [112.78, -7.62]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Probolinggo", id: "probolinggo-kab", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.00, -7.70], [113.12, -7.68], [113.25, -7.68], [113.38, -7.72],
          [113.45, -7.80], [113.42, -7.92], [113.28, -8.00], [113.10, -8.05],
          [112.98, -8.02], [112.90, -7.92], [113.02, -7.82], [113.00, -7.70]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kota Probolinggo", id: "probolinggo-kota", type: "kota" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.18, -7.68], [113.28, -7.66], [113.35, -7.74], [113.30, -7.82],
          [113.20, -7.84], [113.12, -7.78], [113.18, -7.68]
        ]]
      }
    },

    // ── LUMAJANG / JEMBER / BONDOWOSO / SITUBONDO / BANYUWANGI ──
    {
      type: "Feature",
      properties: { name: "Kab. Lumajang", id: "lumajang", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.10, -8.05], [113.28, -8.00], [113.42, -8.00], [113.52, -8.08],
          [113.55, -8.22], [113.48, -8.38], [113.32, -8.48], [113.15, -8.50],
          [113.00, -8.44], [112.88, -8.35], [112.85, -8.20], [112.92, -8.08],
          [113.00, -8.02], [113.10, -8.05]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Jember", id: "jember", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.48, -8.38], [113.62, -8.25], [113.72, -8.18], [113.85, -8.15],
          [113.95, -8.20], [114.00, -8.32], [113.98, -8.48], [113.88, -8.60],
          [113.72, -8.65], [113.55, -8.65], [113.40, -8.58], [113.28, -8.50],
          [113.15, -8.50], [113.32, -8.48], [113.48, -8.38]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Bondowoso", id: "bondowoso", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.45, -7.80], [113.58, -7.75], [113.72, -7.75], [113.82, -7.80],
          [113.88, -7.92], [113.85, -8.05], [113.72, -8.18], [113.62, -8.25],
          [113.48, -8.38], [113.42, -8.28], [113.42, -8.12], [113.45, -7.92],
          [113.45, -7.80]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Situbondo", id: "situbondo", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [113.38, -7.72], [113.52, -7.68], [113.65, -7.65], [113.78, -7.62],
          [113.92, -7.60], [114.08, -7.60], [114.22, -7.62], [114.35, -7.68],
          [114.38, -7.78], [114.30, -7.88], [114.15, -7.92], [114.00, -7.95],
          [113.88, -7.92], [113.82, -7.80], [113.72, -7.75], [113.58, -7.75],
          [113.45, -7.80], [113.42, -7.92], [113.38, -7.80], [113.38, -7.72]
        ]]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kab. Banyuwangi", id: "banyuwangi", type: "kabupaten" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [114.00, -7.95], [114.15, -7.92], [114.30, -7.88], [114.38, -7.78],
          [114.40, -7.90], [114.42, -8.10], [114.40, -8.30], [114.35, -8.52],
          [114.22, -8.67], [114.05, -8.72], [113.88, -8.70], [113.72, -8.65],
          [113.55, -8.65], [113.40, -8.58], [113.28, -8.50], [113.40, -8.50],
          [113.55, -8.48], [113.70, -8.45], [113.85, -8.38], [113.95, -8.25],
          [113.95, -8.08], [113.92, -7.95], [114.00, -7.95]
        ]]
      }
    },
  ]
};

export default eastJavaGeo;
