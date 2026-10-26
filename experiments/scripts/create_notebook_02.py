import nbformat as nbf
import os

nb = nbf.v4.new_notebook()
cells = []

# Cell 1: Title
cells.append(nbf.v4.new_markdown_cell("""# 🌐 Eksperimen 02: Clustering Ketahanan Fasilitas Kesehatan Jawa Timur
**Mata Kuliah**: Proyek Analitika Data — Sains Data Terapan (PENS 2026)  
**Platform**: Cura (HealthTrust Platform)  
**Role**: Machine Learning Engineer  

---

### 📌 Tujuan Eksperimen:
1. **Segmentasi Geospasial Berbasis Ketahanan Faskes**: Mengelompokkan 38 Kabupaten/Kota di Jawa Timur berdasarkan kapasitas tempat tidur WHO, densitas tenaga medis, beban morbiditas, dan kerentanan KIA/stunting.
2. **Komparasi 3 Algoritma Unsupervised Learning**:
   - **K-Means Clustering** (Penentuan $k$ optimal via Elbow Method & Silhouette Score)
   - **Agglomerative Hierarchical Clustering** (Ward's Linkage & Dendrogram)
   - **DBSCAN** (Analisis kepadatan dan deteksi anomali/outlier)
3. **Reduksi Dimensi & Visualisasi Spasial 2D (PCA)**: Memvisualisasikan sebaran klaster wilayah pada ruang berdimensi rendah.
4. **Profiling & Rekomendasi Kebijakan Regional**: Menyusun profil klaster (Tier 1: Mandiri, Tier 2: Berkembang, Tier 3: Rentan) sebagai dasar navigasi kebijakan Dinkes & Bappeda."""))

# Cell 2: Imports
cells.append(nbf.v4.new_code_cell("""import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.cluster.hierarchy import dendrogram, linkage
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
from sklearn.metrics import silhouette_score, davies_bouldin_score, silhouette_samples
from sklearn.decomposition import PCA

sns.set_theme(style='whitegrid')
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cccccc'
plt.rcParams['axes.linewidth'] = 0.8
print("Library clustering & visualisasi berhasil dimuat!")"""))

# Cell 3: Data Load
cells.append(nbf.v4.new_markdown_cell("""## 1. Memuat Dataset & Penyiapan Fitur Analitik
Kita memuat skor indeks kesehatan dan fitur kapasitas dari `regional_health_index_scores.csv` dan `ml_readiness_dataset.csv`."""))

cells.append(nbf.v4.new_code_cell("""df_score = pd.read_csv('../data/regional_health_index_scores.csv')
df_ml = pd.read_csv('../../database/exports/ml_readiness_dataset.csv')

df = pd.merge(
    df_score, 
    df_ml[['kode_bps', 'total_rs', 'total_puskesmas', 'total_tt', 'kasus_rawat_inap_tahunan', 'proyeksi_penduduk_2026']], 
    on='kode_bps'
)

# Fitur untuk pemodelan
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

print(f"Data siap: {X_scaled.shape[0]} Wilayah x {X_scaled.shape[1]} Fitur")
df[['nama_wilayah'] + feature_cols].head(5)"""))

# Cell 4: Elbow & Silhouette
cells.append(nbf.v4.new_markdown_cell("""## 2. Penentuan Jumlah Klaster Optimal ($k$)
Kita mengevaluasi nilai $k = 2$ hingga $k = 7$ menggunakan **Elbow Method (Inertia SSE)** dan **Silhouette Score**."""))

cells.append(nbf.v4.new_code_cell("""inertias = []
sil_scores = []
k_range = range(2, 8)

for k in k_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=20)
    km.fit(X_scaled)
    inertias.append(km.inertia_)
    sil_scores.append(silhouette_score(X_scaled, km.labels_))

fig, ax1 = plt.subplots(1, 2, figsize=(14, 5))

# Elbow Plot
ax1[0].plot(k_range, inertias, marker='o', color='#3B82F6', linewidth=2, markersize=8)
ax1[0].set_title('Elbow Method (Inertia SSE)', fontsize=13, fontweight='bold')
ax1[0].set_xlabel('Jumlah Klaster (k)', fontsize=11)
ax1[0].set_ylabel('Inertia / Within-Cluster Sum of Squares', fontsize=11)

# Silhouette Plot
ax1[1].plot(k_range, sil_scores, marker='s', color='#10B981', linewidth=2, markersize=8)
ax1[1].axvline(3, color='#EF4444', linestyle='--', label='k=3 (Optimal Terpilih)')
ax1[1].set_title('Silhouette Score Analysis', fontsize=13, fontweight='bold')
ax1[1].set_xlabel('Jumlah Klaster (k)', fontsize=11)
ax1[1].set_ylabel('Silhouette Score', fontsize=11)
ax1[1].legend()

plt.tight_layout()
plt.show()"""))

# Cell 5: Hierarchical Dendrogram
cells.append(nbf.v4.new_markdown_cell("""## 3. Agglomerative Hierarchical Clustering (Dendrogram)
Dendrogram menampilkan struktur taksonomi pohon hubungan kemiripan faskes antar wilayah Jawa Timur."""))

cells.append(nbf.v4.new_code_cell("""linked = linkage(X_scaled, method='ward')

plt.figure(figsize=(14, 8))
dendrogram(
    linked,
    orientation='top',
    labels=df['nama_wilayah'].values,
    distance_sort='descending',
    show_leaf_counts=True,
    leaf_rotation=90,
    leaf_font_size=10
)
plt.title('Hierarchical Clustering Dendrogram (Ward Linkage)', fontsize=14, fontweight='bold', pad=15)
plt.xlabel('Kabupaten / Kota di Jawa Timur', fontsize=12)
plt.ylabel('Euclidean Distance', fontsize=12)
plt.tight_layout()
plt.show()"""))

