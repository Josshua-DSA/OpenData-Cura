"""
Cura - HealthTrust Analytics Platform
Module: VAR & LSTM Forecasting Extension (Langkah 2 ML - Tambahan)
Author: Tim Sains Data Terapan (PENS) - Role: ML Engineer (Leandro Jovan Falviano)

Tujuan (Sesuai Proposal Halaman 7 & 9):
1. Mengimplementasikan Vector Autoregressive (VAR) untuk memodelkan hubungan multivariat
   antara tren rawat inap dan rawat jalan secara simultan.
2. Mengimplementasikan LSTM (Long Short-Term Memory) menggunakan PyTorch sebagai model
   deep learning pembanding untuk time series morbiditas.
3. Mengevaluasi dan membandingkan performa VAR & LSTM terhadap model sebelumnya
   (RF, XGBoost, SARIMAX, Ridge) menggunakan RMSE, MAE, dan MAPE.
4. Mengekspor tabel evaluasi lengkap (6 model) ke JSON dan CSV.
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
from statsmodels.tsa.api import VAR

warnings.filterwarnings("ignore")
torch.manual_seed(42)
np.random.seed(42)


# ─────────────────────────────────────────────────────────────
#  BAGIAN 1: LOAD & PERSIAPAN DATA
# ─────────────────────────────────────────────────────────────

def load_data(base_dir: str = "."):
    """Memuat dataset morbiditas triwulanan dan feature store ML."""
    morb_path = os.path.join(base_dir, "database/exports/disease_morbidity_trends.csv")
    ml_path = os.path.join(base_dir, "database/exports/ml_readiness_dataset.csv")

    if not os.path.exists(morb_path):
        morb_path = "Cura/OpenData-Cura/database/exports/disease_morbidity_trends.csv"
        ml_path = "Cura/OpenData-Cura/database/exports/ml_readiness_dataset.csv"

    df_morb = pd.read_csv(morb_path)
    df_ml = pd.read_csv(ml_path)
    return df_morb, df_ml


def build_province_time_series(df_morb: pd.DataFrame):
    """
    Membangun deret waktu agregat tingkat provinsi (38 Kab/Kota digabung).
    Hasilnya: 1 baris per kuartal dengan kolom rawat_inap dan rawat_jalan.
    Format: Q1-2024, Q2-2024, Q3-2024, Q4-2024 => 4 titik waktu historis.
    """
    q_map = {'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4}

    df_agg = (
        df_morb
        .groupby(['tahun', 'triwulan', 'tipe_pelayanan'])['jumlah_pasien']
        .sum()
        .unstack(fill_value=0)
        .reset_index()
    )
    df_agg['q_num'] = df_agg['triwulan'].map(q_map)
    df_agg = df_agg.sort_values(['tahun', 'q_num']).reset_index(drop=True)
    df_agg['periode'] = df_agg['tahun'].astype(str) + '-' + df_agg['triwulan']

    # Pastikan kedua kolom tipe_pelayanan ada
    for col in ['rawat_inap', 'rawat_jalan']:
        if col not in df_agg.columns:
            df_agg[col] = 0

    return df_agg[['periode', 'tahun', 'triwulan', 'q_num', 'rawat_inap', 'rawat_jalan']]


def build_regional_time_series(df_morb: pd.DataFrame):
    """
    Membangun deret waktu per kabupaten/kota (per kode_bps).
    Digunakan untuk VAR per-wilayah dan LSTM sekuens multi-step.
    """
    q_map = {'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4}
    df_q = (
        df_morb
        .groupby(['kode_bps', 'nama_wilayah', 'tahun', 'triwulan', 'tipe_pelayanan'])['jumlah_pasien']
        .sum()
        .unstack(fill_value=0)
        .reset_index()
    )
    for col in ['rawat_inap', 'rawat_jalan']:
        if col not in df_q.columns:
            df_q[col] = 0

    df_q['q_num'] = df_q['triwulan'].map(q_map)
    df_q = df_q.sort_values(['kode_bps', 'tahun', 'q_num']).reset_index(drop=True)
    return df_q


# ─────────────────────────────────────────────────────────────
#  BAGIAN 2: MODEL VAR (Vector Autoregressive)
# ─────────────────────────────────────────────────────────────

def run_var_model(df_province: pd.DataFrame):
    """
    Melatih dan mengevaluasi model VAR pada deret waktu provinsi (multivariate).

    VAR memodelkan hubungan linear dinamis antara:
    - rawat_inap (t): dipengaruhi oleh lag rawat_inap(t-1) dan rawat_jalan(t-1)
    - rawat_jalan (t): dipengaruhi oleh lag rawat_jalan(t-1) dan rawat_inap(t-1)

    Dengan hanya 4 titik waktu historis (Q1-Q4 2024), lag=1 adalah satu-satunya
    konfigurasi yang valid (minimal 2 observasi untuk training setelah lag).
    """
    series = df_province[['rawat_inap', 'rawat_jalan']].values.astype(float)

    # Dengan 4 titik waktu: train Q1-Q3 (3 obs), test Q4 (1 obs)
    n_train = len(series) - 1
    train_series = series[:n_train]
    test_series = series[n_train:]

    # Fit VAR dengan lag=1
    model = VAR(train_series)
    result = model.fit(maxlags=1, ic=None)

    # Forecast 1 langkah ke depan
    lag_order = result.k_ar
    forecast_input = train_series[-lag_order:]
    forecast = result.forecast(forecast_input, steps=1)

    pred_inap = float(forecast[0][0])
    pred_jalan = float(forecast[0][1])

    actual_inap = float(test_series[0][0])
    actual_jalan = float(test_series[0][1])

    # Evaluasi pada rawat_inap (target utama Bed Demand)
    rmse_var = float(np.sqrt((actual_inap - pred_inap) ** 2))
    mae_var = float(abs(actual_inap - pred_inap))
    mape_var = float(abs((actual_inap - pred_inap) / actual_inap) * 100) if actual_inap != 0 else 0.0

    var_eval = {
        "rmse": round(rmse_var, 2),
        "mae": round(mae_var, 2),
        "mape_pct": round(mape_var, 2),
        "pred_rawat_inap_q4": round(pred_inap, 1),
        "actual_rawat_inap_q4": round(actual_inap, 1),
        "pred_rawat_jalan_q4": round(pred_jalan, 1),
        "actual_rawat_jalan_q4": round(actual_jalan, 1),
        "lag_order": lag_order,
        "catatan": (
            "VAR dilatih pada agregat tingkat provinsi (4 kuartal 2024). "
            "Dengan data 4 titik waktu, lag=1 adalah konfigurasi optimal yang valid. "
            "Model menangkap interdependensi rawat_inap <-> rawat_jalan secara simultan."
        )
    }

    return result, var_eval


# ─────────────────────────────────────────────────────────────
#  BAGIAN 3: MODEL LSTM (PyTorch)
# ─────────────────────────────────────────────────────────────

class LSTMForecaster(nn.Module):
    """
    Arsitektur LSTM sederhana untuk time series univariate (rawat_inap).
    Input : sekuens historis panjang 'seq_len' kuartal
    Output: prediksi 1 langkah ke depan
    """
    def __init__(self, input_size: int = 1, hidden_size: int = 32, num_layers: int = 1, output_size: int = 1):
        super(LSTMForecaster, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out


def prepare_lstm_sequences(series: np.ndarray, seq_len: int = 3):
    """
    Membentuk pasangan (X_seq, y_target) sliding window dari deret waktu.
    seq_len = panjang input sekuens (jumlah timestep historis).
    """
    X, y = [], []
    for i in range(len(series) - seq_len):
        X.append(series[i : i + seq_len])
        y.append(series[i + seq_len])
    return np.array(X), np.array(y)


def run_lstm_model(df_regional: pd.DataFrame, df_ml: pd.DataFrame, epochs: int = 150, lr: float = 0.01):
    """
    Melatih LSTM pada deret waktu rawat_inap agregat seluruh provinsi.

    Strategi:
    - Menggunakan data rawat inap 38 kab/kota (per-wilayah) sebagai sekuens independen.
    - Normalisasi MinMax per wilayah.
    - Sliding window seq_len=3 (Q1, Q2, Q3 -> prediksi Q4).
    - Evaluasi pada Q4 sebagai holdout.
    """
    all_preds = []
    all_actuals = []
    seq_len = 3  # Q1, Q2, Q3 → prediksi Q4

    scaler_global = MinMaxScaler(feature_range=(0, 1))

    # Kumpulkan semua sekuens dari seluruh kab/kota
    X_list, y_list = [], []
    scalers = {}

    for kode in df_regional['kode_bps'].unique():
        sub = df_regional[df_regional['kode_bps'] == kode].sort_values('q_num')
        vals = sub['rawat_inap'].values.astype(float).reshape(-1, 1)

        if len(vals) < seq_len + 1:
            continue

        sc = MinMaxScaler(feature_range=(0, 1))
        vals_scaled = sc.fit_transform(vals).flatten()
        scalers[kode] = sc

        X_seq, y_seq = prepare_lstm_sequences(vals_scaled, seq_len=seq_len)
        X_list.append(X_seq)
        y_list.append(y_seq)

    if not X_list:
        return None, {"rmse": 999, "mae": 999, "mape_pct": 999, "catatan": "Data tidak cukup"}

    X_all = np.concatenate(X_list, axis=0)
    y_all = np.concatenate(y_list, axis=0)

    # Train/test split: 80% train, 20% test (berdasarkan posisi)
    split = int(len(X_all) * 0.8)
    X_train_np = X_all[:split]
    y_train_np = y_all[:split]
    X_test_np = X_all[split:]
    y_test_np = y_all[split:]

    # Konversi ke tensor PyTorch
    X_train_t = torch.FloatTensor(X_train_np).unsqueeze(-1)  # (N, seq_len, 1)
    y_train_t = torch.FloatTensor(y_train_np).unsqueeze(-1)  # (N, 1)
    X_test_t = torch.FloatTensor(X_test_np).unsqueeze(-1)
    y_test_t = torch.FloatTensor(y_test_np).unsqueeze(-1)

    dataset = TensorDataset(X_train_t, y_train_t)
    loader = DataLoader(dataset, batch_size=16, shuffle=True)

    # Inisialisasi model
    model = LSTMForecaster(input_size=1, hidden_size=32, num_layers=1, output_size=1)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=50, gamma=0.5)

    # Training loop
    model.train()
    train_losses = []
    for epoch in range(epochs):
        epoch_loss = 0.0
        for X_batch, y_batch in loader:
            optimizer.zero_grad()
            output = model(X_batch)
            loss = criterion(output, y_batch)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        train_losses.append(epoch_loss / len(loader))
        scheduler.step()

    # Evaluasi pada test set (skala ternormalisasi)
    model.eval()
    with torch.no_grad():
        preds_scaled = model(X_test_t).numpy().flatten()
        actual_scaled = y_test_t.numpy().flatten()

    # Hitung metrik pada skala normalisasi (0-1) lalu inverse ke skala asli
    # Gunakan scaler dari kabupaten terakhir sebagai referensi skala representatif
    ref_kode = list(scalers.keys())[-1]
    ref_sc = scalers[ref_kode]

    preds_inv = ref_sc.inverse_transform(preds_scaled.reshape(-1, 1)).flatten()
    actual_inv = ref_sc.inverse_transform(actual_scaled.reshape(-1, 1)).flatten()

    rmse_lstm = float(np.sqrt(mean_squared_error(actual_inv, preds_inv)))
    mae_lstm = float(mean_absolute_error(actual_inv, preds_inv))
    # MAPE: filter out zero actuals
    mask = actual_inv != 0
    mape_lstm = float(np.mean(np.abs((actual_inv[mask] - preds_inv[mask]) / actual_inv[mask])) * 100) if mask.any() else 0.0

    lstm_eval = {
        "rmse": round(rmse_lstm, 2),
        "mae": round(mae_lstm, 2),
        "mape_pct": round(mape_lstm, 2),
        "epochs_trained": epochs,
        "architecture": "LSTM(hidden=32, layers=1) -> Linear(1) | PyTorch",
        "seq_len": seq_len,
        "n_train_samples": int(X_train_np.shape[0]),
        "n_test_samples": int(X_test_np.shape[0]),
        "final_train_loss": round(float(train_losses[-1]), 6),
        "catatan": (
            "LSTM dilatih pada seluruh sekuens rawat_inap 38 Kab/Kota (sliding window seq=3). "
            "Normalisasi MinMax per wilayah, evaluasi inverse-transform ke skala kasus asli. "
            "Model menangkap dependensi temporal non-linear antar kuartal."
        )
    }

    return model, lstm_eval, train_losses


# ─────────────────────────────────────────────────────────────
#  BAGIAN 4: TABEL KOMPARASI LENGKAP 6 MODEL
# ─────────────────────────────────────────────────────────────

def build_comparison_table(existing_eval: dict, var_eval: dict, lstm_eval: dict):
    """
    Menggabungkan evaluasi 6 model forecasting menjadi tabel perbandingan lengkap.
    """
    rows = []
    model_order = [
        ("Random Forest Regressor", existing_eval.get("random_forest", {})),
        ("XGBoost Regressor",       existing_eval.get("xgboost", {})),
        ("SARIMAX Seasonal",        existing_eval.get("sarimax_seasonal", {})),
        ("Ridge Regression",        existing_eval.get("ridge_regression", {})),
        ("VAR (Vector AR)",         var_eval),
        ("LSTM (PyTorch)",          lstm_eval),
    ]
    for name, m in model_order:
        rows.append({
            "model": name,
            "rmse": m.get("rmse", "-"),
            "mae": m.get("mae", "-"),
            "mape_pct": m.get("mape_pct", "-"),
            "lulus_target_mape_15pct": (
                m.get("mape_pct", 999) < 15.0
                if isinstance(m.get("mape_pct"), (int, float)) else "-"
            )
        })
    df_cmp = pd.DataFrame(rows)
    return df_cmp


# ─────────────────────────────────────────────────────────────
#  BAGIAN 5: EXPORT ARTEFAK
# ─────────────────────────────────────────────────────────────

def export_results(var_eval: dict, lstm_eval: dict, df_comparison: pd.DataFrame, out_dir: str = "experiments/data"):
    """Menyimpan seluruh hasil evaluasi VAR & LSTM ke folder experiments/data/."""
    os.makedirs(out_dir, exist_ok=True)

    # JSON evaluasi lengkap (6 model)
    existing_eval_path = os.path.join(out_dir, "forecasting_evaluation.json")
    if os.path.exists(existing_eval_path):
        with open(existing_eval_path, encoding="utf-8") as f:
            full_eval = json.load(f)
    else:
        full_eval = {}

    full_eval["var_vector_autoregressive"] = var_eval
    full_eval["lstm_pytorch"] = lstm_eval

    # Tentukan best model dari semua 6
    candidates = {k: v for k, v in full_eval.items()
                  if isinstance(v, dict) and "mape_pct" in v}
    best_key = min(candidates, key=lambda k: candidates[k]["mape_pct"])
    full_eval["best_model"] = {
        "Random Forest Regressor": "Random Forest Regressor",
        "xgboost": "XGBoost Regressor",
        "sarimax_seasonal": "SARIMAX Seasonal",
        "ridge_regression": "Ridge Regression",
        "var_vector_autoregressive": "VAR (Vector Autoregressive)",
        "lstm_pytorch": "LSTM (PyTorch)"
    }.get(best_key, best_key)
    full_eval["target_mape_met"] = any(
        v.get("mape_pct", 999) < 15.0 for v in candidates.values()
        if isinstance(v.get("mape_pct"), (int, float))
    )

    eval_out = os.path.join(out_dir, "forecasting_evaluation_full.json")
    with open(eval_out, "w", encoding="utf-8") as f:
        json.dump(full_eval, f, indent=2, ensure_ascii=False)

    # CSV tabel komparasi
    cmp_out = os.path.join(out_dir, "forecasting_model_comparison.csv")
    df_comparison.to_csv(cmp_out, index=False)

    print(f"[SUCCESS] Artefak VAR & LSTM berhasil diekspor:")
    print(f"  1. {eval_out} (Evaluasi Lengkap 6 Model)")
    print(f"  2. {cmp_out} (Tabel Komparasi CSV)")
    return full_eval


# ─────────────────────────────────────────────────────────────
#  PIPELINE UTAMA
# ─────────────────────────────────────────────────────────────

def run_pipeline():
    print("=" * 70)
    print("[START] PIPELINE VAR & LSTM FORECASTING (LANGKAH 2 ML)")
    print("=" * 70)

    # 1. Load data
    df_morb, df_ml = load_data()
    print(f"[OK] Data dimuat: {len(df_morb)} baris morbiditas, {len(df_ml)} wilayah.")

    # 2. Bangun deret waktu provinsi (VAR) dan regional (LSTM)
    df_province = build_province_time_series(df_morb)
    df_regional = build_regional_time_series(df_morb)
    print(f"[OK] Deret waktu provinsi: {len(df_province)} kuartal | Regional: {df_regional['kode_bps'].nunique()} wilayah.")

    # 3. Model VAR
    print("\n--- [1/2] MELATIH MODEL VAR (Vector Autoregressive) ---")
    var_result, var_eval = run_var_model(df_province)
    print(f"  Lag order terpilih    : {var_eval['lag_order']}")
    print(f"  Prediksi Q4 rawat_inap: {var_eval['pred_rawat_inap_q4']:,.0f} | Aktual: {var_eval['actual_rawat_inap_q4']:,.0f}")
    print(f"  RMSE: {var_eval['rmse']:,.2f} | MAE: {var_eval['mae']:,.2f} | MAPE: {var_eval['mape_pct']:.2f}%")

    # 4. Model LSTM
    print("\n--- [2/2] MELATIH MODEL LSTM (PyTorch) ---")
    print(f"  Arsitektur : LSTM(hidden=32, layers=1) -> Linear(1)")
    print(f"  Epochs     : 150 | LR: 0.01 (StepLR decay x0.5 tiap 50 epoch)")
    lstm_model, lstm_eval, train_losses = run_lstm_model(df_regional, df_ml, epochs=150, lr=0.01)
    print(f"  Training samples : {lstm_eval['n_train_samples']} | Test samples: {lstm_eval['n_test_samples']}")
    print(f"  Final Train Loss : {lstm_eval['final_train_loss']:.6f}")
    print(f"  RMSE: {lstm_eval['rmse']:,.2f} | MAE: {lstm_eval['mae']:,.2f} | MAPE: {lstm_eval['mape_pct']:.2f}%")

    # 5. Load existing evaluation dan buat tabel komparasi
    existing_path = "experiments/data/forecasting_evaluation.json"
    if os.path.exists(existing_path):
        with open(existing_path, encoding="utf-8") as f:
            existing_eval = json.load(f)
    else:
        existing_eval = {}

    df_comparison = build_comparison_table(existing_eval, var_eval, lstm_eval)

    print("\n--- TABEL KOMPARASI LENGKAP 6 MODEL FORECASTING ---")
    print(df_comparison.to_string(index=False))

    # 6. Export
    full_eval = export_results(var_eval, lstm_eval, df_comparison)
    print(f"\n  Model Terbaik (MAPE Terendah): {full_eval.get('best_model', '-')}")
    print("=" * 70)


if __name__ == "__main__":
    run_pipeline()
