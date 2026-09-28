"""
Cura — HealthTrust Analytics Platform
Module: Composite Health Index & Regional Priority Scorer (Langkah 1 ML)
Author: Tim Sains Data Terapan (PENS) - Role: ML Engineer

Tujuan:
1. Menghitung Composite Health Index (Skor Kesehatan Wilayah 0-100) untuk 38 Kab/Kota di Jawa Timur.
2. Menghitung Skor Kesehatan Agregat Provinsi Jawa Timur.
3. Mengidentifikasi Daftar Wilayah Prioritas (Kab/Kota yang paling membutuhkan intervensi segera).
4. Menghasilkan Rekomendasi Program Penanganan Kesehatan berbasis data defisit spesifik (Pilar KIA, Faskes, Nakes, Morbiditas).
"""

import os
import json
import pandas as pd
import numpy as np

def load_source_data(base_path: str = "Cura/OpenData-Cura/database/exports"):
    """Memuat feature store ML dan indikator KIA terpadu."""
    ml_path = os.path.join(base_path, "ml_readiness_dataset.csv")
    kia_path = os.path.join(base_path, "maternal_child_health.csv")
    
    if not os.path.exists(ml_path):
        # Fallback relative path
        ml_path = "database/exports/ml_readiness_dataset.csv"
        kia_path = "database/exports/maternal_child_health.csv"

    df_ml = pd.read_csv(ml_path)
    df_kia = pd.read_csv(kia_path)
    
    # Merge on kode_bps
    cols_kia = [
        'kode_bps', 'aki', 'akb', 'prevalensi_stunting', 
        'cakupan_idl', 'k4_coverage', 'persen_persalinan_faskes'
    ]
    df = pd.merge(df_ml, df_kia[cols_kia], on='kode_bps', suffixes=('', '_kia'))
    return df

def minmax_pos(series: pd.Series) -> pd.Series:
    """Normalisasi indikator positif (semakin tinggi semakin baik) ke skala 0 - 100."""
    s_min, s_max = series.min(), series.max()
    if s_max == s_min:
        return series * 0 + 50.0
    return ((series - s_min) / (s_max - s_min)) * 100.0

def minmax_neg(series: pd.Series) -> pd.Series:
    """Normalisasi indikator beban/negatif (semakin rendah semakin baik) ke skala 0 - 100."""
    s_min, s_max = series.min(), series.max()
    if s_max == s_min:
        return series * 0 + 50.0
    return ((s_max - series) / (s_max - s_min)) * 100.0

def compute_composite_health_index(df: pd.DataFrame) -> pd.DataFrame:
    """
    Menghitung 5 Pilar Kesehatan & Skor Komposit Akhir:
    1. Pilar Kapasitas Fasilitas Kesehatan (Bobot 25%)
    2. Pilar SDM Tenaga Medis (Bobot 20%)
    3. Pilar Kesehatan Ibu, Anak & Stunting (Bobot 25%)
    4. Pilar Beban Morbiditas Penyakit (Bobot 15%)
    5. Pilar Cakupan Program Preventif & KIA (Bobot 15%)
    """
    res = df.copy()
    pop_2026 = res['proyeksi_penduduk_2026']

    # --- PILAR 1: Fasilitas Kesehatan (25%) ---
    # Rasio Bed WHO (di-cap di 3.0 agar outlier kota besar tidak mendistorsi scoring kabupaten secara ekstrem)
    bed_ratio_capped = res['rasio_tt_proyeksi_2026'].clip(upper=3.0)
    score_bed = minmax_pos(bed_ratio_capped)
    pkm_per_100k = (res['total_puskesmas'] / pop_2026) * 100000
    score_pkm = minmax_pos(pkm_per_100k)
    pkm_tt_per_100k = (res['total_tt_puskesmas'] / pop_2026) * 100000
    score_pkm_tt = minmax_pos(pkm_tt_per_100k)
    res['pilar_fasilitas'] = (0.50 * score_bed + 0.30 * score_pkm + 0.20 * score_pkm_tt).round(2)

    # --- PILAR 2: Tenaga Kesehatan (20%) ---
    score_dokter = minmax_pos(res['rasio_dokter_per_1000'])
    score_perawat = minmax_pos(res['rasio_perawat_per_1000'])
    score_bidan = minmax_pos(res['rasio_bidan_per_1000'])
    res['pilar_nakes'] = (0.45 * score_dokter + 0.30 * score_perawat + 0.25 * score_bidan).round(2)

    # --- PILAR 3: Kesehatan Ibu, Anak & Gizi (25%) ---
    # Semakin rendah stunting/AKI/AKB, skor semakin tinggi (positif)
    score_stunting = minmax_neg(res['prevalensi_stunting'])
    score_aki = minmax_neg(res['aki'])
    score_akb = minmax_neg(res['akb'])
    res['pilar_kia'] = (0.50 * score_stunting + 0.25 * score_aki + 0.25 * score_akb).round(2)

    # --- PILAR 4: Morbiditas & Beban Kasus (15%) ---
    kasus_inap_per_1k = (res['kasus_rawat_inap_tahunan'] / pop_2026) * 1000
    kasus_menular_per_1k = (res['kasus_menular_tahunan'] / pop_2026) * 1000
    res['pilar_morbiditas'] = (0.50 * minmax_neg(kasus_inap_per_1k) + 0.50 * minmax_neg(kasus_menular_per_1k)).round(2)

    # --- PILAR 5: Cakupan Program Preventif (15%) ---
    score_idl = minmax_pos(res['cakupan_idl'])
    score_k4 = minmax_pos(res['k4_coverage'])
    score_persalinan = minmax_pos(res['persen_persalinan_faskes'])
    res['pilar_program'] = (0.40 * score_idl + 0.30 * score_k4 + 0.30 * score_persalinan).round(2)

    # --- SKOR KOMPOSIT AKHIR (0 - 100) ---
    res['skor_kesehatan'] = (
        0.25 * res['pilar_fasilitas'] +
        0.20 * res['pilar_nakes'] +
        0.25 * res['pilar_kia'] +
        0.15 * res['pilar_morbiditas'] +
        0.15 * res['pilar_program']
    ).round(2)

    # Klasifikasi Status Wilayah (Disesuaikan dengan ambang KPI Dasbor: 8 Wilayah Prioritas)
    def classify_status(score):
        if score >= 55.0:
            return "Tangguh / Mandiri", "hijau", "Kondisi Baik"
        elif score >= 40.0:
            return "Waspada", "kuning", "Perlu Dipantau Berkala"
        else:
            return "Prioritas Intervensi", "merah", "Membutuhkan Intervensi Mendesak"

    status_info = res['skor_kesehatan'].apply(classify_status)
    res['kategori_status'] = [x[0] for x in status_info]
    res['warna_indikator'] = [x[1] for x in status_info]
    res['keterangan_tindakan'] = [x[2] for x in status_info]

    # Ranking (1 = Terbaik, 38 = Terendah)
    res['rank_provinsi'] = res['skor_kesehatan'].rank(ascending=False, method='min').astype(int)

    return res

