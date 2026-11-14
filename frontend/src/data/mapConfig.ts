import { regionHealth } from "./healthData";
import { formatDecimal, formatNumber, formatPercent } from "../lib/formatNumber";

// -- Types --
export type MapMetric = "bedRatio" | "stuntingRate" | "disease";

// Layers: choropleth fill (warna klaster), batas wilayah, label nama daerah.
export interface LayerState {
  fill: boolean;
  boundaries: boolean;
  labels: boolean;
}

export const DEFAULT_LAYERS: LayerState = {
  fill: true,
  boundaries: true,
  labels: true,
};

// -- Clusters (choropleth categories) --
export type ClusterId = "adequate" | "stable" | "watch" | "critical" | "nodata";

export interface ClusterStyle {
  label: string;
  color: string;
}

export const CLUSTER_STYLES: Record<ClusterId, ClusterStyle> = {
  adequate: { label: "Adequate", color: "#1D4ED8" },
  stable:   { label: "Stable",   color: "#7DB6EA" },
  watch:    { label: "Watch",    color: "#F59E0B" },
  critical: { label: "Critical", color: "#DC2626" },
  nodata:   { label: "Tanpa Data", color: "#CBD5E1" },
};


export interface LegendEntry {
  cluster: ClusterId;
  label: string;
  threshold: string;
  color: string;
}

export interface MetricConfig {
  title: string;
  /** Raw value used for tooltip/search only - never for colouring. */
  getValue: (r: (typeof regionHealth)[number]) => number;
  getDisplay: (r: (typeof regionHealth)[number]) => string;
  /** Choropleth cluster for a region. */
  getCluster: (r: (typeof regionHealth)[number]) => ClusterId;
  /** Summary metric shown in the region drawer. */
  getStatusLabel: (r: (typeof regionHealth)[number]) => { label: string; color: string };
  /** Rank / priority score (0-100) used by the cluster model. */
  getPriorityScore: (r: (typeof regionHealth)[number]) => number;
  legend: LegendEntry[];
  tooltipRows: (r: (typeof regionHealth)[number]) => [string, string][];
}

// Cluster decision helpers - thresholds define the legend and colours.
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// Ambang rasio tempat tidur. SATU sumber kebenaran untuk warna, tooltip,
// panel drawer dan legenda (jangan menulis ulang angka di tempat lain).
export const BED_RATIO_THRESHOLDS = {
  adequate: 1.2, // >= 1,20
  stable: 1.0,   // 1,00 - 1,19
  watch: 0.75,   // 0,75 - 0,99
  // < 0,75 = critical
} as const;

// Stunting prevalence thresholds (persen). Rendah = lebih baik.
export const STUNTING_THRESHOLDS = {
  adequate: 14, // < 14%
  stable: 20,   // 14 - 19,9%
  watch: 25,    // 20 - 24,9%
  // >= 25% = critical
} as const;

// Ambang kasus penyakit menular (DBD + TB + Pneumonia). Dikalibrasi terhadap
// rentang data saat ini (291-2.055 kasus) agar keempat klaster tetap terpakai;
// dengan ambang lama (1.000/3.000/5.000) seluruh peta nyaris satu warna.
export const DISEASE_THRESHOLDS = {
  adequate: 500, // < 500 kasus
  stable: 750,   // 500 - 749
  watch: 1000,   // 750 - 999
  // >= 1.000 = critical
} as const;

// Format angka ribuan gaya Indonesia untuk teks legenda.
function num(value: number): string {
  return formatNumber(value);
}

// Format rasio 2 desimal dengan koma (gaya Indonesia) untuk teks legenda.
function ratio(value: number): string {
  return formatDecimal(value, 2);
}

// Format persen 1 desimal dengan koma untuk teks legenda.
function pct(value: number): string {
  return formatDecimal(value, 1);
}

// Bed ratio adequacy: higher = better.
function bedCluster(r: (typeof regionHealth)[number]): ClusterId {
  const v = r.bedRatio;
  if (!Number.isFinite(v)) return "nodata";
  if (v >= BED_RATIO_THRESHOLDS.adequate) return "adequate";
  if (v >= BED_RATIO_THRESHOLDS.stable) return "stable";
  if (v >= BED_RATIO_THRESHOLDS.watch) return "watch";
  return "critical";
}

// Stunting prevalence: lower = better.
function stuntingCluster(r: (typeof regionHealth)[number]): ClusterId {
  const v = r.stuntingRate;
  if (!Number.isFinite(v)) return "nodata";
  if (v < STUNTING_THRESHOLDS.adequate) return "adequate";
  if (v < STUNTING_THRESHOLDS.stable) return "stable";
  if (v < STUNTING_THRESHOLDS.watch) return "watch";
  return "critical";
}

// Communicable disease burden (DBD + TB + Pneumonia): lower = better.
function diseaseCluster(r: (typeof regionHealth)[number]): ClusterId {
  const v = r.dbd + r.tb + r.pneumonia;
  if (!Number.isFinite(v)) return "nodata";
  if (v < DISEASE_THRESHOLDS.adequate) return "adequate";
  if (v < DISEASE_THRESHOLDS.stable) return "stable";
  if (v < DISEASE_THRESHOLDS.watch) return "watch";
  return "critical";
}

function bedScore(r: (typeof regionHealth)[number]): number {
  return clamp(14 + (1.6 - r.bedRatio) * 46);
}

function stuntingScore(r: (typeof regionHealth)[number]): number {
  return clamp(14 + (r.stuntingRate - 10) * 3.4);
}

