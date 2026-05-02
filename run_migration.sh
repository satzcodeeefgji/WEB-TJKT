#!/bin/bash

# Migration file path
MIGRATION_FILE="supabase/migrations/20260429120000_first_three_users_as_admin.sql"

# Supabase connection details
SUPABASE_HOST="legelgunxohxkpqipnwl.db.supabase.co"
SUPABASE_USER="postgres"
SUPABASE_DB="postgres"

echo "=== Supabase Migration Runner ==="
echo "Project: legelgunxohxkpqipnwl"
echo ""
echo "Masukkan database password (dari Supabase Dashboard > Settings > Database):"
read -s DB_PASSWORD

export PGPASSWORD=$DB_PASSWORD

# Run migration
psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -p 5432 -f $MIGRATION_FILE

if [ $? -eq 0 ]; then
  echo "✓ Migration berhasil dijalankan!"
else
  echo "✗ Ada error saat menjalankan migration"
  exit 1
fi
