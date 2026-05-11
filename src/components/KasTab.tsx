import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Wallet, ChevronRight, Clock, AlertCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KAS_DAILY_AMOUNT } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type Student = { id: string; name: string; absen: string; nisn: string; saldo_awal: number };
type Props = { role: string | null };

const formatRp = (n: number) => "Rp" + n.toLocaleString("id-ID");

// Get current date in Jakarta timezone (WIB)
const getJakartaDate = (): string => {
  const date = new Date();
  const jakartaTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return jakartaTime;
};

// Check if a date is weekend (Saturday = 6, Sunday = 0)
const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr + "T00:00:00");
  return date.getDay() === 0 || date.getDay() === 6;
};

// Calculate business days between two dates (excluding weekends and libur dates)
const getBusinessDaysDifference = (
  fromDate: string,
  toDate: string,
  excludedDates: Set<string> = new Set()
): number => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  let count = 0;
  const current = new Date(from);

  while (current < to) {
    current.setDate(current.getDate() + 1);
    const dateKey = current.toISOString().split("T")[0];
    if (!isWeekend(dateKey) && !excludedDates.has(dateKey)) {
      count++;
    }
  }
  return count;
};

export const KasTab = ({ role }: Props) => {
  const isAdmin = role === "admin";
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [paidCount, setPaidCount] = useState<Record<string, number>>({});
  const [lastPaymentDate, setLastPaymentDate] = useState<Record<string, string>>({});
  const [liburDates, setLiburDates] = useState<Record<string, Set<string>>>({});
  const [saldoDeductions, setSaldoDeductions] = useState<Record<string, number>>({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liburDate, setLiburDate] = useState("");
  const [selectedStudentForLibur, setSelectedStudentForLibur] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [absen, setAbsen] = useState("");
  const [nisn, setNisn] = useState("");
  const [saldoAwal, setSaldoAwal] = useState("");
  const [deleteStudentDialogOpen, setDeleteStudentDialogOpen] = useState(false);
  const [pendingDeleteStudentId, setPendingDeleteStudentId] = useState<string | null>(null);
  const [deleteLiburDialogOpen, setDeleteLiburDialogOpen] = useState(false);
  const [pendingDeleteLibur, setPendingDeleteLibur] = useState<{ studentId: string; date: string } | null>(null);

  const reset = () => { setName(""); setAbsen(""); setNisn(""); setSaldoAwal(""); };

  const load = useCallback(async (showLoading = true) => {
    const loadId = ++loadIdRef.current;

    if (showLoading || !hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const loadLiburRecords = async () => {
        const result = await supabase
          .from("libur_records")
          .select("student_id,libur_date")
          .eq("is_active", true);

        if (result.error && (result.error.message?.includes("is_active") || result.error.code === "42703")) {
          return supabase.from("libur_records").select("student_id,libur_date");
        }
        return result;
      };

      const [studentsResult, paymentsResult, expensesResult, liburResult, saldoResult] = await withTimeout(
        Promise.all([
          supabase.from("students").select("*").order("absen", { ascending: true }),
          supabase.from("kas_payments").select("student_id,paid_date"),
          supabase.from("expenses").select("amount"),
          loadLiburRecords(),
          supabase.from("saldo_deductions").select("student_id,deduction_amount"),
        ]),
        "Memuat data kas terlalu lama. Coba refresh halaman."
      );

      if (loadId !== loadIdRef.current) return;

      const missingLiburTable = liburResult.error && (liburResult.error.message?.includes("libur_records") || liburResult.error.message?.includes("table \"libur_records\""));
      const missingSaldoTable = saldoResult.error && (saldoResult.error.message?.includes("saldo_deductions") || saldoResult.error.message?.includes("table \"saldo_deductions\""));

      if (studentsResult.error || paymentsResult.error || expensesResult.error) {
        toast.error("Gagal memuat data kas");
        console.error("Load kas error:", {
          students: studentsResult.error,
          payments: paymentsResult.error,
          expenses: expensesResult.error,
          libur: liburResult.error,
          saldo: saldoResult.error,
        });
        return;
      }

      if (missingLiburTable) {
        toast.warning("Tabel libur_records tidak ditemukan. Fitur libur akan dinonaktifkan sampai migrasi dijalankan.");
      } else if (liburResult.error) {
        toast.error("Gagal memuat jadwal libur");
        console.error("Load libur error:", liburResult.error);
      }

      if (missingSaldoTable) {
        toast.warning("Tabel saldo_deductions tidak ditemukan. Pengurangan saldo tidak akan dihitung sampai migrasi dijalankan.");
      } else if (saldoResult.error) {
        toast.error("Gagal memuat potongan saldo");
        console.error("Load saldo deductions error:", saldoResult.error);
      }

      const counts = (paymentsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.student_id] = (acc[row.student_id] ?? 0) + 1;
        return acc;
      }, {});

      const lastPayments = (paymentsResult.data ?? []).reduce<Record<string, string>>((acc, row) => {
        if (!acc[row.student_id] || row.paid_date > acc[row.student_id]) {
          acc[row.student_id] = row.paid_date;
        }
        return acc;
      }, {});

      const libur = (liburResult.data ?? []).reduce<Record<string, Set<string>>>((acc, row) => {
        if (!acc[row.student_id]) acc[row.student_id] = new Set();
        acc[row.student_id].add(row.libur_date);
        return acc;
      }, {});

      const saldoDed = (saldoResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.student_id] = (acc[row.student_id] ?? 0) + Number(row.deduction_amount);
        return acc;
      }, {});

      setStudents(studentsResult.data ?? []);
      setPaidCount(counts);
      setLastPaymentDate(lastPayments);
      setLiburDates(libur);
      setSaldoDeductions(saldoDed);
      setTotalExpenses((expensesResult.data ?? []).reduce((total, item) => total + Number(item.amount), 0));
      hasLoadedRef.current = true;
    } catch (error) {
      if (loadId !== loadIdRef.current) return;

      const message = error instanceof Error ? error.message : "Gagal memuat data kas";
      toast.error(message);
      console.error("Load kas error:", error);
    } finally {
      if (loadId === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const reloadWhenActive = () => {
      if (document.visibilityState === "visible") {
        load(!hasLoadedRef.current);
      }
    };

    document.addEventListener("visibilitychange", reloadWhenActive);
    window.addEventListener("focus", reloadWhenActive);

    return () => {
      document.removeEventListener("visibilitychange", reloadWhenActive);
      window.removeEventListener("focus", reloadWhenActive);
    };
  }, [load]);

  const addStudent = async () => {
    if (!name.trim() || !absen.trim()) return toast.error("Nama dan No Absen wajib diisi");

    const { error } = await supabase.from("students").insert({
      name: name.trim(),
      absen: absen.trim(),
      nisn: nisn.trim(),
      saldo_awal: Number(saldoAwal || 0),
    });

    if (error) {
      toast.error("Gagal menambahkan murid");
      console.error("Add student error:", error);
      return;
    }

    toast.success("Murid ditambahkan");
    reset();
    setOpen(false);
    load();
  };

  const removeStudent = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      toast.error("Gagal menghapus murid");
      console.error("Delete student error:", error);
      return;
    }

    toast.success("Murid dihapus");
    setDeleteStudentDialogOpen(false);
    setPendingDeleteStudentId(null);
    load();
  };

  const removeLibur = async (studentId: string, date: string) => {
    const { error } = await supabase
      .from("libur_records")
      .delete()
      .eq("student_id", studentId)
      .eq("libur_date", date);

    if (error) {
      toast.error("Gagal menghapus libur");
      console.error("Remove libur error:", error);
      return;
    }

    toast.success("Libur dihapus");
    setDeleteLiburDialogOpen(false);
    setPendingDeleteLibur(null);
    load();
  };

  const markLibur = async (studentId: string, date: string) => {
    const { error } = await supabase.from("libur_records").insert({
      student_id: studentId,
      libur_date: date,
    });

    if (error) {
      toast.error("Gagal menambah libur");
      console.error("Add libur error:", error);
      return;
    }

    toast.success("Libur ditambahkan");
    setSelectedStudentForLibur(null);
    setLiburDate("");
    load();
  };

  // Get students who haven't paid in more than 2 business days
  const getUnpaidOver2Days = (): Student[] => {
    const today = getJakartaDate();
    return students.filter((s) => {
      const lastPaid = lastPaymentDate[s.id];
      if (!lastPaid) return true; // Never paid
      const liburSet = liburDates[s.id] ?? new Set();
      const daysDiff = getBusinessDaysDifference(lastPaid, today, liburSet);
      return daysDiff >= 2;
    });
  };

  const unpaidStudents = getUnpaidOver2Days();

  const totalMasuk =
    Object.values(paidCount).reduce((a, b) => a + b, 0) * (KAS_DAILY_AMOUNT / 2) +
    students.reduce((a, s) => a + (s.saldo_awal || 0), 0);
  const saldoKas = totalMasuk - totalExpenses;

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Kas Kelas</h2>
          <p className="text-sm text-muted-foreground">
            {students.length} murid · Rp2.000/hari (Rp1.000 kas + Rp1.000 tabungan)
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-muted animate-scale-in-soft">Masuk: <span className="font-medium text-foreground tabular-nums">{formatRp(totalMasuk)}</span></span>
            <span className="px-2.5 py-1 rounded-md bg-muted animate-scale-in-soft animate-delay-1">Keluar: <span className="font-medium text-destructive tabular-nums">−{formatRp(totalExpenses)}</span></span>
            <span className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground animate-scale-in-soft animate-delay-2">Saldo: <span className="font-semibold tabular-nums">{formatRp(saldoKas)}</span></span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Button 
                variant="outline"
                onClick={() => navigate("/kas/unpaid")}
                className="flex items-center gap-2"
              >
                <AlertCircle className="size-4" />
                {`Belum Bayar >2H (${unpaidStudents.length})`}
              </Button>
              <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="size-4 mr-1" /> Tambah Murid</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Murid Baru</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sname">Nama</Label>
                      <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="sabsen">No Absen</Label>
                        <Input id="sabsen" value={absen} onChange={(e) => setAbsen(e.target.value)} maxLength={5} inputMode="numeric" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="snisn">NIS</Label>
                        <Input id="snisn" value={nisn} onChange={(e) => setNisn(e.target.value)} maxLength={20} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ssaldo">Saldo Awal (Rp)</Label>
                      <Input id="ssaldo" value={saldoAwal} onChange={(e) => setSaldoAwal(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" />
                      <p className="text-xs text-muted-foreground">Uang kas yang sudah dibayar manual sebelum web ini dibuat.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={addStudent}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
      ) : students.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center bg-muted/30 animate-scale-in-soft">
          <Wallet className="size-10 mx-auto text-muted-foreground mb-3 animate-fade-up" />
          <p className="text-muted-foreground text-sm">
            Belum ada murid. {isAdmin ? "Tambahkan murid untuk mulai." : "Login admin untuk menambahkan."}
          </p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-12">#</th>
                  <th className="px-4 py-3 font-medium w-24">No Absen</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium text-right">Total Bayar</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const total = (paidCount[s.id] ?? 0) * (KAS_DAILY_AMOUNT / 2) + (s.saldo_awal || 0);
                  const saldo = total - (saldoDeductions[s.id] ?? 0);
                  const liburSet = liburDates[s.id] ?? new Set();
                  return (
                    <tr
                      key={s.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors group stagger-row"
                      style={{ animationDelay: `${Math.min(i * 35, 260)}ms` }}
                    >
                      <td className="px-4 py-0"><Link to={`/kas/${s.id}`} className="block py-3 tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</Link></td>
                      <td className="px-4 py-0"><Link to={`/kas/${s.id}`} className="block py-3 tabular-nums">{s.absen}</Link></td>
                      <td className="px-4 py-0">
                        <Link to={`/kas/${s.id}`} className="py-3 font-medium flex items-center gap-1.5 group-hover:text-primary transition-colors">
                          {s.name}
                          <ChevronRight className="size-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-4 py-0"><Link to={`/kas/${s.id}`} className="block py-3 text-right tabular-nums font-medium">{formatRp(total)}</Link></td>
                      <td className="px-4 py-0"><Link to={`/kas/${s.id}`} className="block py-3 text-right tabular-nums font-medium text-primary">{formatRp(saldo)}</Link></td>
                      <td className="px-4 py-0 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {isAdmin && (
                            <>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="size-7"
                                    title="Tandai Libur"
                                    onClick={() => { setSelectedStudentForLibur(s.id); setLiburDate(""); }}
                                  >
                                    <PauseCircle className="size-4 text-muted-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Libur - {s.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="libur-date">Tanggal Libur</Label>
                                      <Input 
                                        id="libur-date" 
                                        type="date" 
                                        value={liburDate}
                                        onChange={(e) => setLiburDate(e.target.value)}
                                      />
                                    </div>
                                    {liburSet.size > 0 && (
                                      <div className="border-t pt-4">
                                        <p className="text-sm font-medium mb-2">Libur yang terdaftar:</p>
                                        <div className="space-y-2">
                                          {Array.from(liburSet).map((date) => (
                                            <div key={date} className="flex items-center justify-between text-sm">
                                              <span>{date}</span>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => { setPendingDeleteLibur({ studentId: s.id, date }); setDeleteLiburDialogOpen(true); }}
                                              >
                                                Hapus
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setLiburDate("")}>Batal</Button>
                                    <Button onClick={() => markLibur(s.id, liburDate)}>Simpan</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => { setPendingDeleteStudentId(s.id); setDeleteStudentDialogOpen(true); }} 
                                className="size-7 text-muted-foreground hover:text-destructive" 
                                title="Hapus murid"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={deleteStudentDialogOpen} onOpenChange={setDeleteStudentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Murid?</AlertDialogTitle>
            <AlertDialogDescription>
              Murid akan dihapus dan semua riwayat kas terkait juga akan terhapus. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDeleteStudentId && removeStudent(pendingDeleteStudentId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteLiburDialogOpen} onOpenChange={setDeleteLiburDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Libur?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal libur untuk tanggal {pendingDeleteLibur?.date} akan dihapus dan kas akan berjalan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDeleteLibur && removeLibur(pendingDeleteLibur.studentId, pendingDeleteLibur.date)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
