import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Wallet, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KAS_DAILY_AMOUNT } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";

type Student = { id: string; name: string; absen: string; nisn: string; saldo_awal: number };
type Props = { role: string | null };

const formatRp = (n: number) => "Rp" + n.toLocaleString("id-ID");

export const KasTab = ({ role }: Props) => {
  const isAdmin = role === "admin";
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [paidCount, setPaidCount] = useState<Record<string, number>>({});
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [absen, setAbsen] = useState("");
  const [nisn, setNisn] = useState("");
  const [saldoAwal, setSaldoAwal] = useState("");

  const reset = () => { setName(""); setAbsen(""); setNisn(""); setSaldoAwal(""); };

  const load = useCallback(async (showLoading = true) => {
    const loadId = ++loadIdRef.current;

    if (showLoading || !hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const [studentsResult, paymentsResult, expensesResult] = await withTimeout(
        Promise.all([
          supabase.from("students").select("*").order("absen", { ascending: true }),
          supabase.from("kas_payments").select("student_id"),
          supabase.from("expenses").select("amount"),
        ]),
        "Memuat data kas terlalu lama. Coba refresh halaman."
      );

      if (loadId !== loadIdRef.current) return;

      if (studentsResult.error || paymentsResult.error || expensesResult.error) {
        toast.error("Gagal memuat data kas");
        console.error("Load kas error:", {
          students: studentsResult.error,
          payments: paymentsResult.error,
          expenses: expensesResult.error,
        });
        return;
      }

      const counts = (paymentsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
        acc[row.student_id] = (acc[row.student_id] ?? 0) + 1;
        return acc;
      }, {});

      setStudents(studentsResult.data ?? []);
      setPaidCount(counts);
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

  const removeStudent = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Hapus murid ini? Riwayat kas juga akan terhapus.")) return;

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      toast.error("Gagal menghapus murid");
      console.error("Delete student error:", error);
      return;
    }

    toast.success("Murid dihapus");
    load();
  };

  const totalMasuk =
    Object.values(paidCount).reduce((a, b) => a + b, 0) * KAS_DAILY_AMOUNT +
    students.reduce((a, s) => a + (s.saldo_awal || 0), 0);
  const saldoKas = totalMasuk - totalExpenses;

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Kas Kelas</h2>
          <p className="text-sm text-muted-foreground">
            {students.length} murid · Rp2.000/hari
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-muted animate-scale-in-soft">Masuk: <span className="font-medium text-foreground tabular-nums">{formatRp(totalMasuk)}</span></span>
            <span className="px-2.5 py-1 rounded-md bg-muted animate-scale-in-soft animate-delay-1">Keluar: <span className="font-medium text-destructive tabular-nums">−{formatRp(totalExpenses)}</span></span>
            <span className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground animate-scale-in-soft animate-delay-2">Saldo: <span className="font-semibold tabular-nums">{formatRp(saldoKas)}</span></span>
          </div>
        </div>
        {isAdmin && (
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
                    <Label htmlFor="snisn">NISN</Label>
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
        )}
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
                  <th className="px-4 py-3 font-medium">NISN</th>
                  <th className="px-4 py-3 font-medium text-right">Total Bayar</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const total = (paidCount[s.id] ?? 0) * KAS_DAILY_AMOUNT + (s.saldo_awal || 0);
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
                      <td className="px-4 py-0"><Link to={`/kas/${s.id}`} className="block py-3 text-muted-foreground tabular-nums">{s.nisn || "—"}</Link></td>
                      <td className="px-4 py-0"><Link to={`/kas/${s.id}`} className="block py-3 text-right tabular-nums font-medium">{formatRp(total)}</Link></td>
                      <td className="px-4 py-3 text-center">
                        {isAdmin && (
                          <Button size="icon" variant="ghost" onClick={(e) => removeStudent(e, s.id)} className="size-7 text-muted-foreground hover:text-destructive" aria-label="Hapus murid">
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
