import { regionHealth } from "./healthData";

// ── Types ─────────────────────────────────────────────────────────────────────
export type MapMetric = "bedRatio" | "stuntingRate" | "disease";

export interface LayerState {
  markers: boolean;
  boundaries: boolean;
  heatmap: boolean;
  labels: boolean;
}

export const DEFAULT_LAYERS: LayerState = {
  markers: true,
  boundaries: true,
  heatmap: false,
  labels: false,
};

// ── Geographic centroids for all 38 kabupaten/kota ───────────────────────────
export const MAP_CENTROIDS: Record<string, [number, number]> = {
  "pacitan":          [-8.18,  111.10],
  "ponorogo":         [-7.87,  111.46],
  "trenggalek":       [-8.05,  111.71],
  "tulungagung":      [-8.07,  111.90],
  "blitar-kab":       [-8.10,  112.10],
  "kediri-kab":       [-7.82,  112.00],
  "malang-kab":       [-8.16,  112.62],
  "lumajang":         [-8.13,  113.22],
  "jember":           [-8.17,  113.70],
  "banyuwangi":       [-8.22,  114.37],
  "bondowoso":        [-7.91,  113.82],
  "situbondo":        [-7.70,  114.00],
  "probolinggo-kab":  [-7.85,  113.18],
  "pasuruan-kab":     [-7.65,  112.90],
  "sidoarjo":         [-7.45,  112.72],
  "mojokerto-kab":    [-7.47,  112.43],
  "jombang":          [-7.55,  112.23],
  "nganjuk":          [-7.60,  111.90],
  "madiun-kab":       [-7.63,  111.52],
  "magetan":          [-7.65,  111.34],
  "ngawi":            [-7.40,  111.45],
  "bojonegoro":       [-7.15,  111.88],
  "tuban":            [-6.90,  111.90],
  "lamongan":         [-7.12,  112.42],
  "gresik":           [-7.16,  112.65],
  "bangkalan":        [-7.04,  112.73],
  "sampang":          [-7.18,  113.25],
  "pamekasan":        [-7.16,  113.47],
  "sumenep":          [-6.97,  113.87],
  "surabaya":         [-7.25,  112.75],
  "malang-kota":      [-7.98,  112.62],
  "kediri-kota":      [-7.82,  112.01],
  "blitar-kota":      [-8.10,  112.17],
  "madiun-kota":      [-7.64,  111.53],
  "mojokerto-kota":   [-7.46,  112.44],
  "pasuruan-kota":    [-7.64,  112.91],
  "probolinggo-kota": [-7.75,  113.21],
  "batu":             [-7.87,  112.53],
};

export const MAP_BOUNDS: [[number, number], [number, number]] = [[-8.85, 111.0], [-6.7, 114.5]];

// ── Color helpers ─────────────────────────────────────────────────────────────
type RegionRow = typeof regionHealth[number];

interface LegendItem { label: string; sublabel: string; color: string; }

export interface MetricConfig {
  title: string;
  getColor: (r: RegionRow) => string;
  getStatusLabel: (r: RegionRow) => { label: string; color: string };
  getHeatColor: (r: RegionRow) => string;
  legend: LegendItem[];
  tooltipRows: (r: RegionRow) => [string, string][];
}

function bedFill(v: number): string {
  if (v >= 1.2)  return "#1677C8";
  if (v >= 1.0)  return "#76B6E8";
  if (v >= 0.75) return "#E5A33B";
  return "#D94A4A";
}
function stuntingFill(v: number): string {
  if (v < 15)  return "#2F9E72";
  if (v < 20)  return "#76B6E8";
  if (v < 25)  return "#E5A33B";
  return "#D94A4A";
}
function diseaseFill(total: number): string {
  if (total < 1000) return "#2F9E72";
  if (total < 3000) return "#76B6E8";
  if (total < 5000) return "#E5A33B";
  return "#D94A4A";
}

