# Supabase Migration Runner for Windows PowerShell

$SUPABASE_HOST = "legelgunxohxkpqipnwl.db.supabase.co"
$SUPABASE_USER = "postgres"
$SUPABASE_DB = "postgres"
$MIGRATION_FILE = "supabase/migrations/20260429120000_first_three_users_as_admin.sql"

Write-Host "=== Supabase Migration Runner ===" -ForegroundColor Green
Write-Host "Project: legelgunxohxkpqipnwl" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
try {
    $psqlVersion = psql --version
    Write-Host "✓ PostgreSQL CLI found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ PostgreSQL CLI (psql) not found!" -ForegroundColor Red
    Write-Host "Silakan install PostgreSQL dari https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Masukkan database password dari Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "(Settings > Database > Show password)" -ForegroundColor DarkGray
$DB_PASSWORD = Read-Host "Password" -AsSecureString

# Convert secure string to plain text for environment variable
$ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($DB_PASSWORD)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)

# Set environment variable
$env:PGPASSWORD = $plainPassword

# Read migration SQL
if (!(Test-Path $MIGRATION_FILE)) {
    Write-Host "✗ Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

$migrationSql = Get-Content $MIGRATION_FILE -Raw

# Execute migration
Write-Host ""
Write-Host "Menjalankan migration..." -ForegroundColor Cyan

try {
    $migrationSql | psql -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -p 5432
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migration berhasil dijalankan!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Sekarang coba refresh aplikasi Anda untuk lihat tombol admin." -ForegroundColor Cyan
    } else {
        Write-Host "✗ Ada error saat menjalankan migration (exit code: $LASTEXITCODE)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from memory
    $env:PGPASSWORD = ""
}
