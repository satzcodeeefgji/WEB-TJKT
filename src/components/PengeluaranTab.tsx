import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

type Expense = { id: string; description: string; expense_date: string; amount: number };
type Props = { role: string | null };

const formatRp = (n: number) => "Rp" + n.toLocaleString("id-ID");

export const PengeluaranTab = ({ role }: Props) => {
  const isAdmin = role === "admin";
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");

  const reset = () => { setDesc(""); setDate(format(new Date(), "yyyy-MM-dd")); setAmount(""); };

  const load = useCallback(async (showLoading = true) => {
    const loadId = ++loadIdRef.current;

    if (showLoading || !hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("expenses")
          .select("*")
          .order("expense_date", { ascending: false }),
        "Memuat pengeluaran terlalu lama. Coba refresh halaman."
      );

      if (loadId !== loadIdRef.current) return;

      if (error) {
        toast.error(`Gagal memuat pengeluaran: ${error.message}`);
        console.error("Load expenses error:", error);
        return;
      }

      setItems(data ?? []);
      hasLoadedRef.current = true;
    } catch (error) {
      if (loadId !== loadIdRef.current) return;

      const message = error instanceof Error ? error.message : "Gagal memuat pengeluaran";
      toast.error(message);
      console.error("Load expenses error:", error);
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

  const addExpense = async () => {
    if (!desc.trim() || !date || !amount) return toast.error("Semua kolom wajib diisi");
    const num = Number(amount);
    if (!num || num <= 0) return toast.error("Jumlah tidak valid");

    const { error } = await supabase.from("expenses").insert({
      description: desc.trim(),
      expense_date: date,
      amount: num,
    });

    if (error) {
      toast.error("Gagal menambahkan pengeluaran");
      console.error("Add expense error:", error);
      return;
    }

    toast.success("Pengeluaran ditambahkan");
    reset(); setOpen(false); load();
  };

  const removeExpense = async (id: string) => {
    if (!confirm("Hapus pengeluaran ini?")) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast.error("Gagal menghapus pengeluaran");
      console.error("Delete expense error:", error);
      return;
    }

    toast.success("Pengeluaran dihapus");
    load();
  };

  const total = items.reduce((a, b) => a + b.amount, 0);

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pengeluaran Kas</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} catatan · Total keluar:{" "}
            <span className="font-medium text-foreground">{formatRp(total)}</span>
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-1" /> Tambah Pengeluaran</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pengeluaran Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edesc">Untuk Apa</Label>
                  <Input id="edesc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Contoh: Beli spidol" maxLength={200} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="edate">Tanggal</Label>
                    <Input id="edate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eamount">Jumlah (Rp)</Label>
                    <Input id="eamount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                <Button onClick={addExpense}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
      ) : items.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center bg-muted/30 animate-scale-in-soft">
          <Receipt className="size-10 mx-auto text-muted-foreground mb-3 animate-fade-up" />
          <p className="text-muted-foreground text-sm">
            Belum ada pengeluaran. {isAdmin ? "Tambahkan untuk mulai mencatat." : "Login admin untuk menambahkan."}
          </p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card table-shell">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-32">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Untuk Apa</th>
                  <th className="px-4 py-3 font-medium text-right w-32">Jumlah</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, index) => (
                  <tr
                    key={it.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors stagger-row"
                    style={{ animationDelay: `${Math.min(index * 35, 260)}ms` }}
                  >
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {format(parseISO(it.expense_date), "dd MMM yyyy", { locale: idLocale })}
                    </td>
                    <td className="px-4 py-3 font-medium">{it.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-destructive">
                      −{formatRp(it.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => removeExpense(it.id)} className="size-7 text-muted-foreground hover:text-destructive" aria-label="Hapus">
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