export const METRIC_CONFIG: Record<MapMetric, MetricConfig> = {
  bedRatio: {
    title: "Rasio Tempat Tidur per 1.000 Penduduk",
    getColor: (r) => bedFill(r.bedRatio),
    getStatusLabel: (r) => {
      const c = bedFill(r.bedRatio);
      const l = r.bedRatio >= 1.2 ? "ADEQUATE" : r.bedRatio >= 1.0 ? "STABLE" : r.bedRatio >= 0.75 ? "WATCH" : "CRITICAL";
      return { label: l, color: c };
    },
    getHeatColor: (r) => bedFill(r.bedRatio),
    legend: [
      { label: "Adequate",  sublabel: "≥ 1.20",      color: "#1677C8" },
      { label: "Stable",    sublabel: "1.00 – 1.19",  color: "#76B6E8" },
      { label: "Watch",     sublabel: "0.75 – 0.99",  color: "#E5A33B" },
      { label: "Critical",  sublabel: "< 0.75",       color: "#D94A4A" },
    ],
    tooltipRows: (r) => [
      ["Bed Ratio",     `${r.bedRatio.toFixed(2)} / 1.000`],
      ["WHO Benchmark", "1,00 / 1.000"],
      ["Rumah Sakit",   String(Math.round(r.facilityCount * 0.28))],
      ["Puskesmas",     String(r.facilityCount - Math.round(r.facilityCount * 0.28))],
    ],
  },
  stuntingRate: {
    title: "Prevalensi Stunting Balita (%)",
    getColor: (r) => stuntingFill(r.stuntingRate),
    getStatusLabel: (r) => {
      const c = stuntingFill(r.stuntingRate);
      const l = r.stuntingRate < 15 ? "RENDAH" : r.stuntingRate < 20 ? "SEDANG" : r.stuntingRate < 25 ? "TINGGI" : "PARAH";
      return { label: l, color: c };
    },
    getHeatColor: (r) => stuntingFill(r.stuntingRate),
    legend: [
      { label: "Rendah", sublabel: "< 15%",  color: "#2F9E72" },
      { label: "Sedang", sublabel: "15–19%", color: "#76B6E8" },
      { label: "Tinggi", sublabel: "20–24%", color: "#E5A33B" },
      { label: "Parah",  sublabel: "≥ 25%",  color: "#D94A4A" },
    ],
    tooltipRows: (r) => [
      ["Prevalensi Stunting", `${r.stuntingRate.toFixed(1)}%`],
      ["Target Nasional",     "< 14%"],
      ["Populasi",            r.population.toLocaleString("id-ID")],
    ],
  },
  disease: {
    title: "Kasus Penyakit Menular (DBD + TB + Pneumonia)",
    getColor: (r) => diseaseFill(r.dbd + r.tb + r.pneumonia),
    getStatusLabel: (r) => {
      const total = r.dbd + r.tb + r.pneumonia;
      const c = diseaseFill(total);
      const l = total < 1000 ? "MINIMAL" : total < 3000 ? "SEDANG" : total < 5000 ? "TINGGI" : "KRITIS";
      return { label: l, color: c };
    },
    getHeatColor: (r) => diseaseFill(r.dbd + r.tb + r.pneumonia),
    legend: [
      { label: "Minimal", sublabel: "< 1.000 kasus",     color: "#2F9E72" },
      { label: "Sedang",  sublabel: "1.000–2.999 kasus",  color: "#76B6E8" },
      { label: "Tinggi",  sublabel: "3.000–4.999 kasus",  color: "#E5A33B" },
      { label: "Kritis",  sublabel: "≥ 5.000 kasus",     color: "#D94A4A" },
    ],
    tooltipRows: (r) => [
      ["Total Kasus", (r.dbd + r.tb + r.pneumonia).toLocaleString("id-ID")],
      ["DBD",         r.dbd.toLocaleString("id-ID")],
      ["TB",          r.tb.toLocaleString("id-ID")],
      ["Pneumonia",   r.pneumonia.toLocaleString("id-ID")],
    ],
  },
};