function diseaseScore(r: (typeof regionHealth)[number]): number {
  return clamp(12 + ((r.dbd + r.tb + r.pneumonia) - 300) / 22);
}

export const METRIC_CONFIG: Record<MapMetric, MetricConfig> = {
  bedRatio: {
    title: "Rasio Tempat Tidur per 1.000 Penduduk",
    getValue: (r) => r.bedRatio,
    getDisplay: (r) => `${formatDecimal(r.bedRatio, 2)} per 1.000`,
    getCluster: bedCluster,
    getStatusLabel: (r) => {
      const c = bedCluster(r);
      return { label: CLUSTER_STYLES[c].label.toUpperCase(), color: CLUSTER_STYLES[c].color };
    },
    getPriorityScore: bedScore,
    legend: [
      { cluster: "adequate", label: "Adequate", threshold: `>= ${ratio(BED_RATIO_THRESHOLDS.adequate)} / 1.000`, color: CLUSTER_STYLES.adequate.color },
      { cluster: "stable",   label: "Stable",   threshold: `${ratio(BED_RATIO_THRESHOLDS.stable)} sampai ${ratio(BED_RATIO_THRESHOLDS.adequate - 0.01)}`, color: CLUSTER_STYLES.stable.color },
      { cluster: "watch",    label: "Watch",    threshold: `${ratio(BED_RATIO_THRESHOLDS.watch)} sampai ${ratio(BED_RATIO_THRESHOLDS.stable - 0.01)}`, color: CLUSTER_STYLES.watch.color },
      { cluster: "critical", label: "Critical", threshold: `< ${ratio(BED_RATIO_THRESHOLDS.watch)}`, color: CLUSTER_STYLES.critical.color },
    ],
    tooltipRows: (r) => [
      ["Rasio tempat tidur", `${formatDecimal(r.bedRatio, 2)} per 1.000 penduduk`],
      ["Jumlah penduduk",    formatNumber(r.population)],
      ["Total fasilitas",    formatNumber(r.facilityCount)],
    ],
  },
  stuntingRate: {
    title: "Prevalensi Stunting",
    getValue: (r) => r.stuntingRate,
    getDisplay: (r) => formatPercent(r.stuntingRate, 1),
    getCluster: stuntingCluster,
    getStatusLabel: (r) => {
      const c = stuntingCluster(r);
      return { label: CLUSTER_STYLES[c].label.toUpperCase(), color: CLUSTER_STYLES[c].color };
    },
    getPriorityScore: stuntingScore,
    legend: [
      { cluster: "adequate", label: "Adequate", threshold: `< ${pct(STUNTING_THRESHOLDS.adequate)}%`, color: CLUSTER_STYLES.adequate.color },
      { cluster: "stable",   label: "Stable",   threshold: `${pct(STUNTING_THRESHOLDS.adequate)} sampai ${pct(STUNTING_THRESHOLDS.stable - 0.1)}%`, color: CLUSTER_STYLES.stable.color },
      { cluster: "watch",    label: "Watch",    threshold: `${pct(STUNTING_THRESHOLDS.stable)} sampai ${pct(STUNTING_THRESHOLDS.watch - 0.1)}%`, color: CLUSTER_STYLES.watch.color },
      { cluster: "critical", label: "Critical", threshold: `>= ${pct(STUNTING_THRESHOLDS.watch)}%`, color: CLUSTER_STYLES.critical.color },
    ],
    tooltipRows: (r) => [
      ["Prevalensi stunting", formatPercent(r.stuntingRate, 1)],
      ["Target nasional",     `< ${pct(STUNTING_THRESHOLDS.adequate)}%`],
      ["Jumlah penduduk",     formatNumber(r.population)],
    ],
  },
  disease: {
    title: "Kasus Penyakit Menular (DBD + TB + Pneumonia)",
    getValue: (r) => r.dbd + r.tb + r.pneumonia,
    getDisplay: (r) => formatNumber(r.dbd + r.tb + r.pneumonia),
    getCluster: diseaseCluster,
    getStatusLabel: (r) => {
      const c = diseaseCluster(r);
      return { label: CLUSTER_STYLES[c].label.toUpperCase(), color: CLUSTER_STYLES[c].color };
    },
    getPriorityScore: diseaseScore,
    legend: [
      { cluster: "adequate", label: "Adequate", threshold: `< ${num(DISEASE_THRESHOLDS.adequate)} kasus`, color: CLUSTER_STYLES.adequate.color },
      { cluster: "stable",   label: "Stable",   threshold: `${num(DISEASE_THRESHOLDS.adequate)} sampai ${num(DISEASE_THRESHOLDS.stable - 1)}`, color: CLUSTER_STYLES.stable.color },
      { cluster: "watch",    label: "Watch",    threshold: `${num(DISEASE_THRESHOLDS.stable)} sampai ${num(DISEASE_THRESHOLDS.watch - 1)}`, color: CLUSTER_STYLES.watch.color },
      { cluster: "critical", label: "Critical", threshold: `>= ${num(DISEASE_THRESHOLDS.watch)} kasus`, color: CLUSTER_STYLES.critical.color },
    ],
    tooltipRows: (r) => [
      ["Total kasus", formatNumber(r.dbd + r.tb + r.pneumonia)],
      ["DBD",         formatNumber(r.dbd)],
      ["TB",          formatNumber(r.tb)],
      ["Pneumonia",   formatNumber(r.pneumonia)],
    ],
  },
};
