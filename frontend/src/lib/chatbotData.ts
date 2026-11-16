import fs from "node:fs";
import path from "node:path";
import { regionHealth } from "../data/healthData.ts";
import { regionScoreRows } from "../data/regionScoreData.ts";

export const ACTIVE_YEAR = 2024;

export interface RegionIndicator {
  nama: string;
  nilai: number;
  satuan?: string;
}

export interface RegionContext {
  nama: string;
  tipe: "Kabupaten" | "Kota";
  tahun: number;
  skorKesehatan: number;
  peringkatProvinsi: number;
  status: string;
  tingkatUrgensi: string;
  masalahUtama: string;
  masalahSekunder: string;
  indikatorPilar: RegionIndicator[];
  indikatorKesehatan: RegionIndicator[];
  indikatorDashboard: RegionIndicator[];
  rekomendasiProgram: string;
  rekomendasiTindakan: string;
  targetCapaian: string;
  statusPelaksanaan: string;
}

export interface ProvinceSummary {
  tahun: number;
  jumlahWilayah: number;
  rataRataSkor: number;
  rataRataStunting: number;
  rataRataRasioTempatTidur: number;
  rataRataAki: number;
  rataRataAkb: number;
  wilayahSkorTerendah: { nama: string; skor: number }[];
  wilayahSkorTertinggi: { nama: string; skor: number }[];
  totalKasus: { dbd: number; tb: number; pneumonia: number };
}

export type RankingIndicatorKey = "stunting" | "bedRatio" | "nakes" | "facilities" | "score";

export interface RankingContext {
  indikator: string;
  arah: "tertinggi" | "terendah";
  tahun: number;
  daftar: { peringkat: number; nama: string; nilai: number; satuan?: string }[];
}

function parseCsvLine(line: string): string[] {
  return [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)].map((match) =>
    (match[1] ?? match[2] ?? "").replace(/""/g, '"')
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      return row;
    });
}

