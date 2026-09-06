"""Penyakit & SDM models — single source of truth: database.models."""
from database.models import (  # noqa: F401
    TblTenagaKesehatan,
    TblPasienPenyakitWilayah,
)

__all__ = ["TblTenagaKesehatan", "TblPasienPenyakitWilayah"]