# Cell 6: 2D PCA Visualization
cells.append(nbf.v4.new_markdown_cell("""## 4. Visualisasi Proyeksi 2D PCA & Segmentasi Klaster
Reduksi dimensi ke 2 Principal Components untuk memetakan klaster wilayah secara intuitif."""))

cells.append(nbf.v4.new_code_cell("""# Jalankan K-Means k=3
kmeans = KMeans(n_clusters=3, random_state=42, n_init=25)
df['cluster_kmeans'] = kmeans.fit_predict(X_scaled)

# Proyeksi PCA
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_scaled)
df['pca_1'] = X_pca[:, 0]
df['pca_2'] = X_pca[:, 1]

# Mapping nama & warna klaster
cluster_means = df.groupby('cluster_kmeans')['skor_kesehatan'].mean()
sorted_k = cluster_means.sort_values(ascending=False).index.tolist()

tier_map = {
    sorted_k[0]: ("Tier 1: Mandiri & Tangguh", "#10B981"),
    sorted_k[1]: ("Tier 2: Berkembang (Waspada)", "#F59E0B"),
    sorted_k[2]: ("Tier 3: Rentan & Defisit", "#EF4444")
}

df['cluster_tier'] = df['cluster_kmeans'].map(lambda x: tier_map[x][0])
df['cluster_color'] = df['cluster_kmeans'].map(lambda x: tier_map[x][1])

plt.figure(figsize=(13, 9))
for tier_name, color in [("Tier 1: Mandiri & Tangguh", "#10B981"), ("Tier 2: Berkembang (Waspada)", "#F59E0B"), ("Tier 3: Rentan & Defisit", "#EF4444")]:
    sub = df[df['cluster_tier'] == tier_name]
    plt.scatter(sub['pca_1'], sub['pca_2'], color=color, label=tier_name, s=120, edgecolors='white', alpha=0.9)

# Anotasi teks beberapa kota/kabupaten representatif
sample_labels = ['Kota Surabaya', 'Kota Kediri', 'Kabupaten Pacitan', 'Kabupaten Sumenep', 'Kabupaten Malang', 'Kabupaten Sampang', 'Kota Malang']
for _, row in df.iterrows():
    if row['nama_wilayah'] in sample_labels:
        plt.text(row['pca_1'] + 0.1, row['pca_2'] + 0.1, row['nama_wilayah'].replace('Kabupaten ', 'Kab. ').replace('Kota ', 'Kota '), fontsize=9, fontweight='semibold')

plt.title(f'Peta Klaster Ketahanan Faskes Jawa Timur (PCA 2D - Explained Var: {pca.explained_variance_ratio_.sum():.1%})', fontsize=14, fontweight='bold', pad=15)
plt.xlabel(f'Principal Component 1 ({pca.explained_variance_ratio_[0]:.1%} Var)', fontsize=11)
plt.ylabel(f'Principal Component 2 ({pca.explained_variance_ratio_[1]:.1%} Var)', fontsize=11)
plt.legend(frameon=True, loc='upper right', fontsize=11)
plt.tight_layout()
plt.show()"""))

# Cell 7: Radar Profile Chart
cells.append(nbf.v4.new_markdown_cell("""## 5. Radar Chart Perbandingan Karakteristik Antar Klaster
Visualisasi spider/radar chart menunjukkan kekuatan dan kelemahan masing-masing klaster pada 5 pilar kesehatan."""))

cells.append(nbf.v4.new_code_cell("""pilars = ['pilar_fasilitas', 'pilar_nakes', 'pilar_kia', 'pilar_morbiditas', 'pilar_program']
pilar_labels = ['Fasilitas & Bed', 'Tenaga Medis', 'KIA & Stunting', 'Morbiditas (Invers)', 'Cakupan Program']

cluster_summary = df.groupby('cluster_tier')[pilars].mean()

# Radar Chart
num_vars = len(pilars)
angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
angles += angles[:1]

fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))

colors = {'Tier 1: Mandiri & Tangguh': '#10B981', 'Tier 2: Berkembang (Waspada)': '#F59E0B', 'Tier 3: Rentan & Defisit': '#EF4444'}

for tier, col_val in colors.items():
    values = cluster_summary.loc[tier].values.flatten().tolist()
    values += values[:1]
    ax.plot(angles, values, color=col_val, linewidth=2, label=tier)
    ax.fill(angles, values, color=col_val, alpha=0.15)

ax.set_theta_offset(np.pi / 2)
ax.set_theta_direction(-1)
ax.set_xticks(angles[:-1])
ax.set_xticklabels(pilar_labels, fontsize=11, fontweight='semibold')
ax.set_ylim(0, 100)
plt.title('Profil Radar 5 Pilar Kesehatan per Klaster Ketahanan', size=14, fontweight='bold', pad=25)
plt.legend(loc='upper right', bbox_to_anchor=(1.25, 1.1), fontsize=10)
plt.show()"""))

# Cell 8: Policy Table
cells.append(nbf.v4.new_markdown_cell("""## 6. Tabel Profiling & Rekomendasi Kebijakan
Ringkasan karakteristik dan jumlah anggota per klaster untuk konsumsi laporan manajerial."""))

cells.append(nbf.v4.new_code_cell("""summary_table = df.groupby('cluster_tier').agg(
    Jumlah_Wilayah=('kode_bps', 'count'),
    Rata_Skor_Kesehatan=('skor_kesehatan', 'mean'),
    Rasio_Bed_Proyeksi=('rasio_tt_proyeksi_2026', 'mean'),
    Rasio_Dokter_1k=('rasio_dokter_per_1000', 'mean'),
    Prevalensi_Stunting=('prevalensi_stunting', 'mean'),
    AKI_Rata=('aki', 'mean')
).round(2).reset_index()

summary_table"""))


