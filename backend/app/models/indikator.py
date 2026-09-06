"""Indikator/Penduduk/Agregat models — single source of truth: database.models."""
from database.models import (  # noqa: F401
    TblIndikatorKesehatan,
    TblPenduduk,
    TblAgregatWilayah,
)

__all__ = ["TblIndikatorKesehatan", "TblPenduduk", "TblAgregatWilayah"]