def generate_program_recommendations(df_scored: pd.DataFrame) -> pd.DataFrame:
    """Menghasilkan rekomendasi program kesehatan spesifik berdasarkan pilar terlemah masing-masing wilayah."""
    recommendations = []
    
    pilars = ['pilar_fasilitas', 'pilar_nakes', 'pilar_kia', 'pilar_morbiditas', 'pilar_program']
    pilar_names = {
        'pilar_fasilitas': 'Kapasitas Tempat Tidur & Faskes',
        'pilar_nakes': 'Ketersediaan Tenaga Kesehatan',
        'pilar_kia': 'Kesehatan Ibu, Anak & Stunting',
        'pilar_morbiditas': 'Tingginya Beban Penyakit Menular & Rawat Inap',
        'pilar_program': 'Cakupan Imunisasi & Program Preventif'
    }

    program_map = {
        'pilar_fasilitas': {
            'program': 'Program Peningkatan Daya Tampung Faskes & Revitalisasi TT Puskesmas Rawat Inap',
            'tindakan': 'Penambahan kapasitas ranjang terstandar WHO dan penguatan puskesmas rawat inap di perbatasan.',
            'target': 'Mencapai rasio tempat tidur minimal 1.0 per 1.000 penduduk.'
        },
        'pilar_nakes': {
            'program': 'Program Distribusi Merata Dokter Spesialis & Insentif Nakes Daerah Tertinggal',
            'tindakan': 'Mobilisasi dokter residen/spesialis dan pemenuhan kuota perawat/bidan desa.',
            'target': 'Rasio dokter minimal 1 per 1.000 penduduk dan pemerataan bidan per desa.'
        },
        'pilar_kia': {
            'program': 'Program Gerakan Penanganan Stunting Terpadu & Intervensi Gizi 1.000 HPK',
            'tindakan': 'Pemberian makanan tambahan (PMT) kaya protein hewani, skrining anemia remaja putri, & edukasi sanitasi.',
            'target': 'Menurunkan angka stunting di bawah batas toleransi 14% nasional dan meminimalkan AKI/AKB.'
        },
        'pilar_morbiditas': {
            'program': 'Program Pengendalian Vektor Penyakit Tropis Menular & Skrining PTM Massal',
            'tindakan': 'Grebek sarang nyamuk DBD terfokus, penelusuran kontak aktif TB, dan posbindu PTM.',
            'target': 'Menurunkan tren transmisi kasus rawat inap dan menular tahunan minimal 15%.'
        },
        'pilar_program': {
            'program': 'Program Akselerasi Imunisasi Dasar Lengkap (IDL) & Pemantauan ANC K4 Berkala',
            'tindakan': 'Sweeping imunisasi door-to-door dan pendampingan persalinan 100% di fasilitas kesehatan.',
            'target': 'Cakupan Imunisasi Dasar Lengkap (IDL) mencapai minimal 95% target desa UCI.'
        }
    }

    for _, row in df_scored.iterrows():
        # Cari pilar dengan skor terendah
        sub_scores = {p: row[p] for p in pilars}
        weakest_pilar = min(sub_scores, key=sub_scores.get)
        second_weakest = sorted(sub_scores, key=sub_scores.get)[1]

        prog_info = program_map[weakest_pilar]

        urgensi = "Tinggi" if row['skor_kesehatan'] < 45.0 else ("Sedang" if row['skor_kesehatan'] < 65.0 else "Rendah")

        recommendations.append({
            'kode_bps': row['kode_bps'],
            'nama_wilayah': row['nama_wilayah'],
            'skor_kesehatan': row['skor_kesehatan'],
            'rank_provinsi': row['rank_provinsi'],
            'kategori_status': row['kategori_status'],
            'tingkat_urgensi': urgensi,
            'masalah_utama': f"{pilar_names[weakest_pilar]} (Skor: {sub_scores[weakest_pilar]:.1f})",
            'masalah_sekunder': f"{pilar_names[second_weakest]} (Skor: {sub_scores[second_weakest]:.1f})",
            'program_rekomendasi_jatim': prog_info['program'],
            'rekomendasi_tindakan': prog_info['tindakan'],
            'target_capaian': prog_info['target'],
            'status_pelaksanaan': 'Diusulkan untuk DPA/Rencana Kerja TA 2026'
        })

    return pd.DataFrame(recommendations)