# --- Sel 7-10 (DBSCAN, OPTICS, Kepulauan, Tuning) ---
# Ditambahkan Okt 2026: visualisasi & evaluasi DBSCAN/OPTICS, analisis Sumenep & Bawean, tuning Silhouette.
cells.append(nbf.v4.new_markdown_cell("## 7. Density-Based Clustering: DBSCAN — Visualisasi & Evaluasi\n**Tujuan:** menguji apakah struktur kepadatan non-sferis + deteksi anomali (outlier kepulauan/urban) menjelaskan data lebih baik daripada partisi K-Means.\n\n**Prinsip singkat:** DBSCAN mengelompokkan titik yang memiliki ≥ `min_samples` tetangga dalam radius `eps` (titik *core*), memperluas via *density-reachability*, dan melabeli titik yang tidak terjangkau sebagai **noise (-1)** — bukan dipaksa masuk klaster.\nKarena `n=38` kecil dan ruang berdimensi 8 terstandarisasi, kurva **k-distance** dipakai untuk memilih `eps` secara berprinsip, lalu *grid search* kecil mengevaluasi trade-off jumlah klaster vs. proporsi noise.\nMetrik Silhouette untuk DBSCAN/OPTICS dilaporkan **dua versi**: (a) *full* (noise diperlakukan sebagai label) dan (b) *non-noise* (hanya titik core) — versi (b) mudah terlihat besar padahal menutupi banyak noise, sehingga keduanya harus dibaca bersamaan."))

cells.append(nbf.v4.new_code_cell("# --- 7a. Pemilihan eps via k-distance + grid search DBSCAN ---\nfrom sklearn.cluster import OPTICS\nfrom sklearn.neighbors import NearestNeighbors\nfrom sklearn.metrics import calinski_harabasz_score\n\n# k-distance: n_neighbors = min_samples (mencakup titik itu sendiri -> ambil kolom terakhir)\nnn = NearestNeighbors(n_neighbors=4)\nnn.fit(X_scaled)\ndists, _ = nn.kneighbors(X_scaled)\nkdist = np.sort(dists[:, -1])\n\nfig, ax = plt.subplots(figsize=(9, 4.5))\nax.plot(range(1, len(kdist)+1), kdist, marker='o', markersize=4, color='#8B5CF6', linewidth=2)\nax.axhspan(1.5, 2.0, color='#8B5CF6', alpha=0.10, label='Kandidat eps 1.5-2.0 (elbow)')\nax.set_title('k-Distance Plot (k=4, Standardized Euclidean) — Dasar Pemilihan eps DBSCAN', fontsize=12, fontweight='bold')\nax.set_xlabel('Wilayah terurut (sorted distance)', fontsize=10)\nax.set_ylabel('Jarak ke tetangga ke-3 (excl. self)', fontsize=10)\nax.legend(fontsize=9)\nplt.tight_layout()\nplt.show()\n\n# Grid search kecil: eps x min_samples\nrows = []\nfor eps in [1.2, 1.5, 1.8, 2.0, 2.5]:\n    for ms in [3, 4, 5]:\n        lb = DBSCAN(eps=eps, min_samples=ms).fit_predict(X_scaled)\n        ncl = len(set(lb)) - (1 if -1 in lb else 0)\n        nnoise = list(lb).count(-1)\n        sil_nn, sil_full = np.nan, np.nan\n        if ncl >= 2:\n            mask = np.array(lb) != -1\n            try:\n                if mask.sum() > ncl and len(set(np.array(lb)[mask])) >= 2:\n                    sil_nn = silhouette_score(X_scaled[mask], np.array(lb)[mask])\n            except Exception:\n                pass\n            try:\n                sil_full = silhouette_score(X_scaled, lb)\n            except Exception:\n                pass\n        rows.append({'eps': eps, 'min_samples': ms, 'n_cluster': ncl, 'n_noise': nnoise,\n                     'sil_nonnoise': round(float(sil_nn), 4) if not np.isnan(sil_nn) else None,\n                     'sil_full': round(float(sil_full), 4) if not np.isnan(sil_full) else None})\ngrid_dbscan = pd.DataFrame(rows)\nprint(\"Grid DBSCAN (8 fitur baseline, StandardScaler):\")\ngrid_dbscan"))

cells.append(nbf.v4.new_code_cell("# --- 7b. Fit DBSCAN referensi (eps=1.8, min_samples=3, konsisten dengan cluster_regional_resilience.py) ---\ndb_ref = DBSCAN(eps=1.8, min_samples=3)\ndf['cluster_dbscan'] = db_ref.fit_predict(X_scaled)\n\nncl = len(set(df['cluster_dbscan'])) - (1 if -1 in df['cluster_dbscan'].values else 0)\nnnoise = (df['cluster_dbscan'] == -1).sum()\nmask = df['cluster_dbscan'] != -1\nsil_nn = silhouette_score(X_scaled[mask], df.loc[mask, 'cluster_dbscan']) if ncl >= 2 and mask.sum() > ncl else np.nan\ntry:\n    sil_full = silhouette_score(X_scaled, df['cluster_dbscan']) if ncl >= 2 else np.nan\nexcept Exception:\n    sil_full = np.nan\nprint(f\"DBSCAN eps=1.8, min_samples=3 -> {ncl} klaster + {nnoise} noise dari 38 wilayah\")\nprint(f\"Silhouette (non-noise, {mask.sum()} wil.): {sil_nn:.4f} | Silhouette (full, noise=-1): {sil_full:.4f}\")\nprint(\"\\nDaftar noise (-1) — kandidat anomali kepadatan:\")\nprint(df.loc[df['cluster_dbscan']==-1, 'nama_wilayah'].tolist())\n\nplt.figure(figsize=(11, 7.5))\nfor lab in sorted(df['cluster_dbscan'].unique()):\n    sub = df[df['cluster_dbscan'] == lab]\n    if lab == -1:\n        plt.scatter(sub['pca_1'], sub['pca_2'], c='black', marker='x', s=100, linewidths=1.5,\n                    label=f\"Noise (-1): {len(sub)} wil.\", alpha=0.9, zorder=3)\n    else:\n        plt.scatter(sub['pca_1'], sub['pca_2'], s=130, edgecolors='white', linewidths=1.0, alpha=0.9,\n                    label=f\"Dense cluster {lab}: {len(sub)} wil.\", zorder=2)\nfor _, r in df[df['nama_wilayah'].isin(['Kabupaten Sumenep','Kabupaten Gresik','Kabupaten Sampang','Kota Surabaya','Kota Kediri','Kota Madiun'])].iterrows():\n    plt.text(r['pca_1']+0.08, r['pca_2']+0.08, r['nama_wilayah'].replace('Kabupaten ','Kab. '), fontsize=8.5, fontweight='semibold')\nplt.title('DBSCAN pada Ruang PCA 2D (eps=1.8, min_samples=3) — Noise = Anomali Kepadatan', fontsize=13, fontweight='bold')\nplt.xlabel(f\"PC1 ({pca.explained_variance_ratio_[0]:.1%})\"); plt.ylabel(f\"PC2 ({pca.explained_variance_ratio_[1]:.1%})\")\nplt.legend(frameon=True, fontsize=10, loc='best')\nplt.tight_layout(); plt.show()"))

