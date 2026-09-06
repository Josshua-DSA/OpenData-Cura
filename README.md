# 🏥 Cura — HealthTrust Facilities Platform (Jawa Timur)

[![CI Pipeline](https://github.com/Josshua-DSA/Cura-Healthtrust/actions/workflows/ci.yml/badge.svg)](https://github.com/Josshua-DSA/Cura-Healthtrust/actions/workflows/ci.yml)
[![PostGIS](https://img.shields.io/badge/Database-PostgreSQL%2015%20%2B%20PostGIS%203.3-336791.svg?logo=postgresql&logoColor=white)](https://postgis.net/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Cura — HealthTrust Platform** adalah platform analitik dan visualisasi geospasial kesehatan terpadu untuk Provinsi Jawa Timur. Platform ini menggabungkan kapasitas faskes (RS & Puskesmas), tenaga medis (dokter & perawat), tren beban pasien & morbiditas penyakit triwulanan, serta indikator kesehatan ibu & anak (KIA/stunting) guna mendukung pengambilan keputusan kebijakan kesehatan berbasis data riil dan proyeksi machine learning.

---

## 👥 Tim Pengembang & Kontributor
Proyek ini dikembangkan secara kolaboratif oleh tim lintas disiplin:

| Nama / Akun | Peran & Tanggung Jawab | Lingkup Utama |
|---|---|---|
| **Joshua-DSA** | **Lead Database & Backend Engineer** | Arsitektur PostgreSQL 15 + PostGIS 3.3, pipeline ETL/ingestion, query spasial (`ST_DWithin`), membangun CI github Actions dan core REST API FastAPI. |
| **Jovan** | **Machine Learning Engineer** | Pemodelan prediktif, feature store (`ml_readiness_dataset`), forecasting kebutuhan tempat tidur, dan risk clustering wilayah. |
| **Sovia** | **Frontend Engineer** | Pembangunan antarmuka web, integrasi peta interaktif Leaflet.js, visualisasi ECharts, dan katalog faskes. |
| **Dave** | **DevOps & CI/CD Engineer** | Otomatisasi pipeline testing (GitHub Actions), kontainerisasi Docker/Compose, dan manajemen reliabilitas sistem. |

---

## 📑 Daftar Isi
1. [Gambaran Aplikasi & Visi Sistem](#-gambaran-aplikasi--visi-sistem)
2. [Fitur Web yang Dibangun](#-fitur-web-yang-dibangun)
3. [Arsitektur 4 Blok Monitoring](#-arsitektur-4-blok-monitoring)
4. [Dataset & Data Freshness](#-dataset--data-freshness)
5. [Struktur Repositori](#-struktur-repositori)
6. [Panduan Menjalankan Sistem (Quick Start)](#-panduan-menjalankan-sistem-quick-start)
7. [Quality Gates & Automated CI](#-quality-gates--automated-ci)
8. [Lisensi & Kontribusi](#-lisensi--kontribusi)

---

## 🎯 Gambaran Aplikasi & Visi Sistem

Cura dibangun bukan sekadar sebagai katalog rumah sakit, melainkan **Read-First Health Monitoring Platform** lintas sektor di Jawa Timur yang menyajikan:
1. **Peta Ketahanan Faskes**: Visualisasi spasial ketimpangan akses faskes dan ranjang rawat inap standar WHO.
2. **Kesiapsiagaan SDM & Beban Penyakit**: Pemantauan ketersediaan tenaga medis terhadap lonjakan tren 10 penyakit rawat inap/jalan.
3. **Peringatan Dini & Prediksi Cerdas**: Notifikasi otomatis saat suatu wilayah mengalami krisis kapasitas ranjang atau lonjakan wabah penyakit.

---

## 🌐 Fitur Web & Status Implementasi

> ⚠️ **Status jujur per komponen.** Layer **data & API backend sudah berfungsi penuh** (41 data tests + 7 API tests, semuanya green di CI). Layer **frontend dan ML masih dalam perencanaan** — belum ada baris kode UI (`frontend/` berisi placeholder) dan belum ada model ML terlatih (`experiments/` berisi placeholder). Deskripsi di bawah memisahkan **yang sudah ada** (✅) dari **yang direncanakan** (🚧).

### A. Sudah Ada Sekarang (✅)

**REST API Backend (FastAPI)** — endpoint live, terdokumentasi di `/docs`:
- 🏢 `GET /api/v1/faskes` — katalog 447 RS + 977 Puskesmas, filter multi-kriteria, radius search `ST_DWithin`.
- 🗺️ `GET /api/v1/wilayah` + `GET /api/v1/wilayah/choropleth` — GeoJSON 38 kab/kota + rasio TT & proyeksi 2026.
- 🩺 `GET /api/v1/penyakit/*` — tren 10 penyakit terbanyak triwulanan & morbiditas.
- 👶 `GET /api/v1/kia/*` — AKI/AKB/stunting/imunisasi per wilayah.
- 👨‍⚕️ `GET /api/v1/sdm/*` — sebaran tenaga medis per wilayah.
- 🚨 `GET /api/v1/decision/*` — rule ambang batas & event early-warning (tabel + CLI `evaluate-alerts`; **tanpa notifier email/webhook**).
- 📥 `GET /api/v1/katalog` — metadata + unduh dataset bersih `.csv`/`.parquet`.

**Early Warning Engine (data layer)** — `alert_rules`, `alert_events`, dan CLI `evaluate-alerts` menghasilkan `active_alerts` dari rasio TT, lonjakan kasus, dan stunting. **Belum ada notifikasi push** (harus di-poll).

### B. Direncanakan (🚧 — belum ada kode)

**Portal Publik (HTML/CSS/JS + Leaflet + ECharts)** — `/faskes`, `/map`, `/penyakit`, `/kia`, `/wilayah`, `/ask`, `/katalog`. Saat ini `frontend/` berisi placeholder `.gitkeep`.

**Dashboard Manajemen (Next.js + login JWT)** — belum dibangun.

**Machine Learning**:
- *Bed Demand Forecasting* — `ml_readiness_dataset.parquet` (feature store 38×30) **sudah tersedia** sebagai input, tetapi **model belum dilatih** (`experiments/notebooks/` kosong).
- *Healthcare Disparity Clustering* — direncanakan, belum ada.

**AI Insight (`/ask`)** — endpoint ada, tetapi jawabannya dihasilkan oleh **template string + agregat DB**, bukan LLM. Integrasi LLM (mis. Anthropic) direncanakan; `ANTHROPIC_API_KEY` sudah dideklarasikan di config tapi belum dipakai.

**Executive Report Generator (PDF/Excel)** — direncanakan, belum ada endpoint/dependensi PDF.

---

## 🏗️ Arsitektur 4 Blok Monitoring

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        CURA HEALTH MONITORING PLATFORM                           │
├────────────────────────┬────────────────────────┬────────────────────────────────┤
│ 1. FASILITAS & BED     │ 2. SDM & TENAGA MEDIS  │ 3. PASIEN & PENYAKIT           │
│ ├─ 447 Rumah Sakit     │ ├─ Dokter Umum         │ ├─ 10 Penyakit Terbanyak       │
│ ├─ 977 Puskesmas       │ ├─ Dokter Spesialis    │ ├─ Kasus Menular (TB/DBD)      │
│ └─ 62.546 Tempat Tidur │ └─ Perawat & Bidan     │ └─ KIA, Stunting, AKI/AKB      │
├────────────────────────┴────────────────────────┴────────────────────────────────┤
│ 4. EARLY WARNING & ML DECISION SUPPORT                                           │
│ ├─ Sistem Deteksi Anomali Rasio Bed & Outbreak Penyakit                          │
│ ├─ Model Prediksi Kebutuhan Ranjang (Forecasting) & Klastering Risiko            │
│ └─ PostGIS Spatial Engine (Sub-10ms Radius Search & Precomputed Views)           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Dataset & Data Freshness

Sistem menerapkan strategi *multi-cadence ingestion* untuk menjaga kesegaran data:

| Entitas Data | Volume Data | Status Periode | Sumber Resmi |
|---|---|---|---|
| **Fasilitas Rumah Sakit** | 447 Faskes | `2026-LIVE` | SIRS Kemenkes (termasuk RS baru aktif) |
| **Puskesmas Jatim** | 977 Puskesmas | `2024-OFFICIAL` | Open Data Pemprov Jatim / Dinkes |
| **Kapasitas Bed & Rasio** | 38 Kab/Kota | `2026-PROJECTION` | Kemenkes (62.546 Bed) + Proyeksi BPS Jatim 2026 |
| **SDM Tenaga Medis** | 38 Kab/Kota | `2024-OFFICIAL` | Profil Kesehatan Dinkes Jatim |
| **Morbiditas Penyakit** | Triwulanan | `2024-2026` | CKAN Data Kab/Kota (Blitar, Bangkalan, dll) |
| **Kesehatan Ibu & Anak** | 38 Kab/Kota | `2024-OFFICIAL` | Dinas Kesehatan Provinsi Jatim |
| **Polygon Batas Wilayah** | 38 Wilayah | `EPSG:4326` | BPS / Geospatial Repository |

*Seluruh dataset bersih tersedia dalam format `.parquet` dan `.csv` di direktori `database/exports/`.*

---

## 📁 Struktur Repositori

```text
HealthTrust/
├── .github/workflows/          # CI Pipeline GitHub Actions (PostGIS service + pytest)
├── backend/                    # Core REST API FastAPI
│   ├── app/
│   │   ├── api/v1/endpoints/   # Routers: faskes, wilayah, nakes, penyakit, kia, ask
│   │   ├── core/               # Konfigurasi database pool asyncpg & JWT
│   │   ├── models/             # ORM SQLAlchemy PostgreSQL & GeoAlchemy2
│   │   ├── repositories/       # Abstraksi database query
│   │   ├── schemas/            # Validasi Pydantic v2
│   │   └── services/           # Business logic & query spasial
│   ├── requirements.txt        # Dependensi layer API
│   └── tests/                  # Test suite endpoint REST & spatial queries
├── database/                   # Layer Data Engineering & Database PostGIS
│   ├── cli.py                  # CLI Master Runner data pipeline
│   ├── config/                 # Konfigurasi sources & connection settings
│   ├── exports/                # File dataset bersih (.parquet & .csv)
│   ├── pipeline/               # Modul crawler, cleaner, geocoder, storage
│   ├── seeds/                  # Seed statis GeoJSON 38 wilayah & kode BPS
│   ├── tests/                  # Test suite data quality gates (41 tests)
│   ├── README.md               # [PANDUAN KOLABORASI] Khusus tim Data, ML, & Backend
│   └── DATA_DICTIONARY.md      # Kamus data komprehensif & resep kode query
├── experiments/                # Sandbox riset dan eksplorasi data science
│   └── notebooks/              # Jupyter Notebooks untuk pelatihan model ML
├── frontend/                   # UI Web Platform (Public & Dashboard)
├── docker-compose.yml          # Container PostgreSQL 15 + PostGIS 3.3 (Port 5433)
├── README.md                   # Dokumentasi utama produk & aplikasi
└── .gitignore                  # Filter hygiene git
```

---

## 🚀 Panduan Menjalankan Sistem (Quick Start)

### 1. Setup Lingkungan & Database
```bash
# Clone repository
git clone https://github.com/Josshua-DSA/Cura-Healthtrust.git
cd Cura-Healthtrust

# Buat virtual environment Python
python3 -m venv .venv
source .venv/bin/activate
pip install -r database/requirements.txt
pip install -r backend/requirements.txt

# Jalankan database PostGIS & Adminer via Docker
docker-compose up -d
```
* **PostGIS Database**: Aktif di `localhost:5433` (`cura_db`).
* **Adminer Web GUI**: Aktif di `http://localhost:8080`.

### 2. Inisialisasi Database & Seeding Data
```bash
# Inisialisasi skema tabel PostGIS, index GIST/GIN, dan Spatial Views
PYTHONPATH=database python database/cli.py init-db

# Seeding data referensi & seluruh domain (idempoten, aman diulang)
PYTHONPATH=database python database/cli.py seed-wilayah
PYTHONPATH=database python database/cli.py seed-references
PYTHONPATH=database python database/cli.py seed-puskesmas
PYTHONPATH=database python database/cli.py seed-workforce
PYTHONPATH=database python database/cli.py seed-morbidity
PYTHONPATH=database python database/cli.py seed-kia
PYTHONPATH=database python database/cli.py seed-surveillance
PYTHONPATH=database python database/cli.py seed-alert-rules

# Atau jalankan pipeline ETL end-to-end (ingest → clean → load semua domain)
PYTHONPATH=database python database/cli.py run-etl
```

> Migrasi skema dikelola **Alembic** (`alembic upgrade head`). Untuk database yang sudah ada, tandai baseline sekali dengan `alembic stamp head`.

### 3. Menjalankan Backend API
```bash
# Jalankan server FastAPI
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **Swagger API Documentation**: Buka `http://localhost:8000/docs` di browser.

### 4. Menjalankan Verifikasi Testing
```bash
# Eksekusi seluruh 48 unit tests (Database Quality Gates + API Endpoints)
PYTHONPATH=. pytest database/tests backend/tests -v
```

---

## 🛡️ Quality Gates & Automated CI

Setiap perubahan kode diverifikasi otomatis oleh GitHub Actions CI yang menjalankan **48 Unit Tests**:
1. **Data Quality Tests (41 Tests)**: Memvalidasi eliminasi koordinat dummy, auto-swap koordinat terbalik, bounding box spasial Jatim (mencakup Bawean & Kangean), normalisasi teks, integritas relasi foreign key, serta dataset ML Readiness.
2. **Backend API Tests (7 Tests)**: Memvalidasi ketersediaan endpoint kesehatan, response choropleth GeoJSON, query radius spasial PostGIS (`ST_DWithin`), dan endpoint AI Insight.

---

## 📖 Panduan Lanjutan untuk Kolaborator
* **Kolaborasi Tim (Data Analyst, ML Engineer, Backend, Frontend)**: Silakan baca [**`database/README.md`**](database/README.md).
* **Spesifikasi Kolom & Skema Data**: Silakan baca [**`database/DATA_DICTIONARY.md`**](database/DATA_DICTIONARY.md).

---

## 📄 Lisensi
Proyek ini didistribusikan di bawah lisensi MIT.
