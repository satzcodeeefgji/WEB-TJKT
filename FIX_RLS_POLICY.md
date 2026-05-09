# FIX: Row-Level Security Policy Error

## Masalah
Error: `new row violates row-level security policy` ketika user mencoba membuat profil

## Penyebab
RLS policy di tabel `students` hanya mengizinkan **admin** untuk membuat record baru, padahal user biasa perlu membuat record saat profile setup.

## Solusi - 2 Cara untuk menjalankan fix:

### CARA 1: Copy-Paste SQL ke Supabase Dashboard (PALING MUDAH)
1. Buka Supabase Dashboard: https://app.supabase.com
2. Masuk ke project Anda: `legelgunxohxkpqipnwl`
3. Di sidebar kiri, klik **SQL Editor**
4. Klik tombol **New Query**
5. Copy-paste kode di bawah ini:

```sql
-- Allow users to create their own student record during profile setup
-- Drop the old restrictive policy for INSERT
DROP POLICY IF EXISTS "Only admins can create students" ON students;

-- Create new policy that allows authenticated users to create student records
CREATE POLICY "Users can create students"
  ON students FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated (logged in)
    auth.uid() IS NOT NULL
  );
```

6. Klik tombol **Run** (atau tekan `Ctrl+Enter`)
7. Tunggu sebentar, seharusnya tampil "Success"

### CARA 2: Menggunakan PowerShell Script (perlu PostgreSQL CLI)
1. Pastikan PostgreSQL CLI (`psql`) sudah terinstall
2. Buka PowerShell
3. Navigate ke folder project:
   ```powershell
   cd "c:\Users\SATRIA PERMANA PP\Desktop\website kelas"
   ```
4. Jalankan script:
   ```powershell
   .\fix_students_policy.ps1
   ```
5. Masukkan database password saat diminta (ada di Supabase Dashboard > Settings > Database)

---

## Setelah menjalankan fix:
- ✅ User akan bisa membuat profil mereka sendiri
- ✅ Tidak ada lagi error "row-level security policy"
- ✅ Silakan refresh page dan coba lagi

## Jika masih ada error:
1. Refresh browser (Ctrl+F5)
2. Logout dan login ulang
3. Cek Supabase logs: Dashboard > Logs > Postgres

---

**File yang berhubungan:**
- `supabase/fix_students_insert_policy.sql` - Script SQL yang dijalankan
- `fix_students_policy.ps1` - PowerShell script untuk Windows users
- `src/pages/ProfileSetup.tsx` - Page yang membuat profil