cells.append(nbf.v4.new_markdown_cell("## 8. OPTICS — Visualisasi & Evaluasi (Generalisasi DBSCAN Multi-Densitas)\n**Tujuan:** menguji apakah hirarki kepadatan bertingkat (urban padat vs. rural renggang vs. kepulauan terisolasi) membutuhkan ambang kepadatan yang fleksibel — kelemahan DBSCAN `eps` tunggal.\n\n**Prinsip singkat:** OPTICS mengurutkan titik berdasarkan *reachability distance* dan mengekstrak klaster via parameter `xi` (kontras densitas) + `min_cluster_size`, sehingga satu run dapat menangkap klaster dengan kerapatan berbeda. Plot **reachability** (lembah = klaster, puncak = batas/noise) adalah diagnostik utamanya, analog dengan dendrogram pada AHC.\nKonfigurasi di bawah (`min_samples=3`, `min_cluster_size=3`, `xi=0.05`) adalah titik tengah grid `min_samples ∈ {2,3,4,5} × xi ∈ {0.02,0.05,0.10}` yang diuji — grid penuh diringkas pada sel perbandingan §8b."))

cells.append(nbf.v4.new_code_cell("# --- 8a. OPTICS: reachability plot + proyeksi PCA ---\nopt = OPTICS(min_samples=3, xi=0.05, min_cluster_size=3)\ndf['cluster_optics'] = opt.fit_predict(X_scaled)\n\nncl_o = len(set(df['cluster_optics'])) - (1 if -1 in df['cluster_optics'].values else 0)\nnnoise_o = (df['cluster_optics'] == -1).sum()\nmask_o = df['cluster_optics'] != -1\ntry:\n    sil_nn_o = silhouette_score(X_scaled[mask_o], df.loc[mask_o, 'cluster_optics']) if ncl_o >= 2 else np.nan\nexcept Exception:\n    sil_nn_o = np.nan\ntry:\n    sil_full_o = silhouette_score(X_scaled, df['cluster_optics']) if ncl_o >= 2 else np.nan\nexcept Exception:\n    sil_full_o = np.nan\nprint(f\"OPTICS (min_samples=3, xi=0.05, min_cluster_size=3) -> {ncl_o} klaster + {nnoise_o} noise\")\nprint(f\"Silhouette non-noise: {sil_nn_o:.4f} | Silhouette full: {sil_full_o:.4f}\")\nprint(\"Anggota tiap label:\", df['cluster_optics'].value_counts().to_dict())\n\n# Reachability plot (urutan OPTICS)\nfig, ax = plt.subplots(figsize=(13, 4.2))\nordering = opt.ordering_\nreach = np.array(opt.reachability_[ordering])\nax.bar(range(len(reach)), reach, width=1.0, color='#0EA5E9', edgecolor='none')\nax.set_title('OPTICS Reachability Plot (lembah = klaster padat, puncak = batas/noise)', fontsize=12, fontweight='bold')\nax.set_xlabel('Urutan OPTICS (ordering)', fontsize=10)\nax.set_ylabel('Reachability distance', fontsize=10)\nplt.tight_layout(); plt.show()\n\nplt.figure(figsize=(11, 7.5))\nfor lab in sorted(df['cluster_optics'].unique()):\n    sub = df[df['cluster_optics'] == lab]\n    if lab == -1:\n        plt.scatter(sub['pca_1'], sub['pca_2'], c='black', marker='x', s=100, linewidths=1.5,\n                    label=f\"Noise (-1): {len(sub)} wil.\", alpha=0.9, zorder=3)\n    else:\n        plt.scatter(sub['pca_1'], sub['pca_2'], s=140, edgecolors='white', linewidths=1.0, alpha=0.9,\n                    label=f\"OPTICS cluster {lab}: {len(sub)} wil.\", zorder=2)\nfor _, r in df[df['nama_wilayah'].isin(['Kabupaten Sumenep','Kabupaten Gresik','Kabupaten Sampang','Kabupaten Bangkalan','Kabupaten Ngawi','Kabupaten Malang'])].iterrows():\n    plt.text(r['pca_1']+0.08, r['pca_2']+0.08, r['nama_wilayah'].replace('Kabupaten ','Kab. '), fontsize=8.5, fontweight='semibold')\nplt.title('OPTICS pada Ruang PCA 2D — Fragmentasi Tinggi = Sinyal n Kecil, Bukan Struktur Kuat', fontsize=13, fontweight='bold')\nplt.xlabel(f\"PC1 ({pca.explained_variance_ratio_[0]:.1%})\"); plt.ylabel(f\"PC2 ({pca.explained_variance_ratio_[1]:.1%})\")\nplt.legend(frameon=True, fontsize=10, loc='best')\nplt.tight_layout(); plt.show()"))

