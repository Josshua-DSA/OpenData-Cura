# Alembic Migrations — Cura HealthTrust

Single source of truth untuk schema database adalah `database/models.py`.

## Cara pakai

```bash
# 1. Pastikan PostGIS up (port 5433)
docker-compose up -d postgres

# 2. Tandai DB yang sudah ada sebagai baseline (sekali saja, DB lama)
alembic stamp head

# 3. Buat migration baru dari perubahan model (autogenerate)
alembic revision --autogenerate -m "deskripsi perubahan"

# 4. Terapkan migration
alembic upgrade head

# 5. Rollback satu langkah
alembic downgrade -1
```

## Aturan

- Jangan pernah menjalankan `Base.metadata.create_all` di aplikasi.
- Semua perubahan kolom/tabel lewat migration di folder `versions/`.
- Review file autogenerate sebelum commit (alembic kadang butuh penyesuaian manual).
