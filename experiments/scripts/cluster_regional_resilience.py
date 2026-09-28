"""
Cura — HealthTrust Analytics Platform
Module: Regional Health Resilience Clustering (Langkah 2 ML)
Author: Tim Sains Data Terapan (PENS) - Role: ML Engineer

Tujuan:
1. Mengelompokkan 38 Kabupaten/Kota di Jawa Timur ke dalam klaster ketahanan kesehatan (Health Resilience Clusters).
2. Membandingkan algoritma K-Means, Agglomerative Hierarchical Clustering, dan DBSCAN.
3. Melakukan evaluasi metrik (Silhouette Score, Davies-Bouldin Index, Calinski-Harabasz).
4. Profiling karakteristik setiap klaster dan menghasilkan rekomendasi kebijakan berbasis klaster.
5. Mengekspor hasil klaster ke CSV & JSON untuk konsumsi Dasbor / Peta Geospasial.
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.decomposition import PCA

def load_data(base_path: str = "Cura/OpenData-Cura/experiments/data"):
    """Memuat dataset skor kesehatan terpadu hasil Langkah 1."""
    score_path = os.path.join(base_path, "regional_health_index_scores.csv")
    ml_path = "Cura/OpenData-Cura/database/exports/ml_readiness_dataset.csv"
    
    if not os.path.exists(score_path):
        score_path = "experiments/data/regional_health_index_scores.csv"
        ml_path = "database/exports/ml_readiness_dataset.csv"

    df_score = pd.read_csv(score_path)
    df_ml = pd.read_csv(ml_path)

    # Gabungkan atribut penting
    df = pd.merge(
        df_score, 
        df_ml[['kode_bps', 'total_rs', 'total_puskesmas', 'total_tt', 'kasus_rawat_inap_tahunan', 'proyeksi_penduduk_2026']], 
        on='kode_bps'
    )
    return df

def run_clustering_models(df: pd.DataFrame):
    """Mengeksekusi K-Means, Agglomerative, dan DBSCAN."""
    
    # Fitur Analitik Ketahanan (Sesuai Proposal Hal. 7)
    df['kasus_inap_per_1k'] = (df['kasus_rawat_inap_tahunan'] / df['proyeksi_penduduk_2026']) * 1000
    
    feature_cols = [
        'rasio_tt_proyeksi_2026',
        'rasio_dokter_per_1000',
        'prevalensi_stunting',
        'aki',
        'pilar_fasilitas',
        'pilar_nakes',
        'pilar_kia',
        'skor_kesehatan'
    ]

    X = df[feature_cols].copy()
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 1. K-MEANS (k=3)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=25)
    kmeans_labels = kmeans.fit_predict(X_scaled)

    # 2. AGGLOMERATIVE HIERARCHICAL (k=3, ward linkage)
    agg = AgglomerativeClustering(n_clusters=3, linkage='ward')
    agg_labels = agg.fit_predict(X_scaled)

    # 3. DBSCAN (Outlier & Dense clusters)
    dbscan = DBSCAN(eps=1.8, min_samples=3)
    dbscan_labels = dbscan.fit_predict(X_scaled)

    # Evaluasi Metrik
    sil_km = silhouette_score(X_scaled, kmeans_labels)
    db_km = davies_bouldin_score(X_scaled, kmeans_labels)
    ch_km = calinski_harabasz_score(X_scaled, kmeans_labels)

    sil_agg = silhouette_score(X_scaled, agg_labels)
    db_agg = davies_bouldin_score(X_scaled, agg_labels)

    # PCA 2D untuk visualisasi proyeksi
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X_scaled)

    df['cluster_kmeans'] = kmeans_labels
    df['cluster_agg'] = agg_labels
    df['cluster_dbscan'] = dbscan_labels
    df['pca_1'] = X_pca[:, 0].round(3)
    df['pca_2'] = X_pca[:, 1].round(3)

    # Profiling & Penamaan Klaster Berdasarkan Rata-rata Skor
    cluster_means = df.groupby('cluster_kmeans')['skor_kesehatan'].mean()
    sorted_clusters = cluster_means.sort_values(ascending=False).index.tolist()

    # Mapping klaster ke profil bermakna
    cluster_map = {
        sorted_clusters[0]: {
            "tier": "Tier 1: Mandiri & Tangguh (Urban Hub)",
            "short_name": "Pusat Rujukan & Nakes Lengkap",
            "warna": "#10B981", # Hijau
            "karakteristik": "Kapasitas tempat tidur tinggi, densitas dokter spesialis memadai, dan prevalensi stunting relatif rendah.",
            "kebijakan": "Fokus sebagai sentra rujukan regional spesialis dan pembina faskes wilayah satelit."
        },
        sorted_clusters[1]: {
            "tier": "Tier 2: Berkembang & Moderat (Waspada)",
            "short_name": "Kapasitas Sedang (Perlu Stabilisasi)",
            "warna": "#F59E0B", # Kuning
            "karakteristik": "Kapasitas fasilitas rata-rata, sebaran nakes cukup namun rentan overload jika terjadi lonjakan kasus musiman.",
            "kebijakan": "Peningkatan kuota tempat tidur puskesmas rawat inap dan penguatan deteksi dini penyakit tropis."
        },
        sorted_clusters[2]: {
            "tier": "Tier 3: Rentan & Defisit (Prioritas Khusus)",
            "short_name": "Rentan & Defisit Faskes/KIA",
            "warna": "#EF4444", # Merah
            "karakteristik": "Rasio ranjang di bawah standar minimal WHO, beban stunting/KIA tinggi, atau akses geospasial kepulauan/terpencil.",
            "kebijakan": "Intervensi alokasi logistik darurat, percepatan PMT gizi stunting, dan redistribusi tenaga medis."
        }
    }

    df['cluster_id'] = df['cluster_kmeans']
    df['cluster_tier'] = df['cluster_id'].map(lambda x: cluster_map[x]['tier'])
    df['cluster_name'] = df['cluster_id'].map(lambda x: cluster_map[x]['short_name'])
    df['cluster_color'] = df['cluster_id'].map(lambda x: cluster_map[x]['warna'])
    df['karakteristik_klaster'] = df['cluster_id'].map(lambda x: cluster_map[x]['karakteristik'])
    df['rekomendasi_kebijakan'] = df['cluster_id'].map(lambda x: cluster_map[x]['kebijakan'])

    eval_results = {
        "kmeans": {
            "k": 3,
            "silhouette_score": round(float(sil_km), 4),
            "davies_bouldin_index": round(float(db_km), 4),
            "calinski_harabasz_score": round(float(ch_km), 2)
        },
        "agglomerative": {
            "k": 3,
            "linkage": "ward",
            "silhouette_score": round(float(sil_agg), 4),
            "davies_bouldin_index": round(float(db_agg), 4)
        },
        "pca_explained_variance_ratio": [round(float(v), 4) for v in pca.explained_variance_ratio_],
        "total_pca_variance": round(float(pca.explained_variance_ratio_.sum()), 4)
    }

    return df, eval_results

def export_clustering_results(df: pd.DataFrame, eval_results: dict):
    """Menyimpan data hasil clustering."""
    out_dir = "Cura/OpenData-Cura/experiments/data"
    os.makedirs(out_dir, exist_ok=True)

    csv_path = os.path.join(out_dir, "regional_clusters.csv")
    json_path = os.path.join(out_dir, "clustering_evaluation.json")

    export_cols = [
        'kode_bps', 'nama_wilayah', 'cluster_id', 'cluster_tier', 'cluster_name', 'cluster_color',
        'skor_kesehatan', 'pilar_fasilitas', 'pilar_nakes', 'pilar_kia', 'pilar_morbiditas', 'pilar_program',
        'pca_1', 'pca_2', 'karakteristik_klaster', 'rekomendasi_kebijakan'
    ]

    df[export_cols].to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump(eval_results, f, indent=2)

    print(f"[OK] Hasil clustering berhasil disimpan ke:")
    print(f"  - {csv_path}")
    print(f"  - {json_path}")

def run_pipeline():
    print("=" * 65)
    print("[START] MENJALANKAN PIPELINE CLUSTERING KETAHANAN WILAYAH (LANGKAH 2)")
    print("=" * 65)

    df_raw = load_data()
    print(f"[OK] Data termuat: {len(df_raw)} Kab/Kota.")

    df_clustered, eval_results = run_clustering_models(df_raw)
    
    print("\n[EVALUASI MODEL CLUSTERING]")
    print(f"  - K-Means (k=3) Silhouette Score : {eval_results['kmeans']['silhouette_score']}")
    print(f"  - K-Means Davies-Bouldin Index  : {eval_results['kmeans']['davies_bouldin_index']}")
    print(f"  - PCA 2D Explained Variance     : {eval_results['total_pca_variance']:.2%}")

    print("\n[DISTRIBUSI KLASTER WILAYAH]")
    for tier, count in df_clustered['cluster_tier'].value_counts().items():
        print(f"  - {tier}: {count} Kab/Kota")

    export_clustering_results(df_clustered, eval_results)
    print("=" * 65)

if __name__ == "__main__":
    run_pipeline()