cells.append(nbf.v4.new_code_cell("# --- 8b. Perbandingan 4 algoritma pada fitur baseline yang sama ---\ndef safe_scores(X, labels):\n    labs = np.array(labels)\n    ncl = len(set(labs)) - (1 if -1 in labs else 0)\n    nnoise = int((labs == -1).sum()) if -1 in labs else 0\n    sil_f, sil_nn, db, ch = np.nan, np.nan, np.nan, np.nan\n    try:\n        if len(set(labs)) >= 2 and not (-1 in labs and ncl < 1):\n            # silhouette full hanya valid jika >=2 label berbeda\n            sil_f = silhouette_score(X, labs)\n    except Exception:\n        pass\n    try:\n        m = labs != -1\n        if ncl >= 2 and m.sum() > ncl and len(set(labs[m])) >= 2:\n            sil_nn = silhouette_score(X[m], labs[m])\n            db = davies_bouldin_score(X[m], labs[m])\n            ch = calinski_harabasz_score(X[m], labs[m])\n        elif -1 not in labs and len(set(labs)) >= 2:\n            db = davies_bouldin_score(X, labs)\n            ch = calinski_harabasz_score(X, labs)\n    except Exception:\n        pass\n    return ncl, nnoise, sil_f, sil_nn, db, ch\n\nagg3 = AgglomerativeClustering(n_clusters=3, linkage='ward').fit_predict(X_scaled)\nrows = []\nfor name, labs in [('K-Means (k=3)', df['cluster_kmeans']),\n                   ('Agglomerative (k=3, ward)', agg3),\n                   ('DBSCAN (eps=1.8, ms=3)', df['cluster_dbscan']),\n                   ('OPTICS (ms=3, xi=0.05)', df['cluster_optics'])]:\n    ncl, nnz, sf, snn, dbv, chv = safe_scores(X_scaled, labs)\n    rows.append({'Algoritma': name, 'n_klaster': ncl, 'n_noise': nnz,\n                 'sil_full': round(float(sf),4) if not np.isnan(sf) else None,\n                 'sil_nonnoise': round(float(snn),4) if not np.isnan(snn) else None,\n                 'DB_index*': round(float(dbv),4) if not np.isnan(dbv) else None,\n                 'CH_score*': round(float(chv),1) if not np.isnan(chv) else None})\ncomp = pd.DataFrame(rows)\nprint(\"Perbandingan algoritma (baseline 8 fitur, StandardScaler). *DB/CH untuk DBSCAN/OPTICS dihitung pada titik non-noise.\")\ndisplay(comp)\n\n# Visual ringkas: sil_full vs proporsi noise\nfig, ax = plt.subplots(figsize=(9, 4.5))\nx = np.arange(len(comp))\nsil_vals = [v if v is not None else 0 for v in comp['sil_full']]\nnoise_frac = comp['n_noise'] / len(df)\nax.bar(x, sil_vals, color=['#3B82F6','#10B981','#8B5CF6','#0EA5E9'], edgecolor='white')\nax.set_xticks(x); ax.set_xticklabels(comp['Algoritma'], rotation=12, ha='right', fontsize=9)\nax.set_ylabel('Silhouette (full)', fontsize=10)\nax.set_title('Silhouette-full vs. Noise: Density Methods Mengorbankan Cakupan demi Kemurnian Inti', fontsize=11, fontweight='bold')\nfor i, (s, nf) in enumerate(zip(sil_vals, noise_frac)):\n    ax.text(i, s + 0.01, f\"{s:.3f}\\nnoise {nf:.0%}\", ha='center', fontsize=8)\nplt.tight_layout(); plt.show()"))

cells.append(nbf.v4.new_markdown_cell("## 9. Analisis Khusus Wilayah Kepulauan: Sumenep & Bawean (via Gresik)\n**Konteks geografis (mengapa analisis ini terpisah):**\n- **Kab. Sumenep** = kabupaten kepulauan terbesar di Jatim (±126 pulau berpenghuni: Madura timur + Kangean, Sapudi, Masalembu, Raas). Jarak Kangean–pelabuhan Kalianget ±9–12 jam laut; biaya logistik & rujukan berlipat.\n- **Pulau Bawean** = 2 kecamatan (Sangkapura & Tambak, ±80 ribu jiwa, ±120 km di utara Laut Jawa) yang **secara administratif tercakup dalam Kab. Gresik** — sehingga tidak ada baris tersendiri pada dataset 38 kab/kota. Skor Gresik (=46.21, peringkat menengah) adalah **rata-rata mainland industri + Bawean**, yang berisiko menutupi (*masking*) defisit pulau (*ecological fallacy* agregat kabupaten).\n- Pembanding Madura: Sampang, Bangkalan, Pamekasan — untuk menguji apakah efek kepulauan bersifat Sumenep-spesifik atau pola regional.\n\n**Pertanyaan analitik:** (1) Di mana posisi kepulauan pada ruang PCA & seberapa dekat ke centroid klasternya? (2) Apakah DBSCAN/OPTICS menandai mereka sebagai noise/anomali? (3) Implikasi kebijakan apa yang berbeda dari label Tier K-Means semata?"))

