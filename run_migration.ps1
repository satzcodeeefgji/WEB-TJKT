# Supabase Migration Runner for Windows PowerShell

$SUPABASE_HOST = "legelgunxohxkpqipnwl.db.supabase.co"
$SUPABASE_USER = "postgres"
$SUPABASE_DB = "postgres"
$MIGRATION_FILE = "supabase/migrations/20260501000007_add_kas_payments_kind.sql"

Write-Host "=== Supabase Migration Runner ===" -ForegroundColor Green
Write-Host "Project: legelgunxohxkpqipnwl" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "[ERROR] PostgreSQL CLI (psql) not found." -ForegroundColor Red
    Write-Host "Silakan install PostgreSQL dari https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

$psqlVersion = & $psqlCmd.Path --version
Write-Host "PostgreSQL CLI found: $psqlVersion" -ForegroundColor Green

Write-Host ""
Write-Host "Masukkan database password dari Supabase Dashboard:" -ForegroundColor Yellow
Write-Host '(Settings > Database > Show password)' -ForegroundColor DarkGray
$DB_PASSWORD = Read-Host "Password" -AsSecureString

# Convert secure string to plain text for environment variable
$ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($DB_PASSWORD)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)

# Set environment variable
$env:PGPASSWORD = $plainPassword

# Verify migration file exists
if (!(Test-Path $MIGRATION_FILE)) {
    Write-Host "[ERROR] Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Menjalankan migration..." -ForegroundColor Cyan
& $psqlCmd.Path -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -p 5432 -f $MIGRATION_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration berhasil dijalankan!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Selesai. Silakan refresh aplikasi Anda." -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Ada error saat menjalankan migration (exit code: $LASTEXITCODE)" -ForegroundColor Red
}

# Clear password from memory
$env:PGPASSWORD = ""
