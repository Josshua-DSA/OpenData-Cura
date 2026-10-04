import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib

from backend.app.core.config import settings
from backend.app.schemas.prediksi import (
    DISCLAIMER_TEXT,
    BORForecastRequest,
    GenericPredictRequest,
    KLBPredictRequest,
    ModelMetaInfo,
    PredictionResultResponse,
    TopFeatureImportance,
)

logger = logging.getLogger(__name__)


class MLArtifactService:
    def __init__(self, artifact_dir: Optional[str] = None):
        self.artifact_dir = Path(artifact_dir or settings.ML_ARTIFACT_DIR)
        self._models: Dict[str, Any] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}
        self._status: Dict[str, str] = {}

    @staticmethod
    def compute_sha256(filepath: Path) -> str:
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return sha256.hexdigest()

    def load_metadata(self, model_name: str) -> Optional[Dict[str, Any]]:
        meta_path = self.artifact_dir / f"{model_name}.meta.json"
        if not meta_path.exists():
            # Try alternate naming
            meta_path = self.artifact_dir / f"{model_name}.json"
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error("Failed to read metadata for %s: %s", model_name, e)
        return None

    def load_artifact(self, model_name: str) -> bool:
        model_path = self.artifact_dir / f"{model_name}.joblib"
        metadata = self.load_metadata(model_name)

        if not model_path.exists():
            if settings.ML_ALLOW_MOCK_FALLBACK:
                self._status[model_name] = "fallback"
                self._metadata[model_name] = metadata or {
                    "model_name": model_name,
                    "version": "v1.0.0-fallback",
                    "algorithm": "Heuristic Rule-Based Fallback",
                    "metrics": {"note": "Artifact belum di-upload. Mode fallback aktif."},
                    "features": [],
                }
                logger.warning(
                    "ML artifact %s not found at %s. Using heuristic fallback.",
                    model_name,
                    model_path,
                )
                return True
            else:
                self._status[model_name] = "missing"
                logger.error("ML artifact %s not found at %s", model_name, model_path)
                return False

        # If file exists, verify SHA256 if provided in metadata
        calc_sha = self.compute_sha256(model_path)
        if metadata and "sha256" in metadata and metadata["sha256"]:
            expected_sha = metadata["sha256"].lower().strip()
            if calc_sha.lower().strip() != expected_sha:
                self._status[model_name] = "corrupt"
                logger.error(
                    "SHA-256 mismatch for %s: expected %s, calculated %s",
                    model_name,
                    expected_sha,
                    calc_sha,
                )
                return False

        try:
            model = joblib.load(model_path)
            self._models[model_name] = model
            if metadata:
                metadata["sha256"] = calc_sha
                self._metadata[model_name] = metadata
            else:
                self._metadata[model_name] = {
                    "model_name": model_name,
                    "version": "v1.0.0",
                    "algorithm": getattr(model, "__class__", type(model)).__name__,
                    "sha256": calc_sha,
                    "metrics": {},
                    "features": getattr(model, "feature_names_in_", []),
                }
            self._status[model_name] = "active"
            logger.info("Successfully loaded ML artifact: %s (SHA: %s)", model_name, calc_sha[:8])
            return True
        except Exception as e:
            self._status[model_name] = "error"
            logger.error("Failed to deserialize model %s: %s", model_name, e)
            return False

    def load_all_artifacts(self) -> None:
        self.artifact_dir.mkdir(parents=True, exist_ok=True)
        for model_name in settings.ML_ACTIVE_MODELS:
            self.load_artifact(model_name)

    def list_models(self) -> List[ModelMetaInfo]:
        if not self._status:
            self.load_all_artifacts()
        results: List[ModelMetaInfo] = []
        all_keys = set(settings.ML_ACTIVE_MODELS) | set(self._status.keys())
        for model_name in sorted(all_keys):
            meta = self._metadata.get(model_name, {})
            status = self._status.get(model_name, "missing")
            results.append(
                ModelMetaInfo(
                    model_name=model_name,
                    version=meta.get("version", "v1.0.0"),
                    algorithm=meta.get("algorithm", "Unknown"),
                    trained_at=meta.get("trained_at"),
                    metrics=meta.get("metrics", {}),
                    sha256=meta.get("sha256"),
                    features=list(meta.get("features", [])),
                    status=status,
                    is_loaded=(status == "active"),
                )
            )
        return results

    def get_model_meta(self, model_name: str) -> Optional[ModelMetaInfo]:
        for m in self.list_models():
            if m.model_name == model_name:
                return m
        return None

    def predict_klb(self, req: KLBPredictRequest) -> PredictionResultResponse:
        t0 = time.perf_counter()
        model_name = "predict_klb_risk"
        meta = self._metadata.get(model_name, {})
        status = self._status.get(model_name, "missing")
        is_mock = status != "active"

        if not is_mock and model_name in self._models:
            model = self._models[model_name]
            try:
                # Prepare feature vector if model has feature_names_in_
                feat_dict = {
                    "kasus_minggu_ini": req.kasus_minggu_ini,
                    "kasus_minggu_lalu": req.kasus_minggu_lalu,
                    "curah_hujan_mm": req.curah_hujan_mm,
                    "suhu_rata_rata": req.suhu_rata_rata,
                    "kepadatan_penduduk": req.kepadatan_penduduk or 500.0,
                    "cakupan_imunisasi_pct": req.cakupan_imunisasi_pct or 90.0,
                    "sanitasi_layak_pct": req.sanitasi_layak_pct or 85.0,
                }
                import pandas as pd
                df = pd.DataFrame([feat_dict])
                if hasattr(model, "predict_proba"):
                    proba = float(model.predict_proba(df)[0][1])
                else:
                    proba = float(model.predict(df)[0])
                risk_score = round(max(0.0, min(1.0, proba)), 4)
            except Exception as e:
                logger.error("Error executing model %s, falling back: %s", model_name, e)
                is_mock = True
                risk_score = self._calc_klb_heuristic(req)
        else:
            risk_score = self._calc_klb_heuristic(req)

        # Categorize risk level
        if risk_score >= 0.75:
            risk_level = "WASPADA KLB (TINGGI)"
        elif risk_score >= 0.50:
            risk_level = "WASPADA (SEDANG)"
        elif risk_score >= 0.30:
            risk_level = "PERHATIAN (MODERAT)"
        else:
            risk_level = "TERKENDALI (RENDAH)"

        # Top features based on offline SHAP metadata or domain weights
        precomputed_shap = meta.get("shap_summary", {})
        top_features: List[TopFeatureImportance] = []
        if precomputed_shap:
            for feat, score in list(precomputed_shap.items())[:3]:
                top_features.append(TopFeatureImportance(feature=feat, importance_score=float(score)))
        else:
            # Fallback domain feature attributions
            top_features = [
                TopFeatureImportance(feature="Kenaikan Tren Kasus Mingguan", importance_score=0.45, direction="positif"),
                TopFeatureImportance(feature="Curah Hujan & Iklim Ekstrem", importance_score=0.30, direction="positif"),
                TopFeatureImportance(feature="Cakupan Imunisasi / Sanitasi", importance_score=0.25, direction="negatif"),
            ]

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return PredictionResultResponse(
            model_name=model_name,
            version=meta.get("version", "v1.0.0-lean"),
            prediction_value=risk_score,
            risk_level=risk_level,
            confidence_interval={
                "lower_bound": round(max(0.0, risk_score - 0.08), 3),
                "upper_bound": round(min(1.0, risk_score + 0.08), 3),
            },
            top_features=top_features,
            is_mock=is_mock,
            disclaimer=DISCLAIMER_TEXT,
            latency_ms=latency_ms,
        )

    def _calc_klb_heuristic(self, req: KLBPredictRequest) -> float:
        # Heuristic ratio and climate weights
        prev = max(1, req.kasus_minggu_lalu)
        growth = (req.kasus_minggu_ini - req.kasus_minggu_lalu) / prev
        base_score = 0.20
        # If case doubled, strong signal
        if growth >= 1.0:
            base_score += 0.40
        elif growth >= 0.3:
            base_score += 0.20
        elif growth < -0.2:
            base_score -= 0.10

        # Rain factor for vector-borne diseases like DBD
        if req.jenis_penyakit.upper() in ["DBD", "LEPTOSPIROSIS", "DIARE"]:
            if req.curah_hujan_mm > 200.0:
                base_score += 0.15
            elif req.curah_hujan_mm > 100.0:
                base_score += 0.08

        # Immunization factor for vaccine-preventable diseases like Campak
        if req.jenis_penyakit.upper() in ["CAMPAK", "DIFTERI", "POLIO"]:
            if req.cakupan_imunisasi_pct is not None and req.cakupan_imunisasi_pct < 80.0:
                base_score += 0.20

        return round(max(0.05, min(0.95, base_score)), 4)

    def forecast_bor(self, req: BORForecastRequest) -> PredictionResultResponse:
        t0 = time.perf_counter()
        model_name = "forecast_bor"
        meta = self._metadata.get(model_name, {})
        status = self._status.get(model_name, "missing")
        is_mock = status != "active"

        # Baseline projection: trend moving average
        current_bor = req.bor_saat_ini
        trend = 0.0
        if req.tren_kunjungan_harian and len(req.tren_kunjungan_harian) >= 2:
            diffs = [
                req.tren_kunjungan_harian[i] - req.tren_kunjungan_harian[i - 1]
                for i in range(1, len(req.tren_kunjungan_harian))
            ]
            trend = sum(diffs) / len(diffs)

        projected_bor = round(max(10.0, min(100.0, current_bor + (trend * (req.horizon_hari / 7.0)))), 2)

        if projected_bor >= 85.0:
            risk_level = "KRITIS OVERLOAD (BOR >= 85%)"
        elif projected_bor >= 75.0:
            risk_level = "WASPADA KAPASITAS (BOR 75-84%)"
        elif projected_bor >= 60.0:
            risk_level = "IDEAL / NORMAL (BOR 60-74%)"
        else:
            risk_level = "UNDERUTILIZED (BOR < 60%)"

        top_features = [
            TopFeatureImportance(feature="BOR Baseline Saat Ini", importance_score=0.60),
            TopFeatureImportance(feature="Tren Admisi 7 Hari Terakhir", importance_score=0.25),
            TopFeatureImportance(feature="Kapasitas Total Tempat Tidur", importance_score=0.15),
        ]

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return PredictionResultResponse(
            model_name=model_name,
            version=meta.get("version", "v1.0.0-lean"),
            prediction_value=projected_bor,
            risk_level=risk_level,
            confidence_interval={
                "lower_bound": round(max(0.0, projected_bor - 4.5), 2),
                "upper_bound": round(min(100.0, projected_bor + 4.5), 2),
            },
            top_features=top_features,
            is_mock=is_mock,
            disclaimer=DISCLAIMER_TEXT,
            latency_ms=latency_ms,
        )

    def predict_generic(self, req: GenericPredictRequest) -> PredictionResultResponse:
        t0 = time.perf_counter()
        meta = self._metadata.get(req.model_name, {})
        status = self._status.get(req.model_name, "missing")
        is_mock = status != "active"

        pred_val: Any = 0.5
        if not is_mock and req.model_name in self._models:
            model = self._models[req.model_name]
            import pandas as pd
            df = pd.DataFrame([req.features])
            pred_val = model.predict(df)[0].tolist() if hasattr(model.predict(df)[0], "tolist") else float(model.predict(df)[0])

        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return PredictionResultResponse(
            model_name=req.model_name,
            version=meta.get("version", "v1.0.0-lean"),
            prediction_value=pred_val,
            is_mock=is_mock,
            disclaimer=DISCLAIMER_TEXT,
            latency_ms=latency_ms,
        )


# Global singleton instance
ml_artifact_service = MLArtifactService()