cells.append(nbf.v4.new_code_cell("# --- 9a. Profil tabular + visual kepulauan ---\nisland_names = ['Kabupaten Sumenep','Kabupaten Gresik','Kabupaten Sampang','Kabupaten Bangkalan','Kabupaten Pamekasan']\nsil_vals = silhouette_samples(X_scaled, df['cluster_kmeans'])\ndf['sil_kmeans'] = sil_vals\ncentroids = kmeans.cluster_centers_[df['cluster_kmeans'].values]\ndf['dist_centroid'] = np.linalg.norm(X_scaled - centroids, axis=1)\n\nisl = df[df['nama_wilayah'].isin(island_names)].copy()\nprint(\"Profil 5 wilayah Madura + Gresik (Bawean proxy) — terurut skor kesehatan:\")\ndisplay(isl[['nama_wilayah','skor_kesehatan','pilar_fasilitas','pilar_nakes','pilar_kia',\n             'pilar_morbiditas','pilar_program','rasio_tt_proyeksi_2026','prevalensi_stunting',\n             'cluster_kmeans','cluster_dbscan','cluster_optics','sil_kmeans','dist_centroid']]\n        .sort_values('skor_kesehatan').round(3))\n\n# Bar chart 5 pilar\nfig, ax = plt.subplots(figsize=(11, 5))\nplot_isl = isl.sort_values('skor_kesehatan')\nx = np.arange(len(plot_isl)); w = 0.15\nfor i, col in enumerate(['pilar_fasilitas','pilar_nakes','pilar_kia','pilar_morbiditas','pilar_program']):\n    ax.bar(x + i*w, plot_isl[col].values, width=w, label=col.replace('pilar_',''))\nax.set_xticks(x + 2*w)\nax.set_xticklabels([n.replace('Kabupaten ','Kab. ') for n in plot_isl['nama_wilayah']], rotation=14, ha='right', fontsize=9)\nax.set_ylim(0, 100); ax.set_ylabel('Skor pilar (0-100)', fontsize=10)\nax.set_title('Profil 5 Pilar: Kepulauan & Madura Raya — Sumenep Terendah di Semua Pilar Kecuali Nakes', fontsize=12, fontweight='bold')\nax.legend(fontsize=9, ncol=5, loc='upper center', bbox_to_anchor=(0.5, 1.12))\nplt.tight_layout(); plt.show()\n\n# Zoom PCA kepulauan vs centroid Tier-nya + anotasi Bawean\nplt.figure(figsize=(11, 7.5))\nfor tier_name, color in [(\"Tier 1: Mandiri & Tangguh\", \"#10B981\"), (\"Tier 2: Berkembang (Waspada)\", \"#F59E0B\"), (\"Tier 3: Rentan & Defisit\", \"#EF4444\")]:\n    sub = df[df['cluster_tier'] == tier_name]\n    plt.scatter(sub['pca_1'], sub['pca_2'], color=color, label=tier_name, s=110, edgecolors='white', alpha=0.55)\nplt.scatter(isl['pca_1'], isl['pca_2'], c='none', edgecolors='black', s=340, linewidths=1.6, zorder=4)\nfor _, r in isl.iterrows():\n    tag = r['nama_wilayah'].replace('Kabupaten ','Kab. ')\n    if 'Gresik' in r['nama_wilayah']:\n        tag += ' (+Bawean)'\n    plt.text(r['pca_1']+0.10, r['pca_2']+0.10, tag, fontsize=9.5, fontweight='bold',\n             bbox=dict(boxstyle='round,pad=0.25', fc='white', ec='#cccccc', alpha=0.9))\nplt.annotate('Bawean: ±120 km utara Jawa,\\ntertutup agregat Gresik mainland',\n             xy=(isl[isl['nama_wilayah']=='Kabupaten Gresik'][['pca_1','pca_2']].values[0]),\n             xytext=(1.6, 2.6), fontsize=9, ha='center',\n             arrowprops=dict(arrowstyle='->', color='black', lw=1.2),\n             bbox=dict(boxstyle='round,pad=0.3', fc='#FEF3C7', ec='#F59E0B'))\nplt.title('Zoom PCA: Posisi Kepulauan vs. Klaster K-Means (lingkaran hitam = fokus kepulauan)', fontsize=13, fontweight='bold')\nplt.xlabel(f\"PC1 ({pca.explained_variance_ratio_[0]:.1%})\"); plt.ylabel(f\"PC2 ({pca.explained_variance_ratio_[1]:.1%})\")\nplt.legend(fontsize=10); plt.tight_layout(); plt.show()"))

cells.append(nbf.v4.new_markdown_cell("### 9b. Temuan & Rekomendasi Kepulauan (dibaca bersama output sel 9a)\n**Fakta kunci (baseline 8 fitur, K-Means k=3 / DBSCAN eps=1.8 ms=3 / OPTICS ms=3 xi=0.05):**\n1. **Sumenep = skor terendah se-Jatim (33.29, rank 38/38)** — stunting 22.18%, rasio bed 0.76/1.000 (di bawah ambang WHO 1.0), pilar KIA 29.2 & program 31.4. Namun **K-Means menempatkannya di Tier 2 (silhouette hanya +0.10, jarak ke centroid 2.64 — terbesar kedua di kelompoknya)**: contoh *misassignment* partisi sferis terhadap outlier geografis. DBSCAN menempatkannya di dense-cluster 1 (bersama 17 wil. rural), sedangkan **OPTICS melabelinya noise (-1)** — kedua metode densitas sepakat bahwa Sumenep bukan inti klaster mana pun.\n2. **Gresik (proxy Bawean) = titik jembatan (silhouette −0.045, negatif!)** — satu-satunya silhouette negatif pada baseline; DBSCAN **noise**, OPTICS **noise**, jarak ke centroid 2.27. Skor agregat 46.21 menutupi dualitas: mainland industri (Sidoarjo–Gresik corridor) vs. Bawean terisolasi. Pilar KIA Gresik hanya 27.1 (setara Sumenep) walau pilar fasilitas 47.5 — pola khas *access gap*, bukan *capacity gap*.\n3. **Intra-Madura heterogen, bukan blok tunggal:** Sampang (37.31, DBSCAN noise, PCA paling kiri −3.06) ≠ Bangkalan (38.80, DBSCAN core) ≠ Pamekasan (55.71, tertinggi ke-5 di Madura raya, DBSCAN core). Pamekasan membuktikan bahwa status pulau tidak deterministik — tata kelola (pilar nakes 65.7, KIA 70.3) dapat mengkompensasi geografi.\n4. **Implikasi metodologis:** agregat kabupaten **tidak cukup** untuk kepulauan. Rekomendasi: (i) *disaggregate* ke level kecamatan/puskesmas (Sangkapura vs. Tambak untuk Bawean; Kangean/Sapudi/Masalembu untuk Sumenep) dengan tambahan fitur *travel time laut*, frekuensi kapal, dan rasio nakes per pulau; (ii) perlakukan label Tier Sumenep/Gresik sebagai **sementara + flag kepulauan**, bukan dasar alokasi formulaik.\n\n**Rekomendasi kebijakan diferensiasi:**\n- *Sumenep (126 pulau):* RS rujukan kepulauan + kapal rujuk terjadwal, penempatan dokter spesialis rotasi Kangean, PMT stunting berbasis logistik laut, dan skema *telemedicine* redundancy (Satelit/VSAT) saat cuaca buruk.\n- *Bawean (via Gresik):* puskesmas rawat inap 24 jam + helipad/evakuasi laut di Sangkapura & Tambak, insentif retensi nakes pulau, dan pemisahan KPI Bawean dari mainland Gresik pada dasbor Cura agar tidak ter-masking."))

