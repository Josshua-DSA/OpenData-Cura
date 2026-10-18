# 📝 Catatan Integrasi Backend (Backend Handover Notes)
# Proyek: Cura — HealthTrust Facilities Platform
> **Dari:** Leandro Jovan Falviano (Machine Learning Engineer)  
> **Untuk:** Joshua Remedial Syeba (Lead Database & Backend Engineer) & Tim Pengembang  
> **Branch Git:** `JovanML`  
> **Status:** Siap Integrasi & Review Pull Request  

---

## 📌 Ringkasan Pembaruan (Executive Summary)

Pekerjaan pada layer Machine Learning telah menyelesaikan seluruh metodologi dan algoritma yang dirancang pada Proposal Proyek (Halaman 6–9). Update ini mencakup:
1. **Penggantian dummy mock model** di `ml/artifacts/` dengan model machine learning terlatih nyata, tervalidasi SHA-256, dan hemat memori (kompatibel penuh dengan lean VPS 1 GB RAM).
2. **Write-back dataset inferensial analitik** ke `database/exports/` dalam format ganda (`.csv` dan `.parquet`) untuk kebutuhan seeding database PostGIS dan konsumsi REST API.
3. **Penyediaan skrip retraining deterministik** yang dapat dijalankan secara otomatis saat pipeline data ETL diperbarui.

---

## 🤖 1. Spesifikasi Model Production (`ml/artifacts/`)

Kedua model aktif di bawah telah sesuai dengan kontrak Pydantic pada `backend/app/schemas/prediksi.py` dan dimuat otomatis oleh `MLArtifactService` saat startup atau melalui endpoint reload.

### A. Model Deteksi Dini Risiko KLB (`predict_klb_risk`)
* **File:** `ml/artifacts/predict_klb_risk.joblib` & `predict_klb_risk.meta.json`
* **Algoritma:** `LogisticRegression-Calibrated`
* **Metrik Evaluasi:**
  - Accuracy: `93.4%`
  - F1-Score: `0.921`
  - ROC-AUC: `0.985`
* **Checksum SHA-256:** `68fbfeaf3e8c514fd3f27203fc92cced7ae260808989404eb2e0a5310908c9d0`
* **Endpoint Konsumen:** `POST /api/v1/prediksi/klb`
* **Fitur Input yang Dibutuhkan:**
  ```json
  {
    "kasus_minggu_ini": 25,
    "kasus_minggu_lalu": 10,
    "curah_hujan_mm": 220.0,
    "suhu_rata_rata": 27.5,
    "kepadatan_penduduk": 850.0,
    "cakupan_imunisasi_pct": 85.0,
    "sanitasi_layak_pct": 78.0
  }
  ```
* **Interpretasi Output:**
  - `prediction_value`: Probabilitas risiko terjadinya KLB ($0.0 - 1.0$).
  - `risk_level`:
    - $\ge 0.75$: **WASPADA KLB (TINGGI)**
    - $0.50 - 0.74$: **WASPADA (SEDANG)**
    - $0.30 - 0.49$: **PERHATIAN (MODERAT)**
    - $< 0.30$: **TERKENDALI (RENDAH)**
  - `top_features`: Atribusi feature importance (offline SHAP) terurut.

---

### B. Model Proyeksi Keterisian Tempat Tidur (`forecast_bor`)
* **File:** `ml/artifacts/forecast_bor.joblib` & `forecast_bor.meta.json`
* **Algoritma:** `RidgeRegression-Compact`
* **Metrik Evaluasi:**
  - $R^2$ Score: `0.960`
  - Mean Absolute Error (MAE): `1.87%`
  - Root Mean Squared Error (RMSE): `2.35%`
* **Checksum SHA-256:** `8cf5cc80ce53edfb626ad7a7215983ff0ddd49ffebf45f8584b6fb73018ced1b`
* **Endpoint Konsumen:** `POST /api/v1/prediksi/bor`
* **Fitur Input yang Dibutuhkan:**
  ```json
  {
    "bor_saat_ini": 72.5,
    "total_tempat_tidur": 250,
    "tren_kunjungan_harian": [70.0, 71.0, 71.5, 72.0, 72.5],
    "horizon_hari": 14
  }
  ```
