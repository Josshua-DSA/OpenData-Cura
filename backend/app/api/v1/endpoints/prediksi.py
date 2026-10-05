from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.schemas.common import APIResponse
from backend.app.schemas.prediksi import (
    BORForecastRequest,
    GenericPredictRequest,
    KLBPredictRequest,
    ModelListResponse,
    ModelMetaInfo,
    PredictionResultResponse,
)
from backend.app.services.ml_artifact_service import ml_artifact_service

router = APIRouter(prefix="/prediksi", tags=["Blok Prediksi & Simulasi (ML Artifact)"])


@router.get("/models", response_model=APIResponse[ModelListResponse])
async def list_models():
    """
    Daftar model ML yang terdaftar di registry lean artifact.
    Menampilkan status loaded, versi, algoritma, dan checksum SHA-256.
    """
    models = ml_artifact_service.list_models()
    return APIResponse(
        success=True,
        message="Model registry retrieved successfully.",
        data=ModelListResponse(total=len(models), models=models),
    )


@router.get("/models/{model_name}", response_model=APIResponse[ModelMetaInfo])
async def get_model_detail(model_name: str):
    """
    Informasi detail metadata dan metrik benchmark model artifact tertentu.
    """
    model = ml_artifact_service.get_model_meta(model_name)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model artifact '{model_name}' tidak ditemukan di registry.",
        )
    return APIResponse(
        success=True,
        message=f"Metadata for model '{model_name}' retrieved successfully.",
        data=model,
    )


@router.post("/klb", response_model=APIResponse[PredictionResultResponse])
async def predict_klb(request: KLBPredictRequest):
    """
    Simulasi & Prediksi Kewaspadaan Dini Risiko Kejadian Luar Biasa (F-EW03).
    Menggunakan artifact model XGBoost / LightGBM offline dengan evaluasi fitur deterministik.
    """
    result = ml_artifact_service.predict_klb(request)
    return APIResponse(
        success=True,
        message="Prediksi risiko KLB berhasil dihitung.",
        data=result,
    )


@router.post("/bor", response_model=APIResponse[PredictionResultResponse])
async def forecast_bor(request: BORForecastRequest):
    """
    Proyeksi Bed Occupancy Rate (BOR) Rumah Sakit (F-FK01).
    Menggunakan time-series baseline / model statistik ringan offline dengan interval kepercayaan.
    """
    result = ml_artifact_service.forecast_bor(request)
    return APIResponse(
        success=True,
        message="Proyeksi BOR berhasil dihitung.",
        data=result,
    )


@router.post("/simulate", response_model=APIResponse[PredictionResultResponse])
async def simulate_model(request: GenericPredictRequest):
    """
    Simulasi umum parameter input terhadap model artifact terdaftar.
    """
    result = ml_artifact_service.predict_generic(request)
    return APIResponse(
        success=True,
        message=f"Simulasi model '{request.model_name}' selesai.",
        data=result,
    )


@router.post("/reload", response_model=APIResponse[ModelListResponse])
async def reload_artifacts():
    """
    Muat ulang (hot reload) file artifact .joblib dan metadata dari disk tanpa restart container.
    """
    ml_artifact_service.load_all_artifacts()
    models = ml_artifact_service.list_models()
    return APIResponse(
        success=True,
        message="Semua artifact ML berhasil dimuat ulang dari disk.",
        data=ModelListResponse(total=len(models), models=models),
    )