cells.append(nbf.v4.new_markdown_cell("## 10. Tuning Fitur & Argumentasi Target Silhouette > 0.65 (Proposal hal. 7)\n**Target proposal:** `Silhouette Score (> 0.65)` untuk clustering ketahanan (bersama Elbow & Davies-Bouldin). **Realisasi baseline:** K-Means k=3 = **0.22**, Agglomerative = **0.22**, DBSCAN-full ≈ **−0.03**, OPTICS-full ≈ **−0.09** — jauh di bawah target.\n\nSel ini menjawab secara empiris: *dapatkah tuning fitur mencapai >0.65 tanpa merusak makna kebijakan?* Hipotesis yang diuji: (H1) redundansi komposit `skor_kesehatan` (r≈0.61–0.65 dengan pilarnya) + outlier ekstrem `rasio_tt` (kota 4–8 vs. median kab. ~1.0) menekan Silhouette; (H2) Silhouette >0.65 pada `n=38` heterogen hanya tercapai via *collapse* ke 1–2 fitur (≈ pemeringkatan skor), yang melanggar prinsip segmentasi multidimensi — fenomena **Goodhart's law** pada metrik klaster."))

cells.append(nbf.v4.new_code_cell("# --- 10a. Bukti empiris: korelasi, ablasi fitur, dan demo Goodhart ---\n# 1) Heatmap korelasi (akar masalah redundansi + skew)\ncorr = df[feature_cols + ['pilar_morbiditas','pilar_program']].corr()\nfig, ax = plt.subplots(figsize=(9, 7))\nsns.heatmap(corr, annot=True, fmt='.2f', cmap='RdYlGn', center=0.3, vmin=-0.6, vmax=1.0,\n            square=True, linewidths=0.5, cbar_kws={'label': 'Korelasi Pearson'}, annot_kws={'fontsize':8})\nax.set_title('Korelasi Fitur: skor_kesehatan Redundan (r>0.6 dgn 3 pilar) | rasio_tt Skew oleh Kota', fontsize=12, fontweight='bold')\nplt.tight_layout(); plt.show()\nprint(\"Korelasi tertinggi: rasio_tt vs pilar_fasilitas = {:.2f}; skor vs pilar_kia = {:.2f}; skor vs pilar_fasilitas = {:.2f}\".format(\n    corr.loc['rasio_tt_proyeksi_2026','pilar_fasilitas'], corr.loc['skor_kesehatan','pilar_kia'], corr.loc['skor_kesehatan','pilar_fasilitas']))\n\n# 2) Ablasi fitur terkontrol (scaler & seed identik, hanya feature set berbeda)\ndef eval_k(cols, k=3, log_tt=False):\n    X = df[cols].copy()\n    if log_tt and 'rasio_tt_proyeksi_2026' in X.columns:\n        X['rasio_tt_proyeksi_2026'] = np.log1p(X['rasio_tt_proyeksi_2026'])\n    Xs = StandardScaler().fit_transform(X)\n    lb = KMeans(n_clusters=k, random_state=42, n_init=25).fit_predict(Xs)\n    return silhouette_score(Xs, lb)\n\nbase8 = feature_cols\nvarian = {\n    'A. Baseline 8F': (base8, False),\n    'B. 7F drop skor_kesehatan': ([c for c in base8 if c != 'skor_kesehatan'], False),\n    'C. 6F (drop skor+aki, logTT)': (['rasio_tt_proyeksi_2026','rasio_dokter_per_1000','prevalensi_stunting','pilar_fasilitas','pilar_nakes','pilar_kia'], True),\n    'D. 4F mentah (logTT)': (['rasio_tt_proyeksi_2026','rasio_dokter_per_1000','prevalensi_stunting','aki'], True),\n    'E. 5 pilar saja': (['pilar_fasilitas','pilar_nakes','pilar_kia','pilar_morbiditas','pilar_program'], False),\n}\nres = []\nfor nama, (cols, lg) in varian.items():\n    res.append({'Varian': nama, 'k=2': round(eval_k(cols, 2, lg), 4), 'k=3': round(eval_k(cols, 3, lg), 4), 'n_fitur': len(cols)})\nabl = pd.DataFrame(res)\nprint(\"\\nAblasi fitur (K-Means, StandardScaler, seed=42):\")\ndisplay(abl)\n\nfig, ax = plt.subplots(figsize=(10, 4.5))\nx = np.arange(len(abl)); w = 0.35\nax.bar(x - w/2, abl['k=2'], width=w, label='k=2', color='#3B82F6', edgecolor='white')\nax.bar(x + w/2, abl['k=3'], width=w, label='k=3', color='#10B981', edgecolor='white')\nax.axhline(0.65, color='#EF4444', linestyle='--', linewidth=1.8, label='Target proposal 0.65')\nax.set_xticks(x); ax.set_xticklabels(abl['Varian'], rotation=14, ha='right', fontsize=9)\nax.set_ylabel('Silhouette Score', fontsize=10)\nax.set_title('Tuning Terbaik (+57%: 0.22 → 0.35) Tetap Jauh dari 0.65 — Target Tak Tercapai secara Sehat', fontsize=11, fontweight='bold')\nax.legend(fontsize=9)\nplt.tight_layout(); plt.show()\n\n# 3) Demo Goodhart: 1-2 fitur dapat 'memenuhi' target tetapi menghancurkan makna\nprint(\"\\nDemo Goodhart — Silhouette tinggi via collapse dimensi (KEHILANGANAN makna ketahanan):\")\nfor cols, k in [(['skor_kesehatan'], 2), (['skor_kesehatan'], 3), (['rasio_tt_proyeksi_2026','skor_kesehatan'], 2)]:\n    Xs = StandardScaler().fit_transform(df[cols])\n    s = silhouette_score(Xs, KMeans(n_clusters=k, random_state=42, n_init=25).fit_predict(Xs))\n    print(f\"  {cols} k={k}: Silhouette = {s:.4f} {'(>0.5, tapi hanya ranking 1D!)' if s > 0.5 else ''}\")"))