function readCsv(fileName: string): Record<string, string>[] {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function toNumber(value: string | undefined): number {
  const parsed = Number((value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

let cachedIndex: Map<string, RegionContext> | null = null;

function buildIndex(): Map<string, RegionContext> {
  if (cachedIndex) return cachedIndex;

  const healthRows = readCsv("regional_health_index_scores.csv");
  const programRows = readCsv("regional_program_recommendations.csv");
  const programByName = new Map(programRows.map((row) => [normalizeName(row.nama_wilayah), row]));
  const dashboardByName = new Map(regionScoreRows.map((row) => [normalizeName(row.name), row]));

  const index = new Map<string, RegionContext>();

  for (const row of healthRows) {
    const name = row.nama_wilayah;
    const key = normalizeName(name);
    const program = programByName.get(key);
    const dashboard = dashboardByName.get(key);
    const tipe = /^kota\b/i.test(name) ? "Kota" : "Kabupaten";

    const indikatorPilar: RegionIndicator[] = [
      { nama: "Pilar Fasilitas", nilai: toNumber(row.pilar_fasilitas) },
      { nama: "Pilar Tenaga Kesehatan", nilai: toNumber(row.pilar_nakes) },
      { nama: "Pilar KIA", nilai: toNumber(row.pilar_kia) },
      { nama: "Pilar Morbiditas", nilai: toNumber(row.pilar_morbiditas) },
      { nama: "Pilar Program", nilai: toNumber(row.pilar_program) },
    ].sort((a, b) => a.nilai - b.nilai);

    const indikatorKesehatan: RegionIndicator[] = [
      { nama: "Prevalensi Stunting", nilai: toNumber(row.prevalensi_stunting), satuan: "%" },
      {
        nama: "Rasio Tempat Tidur (proyeksi 2026)",
        nilai: toNumber(row.rasio_tt_proyeksi_2026),
        satuan: "per 1.000 penduduk",
      },
      { nama: "Rasio Dokter per 1.000 Penduduk", nilai: toNumber(row.rasio_dokter_per_1000) },
      { nama: "Angka Kematian Ibu (AKI)", nilai: toNumber(row.aki), satuan: "per 100.000 kelahiran" },
      { nama: "Angka Kematian Bayi (AKB)", nilai: toNumber(row.akb), satuan: "per 1.000 kelahiran" },
    ];

    const indikatorDashboard: RegionIndicator[] = (dashboard?.indicatorScores ?? [])
      .map((item) => ({ nama: item.label, nilai: item.value }))
      .sort((a, b) => a.nilai - b.nilai);

    index.set(key, {
      nama: name.replace(/\s+/g, " ").trim(),
      tipe,
      tahun: ACTIVE_YEAR,
      skorKesehatan: toNumber(row.skor_kesehatan),
      peringkatProvinsi: toNumber(row.rank_provinsi),
      status: row.kategori_status || program?.kategori_status || "",
      tingkatUrgensi: program?.tingkat_urgensi || "",
      masalahUtama: program?.masalah_utama || "",
      masalahSekunder: program?.masalah_sekunder || "",
      indikatorPilar,
      indikatorKesehatan,
      indikatorDashboard,
      rekomendasiProgram: program?.program_rekomendasi_jatim || "",
      rekomendasiTindakan: program?.rekomendasi_tindakan || "",
      targetCapaian: program?.target_capaian || "",
      statusPelaksanaan: program?.status_pelaksanaan || "",
    });
  }

  cachedIndex = index;
  return index;
}

export function getRegionContext(name: string): RegionContext | undefined {
  return buildIndex().get(normalizeName(name));
}

export function getAllRegionContexts(): RegionContext[] {
  return [...buildIndex().values()];
}

export function buildProvinceSummary(): ProvinceSummary {
  const regions = getAllRegionContexts();
  const count = regions.length || 1;
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const avg = (values: number[]) => round(sum(values) / count, 2);
  const findIndicator = (region: RegionContext, prefix: string) =>
    region.indikatorKesehatan.find((item) => item.nama.startsWith(prefix))?.nilai ?? 0;

  const sortedByScore = [...regions].sort((a, b) => a.skorKesehatan - b.skorKesehatan);

  return {
    tahun: ACTIVE_YEAR,
    jumlahWilayah: regions.length,
    rataRataSkor: avg(regions.map((region) => region.skorKesehatan)),
    rataRataStunting: avg(regions.map((region) => findIndicator(region, "Prevalensi Stunting"))),
    rataRataRasioTempatTidur: avg(regions.map((region) => findIndicator(region, "Rasio Tempat Tidur"))),
    rataRataAki: avg(regions.map((region) => findIndicator(region, "Angka Kematian Ibu"))),
    rataRataAkb: avg(regions.map((region) => findIndicator(region, "Angka Kematian Bayi"))),
    wilayahSkorTerendah: sortedByScore.slice(0, 5).map((region) => ({
      nama: region.nama,
      skor: region.skorKesehatan,
    })),
    wilayahSkorTertinggi: sortedByScore
      .slice(-5)
      .reverse()
      .map((region) => ({ nama: region.nama, skor: region.skorKesehatan })),
    totalKasus: {
      dbd: sum(regionHealth.map((region) => region.dbd)),
      tb: sum(regionHealth.map((region) => region.tb)),
      pneumonia: sum(regionHealth.map((region) => region.pneumonia)),
    },
  };
}

export function buildRankingContext(
  indicatorKey: RankingIndicatorKey,
  direction: "asc" | "desc",
  limit: number
): RankingContext {
  const regions = getAllRegionContexts();
  const config: Record<
    RankingIndicatorKey,
    { label: string; unit?: string; getValue: (region: RegionContext) => number }
  > = {
    stunting: {
      label: "Prevalensi Stunting",
      unit: "%",
      getValue: (region) =>
        region.indikatorKesehatan.find((item) => item.nama === "Prevalensi Stunting")?.nilai ?? 0,
    },
    bedRatio: {
      label: "Rasio Tempat Tidur",
      unit: "per 1.000 penduduk",
      getValue: (region) =>
        region.indikatorKesehatan.find((item) => item.nama.startsWith("Rasio Tempat Tidur"))?.nilai ?? 0,
    },
    nakes: {
      label: "Pilar Tenaga Kesehatan",
      getValue: (region) =>
        region.indikatorPilar.find((item) => item.nama === "Pilar Tenaga Kesehatan")?.nilai ?? 0,
    },
    facilities: {
      label: "Pilar Fasilitas",
      getValue: (region) =>
        region.indikatorPilar.find((item) => item.nama === "Pilar Fasilitas")?.nilai ?? 0,
    },
    score: {
      label: "Skor Kesehatan",
      getValue: (region) => region.skorKesehatan,
    },
  };

  const selected = config[indicatorKey];
  const sorted = [...regions].sort((a, b) => {
    const valueA = selected.getValue(a);
    const valueB = selected.getValue(b);
    return direction === "desc" ? valueB - valueA : valueA - valueB;
  });

  return {
    indikator: selected.label,
    arah: direction === "desc" ? "tertinggi" : "terendah",
    tahun: ACTIVE_YEAR,
    daftar: sorted.slice(0, Math.max(1, Math.min(limit, 38))).map((region, index) => ({
      peringkat: index + 1,
      nama: region.nama,
      nilai: selected.getValue(region),
      satuan: selected.unit,
    })),
  };
}
