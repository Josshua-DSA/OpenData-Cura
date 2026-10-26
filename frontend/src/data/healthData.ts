export interface RegionHealth {
  id: string;
  name: string;
  type: "kabupaten" | "kota";
  bedRatio: number;       // beds per 1,000 population
  stuntingRate: number;   // percentage
  facilityCount: number;
  priorityLevel: "high" | "medium" | "low";
  aki: number;            // Angka Kematian Ibu per 100k
  akb: number;            // Angka Kematian Bayi per 1k
  population: number;
  dbd: number;            // DBD cases
  tb: number;             // TB cases
  pneumonia: number;
}

export const regionHealth: RegionHealth[] = [
  { id: "pacitan", name: "Kab. Pacitan", type: "kabupaten", bedRatio: 0.52, stuntingRate: 24.8, facilityCount: 28, priorityLevel: "high", aki: 142, akb: 9.8, population: 545800, dbd: 45, tb: 320, pneumonia: 185 },
  { id: "ponorogo", name: "Kab. Ponorogo", type: "kabupaten", bedRatio: 0.88, stuntingRate: 21.2, facilityCount: 42, priorityLevel: "medium", aki: 118, akb: 8.2, population: 869200, dbd: 68, tb: 480, pneumonia: 220 },
  { id: "trenggalek", name: "Kab. Trenggalek", type: "kabupaten", bedRatio: 0.78, stuntingRate: 22.4, facilityCount: 32, priorityLevel: "medium", aki: 125, akb: 8.8, population: 692400, dbd: 52, tb: 390, pneumonia: 198 },
  { id: "tulungagung", name: "Kab. Tulungagung", type: "kabupaten", bedRatio: 1.05, stuntingRate: 17.8, facilityCount: 48, priorityLevel: "low", aki: 98, akb: 6.5, population: 1038500, dbd: 88, tb: 520, pneumonia: 245 },
  { id: "blitar-kab", name: "Kab. Blitar", type: "kabupaten", bedRatio: 0.82, stuntingRate: 20.1, facilityCount: 45, priorityLevel: "medium", aki: 110, akb: 7.5, population: 1148200, dbd: 72, tb: 445, pneumonia: 212 },
  { id: "kediri-kab", name: "Kab. Kediri", type: "kabupaten", bedRatio: 0.95, stuntingRate: 19.2, facilityCount: 55, priorityLevel: "low", aki: 105, akb: 7.1, population: 1526000, dbd: 95, tb: 580, pneumonia: 268 },
  { id: "malang-kab", name: "Kab. Malang", type: "kabupaten", bedRatio: 0.74, stuntingRate: 22.8, facilityCount: 62, priorityLevel: "medium", aki: 130, akb: 9.0, population: 2678200, dbd: 142, tb: 820, pneumonia: 385 },
  { id: "lumajang", name: "Kab. Lumajang", type: "kabupaten", bedRatio: 0.68, stuntingRate: 24.1, facilityCount: 36, priorityLevel: "high", aki: 138, akb: 9.5, population: 1022400, dbd: 65, tb: 420, pneumonia: 202 },
  { id: "jember", name: "Kab. Jember", type: "kabupaten", bedRatio: 0.89, stuntingRate: 20.8, facilityCount: 58, priorityLevel: "medium", aki: 112, akb: 7.8, population: 2429400, dbd: 128, tb: 750, pneumonia: 352 },
  { id: "banyuwangi", name: "Kab. Banyuwangi", type: "kabupaten", bedRatio: 1.12, stuntingRate: 16.5, facilityCount: 68, priorityLevel: "low", aki: 88, akb: 6.0, population: 1746600, dbd: 105, tb: 610, pneumonia: 285 },
  { id: "bondowoso", name: "Kab. Bondowoso", type: "kabupaten", bedRatio: 0.62, stuntingRate: 25.8, facilityCount: 30, priorityLevel: "high", aki: 148, akb: 10.2, population: 747200, dbd: 48, tb: 350, pneumonia: 178 },
  { id: "situbondo", name: "Kab. Situbondo", type: "kabupaten", bedRatio: 0.72, stuntingRate: 23.5, facilityCount: 32, priorityLevel: "high", aki: 135, akb: 9.2, population: 668200, dbd: 42, tb: 310, pneumonia: 165 },
  { id: "probolinggo-kab", name: "Kab. Probolinggo", type: "kabupaten", bedRatio: 0.58, stuntingRate: 26.2, facilityCount: 35, priorityLevel: "high", aki: 152, akb: 10.8, population: 1122400, dbd: 58, tb: 390, pneumonia: 188 },
  { id: "pasuruan-kab", name: "Kab. Pasuruan", type: "kabupaten", bedRatio: 0.76, stuntingRate: 21.5, facilityCount: 52, priorityLevel: "medium", aki: 122, akb: 8.5, population: 1597400, dbd: 98, tb: 510, pneumonia: 238 },
  { id: "sidoarjo", name: "Kab. Sidoarjo", type: "kabupaten", bedRatio: 1.18, stuntingRate: 14.2, facilityCount: 78, priorityLevel: "low", aki: 82, akb: 5.5, population: 2218600, dbd: 168, tb: 680, pneumonia: 312 },
  { id: "mojokerto-kab", name: "Kab. Mojokerto", type: "kabupaten", bedRatio: 0.92, stuntingRate: 18.8, facilityCount: 46, priorityLevel: "low", aki: 102, akb: 7.0, population: 1102000, dbd: 82, tb: 465, pneumonia: 218 },
  { id: "jombang", name: "Kab. Jombang", type: "kabupaten", bedRatio: 0.98, stuntingRate: 18.2, facilityCount: 50, priorityLevel: "low", aki: 96, akb: 6.8, population: 1275400, dbd: 92, tb: 498, pneumonia: 232 },
  { id: "nganjuk", name: "Kab. Nganjuk", type: "kabupaten", bedRatio: 0.85, stuntingRate: 20.5, facilityCount: 44, priorityLevel: "medium", aki: 115, akb: 8.0, population: 1041200, dbd: 74, tb: 428, pneumonia: 205 },
  { id: "madiun-kab", name: "Kab. Madiun", type: "kabupaten", bedRatio: 0.90, stuntingRate: 19.5, facilityCount: 38, priorityLevel: "low", aki: 108, akb: 7.3, population: 669200, dbd: 55, tb: 362, pneumonia: 172 },
  { id: "magetan", name: "Kab. Magetan", type: "kabupaten", bedRatio: 0.95, stuntingRate: 18.5, facilityCount: 36, priorityLevel: "low", aki: 100, akb: 6.9, population: 620400, dbd: 52, tb: 340, pneumonia: 162 },
  { id: "ngawi", name: "Kab. Ngawi", type: "kabupaten", bedRatio: 0.80, stuntingRate: 21.8, facilityCount: 40, priorityLevel: "medium", aki: 118, akb: 8.2, population: 820400, dbd: 62, tb: 405, pneumonia: 195 },
  { id: "bojonegoro", name: "Kab. Bojonegoro", type: "kabupaten", bedRatio: 0.78, stuntingRate: 22.0, facilityCount: 44, priorityLevel: "medium", aki: 122, akb: 8.4, population: 1215600, dbd: 72, tb: 465, pneumonia: 222 },
  { id: "tuban", name: "Kab. Tuban", type: "kabupaten", bedRatio: 0.75, stuntingRate: 22.5, facilityCount: 40, priorityLevel: "medium", aki: 128, akb: 8.8, population: 1154200, dbd: 68, tb: 440, pneumonia: 212 },
  { id: "lamongan", name: "Kab. Lamongan", type: "kabupaten", bedRatio: 0.88, stuntingRate: 19.8, facilityCount: 48, priorityLevel: "low", aki: 108, akb: 7.4, population: 1182000, dbd: 82, tb: 470, pneumonia: 225 },
  { id: "gresik", name: "Kab. Gresik", type: "kabupaten", bedRatio: 1.02, stuntingRate: 16.8, facilityCount: 54, priorityLevel: "low", aki: 92, akb: 6.2, population: 1315000, dbd: 105, tb: 512, pneumonia: 240 },
  { id: "bangkalan", name: "Kab. Bangkalan", type: "kabupaten", bedRatio: 0.48, stuntingRate: 28.5, facilityCount: 26, priorityLevel: "high", aki: 165, akb: 11.5, population: 965000, dbd: 38, tb: 295, pneumonia: 155 },
  { id: "sampang", name: "Kab. Sampang", type: "kabupaten", bedRatio: 0.42, stuntingRate: 31.2, facilityCount: 22, priorityLevel: "high", aki: 178, akb: 12.2, population: 1006000, dbd: 32, tb: 268, pneumonia: 142 },
  { id: "pamekasan", name: "Kab. Pamekasan", type: "kabupaten", bedRatio: 0.55, stuntingRate: 27.8, facilityCount: 28, priorityLevel: "high", aki: 155, akb: 10.8, population: 858200, dbd: 42, tb: 285, pneumonia: 148 },
  { id: "sumenep", name: "Kab. Sumenep", type: "kabupaten", bedRatio: 0.62, stuntingRate: 25.2, facilityCount: 35, priorityLevel: "high", aki: 148, akb: 10.2, population: 1090000, dbd: 48, tb: 312, pneumonia: 162 },
  // Kota
  { id: "surabaya", name: "Kota Surabaya", type: "kota", bedRatio: 2.45, stuntingRate: 9.8, facilityCount: 125, priorityLevel: "low", aki: 58, akb: 3.8, population: 2977000, dbd: 285, tb: 1250, pneumonia: 520 },
  { id: "malang-kota", name: "Kota Malang", type: "kota", bedRatio: 2.18, stuntingRate: 11.2, facilityCount: 58, priorityLevel: "low", aki: 68, akb: 4.5, population: 874000, dbd: 142, tb: 580, pneumonia: 268 },
  { id: "kediri-kota", name: "Kota Kediri", type: "kota", bedRatio: 1.85, stuntingRate: 13.5, facilityCount: 42, priorityLevel: "low", aki: 78, akb: 5.2, population: 295000, dbd: 78, tb: 285, pneumonia: 135 },
  { id: "blitar-kota", name: "Kota Blitar", type: "kota", bedRatio: 1.72, stuntingRate: 14.2, facilityCount: 28, priorityLevel: "low", aki: 85, akb: 5.6, population: 136000, dbd: 52, tb: 185, pneumonia: 88 },
  { id: "madiun-kota", name: "Kota Madiun", type: "kota", bedRatio: 2.05, stuntingRate: 12.8, facilityCount: 32, priorityLevel: "low", aki: 72, akb: 4.8, population: 180000, dbd: 65, tb: 215, pneumonia: 102 },
  { id: "mojokerto-kota", name: "Kota Mojokerto", type: "kota", bedRatio: 1.95, stuntingRate: 13.8, facilityCount: 24, priorityLevel: "low", aki: 80, akb: 5.4, population: 125000, dbd: 48, tb: 168, pneumonia: 80 },
  { id: "pasuruan-kota", name: "Kota Pasuruan", type: "kota", bedRatio: 1.68, stuntingRate: 15.2, facilityCount: 22, priorityLevel: "low", aki: 88, akb: 5.8, population: 192000, dbd: 55, tb: 185, pneumonia: 88 },
  { id: "probolinggo-kota", name: "Kota Probolinggo", type: "kota", bedRatio: 1.58, stuntingRate: 16.0, facilityCount: 20, priorityLevel: "low", aki: 92, akb: 6.2, population: 238000, dbd: 58, tb: 195, pneumonia: 92 },
  { id: "batu", name: "Kota Batu", type: "kota", bedRatio: 1.42, stuntingRate: 16.8, facilityCount: 18, priorityLevel: "low", aki: 95, akb: 6.5, population: 212000, dbd: 48, tb: 165, pneumonia: 78 },
];

