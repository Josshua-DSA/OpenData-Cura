"""
Regional Health KPI & Prescriptive Recommendation Engine.
Menghitung Skor Kerentanan Wilayah (Health Vulnerability Index) dan
menghasilkan rekomendasi intervensi terarah berbasis data multi-domain 38 Kab/Kota.
"""

import os
import json
import logging
from typing import List, Dict, Any
import numpy as np
import pandas as pd

logger = logging.getLogger("RecommendationEngine")


class RegionalKpiRecommendationEngine:
    """
    Engine untuk mengukur KPI Terpadu & menghasilkan Rekomendasi Tindakan Wilayah.
    """

    @staticmethod
    def _get_series(df: pd.DataFrame, col: str, default_val: float) -> pd.Series:
        if col in df.columns:
            return pd.Series(df[col], index=df.index, dtype=float).fillna(default_val)
        return pd.Series(default_val, index=df.index, dtype=float)

    @classmethod
    def _min_max_scale(cls, series: pd.Series) -> pd.Series:
        s = pd.Series(series, dtype=float).fillna(0.0)
        min_val = float(s.min())
        max_val = float(s.max())
        if max_val <= min_val:
            return pd.Series(0.5, index=s.index, dtype=float)
        return (s - min_val) / (max_val - min_val)

    def calculate_vulnerability_index(self, df_ml: pd.DataFrame) -> pd.DataFrame:
        """
        Hitung Health Vulnerability Index (HVI) skala 0–100.
        0 = Paling Tangguh / Mandiri, 100 = Paling Rentan / Kritis.
        """
        df = df_ml.copy()

        # 1. Komponen Beban Risiko (makin tinggi nilai, makin berisiko)
        stunting_s = self._get_series(df, "prevalensi_stunting_balita_persen", 20.0)
        stunting_norm = self._min_max_scale(stunting_s)

        sanitasi_s = self._get_series(df, "akses_sanitasi_layak_persen", 85.0)
        sanitasi_deficit = 100.0 - sanitasi_s
        sanitasi_norm = self._min_max_scale(sanitasi_deficit)

        air_s = self._get_series(df, "akses_air_minum_layak_persen", 90.0)
        air_deficit = 100.0 - air_s
        air_norm = self._min_max_scale(air_deficit)

        rokok_s = self._get_series(df, "prevalensi_merokok_persen", 30.0)
        rokok_norm = self._min_max_scale(rokok_s)

        # Kepadatan penduduk (log-scale agar kota besar tidak bias ekstrem)
        kepadatan_s = self._get_series(df, "kepadatan_penduduk_km2", 1000.0)
        kepadatan_log = np.log1p(np.maximum(kepadatan_s.values, 0))
        kepadatan_norm = self._min_max_scale(pd.Series(kepadatan_log, index=df.index))

        # Beban Morbiditas per 1.000 penduduk
        pop_s = self._get_series(df, "proyeksi_penduduk_2026", 1_000_000.0)
        pop_k = np.where(pop_s.values <= 0, 1.0, pop_s.values / 1000.0)
        morbiditas_s = self._get_series(df, "total_kasus_pasien_tahunan", 10_000.0)
        morbiditas_rate = pd.Series(morbiditas_s.values / pop_k, index=df.index)
        morbiditas_norm = self._min_max_scale(morbiditas_rate)

        risk_score = (
            stunting_norm * 0.25 +
            sanitasi_norm * 0.20 +
            air_norm * 0.15 +
            morbiditas_norm * 0.15 +
            rokok_norm * 0.15 +
            kepadatan_norm * 0.10
        )

        # 2. Komponen Kapasitas Pelindung (makin tinggi nilai, makin terlindungi)
        bed_s = self._get_series(df, "rasio_tt_resmi", 1.0)
        bed_norm = self._min_max_scale(bed_s)

        doc_s = self._get_series(df, "rasio_dokter_per_1000", 0.4)
        doc_norm = self._min_max_scale(doc_s)

        idl_s = self._get_series(df, "cakupan_imunisasi_lengkap_persen", 90.0)
        idl_norm = self._min_max_scale(idl_s)

        k4_s = self._get_series(df, "cakupan_k4_ibu_hamil_persen", 90.0)
        k4_norm = self._min_max_scale(k4_s)

        uhc_s = self._get_series(df, "cakupan_bpjs_uhc_persen", 90.0)
        uhc_norm = self._min_max_scale(uhc_s)

        protection_score = (
            bed_norm * 0.25 +
            doc_norm * 0.25 +
            idl_norm * 0.20 +
            k4_norm * 0.15 +
            uhc_norm * 0.15
        )

        # 3. Indeks Kerentanan Akhir (Skala 0–100)
        hvi_raw = (0.60 * risk_score + 0.40 * (1.0 - protection_score)) * 100.0
        df["skor_kerentanan"] = hvi_raw.round(2)

        # 4. Peringkat: 1 = Paling Rentan / Butuh Intervensi Terbesar
        df["peringkat_kerentanan"] = df["skor_kerentanan"].rank(ascending=False, method="min").astype(int)

        # 5. Kategori Kerentanan
        def classify_hvi(val: float) -> str:
            if val >= 60.0:
                return "sangat_tinggi"
            if val >= 45.0:
                return "tinggi"
            if val >= 32.0:
                return "sedang"
            return "rendah"

        df["kategori_kerentanan"] = df["skor_kerentanan"].apply(classify_hvi)
        return df

    def generate_recommendations(self, row: pd.Series) -> List[Dict[str, Any]]:
        """
        Evaluasi aturan preskriptif multi-domain untuk menghasilkan paket rekomendasi konkret.
        """
        recs = []

        sanitasi = float(row.get("akses_sanitasi_layak_persen", 85.0))
        air = float(row.get("akses_air_minum_layak_persen", 90.0))
        stunting = float(row.get("prevalensi_stunting_balita_persen", 15.0))
        doc_ratio = float(row.get("rasio_dokter_per_1000", 0.5))
        bed_ratio = float(row.get("rasio_tt_resmi", 1.0))
        idl = float(row.get("cakupan_imunisasi_lengkap_persen", 90.0))
        uhc = float(row.get("cakupan_bpjs_uhc_persen", 95.0))
        rokok = float(row.get("prevalensi_merokok_persen", 30.0))
        kepadatan = float(row.get("kepadatan_penduduk_km2", 1000.0))

        # Aturan 1: Infrastruktur Sanitasi & Air Bersih
        if sanitasi < 82.0 or air < 88.0:
            recs.append({
                "prioritas": "Tinggi",
                "domain": "Sanitasi & Air Bersih",
                "isu_terdeteksi": f"Akses sanitasi layak ({sanitasi:.1f}%) atau air bersih ({air:.1f}%) di bawah rata-rata Jawa Timur.",
                "tindakan_rekomendasi": "Pemicuan Sanitasi Total Berbasis Masyarakat (STBM) Stop BABS & Akselerasi DAK Fisik Air Minum Desa.",
                "target_dampak": "Menekan penularan diare balita dan memutus siklus infeksi cacing enterik."
            })

        # Aturan 2: Gizi & Pengentasan Stunting
        if stunting >= 18.0:
            recs.append({
                "prioritas": "Tinggi",
                "domain": "Gizi & Balita",
                "isu_terdeteksi": f"Prevalensi stunting ({stunting:.1f}%) melebihi ambang batas waspada Kemenkes (18.0%).",
                "tindakan_rekomendasi": "Pemberian Makanan Tambahan (PMT) Berbasis Pangan Lokal Berprotein Hewani & Pendampingan 1.000 HPK.",
                "target_dampak": "Target percepatan penurunan prevalensi stunting menuju target nasional < 14%."
            })

        # Aturan 3: Alokasi SDM Medis & Kapasitas Ranjang
        if doc_ratio < 0.40 or bed_ratio < 0.85:
            recs.append({
                "prioritas": "Tinggi",
                "domain": "SDM Medis & Faskes",
                "isu_terdeteksi": f"Rasio dokter ({doc_ratio:.2f}/1.000) atau rasio tempat tidur RS ({bed_ratio:.2f}/1.000) defisit.",
                "tindakan_rekomendasi": "Penempatan Dokter Residen/PTT Daerah Terpencil & Peningkatan Faskes Puskesmas Non-Rawat Inap.",
                "target_dampak": "Memperluas daya tampung faskes primer dan mencegah penumpukan rujukan RS."
            })

        # Aturan 4: Proteksi Imunisasi & Kesiapsiagaan KLB
        if idl < 88.0:
            recs.append({
                "prioritas": "Menengah",
                "domain": "Imunisasi & KLB",
                "isu_terdeteksi": f"Cakupan Imunisasi Dasar Lengkap ({idl:.1f}%) belum mencapai batas aman herd immunity (95%).",
                "tindakan_rekomendasi": "Pelaksanaan Sub-PIN Imunisasi Kejar (Catch-up) Campak-Rubela terintegrasi Posyandu & PAUD.",
                "target_dampak": "Mencegah Kejadian Luar Biasa (KLB) PD3I di klaster wilayah padat."
            })

        # Aturan 5: Jaminan Finansial Kesehatan (UHC)
        if uhc < 90.0:
            recs.append({
                "prioritas": "Menengah",
                "domain": "Jaminan Kesehatan",
                "isu_terdeteksi": f"Kepesertaan JKN/BPJS ({uhc:.1f}%) belum memenuhi Universal Health Coverage.",
                "tindakan_rekomendasi": "Perluasan alokasi PBID (Penerima Bantuan Iuran Daerah) APBD bagi keluarga pra-sejahtera.",
                "target_dampak": "Menghilangkan hambatan finansial masyarakat dalam mencari pengobatan medis."
            })

        # Aturan 6: Perilaku & Pengendalian PTM Perkotaan
        if rokok >= 31.0 and kepadatan >= 1000.0:
            recs.append({
                "prioritas": "Menengah",
                "domain": "Pengendalian PTM",
                "isu_terdeteksi": f"Prevalensi konsumsi rokok ({rokok:.1f}%) dan kepadatan penduduk ({kepadatan:.0f} jiwa/km²) tinggi.",
                "tindakan_rekomendasi": "Penegakan Perda Kawasan Tanpa Rokok (KTR) & Skrining Kardiovaskular Dini di Posbindu PTM.",
                "target_dampak": "Mengurangi beban rawat inap penyakit tidak menular (hipertensi, jantung, stroke)."
            })

        # Fallback jika wilayah sangat tangguh (tidak ada trigger di atas)
        if not recs:
            recs.append({
                "prioritas": "Pemeliharaan",
                "domain": "Penguatan Kapasitas",
                "isu_terdeteksi": "Indikator makro dan kapasitas fasilitas kesehatan terpantau stabil di atas rata-rata.",
                "tindakan_rekomendasi": "Pertahankan kualitas layanan rujukan dan kembangkan telemedicine faskes terpencil.",
                "target_dampak": "Mempertahankan status ketahanan kesehatan daerah mandiri."
            })

        return recs


