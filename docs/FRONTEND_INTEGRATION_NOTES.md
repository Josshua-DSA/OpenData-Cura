# 🎨 Panduan Integrasi Frontend (Frontend Handover & Data Contract)
# Proyek: Cura — HealthTrust Facilities Platform (Jawa Timur)
> **Dari:** Leandro Jovan Falviano (Machine Learning Engineer)  
> **Untuk:** Sovia Wahyuningtyas (Frontend Engineer) & Tim Pengembang  
> **Referensi UI:** [Figma Cura UI Design Dashboard](https://www.figma.com/design/YfUQqdB7cV5vRSyaHDx3O7/Cura-UI-Design-Dashboard?node-id=0-1&p=f&t=72xksOVZMOLaNuwx-0)  
> **Status:** Siap Digunakan untuk Slicing & Integrasi Data  

---

## 📌 Ringkasan Eksekutif (Overview)

Dokumen ini adalah **panduan kontrak data resmi** yang menghubungkan setiap frame antarmuka di Figma dengan:
1. **Dataset inferensial ML** (`database/exports/*.csv` dan `*.parquet`).
2. **Endpoint REST API Backend FastAPI** (`/api/v1/*`).
3. **Model Machine Learning Live / What-If Simulator** (`/api/v1/prediksi/*`).

Semua dataset telah dibersihkan (0 missing values, 38 Kab/Kota Jawa Timur terstandarisasi dengan `kode_bps` 4 digit resmi BPS).

---

## ⚠️ PANDUAN PENTING: Lokasi Data & FAQ Repositori untuk Frontend

> **CATATAN UNTUK SOVIA (Frontend Engineer):**  
> Jika Anda melihat struktur direktori atau file `.gitignore` dan bertanya:  
> *"Kenapa folder `database/logs/`, `database/raw/`, dan `data/pgdata/` tidak ada di repositori?"*

### ❓ FAQ: Mengapa 3 Folder Tersebut Tidak Ada di Git?
1. **`database/raw/` (Sengaja Diabaikan / .gitignore):**  
   Folder ini adalah *staging cache* sementara untuk menampung file mentah kotor hasil crawling/scraping dari SIRS Kemenkes sebelum dibersihkan. Sesuai *best practice* data engineering, file mentah kotor tidak pernah di-commit ke Git agar repo tidak membengkak. **Frontend tidak perlu dan dilarang menggunakan data mentah ini.**
2. **`data/pgdata/` (Sengaja Diabaikan / .gitignore):**  
   Folder ini adalah file biner fisik internal database PostgreSQL. Pada `docker-compose.yml`, data database dikelola otomatis oleh Docker melalui *Named Volume* (`pgdata`), bukan disimpan sebagai folder biasa di workspace. File biner database dilarang di-commit ke Git karena spesifik mesin OS dan rawan corrupt.
3. **`database/logs/` (Sengaja Diabaikan / .gitignore):**  
   Folder ini hanya berisi log teks eksekusi script lokal (`*.log`). Diabaikan oleh Git agar tim pengembang tidak saling bertabrakan (*git merge conflict*) setiap kali menjalankan skrip.

---

### 📍 Peta Akses: Mana yang Harus Dipakai vs Mana yang Tidak Perlu Disentuh

| Lokasi di Repositori | Status untuk Frontend | Fungsi & Cara Penggunaan |
|---|:---:|---|
| ✅ **`database/exports/`** | **SUMBER DATA STATIS UTAMA** | Berisi file dataset bersih (`.csv` dan `.parquet`) hasil kurasi dan output model ML. Bebas dicopy ke `frontend/public/data/` untuk bahan mock/slicing tanpa perlu menyalakan database. |
| ✅ **`database/seeds/jatim_districts.geojson`** | **SUMBER PETA SPASIAL** | File poligon batas wilayah resmi 38 Kabupaten/Kota se-Jawa Timur untuk dirender langsung di Leaflet.js / Mapbox pada halaman *Health Map*. |
| ✅ **REST API (`http://localhost:8000/api/v1/*`)** | **SUMBER DATA DINAMIS** | Endpoint FastAPI dari Joshua & Jovan untuk konsumsi live data via `fetch()` / `axios`. |
| ❌ `database/raw/`, `database/logs/`, `data/pgdata/` | **ABAIKAN (JANGAN DICARI)** | Khusus operasional internal pipeline backend & Docker engine. |

---

## 🗺️ 1. Pemetaan Komponen UI Figma ke Sumber Data

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        CURA DASHBOARD (FIGMA)                                          │
├─────────────────────┬──────────────────────────┬───────────────────────────────────────────────────────┤
│ Frame Figma         │ Komponen Visual          │ Sumber Data Lokal (database/exports/) & REST API      │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 1. Overview         │ • 4 Kartu KPI Utama      │ • database/exports/regional_health_index_scores.csv   │
│                     │ • Peta Mini Jatim        │ • database/exports/bed_demand_forecast_2026.csv       │
│                     │ • List Wilayah Prioritas │ • database/exports/disease_morbidity_trends.csv       │
│                     │ • Tren Penyakit Utama    │ • API: GET /api/v1/statistik/ringkasan                │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 2. Health Map       │ • Choropleth 38 Wilayah  │ • database/seeds/jatim_districts.geojson              │
│                     │ • Switcher Layer Peta    │ • database/exports/regional_vulnerability_predictions.*│
│                     │ • Legend Baku WHO        │ • database/exports/regional_clusters.csv              │
│                     │                          │ • API: GET /api/v1/wilayah/choropleth                 │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 3. Compare Region   │ • Dropdown Pilih 2 Kabko │ • database/exports/regional_health_index_scores.csv   │
│                     │ • Bar Chart 5 Pilar      │   (Kolom: pilar_fasilitas, nakes, kia,                │
│                     │ • Kartu Selisih Metrik   │    morbiditas, program)                               │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 4. Program          │ • Tabel Rekomendasi Aksi │ • database/exports/regional_program_recommendations.csv│
│    Recommendation   │ • Badge Tingkat Urgensi  │   (38 Kab/Kota lengkap dengan aksi,                   │
│                     │ • Filter Status          │    target capaian, & program resmi Jatim)             │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 5. Disease & KIA    │ • Tren 10 Penyakit Utama │ • database/exports/disease_morbidity_trends.csv       │
│                     │ • KPI Stunting & KIA     │ • database/exports/indicators_jatim.csv               │
│                     │                          │ • API: GET /api/v1/penyakit/tren                      │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 6. What-If ML Sim   │ • Form Slider Parameter  │ • POST /api/v1/prediksi/klb                           │
│    (Interactive)    │ • Gauge Risiko & SHAP    │ • POST /api/v1/prediksi/bor                           │
├─────────────────────┼──────────────────────────┼───────────────────────────────────────────────────────┤
│ 7. AI Insight       │ • Chatbot Analitik       │ • POST /api/v1/ask                                    │
│                     │                          │ • database/exports/bayesian_top_risk_per_region.csv   │
└─────────────────────┴──────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 💻 2. Panduan Integrasi Detail per Halaman Figma

---

### A. Halaman: Overview (Ringkasan Kesehatan Jawa Timur)

#### 1. Kartu KPI Utama (Top Metric Cards)
Di bagian atas terdapat 4 kartu statistik ringkasan:
* **Kartu 1: Total Fasilitas Kesehatan**
  - **Nilai:** `1.424 Faskes` (447 RS + 977 Puskesmas).
  - **Sumber:** `hospitals_clean.csv` + `puskesmas_clean.csv` atau `GET /api/v1/statistik/ringkasan`.
* **Kartu 2: Rasio Tempat Tidur Provinsi (Bed Ratio)**
  - **Nilai:** `0.94` (Target WHO: $\ge 1.0$ per 1.000 penduduk).
  - **Sub-teks / Warna:** Kuning (Defisit Ringan terhadap standar WHO).
  - **Sumber:** `bed_demand_forecast_2026.csv` kolom `rasio_tt_resmi`.
* **Kartu 3: Wilayah Prioritas Intervensi**
  - **Nilai:** `8 Kabupaten/Kota` (Wilayah berstatus Kritis / Merah).
  - **Sumber:** `regional_health_index_scores.csv` filter `warna_indikator == 'merah'`.
* **Kartu 4: Rata-Rata Prevalensi Stunting**
  - **Nilai:** `18.7%` (Tren penurunan Jawa Timur).
  - **Sumber:** `ml_readiness_dataset.csv` kolom `prevalensi_stunting`.

#### 2. Widget Peta Mini & Kabupaten Prioritas
* **Tampilan:** Peta mini Jawa Timur dan panel daftar wilayah ranking terbawah.
* **Data List Prioritas:** Urutkan `regional_health_index_scores.csv` berdasarkan kolom `rank_provinsi` secara *descending* (ranking 31–38):
  1. Kab. Sampang (Skor: 31.2, Rank: 38)
  2. Kab. Bangkalan (Skor: 33.4, Rank: 37)
  3. Kab. Probolinggo (Skor: 35.1, Rank: 36)
  4. Kab. Bondowoso (Skor: 36.8, Rank: 35)

---

### B. Halaman: Health Map (Peta Spasial Geospasial)

#### 1. Base Layer & GeoJSON
* **Sumber Batas Poligon:** `database/seeds/jatim_districts.geojson` atau endpoint `GET /api/v1/wilayah/choropleth/geojson`.
* **Join Key:** Kolom `kode_bps` (contoh: `"3501"` untuk Pacitan, `"3578"` untuk Kota Surabaya).

#### 2. Standar Palet Warna Resmi (Sesuai Proposal & WHO)
Terapkan kode warna hex berikut pada layer choropleth:

```javascript
// Standar Palet Warna Status Ketahanan Faskes
function getColorByStatus(status) {
  switch (status.toLowerCase()) {
    case 'hijau':
    case 'aman':
    case 'tangguh':
      return '#10B981'; // Emerald Green
    case 'kuning':
    case 'waspada':
    case 'moderat':
      return '#F59E0B'; // Amber / Yellow
    case 'merah':
    case 'kritis':
    case 'defisit':
      return '#EF4444'; // Red
    default:
      return '#94A3B8'; // Slate Gray
  }
}
```

#### 3. Tiga Mode Layer Choropleth (Switcher Dropdown di Peta)
1. **Mode 1: Skor Kesehatan Terpadu (Health Index 0–100)**
   - Property: `skor_kesehatan` dari `regional_health_index_scores.csv`.
   - Klasifikasi: $\ge 60$ (Hijau), $45 - 59.9$ (Kuning), $< 45$ (Merah).
2. **Mode 2: Rasio Tempat Tidur Standar WHO (2026)**
   - Property: `rasio_tt_proyeksi_2026` dari `bed_demand_forecast_2026.csv`.
   - Klasifikasi: $\ge 1.0$ (Hijau - Aman), $0.7 - 0.99$ (Kuning - Waspada), $< 0.7$ (Merah - Defisit Kritis).
3. **Mode 3: Klaster Resiliensi Wilayah**
   - Property: `cluster_tier` dari `regional_clusters.csv`.
   - Klasifikasi: Tier 1 (Mandiri & Tangguh), Tier 2 (Berkembang & Moderat), Tier 3 (Rentan & Defisit).

#### 4. Tooltip / Popup Saat Poligon Wilayah Diklik
Tampilkan informasi ringkas:
```html
<div class="popup-card">
  <h4>${nama_wilayah}</h4>
  <p><b>Skor Kesehatan:</b> ${skor_kesehatan} / 100 (${kategori_status})</p>
  <p><b>Rasio Bed (WHO):</b> ${rasio_tt_proyeksi_2026} per 1.000 penduduk</p>
  <p><b>Status Defisit Bed:</b> ${gap_tt_terhadap_who > 0 ? '+' : ''}${gap_tt_terhadap_who} Bed</p>
  <p><b>Prevalensi Stunting:</b> ${prevalensi_stunting}%</p>
</div>
```

---

### C. Halaman: Compare Region (Komparasi Antar-Wilayah)

#### 1. Kontrol Input
* Dua input dropdown selector: **Wilayah A** (default: `Kota Surabaya`) vs **Wilayah B** (default: `Kabupaten Sampang`).

#### 2. Grouped Bar Chart / Radar Chart (5 Pilar Kesehatan)
Gunakan library chart pilihan Anda (ECharts / Chart.js / Recharts). Ambil data dari `regional_health_index_scores.csv` berdasarkan `kode_bps`:

```javascript
// Contoh struktur data untuk chart 5 pilar
const compareData = {
  categories: [
    'Kapasitas Fasilitas',
    'Tenaga Medis',
    'Kesehatan Ibu & Anak',
    'Kendalikan Morbiditas',
    'Cakupan Program'
  ],
  series: [
    {
      name: 'Kota Surabaya',
      data: [
        regionA.pilar_fasilitas,  // misal 88.4
        regionA.pilar_nakes,      // misal 92.1
        regionA.pilar_kia,        // misal 85.0
        regionA.pilar_morbiditas, // misal 78.3
        regionA.pilar_program     // misal 89.5
      ]
    },
    {
      name: 'Kabupaten Sampang',
      data: [
        regionB.pilar_fasilitas,  // misal 22.1
        regionB.pilar_nakes,      // misal 18.4
        regionB.pilar_kia,        // misal 35.2
        regionB.pilar_morbiditas, // misal 41.0
        regionB.pilar_program     // misal 38.6
      ]
    }
  ]
};
```

---

### D. Halaman: Program Recommendation (Rekomendasi Intervensi)

Ini adalah halaman tabel inti hasil pemodelan prescriptive ML.
* **Sumber Data:** `database/exports/regional_program_recommendations.csv` atau `.parquet` (38 baris data).
* **Kolom Tabel & Pemetaan Tampilan:**

| Header Tabel di UI | Key di CSV / JSON | Tipe Tampilan di UI | Contoh Data |
|---|---|---|---|
| **Kabupaten / Kota** | `nama_wilayah` | Teks tebal + BPS code | `Kabupaten Malang (3507)` |
| **Skor & Rank** | `skor_kesehatan` & `rank_provinsi` | Badge Skor + Rank | `37.2 (Rank #34)` |
| **Status Urgensi** | `tingkat_urgensi` | Badge Warna: Merah (`Tinggi`), Kuning (`Sedang`), Hijau (`Rendah`) | `<Badge color="red">Tinggi</Badge>` |
| **Defisit / Masalah Utama** | `masalah_utama` | Teks ringkasan masalah | `Ketersediaan Tenaga Kesehatan (Skor: 11.9)` |
| **Program Rekomendasi Jatim** | `program_rekomendasi_jatim` | Teks nama program kerja resmi | `Program Distribusi Merata Dokter Spesialis & Insentif Nakes` |
| **Tindakan Lapangan** | `rekomendasi_tindakan` | Teks aksi operasional | `Mobilisasi dokter residen/spesialis dan pemenuhan bidan desa.` |
| **Target Capaian** | `target_capaian` | Teks target indikator | `Rasio dokter minimal 1 per 1.000 penduduk.` |
| **Status Pelaksanaan** | `status_pelaksanaan` | Badge Status | `Diusulkan untuk TA 2026` |

* **Fitur Filter di Atas Tabel:**
  - Filter Urgensi: *All*, *Tinggi*, *Sedang*, *Rendah*.
  - Search box: Pencarian nama wilayah.

---

### E. Widget Interaktif: What-If ML Simulator (Live Inferensi)

Untuk membuat dasbor interaktif yang mendemonstrasikan keunggulan machine learning secara langsung kepada dosen penguji, buatkan widget form simulasi yang memanggil API ML.

#### 1. Simulasi Risiko Kejadian Luar Biasa (KLB)
* **Endpoint:** `POST /api/v1/prediksi/klb`
* **Payload Request:**
  ```json
  {
    "jenis_penyakit": "DBD",
    "kasus_minggu_ini": 25,
    "kasus_minggu_lalu": 10,
    "curah_hujan_mm": 220.0,
    "suhu_rata_rata": 28.0,
    "kepadatan_penduduk": 850.0,
    "cakupan_imunisasi_pct": 82.0,
    "sanitasi_layak_pct": 75.0
  }
  ```
* **Contoh Response:**
  ```json
  {
    "success": true,
    "data": {
      "model_name": "predict_klb_risk",
      "version": "v1.1.0-prod",
      "prediction_value": 0.842,
      "risk_level": "WASPADA KLB (TINGGI)",
      "confidence_interval": {
        "lower_bound": 0.762,
        "upper_bound": 0.922
      },
      "top_features": [
        {"feature": "kasus_minggu_ini", "importance_score": 0.38},
        {"feature": "curah_hujan_mm", "importance_score": 0.29},
        {"feature": "kepadatan_penduduk", "importance_score": 0.18}
      ],
      "latency_ms": 12.4
    }
  }
  ```
* **Rekomendasi UI:** Tampilkan *Gauge Meter* (0% - 100%) dengan warna dinamis dan *horizontal bar* kecil untuk `top_features` (explainability SHAP).

#### 2. Simulasi Proyeksi Keterisian Tempat Tidur (BOR Forecast)
* **Endpoint:** `POST /api/v1/prediksi/bor`
* **Payload Request:**
  ```json
  {
    "bor_saat_ini": 78.5,
    "total_tempat_tidur": 300,
    "tren_kunjungan_harian": [72.0, 74.0, 75.5, 77.0, 78.5],
    "horizon_hari": 14
  }
  ```
* **Response `risk_level`:**
  - $\ge 85\%$: Badge Merah (**KRITIS OVERLOAD**)
  - $75\% - 84\%$: Badge Kuning (**WASPADA KAPASITAS**)
  - $60\% - 74\%$: Badge Hijau (**IDEAL / NORMAL**)
  - $< 60\%$: Badge Abu-abu (**UNDERUTILIZED**)

---

### F. Halaman: AI Insight (Chatbot Analitik)

* **Endpoint:** `POST /api/v1/ask`
* **Payload Request:**
  ```json
  {
    "query": "Wilayah mana yang paling rentan mengalami krisis ranjang jika DBD melonjak?",
    "kode_bps": "3578" // Opsional jika konteks wilayah spesifik
  }
  ```
* **Response:** Backend akan merespons pesan teks analitik berbasis data Bayesian dan matriks klaster ketahanan yang sudah disiapkan di feature store.

---

## 🚀 3. Opsi Konsumsi Data untuk Frontend

Sovia memiliki **2 pilihan fleksibel** untuk mengonsumsi data saat mendevelop frontend:

### Opsi 1: Konsumsi Langsung REST API (Rekomendasi Utama)
Jika backend FastAPI berjalan di `http://localhost:8000`:
- Gunakan Axios / Fetch untuk memanggil endpoint `/api/v1/*`.
- Memungkinkan data selalu ter-update jika database PostGIS melakukan sinkronisasi ulang.

### Opsi 2: Konsumsi File Statis CSV / JSON (Offline Mocking / Cepat)
Jika backend sedang belum aktif di laptop Sovia:
- Salin file dari `database/exports/*.csv` ke folder `frontend/public/data/`.
- Gunakan library seperti `d3-dsv` atau `papaparse` untuk membaca CSV langsung di browser.
- Semua file CSV sudah tervalidasi 0 null, sehingga tidak akan memicu error `undefined` pada properti objek!

---

## ✅ Checklist Kesiapan Frontend

- [ ] Import Google Font (Inter / Outfit) & Leaflet CSS di `index.html`.
- [ ] Buat reusable component `KPICard`, `BadgeStatus`, `ChoroplethMap`, dan `DataTable`.
- [ ] Pasang palet warna standar WHO (`#10B981`, `#F59E0B`, `#EF4444`).
- [ ] Hubungkan form slider dengan endpoint `/api/v1/prediksi/klb` untuk demo interaktif.
- [ ] Tampilkan 38 baris rekomendasi di halaman *Program Recommendation*.

---
*Dokumen ini disusun oleh Leandro Jovan Falviano (ML Engineer) untuk mendukung akselerasi frontend slicing tim Cura HealthTrust.*
