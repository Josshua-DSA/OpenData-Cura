from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

DISCLAIMER_TEXT = (
    "Hasil prediksi berbasis model statistik/machine learning untuk simulasi dan "
    "monitoring indikatif kewaspadaan dini. Bukan diagnosa medis atau keputusan klinis definitif."
)


class ModelMetaInfo(BaseModel):
    model_name: str
    version: str = "v1.0.0"
    algorithm: str = "Unknown"
    trained_at: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    sha256: Optional[str] = None
    features: List[str] = Field(default_factory=list)
    status: str = "missing"
    is_loaded: bool = False


class ModelListResponse(BaseModel):
    total: int
    models: List[ModelMetaInfo]


class TopFeatureImportance(BaseModel):
    feature: str
    importance_score: float
    direction: Optional[str] = None


class KLBPredictRequest(BaseModel):
    kode_kab_kota: Optional[str] = Field(default=None)
    nama_kab_kota: Optional[str] = Field(default=None)
    jenis_penyakit: str = Field(description="Jenis penyakit potensial KLB (DBD, Campak, Leptospirosis, dll)")
    kasus_minggu_ini: int = Field(ge=0)
    kasus_minggu_lalu: int = Field(default=0, ge=0)
    curah_hujan_mm: float = Field(default=150.0, ge=0.0)
    suhu_rata_rata: float = Field(default=27.5)
    kepadatan_penduduk: Optional[float] = Field(default=None, ge=0.0)
    cakupan_imunisasi_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    sanitasi_layak_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0)


class BORForecastRequest(BaseModel):
    kode_faskes: Optional[str] = Field(default=None)
    nama_faskes: Optional[str] = Field(default=None)
    bor_saat_ini: float = Field(ge=0.0, le=100.0, description="BOR saat ini dalam persen (%)")
    total_tempat_tidur: int = Field(gt=0)
    tren_kunjungan_harian: List[float] = Field(default_factory=list, description="Rata-rata BOR harian 7 hari terakhir")
    horizon_hari: int = Field(default=14, ge=1, le=90, description="Horizon proyeksi dalam hari (1-90)")


class GenericPredictRequest(BaseModel):
    model_name: str
    features: Dict[str, Any]


class PredictionResultResponse(BaseModel):
    model_name: str
    version: str
    prediction_value: Union[float, int, List[float], Dict[str, Any]]
    risk_level: Optional[str] = None
    confidence_interval: Optional[Dict[str, float]] = None
    top_features: List[TopFeatureImportance] = Field(default_factory=list)
    is_mock: bool = False
    disclaimer: str = DISCLAIMER_TEXT
    latency_ms: float
