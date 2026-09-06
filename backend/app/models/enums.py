"""Enum shim — single source of truth adalah database.models.

Semua enum domain-data di-re-export dari database.models agar backend dan ETL
tidak punya dua definisi enum yang bisa melenceng. Enum khusus backend
(EnumUserRole untuk RBAC, EnumFaskesLevel legacy) tetap didefinisikan di sini.
"""
import enum

from database.models import (
    EnumKelasRS,
    EnumKepemilikan,
    EnumTipeWilayah,
    EnumTipeRawatPuskesmas,
    EnumPipelineStatus,
    EnumJenisNakes,
    EnumTipePelayanan,
    EnumStatusKasusPenyakit,
    EnumSurveillanceStatus,
    EnumAlertSeverity,
    EnumAlertStatus,
)

# Backward-compat alias: backend historically named this enum differently.
EnumTipePelayananPenyakit = EnumTipePelayanan


class EnumUserRole(str, enum.Enum):
    public = "public"
    analyst = "analyst"
    operator = "operator"
    admin = "admin"
    superadmin = "superadmin"


class EnumFaskesLevel(str, enum.Enum):
    RS = "RS"
    Puskesmas = "Puskesmas"
    Dinas = "Dinas"
    Klinik = "Klinik"
    Semua_Faskes = "Semua Faskes"


__all__ = [
    "EnumKelasRS",
    "EnumKepemilikan",
    "EnumTipeWilayah",
    "EnumTipeRawatPuskesmas",
    "EnumPipelineStatus",
    "EnumJenisNakes",
    "EnumTipePelayanan",
    "EnumTipePelayananPenyakit",
    "EnumStatusKasusPenyakit",
    "EnumSurveillanceStatus",
    "EnumAlertSeverity",
    "EnumAlertStatus",
    "EnumUserRole",
    "EnumFaskesLevel",
]
