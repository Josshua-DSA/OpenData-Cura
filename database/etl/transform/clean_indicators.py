"""
Public Health Macro Indicators Cleaner — OOP Class sesuai RULES.md Seksi 2.3.
Standardisasi dan validasi 8 Determinan Kesehatan Publik (Sanitasi, Air, Stunting, IDL, K4, BPJS, Rokok, Kepadatan).
"""

import logging
from typing import List, Dict, Any, Optional
import pandas as pd
import pandera as pa
import pandera.pandas as pa_pd
from pandera.typing import Series

from pipeline.clean.base_cleaner import BaseCleaner

logger = logging.getLogger("IndicatorsCleaner")


class CleanIndicatorsSchema(pa_pd.DataFrameModel):
    kode_bps: Series[str] = pa.Field(nullable=False)
    nama_wilayah: Series[str] = pa.Field(nullable=False)
    tahun: Series[int] = pa.Field(ge=2020, le=2030)
    topik: Series[str] = pa.Field(nullable=False)
    nama_indikator: Series[str] = pa.Field(nullable=False)
    nilai: Series[float] = pa.Field(ge=0.0, nullable=False)
    satuan: Series[str] = pa.Field(nullable=True)
    sumber_data: Series[str] = pa.Field(nullable=True)
    coverage_periode: Series[str] = pa.Field(nullable=True)

    class Config:
        strict = False
        coerce = True


class IndicatorsCleaner(BaseCleaner):
    """OOP Transformer untuk 8 Indikator Determinan Kesehatan Publik Jawa Timur."""

    @property
    def schema_input(self) -> None:
        return None

    @property
    def schema_output(self) -> pa.DataFrameSchema:
        return CleanIndicatorsSchema.to_schema()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame()

        df = df.copy()
        df["kode_bps"] = df["kode_bps"].astype(str).str.strip().str.zfill(4)
        df["nama_wilayah"] = df["nama_wilayah"].astype(str).str.strip()
        df["tahun"] = pd.to_numeric(df["tahun"], errors="coerce").fillna(2024).astype(int)
        df["topik"] = df["topik"].astype(str).str.strip()
        df["nama_indikator"] = df["nama_indikator"].astype(str).str.strip()
        df["nilai"] = pd.to_numeric(df["nilai"], errors="coerce").fillna(0.0).astype(float)
        
        if "satuan" in df.columns:
            df["satuan"] = df["satuan"].astype(str).str.strip()
        else:
            df["satuan"] = "%"

        if "sumber_file" in df.columns and "sumber_data" not in df.columns:
            df["sumber_data"] = df["sumber_file"].astype(str).str.strip()
        elif "sumber_data" not in df.columns:
            df["sumber_data"] = "Dinas Kesehatan Provinsi Jawa Timur / BPS"

        if "coverage_periode" not in df.columns:
            df["coverage_periode"] = "2024-OFFICIAL"

        # Filter valid Jawa Timur BPS codes
        df = df[df["kode_bps"].str.match(self.KODE_BPS_PATTERN)].copy()
        logger.info(f"[IndicatorsCleaner] Successfully standardized {len(df)} public health indicator records.")
        return df

    def clean_records(self, raw_records: List[Dict[str, Any]]) -> pd.DataFrame:
        return self.clean(pd.DataFrame(raw_records))


def clean_and_validate_indicators(raw_records: List[Dict[str, Any]]) -> pd.DataFrame:
    cleaner = IndicatorsCleaner()
    return cleaner.clean_records(raw_records)
