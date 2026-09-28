import os
import pytest
import pandas as pd
from pipeline.loader import get_session
from models import TblTenagaKesehatan, TblPasienPenyakitWilayah


def test_workforce_export_and_db_counts():
    exports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exports")
    parquet_path = os.path.join(exports_dir, "healthcare_workforce.parquet")
    csv_path = os.path.join(exports_dir, "healthcare_workforce.csv")

    assert os.path.exists(parquet_path)
    assert os.path.exists(csv_path)

    df = pd.read_parquet(parquet_path)
    assert len(df) == 266  # 38 Kab/Kota * 7 jenis nakes
    assert "dokter_umum" in df["jenis_nakes"].values
    assert "perawat" in df["jenis_nakes"].values
    assert (df["jumlah"] >= 0).all()

    session = get_session()
    try:
        count = session.query(TblTenagaKesehatan).count()
        assert count == 266
    finally:
        session.close()


def test_morbidity_trends_export_and_db_counts():
    exports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exports")
    parquet_path = os.path.join(exports_dir, "disease_morbidity_trends.parquet")
    csv_path = os.path.join(exports_dir, "disease_morbidity_trends.csv")

    assert os.path.exists(parquet_path)
    assert os.path.exists(csv_path)

    df = pd.read_parquet(parquet_path)
    assert len(df) == 1520  # 38 Kab/Kota * 4 Q * 10 Penyakit
    assert "Demam Berdarah Dengue (DBD)" in df["nama_penyakit"].values
    assert set(df["triwulan"].unique()) == {"Q1", "Q2", "Q3", "Q4"}

    session = get_session()
    try:
        count = session.query(TblPasienPenyakitWilayah).count()
        assert count == 1520
    finally:
        session.close()


def test_ml_readiness_unified_dataset():
    exports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "exports")
    parquet_path = os.path.join(exports_dir, "ml_readiness_dataset.parquet")
    csv_path = os.path.join(exports_dir, "ml_readiness_dataset.csv")

    assert os.path.exists(parquet_path)
    assert os.path.exists(csv_path)

    df_ml = pd.read_parquet(parquet_path)
    assert len(df_ml) == 38  # 38 Kab/Kota
    # Feature columns check
    expected_cols = [
        "kode_bps", "nama_wilayah", "total_tt", "total_puskesmas",
        "total_rs", "dokter_umum", "perawat", "bidan",
        "total_kasus_pasien_tahunan", "rasio_dokter_per_1000",
        "proyeksi_penduduk_2026", "rasio_tt_proyeksi_2026",
        # 8 Public Health Macro Determinants
        "akses_sanitasi_layak_persen", "akses_air_minum_layak_persen",
        "kepadatan_penduduk_km2", "prevalensi_stunting_balita_persen",
        "cakupan_k4_ibu_hamil_persen", "cakupan_imunisasi_lengkap_persen",
        "cakupan_bpjs_uhc_persen", "prevalensi_merokok_persen",
        # Composite Analytical Indices
        "indeks_risiko_stunting_sanitasi", "indeks_proteksi_preventif"
    ]
    for col in expected_cols:
        assert col in df_ml.columns, f"Missing ML feature: {col}"

    assert (df_ml["total_rs"] > 0).all()
    assert (df_ml["total_puskesmas"] > 0).all()
    assert (df_ml["dokter_umum"] > 0).all()
    assert (df_ml["rasio_dokter_per_1000"] > 0).all()
    assert (df_ml["akses_sanitasi_layak_persen"] > 0).all()
    assert (df_ml["prevalensi_stunting_balita_persen"] > 0).all()
    assert (df_ml["indeks_risiko_stunting_sanitasi"] > 0).all()
    assert (df_ml["indeks_proteksi_preventif"] > 0).all()


def test_public_health_macro_indicators_cleaner_and_db():
    from etl.transform.clean_indicators import clean_and_validate_indicators
    from models import TblIndikatorKesehatan

    raw_sample = [
        {
            "kode_bps": "3578",
            "nama_wilayah": "Kota Surabaya",
            "tahun": 2024,
            "topik": "Sanitasi & Lingkungan",
            "nama_indikator": "Persentase Akses Sanitasi Layak (Jamban Sehat)",
            "nilai": 97.8,
            "satuan": "%",
            "sumber_file": "Dinkes Jatim / STBM Kemenkes"
        },
        {
            "kode_bps": "3527",
            "nama_wilayah": "Kabupaten Sampang",
            "tahun": 2024,
            "topik": "Gizi & Tumbuh Kembang",
            "nama_indikator": "Prevalensi Balita Stunting",
            "nilai": 27.9,
            "satuan": "%",
            "sumber_file": "SSGI / Dinkes Jatim"
        }
    ]

    df_cleaned = clean_and_validate_indicators(raw_sample)
    assert len(df_cleaned) == 2
    assert "kode_bps" in df_cleaned.columns
    assert "coverage_periode" in df_cleaned.columns
    assert (df_cleaned["nilai"] > 0).all()

    # DB records count verification
    session = get_session()
    try:
        count = session.query(TblIndikatorKesehatan).count()
        assert count == 304  # 38 Kab/Kota * 8 Public Health Determinants
    finally:
        session.close()
