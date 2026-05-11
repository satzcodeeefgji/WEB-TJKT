# Supabase Migration Runner for Windows PowerShell

$SUPABASE_HOST = "legelgunxohxkpqipnwl.db.supabase.co"
$SUPABASE_USER = "postgres"
$SUPABASE_DB = "postgres"
$MIGRATIONS_DIR = "supabase/migrations"

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

if (!(Test-Path $MIGRATIONS_DIR)) {
    Write-Host "[ERROR] Folder migration tidak ditemukan: $MIGRATIONS_DIR" -ForegroundColor Red
    exit 1
}

$scriptFiles = Get-ChildItem -Path $MIGRATIONS_DIR -Filter *.sql | Sort-Object Name
if ($scriptFiles.Count -eq 0) {
    Write-Host "[ERROR] Tidak ada file SQL di folder: $MIGRATIONS_DIR" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Masukkan database password dari Supabase Dashboard:" -ForegroundColor Yellow
Write-Host '(Settings > Database > Show password)' -ForegroundColor DarkGray
$DB_PASSWORD = Read-Host "Password" -AsSecureString

$ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($DB_PASSWORD)
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
$env:PGPASSWORD = $plainPassword

Write-Host ""
Write-Host "Menjalankan semua file SQL di $MIGRATIONS_DIR" -ForegroundColor Cyan

foreach ($script in $scriptFiles) {
    Write-Host "- Running $($script.Name)" -ForegroundColor Cyan
    & $psqlCmd.Path -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -p 5432 -f $script.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Ada error saat menjalankan $($script.Name) (exit code: $LASTEXITCODE)" -ForegroundColor Red
        $env:PGPASSWORD = ""
        exit 1
    }
    Write-Host "  ✓ Selesai $($script.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "✓ Semua migration berhasil dijalankan!" -ForegroundColor Green
$env:PGPASSWORD = ""