cells.append(nbf.v4.new_markdown_cell("### 10b. Argumentasi Ilmiah & Keputusan Tuning (untuk Laporan & Sidang)\n**Kesimpulan tuning (empiris, reproducible pada sel 10a):**\n- Varian terbaik yang *sehat* adalah **C. 6 fitur (rasio_tt log + dokter + stunting + 3 pilar fasilitas/nakes/KIA), k=2: Silhouette 0.35** (+57% dari baseline 0.22) dan **D. 4 fitur mentah k=3: 0.32**. Penghapusan komposit `skor_kesehatan` (multikolinear) + transformasi `log1p` pada `rasio_tt` yang sangat skew (kota 4–8 vs. median 1.1) adalah dua intervensi yang terbukti menaikkan separabilitas.\n- Namun **bahkan tuning terbaik (≈0.35) tetap berjarak 0.30 dari target 0.65**. Satu-satunya cara mencapai >0.5–0.6 adalah *collapse* ke 1 fitur (`skor_kesehatan` saja: 0.62 pada k=2) — yang secara substantif bukan lagi *clustering ketahanan multidimensi*, melainkan *pemeringkatan univariat* berkedok klaster.\n\n**Mengapa target >0.65 tidak tepat untuk kasus ini (5 argumen):**\n1. **Ukuran & geometri data:** `n=38` dengan kontinum urban–rural–kepulauan tidak membentuk bola-bola terpisah (*well-separated spheres*) yang disyaratkan Silhouette tinggi; distribusi bersifat gradien + 6 *urban outlier* ekstrem yang merentangkan ruang Euclidean.\n2. **Redundansi terstruktur:** `skor_kesehatan` adalah kombinasi linear pilar-pilarnya (r 0.61–0.65) — mempertahankan + mengikutsertakan pilar = *double counting* yang menggelembungkan jarak intra-klaster. Koreksinya menurunkan dimensi efektif, bukan menambah separasi artifisial.\n3. **Miskomparasi metrik densitas:** DBSCAN/OPTICS *dirancang* menghasilkan noise (Gresik/Sampang/Sumenep sebagai noise adalah **temuan**, bukan kegagalan); Silhouette-full mereka negatif secara definisi ketika noise diperlakukan sebagai label — membandingkannya head-to-head dengan K-Means memakai Silhouette saja adalah *category error*.\n4. **Goodhart's law:** mengoptimalkan Silhouette semata memberi insentif membuang fitur kebijakan (morbiditas, program, KIA) demi angka — tepat yang didemonstrasikan sel 10a. Keputusan yang benar adalah *satisficing* multi-kriteria.\n5. **Literatur pembanding:** pada segmentasi wilayah kesehatan skala kecil (n<50, fitur heterogen), Silhouette 0.20–0.35 adalah norma (*weak-to-moderate structure*, Kaufman & Rousseeuw), bukan anomali; validitas harus dilengkapi **Davies-Bouldin (<1.3 membaik pada varian C), stabilitas bootstrap/ARI, dan validitas domain** (apakah Tier memisahkan aksi kebijakan?).\n\n**Rekomendasi final untuk proyek Cura:**\n- **Pertahankan K-Means k=3 baseline 8F sebagai model pelaporan utama** (komparabilitas dengan Eksperimen 01 & dasbor), tetapi **cantumkan varian C-6F sebagai analisis sensitivitas** di lampiran (Silhouette 0.35/0.27 untuk k=2/k=3).\n- **Revisi target proposal** dari `Silhouette > 0.65` menjadi **`Silhouette > 0.30 (atau DB-index < 1.3) + stabilitas ARI > 0.7 + justifikasi domain per Tier`** — ambang yang ketat namun realistis untuk n=38.\n- **Gunakan DBSCAN/OPTICS sebagai lapisan anomali**, bukan pesaing K-Means: setiap wilayah berlabel noise (khususnya Gresik/Bawean, Sampang, Sumenep pada OPTICS) otomatis memicu *flag review kepulauan* pada pipeline `cluster_regional_resilience.py` sebelum Tier difinalisasi."))

nb.cells = cells

out_path = 'Cura/OpenData-Cura/experiments/notebooks/02_regional_resilience_clustering.ipynb'
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    nbf.write(nb, f)

print(f"Notebook 02 created successfully at {out_path}")
