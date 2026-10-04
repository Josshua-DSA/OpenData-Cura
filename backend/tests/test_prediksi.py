import json
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.services.ml_artifact_service import MLArtifactService


@pytest.mark.asyncio
async def test_get_model_registry():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/prediksi/models")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["total"] >= 2
        models = {m["model_name"]: m for m in body["data"]["models"]}
        assert "predict_klb_risk" in models
        assert "forecast_bor" in models
        assert models["predict_klb_risk"]["sha256"] is not None


@pytest.mark.asyncio
async def test_get_model_detail_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/prediksi/models/predict_klb_risk")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["model_name"] == "predict_klb_risk"
        assert "kasus_minggu_ini" in body["data"]["features"]


@pytest.mark.asyncio
async def test_get_model_detail_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/prediksi/models/non_existent_model_xyz")
        assert res.status_code == 404
        assert res.json()["detail"] is not None


@pytest.mark.asyncio
async def test_predict_klb_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "kode_kab_kota": "3501",
            "nama_kab_kota": "Pacitan",
            "jenis_penyakit": "DBD",
            "kasus_minggu_ini": 25,
            "kasus_minggu_lalu": 10,
            "curah_hujan_mm": 220.0,
            "suhu_rata_rata": 27.5,
            "cakupan_imunisasi_pct": 85.0,
            "sanitasi_layak_pct": 78.0,
        }
        res = await ac.post("/api/v1/prediksi/klb", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        data = body["data"]
        assert data["model_name"] == "predict_klb_risk"
        assert "risk_level" in data
        assert "disclaimer" in data
        assert "Bukan diagnosa medis" in data["disclaimer"]
        assert len(data["top_features"]) > 0
        assert data["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_forecast_bor_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "kode_faskes": "3578012",
            "nama_faskes": "RSUD Dr. Soetomo",
            "bor_saat_ini": 82.5,
            "total_tempat_tidur": 450,
            "tren_kunjungan_harian": [78.0, 79.5, 80.0, 81.0, 82.5],
            "horizon_hari": 14,
        }
        res = await ac.post("/api/v1/prediksi/bor", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        data = body["data"]
        assert data["model_name"] == "forecast_bor"
        assert data["prediction_value"] > 0
        assert "confidence_interval" in data
        assert data["confidence_interval"]["lower_bound"] <= data["confidence_interval"]["upper_bound"]
        assert "Bukan diagnosa medis" in data["disclaimer"]


@pytest.mark.asyncio
async def test_reload_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/v1/prediksi/reload")
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is True
        assert body["data"]["total"] >= 2


def test_corrupt_sha256_detection(tmp_path: Path):
    # Create fake joblib file and meta with invalid SHA256
    model_file = tmp_path / "test_model.joblib"
    model_file.write_bytes(b"dummy binary data for joblib test")
    meta_file = tmp_path / "test_model.meta.json"
    meta_file.write_text(
        json.dumps({
            "model_name": "test_model",
            "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
        })
    )

    svc = MLArtifactService(artifact_dir=str(tmp_path))
    loaded = svc.load_artifact("test_model")
    assert loaded is False
    assert svc._status["test_model"] == "corrupt"


def test_fallback_mode_when_missing(tmp_path: Path):
    svc = MLArtifactService(artifact_dir=str(tmp_path))
    loaded = svc.load_artifact("missing_model")
    assert loaded is True
    assert svc._status["missing_model"] == "fallback"