def run_pipeline():
    print("=" * 65)
    print("[START] MENJALANKAN PIPELINE HITUNG SKOR KESEHATAN JAWA TIMUR (LANGKAH 1)")
    print("=" * 65)

    df_raw = load_source_data()
    print(f"[OK] Data termuat: {len(df_raw)} Kab/Kota.")

    df_scored = compute_composite_health_index(df_raw)
    
    # Skor Provinsi Jawa Timur (Rata-rata tertimbang populasi)
    weighted_prov_score = (
        (df_scored['skor_kesehatan'] * df_scored['proyeksi_penduduk_2026']).sum() / 
        df_scored['proyeksi_penduduk_2026'].sum()
    ).round(2)
    mean_prov_score = df_scored['skor_kesehatan'].mean().round(2)

    print(f"[OK] Skor Kesehatan Rata-rata Jawa Timur: {mean_prov_score} / 100")
    print(f"[OK] Skor Kesehatan Tertimbang Populasi:  {weighted_prov_score} / 100")

    df_recs = generate_program_recommendations(df_scored)

    # Simpan output
    output_dir = "Cura/OpenData-Cura/experiments/data"
    os.makedirs(output_dir, exist_ok=True)

    scored_csv = os.path.join(output_dir, "regional_health_index_scores.csv")
    recs_csv = os.path.join(output_dir, "regional_program_recommendations.csv")
    summary_json = os.path.join(output_dir, "jatim_kpi_summary.json")

    export_cols = [
        'kode_bps', 'nama_wilayah', 'rank_provinsi', 'skor_kesehatan',
        'pilar_fasilitas', 'pilar_nakes', 'pilar_kia', 'pilar_morbiditas', 'pilar_program',
        'kategori_status', 'warna_indikator', 'keterangan_tindakan',
        'rasio_tt_proyeksi_2026', 'rasio_dokter_per_1000', 'prevalensi_stunting', 'aki', 'akb'
    ]

    df_scored[export_cols].to_csv(scored_csv, index=False)
    df_recs.to_csv(recs_csv, index=False)

    kpi_summary = {
        "provinsi": "Jawa Timur",
        "tahun_analisis": "2026",
        "total_kab_kota": int(len(df_scored)),
        "skor_kesehatan_provinsi_mean": float(mean_prov_score),
        "skor_kesehatan_provinsi_weighted": float(weighted_prov_score),
        "jumlah_wilayah_prioritas_intervensi": int((df_scored['kategori_status'] == 'Prioritas Intervensi').sum()),
        "jumlah_wilayah_waspada": int((df_scored['kategori_status'] == 'Waspada').sum()),
        "jumlah_wilayah_tangguh": int((df_scored['kategori_status'] == 'Tangguh / Mandiri').sum()),
        "top_5_prioritas_intervensi": df_scored.sort_values('skor_kesehatan')[['kode_bps', 'nama_wilayah', 'skor_kesehatan']].head(5).to_dict(orient='records'),
        "top_5_wilayah_tertinggi": df_scored.sort_values('skor_kesehatan', ascending=False)[['kode_bps', 'nama_wilayah', 'skor_kesehatan']].head(5).to_dict(orient='records')
    }

    with open(summary_json, "w") as f:
        json.dump(kpi_summary, f, indent=2)

    print(f"\n[OK] Hasil perhitungan berhasil diekspor ke:")
    print(f"  - {scored_csv}")
    print(f"  - {recs_csv}")
    print(f"  - {summary_json}")
    print("=" * 65)

if __name__ == "__main__":
    run_pipeline()
