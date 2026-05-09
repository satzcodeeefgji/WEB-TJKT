# Fix Students RLS Policy - Allows users to create their own records
# Jalankan script ini dengan: .\fix_students_policy.ps1

$SUPABASE_HOST = "vvvnwkdosyartgoyqqgx.db.supabase.co"
$SUPABASE_USER = "postgres"
$SUPABASE_DB = "postgres"
$SUPABASE_PASSWORD = "SATRIA1209!"
$FIX_FILE = "supabase/fix_students_insert_policy.sql"

Write-Host "=== Fix Students RLS Policy ===" -ForegroundColor Green
Write-Host "Project: vvvnwkdosyartgoyqqgx" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "[ERROR] PostgreSQL CLI (psql) tidak ditemukan." -ForegroundColor Red
    Write-Host "Silakan install PostgreSQL dari https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Menjalankan fix policy..." -ForegroundColor Cyan
$env:PGPASSWORD = $SUPABASE_PASSWORD
& psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -p 5432 -f $FIX_FILE
$env:PGPASSWORD = ""

Write-Host ""
Write-Host "✓ Fix selesai!" -ForegroundColor Green
Write-Host "Users sekarang bisa membuat profil mereka sendiri." -ForegroundColor Green
