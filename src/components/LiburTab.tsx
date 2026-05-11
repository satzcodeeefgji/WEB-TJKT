import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

type Props = { role: string | null };

export const LiburTab = ({ role }: Props) => {
  const { user } = useAuth();
  const isAdmin = role === "admin";
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [liburDates, setLiburDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteDate, setPendingDeleteDate] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const load = useCallback(async (showLoading = true) => {
    const loadId = ++loadIdRef.current;
    if (showLoading || !hasLoadedRef.current) setLoading(true);

    try {
      const loadLiburDates = async () => {
        const result = await supabase
          .from("libur_records")
          .select("libur_date")
          .eq("is_active", true)
          .order("libur_date", { ascending: true });

        if (result.error && (result.error.message?.includes("is_active") || result.error.code === "42703")) {
          return supabase.from("libur_records").select("libur_date").order("libur_date", { ascending: true });
        }
        return result;
      };

      const { data, error } = await withTimeout(
        loadLiburDates(),
        "Memuat jadwal libur terlalu lama. Coba refresh halaman."
      );

      if (loadId !== loadIdRef.current) return;
      if (error) {
        console.error("Load libur dates error:", error);
        toast.error("Gagal memuat jadwal libur");
        return;
      }

      const dates = Array.from(new Set((data ?? []).map((item) => item.libur_date))).sort();
      setLiburDates(dates);
      hasLoadedRef.current = true;
    } catch (error) {
      if (loadId !== loadIdRef.current) return;
      const message = error instanceof Error ? error.message : "Gagal memuat jadwal libur";
      toast.error(message);
      console.error("Load libur error:", error);
    } finally {
      if (loadId === loadIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addGlobalLibur = async () => {
    if (!selectedDate) return toast.error("Pilih tanggal libur terlebih dahulu");

    let existingResult = await supabase
      .from("libur_records")
      .select("student_id")
      .eq("libur_date", selectedDate)
      .eq("is_active", true);

    if (existingResult.error && (existingResult.error.message?.includes("is_active") || existingResult.error.code === "42703")) {
      existingResult = await supabase.from("libur_records").select("student_id").eq("libur_date", selectedDate);
    }

    if (existingResult.error) {
      console.error("Libur existing check error:", existingResult.error);
      const missingTable = existingResult.error.message?.includes("public.libur_records") || existingResult.error.message?.includes("table \"libur_records\""
      );
      if (missingTable) {
        toast.error(
          "Gagal memeriksa jadwal libur: tabel libur_records tidak tersedia. Jalankan migrasi Supabase atau periksa koneksi database."
        );
      } else {
        toast.error("Gagal memeriksa jadwal libur");
      }
      return;
    }

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id");

    if (studentsError) {
      toast.error("Gagal memuat daftar murid");
      console.error("Get students error:", studentsError);
      return;
    }

    if (!students || students.length === 0) {
      toast.error("Tidak ada murid untuk dijadikan libur");
      return;
    }

    const existingIds = new Set(((existingResult.data ?? []) as Array<{ student_id: string }>).map((row) => row.student_id));
    const records = students
      .filter((student) => !existingIds.has(student.id))
      .map((student) => ({ student_id: student.id, libur_date: selectedDate }));

    if (records.length === 0) {
      toast.success("Tanggal libur sudah terdaftar untuk semua murid");
      load();
      return;
    }

    const { error: insertError } = await supabase
      .from("libur_records")
      .insert(records);

    if (insertError) {
      console.error("Insert global libur failed", insertError);
      toast.error(`Gagal menambahkan libur: ${insertError.message}`);
      return;
    }

    toast.success("Libur berhasil ditambahkan untuk semua murid");
    load();
  };

  const removeLibur = async (dateToDelete: string) => {
    console.log("Attempting to deactivate libur for date:", dateToDelete);
    console.log("User role:", role);
    console.log("Is admin:", isAdmin);

    let result = await supabase
      .from("libur_records")
      .update({ is_active: false })
      .eq("libur_date", dateToDelete)
      .eq("is_active", true);

    if (result.error && (result.error.message?.includes("is_active") || result.error.code === "42703")) {
      result = await supabase
        .from("libur_records")
        .delete()
        .eq("libur_date", dateToDelete);
    }

    const { error } = result;
    console.log("Deactivate libur result:", { error, success: !error });

    if (error) {
      console.error("Remove libur failed", error);
      toast.error(`Gagal menonaktifkan jadwal libur: ${error.message}`);
      return;
    }
    toast.success("Jadwal libur dinonaktifkan");
    setDeleteDialogOpen(false);
    setPendingDeleteDate(null);
    load();
  };

  const clearLibur = async () => {
    console.log("Attempting to deactivate all active libur records");
    console.log("User role:", role);
    console.log("Is admin:", isAdmin);

    let result = await supabase
      .from("libur_records")
      .update({ is_active: false })
      .eq("is_active", true);

    if (result.error && (result.error.message?.includes("is_active") || result.error.code === "42703")) {
      result = await supabase.from("libur_records").delete().gt("created_at", "1900-01-01");
    }

    const { error } = result;
    console.log("Clear libur result:", { error, success: !error });

    if (error) {
      console.error("Clear libur failed", error);
      toast.error(`Gagal mengakhiri masa libur: ${error.message}`);
      return;
    }
    toast.success("Masa libur telah diakhiri. Kas kembali berjalan.");
    setClearAllDialogOpen(false);
    load();
  };

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Jadwal Libur</h2>
          <p className="text-sm text-muted-foreground">Tambah tanggal libur untuk semua murid sekaligus. Setelah diatur, tombol Mulai Kas akan muncul untuk mengakhiri libur.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setOpen(true)}>Atur Libur Semua</Button>
            {liburDates.length > 0 && (
              <Button variant="secondary" onClick={() => setClearAllDialogOpen(true)}>Mulai Kas</Button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Memuat jadwal libur...</p>
      ) : liburDates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-muted/20">
          <p className="text-sm text-muted-foreground">Belum ada jadwal libur. Tambahkan tanggal libur untuk menghentikan kas sementara.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Tanggal libur yang terdaftar untuk semua murid:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {liburDates.map((date) => (
                <div key={date} className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{date}</span>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setPendingDeleteDate(date); setDeleteDialogOpen(true); }}
                      className="size-6 text-muted-foreground hover:text-destructive"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSelectedDate(format(new Date(), "yyyy-MM-dd")); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Libur Semua Murid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="libur-date">Tanggal Libur</Label>
              <Input id="libur-date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={addGlobalLibur}>Konfirmasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal Libur?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal libur untuk tanggal {pendingDeleteDate} akan dihapus dan kas akan berjalan kembali untuk murid pada hari tersebut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDeleteDate && removeLibur(pendingDeleteDate)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai Kas Lagi?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua jadwal libur akan dihapus dan kas akan berjalan kembali untuk semua murid. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={clearLibur} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Mulai Kas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
