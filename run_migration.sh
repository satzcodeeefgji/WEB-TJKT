#!/bin/bash

# Directory containing SQL migration files
MIGRATIONS_DIR="supabase/migrations"

# Supabase database connection details
SUPABASE_HOST="legelgunxohxkpqipnwl.db.supabase.co"
SUPABASE_USER="postgres"
SUPABASE_DB="postgres"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "[ERROR] Folder migration tidak ditemukan: $MIGRATIONS_DIR"
  exit 1
fi

echo "=== Supabase Migration Runner ==="
echo "Project: legelgunxohxkpqipnwl"
echo ""
echo "Masukkan database password (dari Supabase Dashboard > Settings > Database):"
read -s DB_PASSWORD

export PGPASSWORD=$DB_PASSWORD

echo "Menjalankan semua file SQL di $MIGRATIONS_DIR"

for migration in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  echo "- Running $migration"
  psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -p 5432 -f "$migration"
  if [ $? -ne 0 ]; then
    echo "✗ Error pada migration: $migration"
    exit 1
  fi
  echo "  ✓ Selesai"
done

echo "✓ Semua migration berhasil dijalankan!"