* **Interpretasi Output:**
  - `prediction_value`: Proyeksi persentase BOR faskes pada horizon target.
  - `risk_level`:
    - $\ge 85\%$: **KRITIS OVERLOAD (BOR >= 85%)**
    - $75\% - 84\%$: **WASPADA KAPASITAS (BOR 75-84%)**
    - $60\% - 74\%$: **IDEAL / NORMAL (BOR 60-74%)**
    - $< 60\%$: **UNDERUTILIZED (BOR < 60%)**

---

### C. Cara Hot Reload Model Tanpa Restart Server
Jika Anda mengganti file di `ml/artifacts/`, panggil endpoint admin berikut:
```http
POST /api/v1/prediksi/reload
```
Service akan memverifikasi checksum SHA-256 dan memuat ulang objek `.joblib` ke dalam memory state secara atomik.

---

## 📊 2. Dataset Inferensial Baru di `database/exports/`

Seluruh hasil komputasi analitik telah diekspor dalam format `.csv` dan `.parquet` siap pakai (0 null, kode BPS terstandarisasi):

| Nama File (`.csv` & `.parquet`) | Dimensi | Deskripsi & Kegunaan untuk Backend/Frontend | Rekomendasi Endpoint / Penggunaan |
|---|---|---|---|
| **`regional_clusters`** | 38 baris | Hasil klastering ketahanan faskes (K-Means k=3, Agglomerative, DBSCAN). Memuat Tier resiliensi (Tinggi / Moderat / Rentan). | Disarankan dibuat endpoint `GET /api/v1/wilayah/clusters` atau digabung ke view GeoJSON choropleth. |
| **`regional_health_index_scores`** | 38 baris | Skor komposit kesehatan (0–100) dan breakdown 5 pilar (Fasilitas, Nakes, KIA, Morbiditas, Program). | Disajikan pada kartu statistik ringkasan wilayah di frontend atau query komparasi. |
| **`bed_demand_forecast_2026`** | 38 baris | Proyeksi kebutuhan tempat tidur 2026, gap terhadap standar WHO, dan rekomendasi penambahan kapasitas. | Digunakan untuk layer choropleth kebutuhan ranjang 2026 dan peringatan dini defisit. |
| **`bayesian_top_risk_per_region`** | 38 baris | Top penyakit dengan probabilitas posterior lonjakan defisit faskes tertinggi per Kab/Kota. | Sangat cocok diinjeksi ke endpoint `/api/v1/ask` (AI Context) dan modul early warning. |
| **`bayesian_vulnerability_risk`** | 380 baris | Matriks lengkap probabilitas Bayesian $P(W_j \mid D_i)$ untuk 38 Kab/Kota $\times$ 10 Penyakit. | Query detail risiko penyakit tertentu pada halaman wilayah faskes. |
| **`regional_vulnerability_predictions`** | 38 baris | Klasifikasi status kerentanan supervised (Aman, Waspada, Kritis) + probabilitas kelas. | Digunakan untuk badge status faskes wilayah dan pemicu alert level. |
| **`regional_program_recommendations`** | 38 baris | Aksi intervensi program spesifik berdasarkan pilar defisit terbesar tiap daerah. | Ditampilkan pada tab rekomendasi kebijakan / download laporan eksekutif. |

---

## 🔄 3. Skrip Retraining Mandiri (Automated Pipeline)

Jika database diperbarui dengan data triwulan terbaru, model machine learning dapat dilatih ulang dengan satu perintah:

```bash
python experiments/scripts/train_production_artifacts.py
```

Skrip ini akan secara otomatis:
1. Membaca data terbaru dari `database/exports/`.
2. Melatih ulang model regresi & klasifikasi.
3. Menyimpan file model `.joblib` baru.
4. Menghitung checksum SHA-256 baru dan memperbarui file `.meta.json`.

---

## 💡 4. Saran Tambahan untuk Backend

1. **Seeding ke PostgreSQL:**
   Jika ingin membuat tabel baru untuk data ini di PostGIS, kolom `kode_bps` (VARCHAR 4) dapat dijadikan Foreign Key ke tabel referensi `ref_wilayah_jatim`.
2. **Context Enrichment AI Insight (`/api/v1/ask`):**
   Tambahkan data dari `bayesian_top_risk_per_region` dan `regional_clusters` ke dalam prompt context builder agar jawaban bot analitik lebih kaya dan kontekstual.
3. **Pull Request:**
   Semua perubahan ini berada di branch `JovanML` dan siap dilakukan *merge/PR* ke branch `main`.

---
*Dibuat oleh Leandro Jovan Falviano (ML Engineer) — Proyek Cura HealthTrust.*
