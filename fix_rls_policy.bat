@echo off
REM Fix Students RLS Policy - Windows Batch
REM Jalankan file ini dengan double-click atau: fix_rls_policy.bat

setlocal enabledelayedexpansion

set PGHOST=vvvnwkdosyartgoyqqgx.db.supabase.co
set PGPORT=5432
set PGDATABASE=postgres
set PGUSER=postgres
set PGPASSWORD=SATRIA1209!

echo === Fix Students RLS Policy ===
echo.

REM Check if psql is available
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL CLI (psql) tidak ditemukan.
    echo Silakan install PostgreSQL dari https://www.postgresql.org/download/
    pause
    exit /b 1
)

echo Menjalankan fix policy...
echo.

REM Run the SQL fix
psql -f supabase\fix_students_insert_policy.sql

if %errorlevel% equ 0 (
    echo.
    echo ✓ Fix selesai!
    echo ✓ Users sekarang bisa membuat profil mereka sendiri.
) else (
    echo.
    echo ✗ Ada error saat menjalankan fix.
)

pause
endlocal
