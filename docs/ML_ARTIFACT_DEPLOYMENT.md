# ML Artifact Deployment
# Cura: HealthTrust Facilities
> Versi 1.0 — Opsi A: training offline, inferensi ringan di VPS

## Tujuan

Cura memakai model ML sebagai artifact lokal. Training berjalan di laptop atau CI terpisah. VPS hanya memuat artifact tervalidasi dan menjalankan inferensi saat endpoint prediksi dipanggil.

Desain ini menjaga VPS murah tetap ringan. VPS tidak menjalankan Apache Airflow, Celery, Celery Beat, Redis, Prophet, SHAP runtime, atau proses training ML.

## Batasan Arsitektur

| Area | Keputusan |
|---|---|
| Training | Laptop/CI; tidak boleh berjalan di VPS |
| Format utama | `.joblib` untuk model scikit-learn/LightGBM/XGBoost |
| Format alternatif | `.onnx` jika runtime kompatibel dan ukuran lebih kecil |
| Model BOR | LightGBM/XGBoost atau model statistik ringan; bukan Prophet runtime |
| SHAP | Dihitung offline; simpan `shap_top_features` bersama metadata/prediction cache |
| Loading | Satu artifact aktif per model; startup atau explicit refresh |
| Web process | FastAPI/Uvicorn satu worker pada VPS 1 GB |
| Retraining | Manual atau pipeline CI terpisah; tidak dipicu request API |

## Struktur Artifact

```text
ml/
├── artifacts/
│   ├── predict_klb_risk_v1.0.0_YYYYMMDD.joblib
│   ├── predict_klb_risk_v1.0.0_YYYYMMDD.json
│   ├── predict_klb_risk_v1.0.0_YYYYMMDD.sha256
│   └── ...
├── models/                 # adapter training/inference
├── evaluation/             # evaluasi offline
└── requirements-training.txt  # laptop/CI only
```

Artifact `.joblib` tidak boleh dianggap aman jika sumbernya tidak dipercaya. Hanya deploy artifact dari pipeline/repository yang dikontrol tim.

## Kontrak Metadata

Setiap artifact wajib punya metadata pasangan JSON:

```json
{
  "model_name": "predict_klb_risk",
  "version": "v1.0.0",
  "trained_at": "YYYY-MM-DDTHH:MM:SSZ",
  "algorithm": "XGBoost",
  "feature_names": ["kasus_12_bulan", "kepadatan", "tren_musiman"],
  "runtime": {
    "python": "3.11",
    "library": "xgboost",
    "library_version": "PINNED_VERSION"
  },
  "artifact_file": "predict_klb_risk_v1.0.0_YYYYMMDD.joblib",
  "sha256": "SHA256_HEX_DIGEST",
  "shap_top_features": [
    {"feature": "kasus_12_bulan", "importance": 0.42}
  ],
  "disclaimer": "Prediksi berbasis data historis, bukan diagnosis medis"
}
```

Nilai contoh wajib diganti saat artifact nyata dibuat. `feature_names` dan versi library harus cocok dengan runtime inference.

## Alur Training Offline

1. Ambil dataset training dari export/database yang telah disetujui.
2. Jalankan preprocessing deterministik.
3. Latih model di laptop/CI, bukan VPS.
4. Evaluasi model dan simpan metrik.
5. Hitung SHAP offline bila model mendukungnya.
6. Simpan model, metadata, dan checksum SHA-256.
7. Jalankan validasi artifact: file ada, checksum cocok, feature names lengkap, versi model valid.
8. Kirim bundle ke VPS melalui release terkontrol, `rsync`, atau `scp`.

Training pertama belum dijalankan oleh perubahan dokumen ini.

## Alur Deploy ke VPS

1. Upload artifact ke direktori staging, bukan langsung menimpa artifact aktif.
2. Verifikasi checksum SHA-256.
3. Validasi metadata dan kompatibilitas runtime.
4. Ubah pointer/manifest model aktif secara atomik.
5. Reload proses FastAPI satu kali atau gunakan endpoint refresh admin yang tervalidasi.
6. Jalankan smoke test endpoint prediksi.
7. Jika gagal, kembalikan pointer ke artifact versi sebelumnya.

Tidak boleh menghapus artifact versi aktif sebelum versi baru lulus smoke test.

## Pola Loading Runtime

Backend boleh memakai pola berikut secara konseptual:

```text
startup/refresh
  → baca manifest model aktif
  → cek file + checksum
  → load satu artifact
  → cek feature names
  → simpan model di app state

request prediksi
  → validasi input agregat
  → jalankan inference ringan
  → ambil shap_top_features dari metadata/cache
  → kirim disclaimer
```

Jangan memanggil `joblib.load()` pada setiap request. Jangan membuat `TreeExplainer` pada setiap request. Jangan melatih model pada request.

## Estimasi Resource

Estimasi bergantung ukuran dataset, model, dan jumlah feature. Target Opsi A:

| Komponen | RAM tambahan tipikal | Kondisi |
|---|---:|---|
| Model tree kecil + metadata | 30–120 MB | Satu model aktif |
| Tiga model tree kecil | 100–300 MB | Jika semua dimuat bersamaan |
| Inferensi satu request | 5–50 MB sementara | Payload agregat kecil |
| SHAP offline, bukan runtime | 0 MB standby VPS | Dihitung di laptop/CI |
| Disk artifact | 1–50 MB/model | Bergantung jumlah tree/feature |

Target deployment awal: muat satu model sesuai endpoint. Jangan memuat semua model saat startup jika VPS hanya 1 GB RAM.

## Model Tidak Cocok untuk VPS Murah

- Prophet/Stan runtime.
- TensorFlow atau PyTorch penuh.
- SHAP explainer aktif untuk setiap request.
- Training, hyperparameter search, atau cross-validation di VPS.
- Banyak worker FastAPI yang menduplikasi model di RAM.

## Acceptance Criteria Sebelum Eksekusi Kode

- [ ] Dokumen arsitektur tidak lagi menjadikan Airflow sebagai requirement VPS lean.
- [ ] Training offline tertulis sebagai satu-satunya jalur training.
- [ ] Prophet dihapus dari runtime model BOR.
- [ ] Artifact punya metadata dan SHA-256 checksum.
- [ ] Backend hanya load artifact tervalidasi.
- [ ] Jalur rollback artifact tersedia.
- [ ] Tidak ada training, deploy, atau perubahan Compose dijalankan tanpa persetujuan berikutnya.

## Status

Dokumen desain selesai. Eksekusi non-training berikutnya menunggu persetujuan pengguna.
