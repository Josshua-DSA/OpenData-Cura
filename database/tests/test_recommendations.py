"""
Tests for Regional Health KPI & Prescriptive Recommendation Engine.
Memverifikasi validitas kalkulasi Skor Kerentanan (HVI), pemeringkatan, dan aturan preskriptif.
"""

import os
import json
import pytest
import pandas as pd
from etl.transform.evaluate_recommendations import (
    RegionalKpiRecommendationEngine,
    evaluate_regional_kpi_recommendations
)


@pytest.fixture
def exports_dir():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "exports")


def test_vulnerability_scoring_bounds_and_ranking(exports_dir):
    """
    Pastikan skor HVI terikat pada rentang [0, 100] dan pemeringkatan unik 1-38.
    """
    df = evaluate_regional_kpi_recommendations(exports_dir)
    assert len(df) == 38, f"Expected 38 districts, got {len(df)}"

    # Cek batas skor
    assert (df["skor_kerentanan"] >= 0.0).all(), "Skor kerentanan tidak boleh negatif"
    assert (df["skor_kerentanan"] <= 100.0).all(), "Skor kerentanan tidak boleh melebihi 100"

    # Cek keunikan peringkat 1 sampai 38
    ranks = sorted(df["peringkat_kerentanan"].tolist())
    assert ranks == list(range(1, 39)), "Peringkat kerentanan harus unik dari 1 hingga 38"

    # Cek kategori kerentanan yang valid
    valid_categories = {"sangat_tinggi", "tinggi", "sedang", "rendah"}
    assert set(df["kategori_kerentanan"].unique()).issubset(valid_categories)


def test_prescriptive_recommendation_rules(exports_dir):
    """
    Pastikan setiap kabupaten/kota memiliki rekomendasi utama dan detail rekomendasi terstruktur JSON.
    """
    df = evaluate_regional_kpi_recommendations(exports_dir)

    for _, row in df.iterrows():
        assert len(str(row["rekomendasi_utama"]).strip()) > 10, "Rekomendasi utama tidak boleh kosong"
        recs = json.loads(row["rekomendasi_detail"])
        assert isinstance(recs, list) and len(recs) >= 1, "Rekomendasi detail minimal 1 butir aksi"

        for r in recs:
            assert "prioritas" in r
            assert "domain" in r
            assert "isu_terdeteksi" in r
            assert "tindakan_rekomendasi" in r
            assert "target_dampak" in r

    # Cek sampel kasus spesifik: Sampang (sanitasi rendah & stunting tinggi)
    sampang = df[df["kode_bps"].astype(str) == "3527"].iloc[0]
    sampang_recs = json.loads(str(sampang["rekomendasi_detail"]))
    domains = [r["domain"] for r in sampang_recs]
    assert "Sanitasi & Air Bersih" in domains or "Gizi & Balita" in domains


def test_parquet_and_csv_recommendation_exports(exports_dir):
    """
    Verifikasi sinkronisasi file Parquet dan CSV hasil scoring rekomendasi.
    """
    p_path = os.path.join(exports_dir, "regional_kpi_recommendations.parquet")
    c_path = os.path.join(exports_dir, "regional_kpi_recommendations.csv")

    assert os.path.exists(p_path), "File parquet regional_kpi_recommendations tidak ditemukan"
    assert os.path.exists(c_path), "File csv regional_kpi_recommendations tidak ditemukan"

    df_p = pd.read_parquet(p_path)
    df_c = pd.read_csv(c_path, dtype={"kode_bps": str})

    assert len(df_p) == 38
    assert len(df_c) == 38
    assert list(df_p["kode_bps"].astype(str)) == list(df_c["kode_bps"].astype(str))
