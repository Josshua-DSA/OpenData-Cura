// Dihasilkan dari public/data/regional_health_index_scores.csv.
// Jangan edit manual; perbarui CSV lalu sesuaikan modul ini bila data berubah.

export interface RegionScoreCsvRow {
  score: number;
  rank: number;
  kategori: string;
}

export const regionScoreCsv: Record<string, RegionScoreCsvRow> = {
  "Kabupaten Pacitan": { score: 55.05, rank: 8, kategori: "Tangguh / Mandiri" },
  "Kabupaten Ponorogo": { score: 50.36, rank: 15, kategori: "Waspada" },
  "Kabupaten Trenggalek": { score: 45.55, rank: 21, kategori: "Waspada" },
  "Kabupaten Tulungagung": { score: 44.98, rank: 22, kategori: "Waspada" },
  "Kabupaten Blitar": { score: 46.5, rank: 19, kategori: "Waspada" },
  "Kabupaten Kediri": { score: 48.45, rank: 17, kategori: "Waspada" },
  "Kabupaten Malang": { score: 37.23, rank: 34, kategori: "Prioritas Intervensi" },
  "Kabupaten Lumajang": { score: 42.56, rank: 24, kategori: "Waspada" },
  "Kabupaten Jember": { score: 39.11, rank: 31, kategori: "Prioritas Intervensi" },
  "Kabupaten Banyuwangi": { score: 42.83, rank: 23, kategori: "Waspada" },
  "Kabupaten Bondowoso": { score: 41.8, rank: 25, kategori: "Waspada" },
  "Kabupaten Situbondo": { score: 35.89, rank: 36, kategori: "Prioritas Intervensi" },
  "Kabupaten Probolinggo": { score: 34.16, rank: 37, kategori: "Prioritas Intervensi" },
  "Kabupaten Pasuruan": { score: 39.76, rank: 29, kategori: "Prioritas Intervensi" },
  "Kabupaten Sidoarjo": { score: 55.73, rank: 6, kategori: "Tangguh / Mandiri" },
  "Kabupaten Mojokerto": { score: 40.89, rank: 28, kategori: "Waspada" },
  "Kabupaten Jombang": { score: 49.46, rank: 16, kategori: "Waspada" },
  "Kabupaten Nganjuk": { score: 47.38, rank: 18, kategori: "Waspada" },
  "Kabupaten Madiun": { score: 51.01, rank: 14, kategori: "Waspada" },
  "Kabupaten Magetan": { score: 41.15, rank: 27, kategori: "Waspada" },
  "Kabupaten Ngawi": { score: 36.11, rank: 35, kategori: "Prioritas Intervensi" },
  "Kabupaten Bojonegoro": { score: 61.5, rank: 2, kategori: "Tangguh / Mandiri" },
  "Kabupaten Tuban": { score: 41.79, rank: 26, kategori: "Waspada" },
  "Kabupaten Lamongan": { score: 53.69, rank: 11, kategori: "Waspada" },
  "Kabupaten Gresik": { score: 46.21, rank: 20, kategori: "Waspada" },
  "Kabupaten Bangkalan": { score: 38.8, rank: 32, kategori: "Prioritas Intervensi" },
  "Kabupaten Sampang": { score: 37.31, rank: 33, kategori: "Prioritas Intervensi" },
  "Kabupaten Pamekasan": { score: 55.71, rank: 7, kategori: "Tangguh / Mandiri" },
  "Kabupaten Sumenep": { score: 33.29, rank: 38, kategori: "Prioritas Intervensi" },
  "Kota Kediri": { score: 63.52, rank: 1, kategori: "Tangguh / Mandiri" },
  "Kota Blitar": { score: 59.61, rank: 4, kategori: "Tangguh / Mandiri" },
  "Kota Malang": { score: 53.92, rank: 10, kategori: "Waspada" },
  "Kota Probolinggo": { score: 55.02, rank: 9, kategori: "Tangguh / Mandiri" },
  "Kota Pasuruan": { score: 51.83, rank: 13, kategori: "Waspada" },
  "Kota Mojokerto": { score: 59.87, rank: 3, kategori: "Tangguh / Mandiri" },
  "Kota Madiun": { score: 59.12, rank: 5, kategori: "Tangguh / Mandiri" },
  "Kota Surabaya": { score: 52.78, rank: 12, kategori: "Waspada" },
  "Kota Batu": { score: 39.42, rank: 30, kategori: "Prioritas Intervensi" },
};