def evaluate_regional_kpi_recommendations(exports_dir: str) -> pd.DataFrame:
    """
    Eksekusi modul scoring kerentanan dan pembentukan rekomendasi wilayah.
    Menghasilkan database/exports/regional_kpi_recommendations.parquet & .csv.
    """
    ml_path = os.path.join(exports_dir, "ml_readiness_dataset.parquet")
    if not os.path.exists(ml_path):
        from etl.transform.build_ml_features import build_ml_readiness_dataset
        df_ml = build_ml_readiness_dataset(exports_dir)
    else:
        df_ml = pd.read_parquet(ml_path)

    engine = RegionalKpiRecommendationEngine()
    df_kpi = engine.calculate_vulnerability_index(df_ml)

    recs_list = []
    primary_recs = []
    for _, row in df_kpi.iterrows():
        district_recs = engine.generate_recommendations(row)
        recs_list.append(json.dumps(district_recs, ensure_ascii=False))
        primary_recs.append(district_recs[0]["tindakan_rekomendasi"] if district_recs else "")

    df_kpi["rekomendasi_utama"] = primary_recs
    df_kpi["rekomendasi_detail"] = recs_list

    # Sort by priority rank (Rank 1 = Most Vulnerable at the top)
    df_kpi = df_kpi.sort_values("peringkat_kerentanan").reset_index(drop=True)

    # Simpan dataset hasil scoring dan rekomendasi ke exports/
    out_parquet = os.path.join(exports_dir, "regional_kpi_recommendations.parquet")
    out_csv = os.path.join(exports_dir, "regional_kpi_recommendations.csv")

    df_kpi.to_csv(out_csv, index=False)
    try:
        df_kpi.to_parquet(out_parquet, index=False)
        logger.info(f"[RecommendationEngine] Generated regional KPI recommendations -> {out_parquet} ({len(df_kpi)} rows)")
    except Exception:
        logger.info(f"[RecommendationEngine] Generated regional KPI recommendations -> {out_csv} ({len(df_kpi)} rows)")

    return df_kpi