export const diseaseTrend = [
  { month: "Jan", dbd: 245, tb: 5820, pneumonia: 3200 },
  { month: "Feb", dbd: 312, tb: 5950, pneumonia: 3350 },
  { month: "Mar", dbd: 428, tb: 6100, pneumonia: 3500 },
  { month: "Apr", dbd: 385, tb: 6050, pneumonia: 3420 },
  { month: "May", dbd: 298, tb: 5980, pneumonia: 3280 },
  { month: "Jun", dbd: 212, tb: 5820, pneumonia: 3100 },
  { month: "Jul", dbd: 188, tb: 5750, pneumonia: 3050 },
  { month: "Aug", dbd: 175, tb: 5700, pneumonia: 2980 },
  { month: "Sep", dbd: 205, tb: 5820, pneumonia: 3080 },
  { month: "Oct", dbd: 268, tb: 5920, pneumonia: 3200 },
  { month: "Nov", dbd: 320, tb: 6020, pneumonia: 3350 },
  { month: "Dec", dbd: 295, tb: 5980, pneumonia: 3280 },
];

export const bedRatioTrend = [
  { year: "2019", ratio: 0.78 }, { year: "2020", ratio: 0.81 },
  { year: "2021", ratio: 0.85 }, { year: "2022", ratio: 0.89 },
  { year: "2023", ratio: 0.92 }, { year: "2024", ratio: 0.94 },
];

export const stuntingTrend = [
  { year: "2019", rate: 27.5 }, { year: "2020", rate: 25.8 },
  { year: "2021", rate: 24.2 }, { year: "2022", rate: 22.1 },
  { year: "2023", rate: 20.3 }, { year: "2024", rate: 18.7 },
];

export const top10Diseases = [
  { disease: "Hipertensi", cases: 312450 },
  { disease: "Diabetes Melitus", cases: 248320 },
  { disease: "ISPA", cases: 198750 },
  { disease: "Tuberkulosis", cases: 85200 },
  { disease: "Diare", cases: 78450 },
  { disease: "DBD", cases: 41250 },
  { disease: "Pneumonia", cases: 38900 },
  { disease: "Malaria", cases: 12350 },
  { disease: "Hepatitis B", cases: 9870 },
  { disease: "Leptospirosis", cases: 4250 },
];

export const priorityRegions = regionHealth
  .filter(r => r.priorityLevel === "high")
  .sort((a, b) => a.bedRatio - b.bedRatio)
  .slice(0, 8);
