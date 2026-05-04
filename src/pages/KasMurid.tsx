import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { KAS_DAILY_AMOUNT, KAS_START, KAS_END } from "@/types";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

type Student = { id: string; name: string; absen: string; nisn: string; saldo_awal: number };
type PaymentKind = "kas" | "tabungan";
type PaidMap = Record<string, Set<PaymentKind>>;
const formatRp = (n: number) => "Rp" + n.toLocaleString("id-ID");

const KasMurid = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [paid, setPaid] = useState<PaidMap>({});
  const [supportsKind, setSupportsKind] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const months = useMemo(() => {
    const start = startOfMonth(parseISO(KAS_START));
    const end = startOfMonth(parseISO(KAS_END));
    const list: Date[] = [];
    let cur = start;
    while (cur <= end) {
      list.push(cur);
      const next = new Date(cur);
      next.setMonth(next.getMonth() + 1);
      cur = next;
    }
    return list.length ? list : [start];
  }, []);

  const load = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const [studentResult, paymentsResult] = await withTimeout(
        Promise.all([
          supabase.from("students").select("*").eq("id", id).single(),
          supabase.from("kas_payments").select("paid_date,kind").eq("student_id", id),
        ]),
        "Memuat detail kas terlalu lama. Coba refresh halaman."
      );

      if (studentResult.error) {
        console.error("Load student error:", studentResult.error);
        setNotFound(true);
        return;
      }

      if (paymentsResult.error) {
        const fallback = paymentsResult.error.message?.includes("kas_payments.kind does not exist");
        if (fallback) {
          const fallbackPayments = await supabase
            .from("kas_payments")
            .select("paid_date")
            .eq("student_id", id);

          if (fallbackPayments.error) {
            toast.error(`Gagal memuat pembayaran: ${fallbackPayments.error.message}`);
            console.error("Load fallback payments error:", fallbackPayments.error);
            return;
          }

          setSupportsKind(false);
          setStudent(studentResult.data);
          setPaid(
            (fallbackPayments.data ?? []).reduce<PaidMap>((acc, payment) => {
              const key = payment.paid_date;
              acc[key] = acc[key] ?? new Set();
              acc[key].add("kas");
              return acc;
            }, {})
          );
          return;
        }

        toast.error(`Gagal memuat pembayaran: ${paymentsResult.error.message}`);
        console.error("Load payments error:", paymentsResult.error);
        return;
      }

      setSupportsKind(true);
      setStudent(studentResult.data);
      setPaid(
        (paymentsResult.data ?? []).reduce<PaidMap>((acc, payment) => {
          const key = payment.paid_date;
          const kind = (payment as any).kind || "kas";
          acc[key] = acc[key] ?? new Set();
          acc[key].add(kind as PaymentKind);
          return acc;
        }, {})
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat detail kas";
      toast.error(message);
      console.error("Load kas detail error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (notFound) return <Navigate to="/" replace />;

  const isPaid = (dateKey: string, kind: PaymentKind) => paid[dateKey]?.has(kind) ?? false;

  const togglePayment = async (dateKey: string, kind: PaymentKind) => {
    if (!isAdmin || !student) return toast.error("Hanya admin yang bisa menandai pembayaran");

    const paymentExists = isPaid(dateKey, kind);
    let error = null;

    if (supportsKind === false && kind === "tabungan") {
      return toast.error("Database belum mendukung tabungan. Jalankan migrasi Supabase.");
    }

    if (paymentExists) {
      const query = supabase.from("kas_payments").delete().eq("student_id", student.id).eq("paid_date", dateKey);
      if (supportsKind !== false) query.eq("kind", kind);
      const result = await query;
      error = result.error;
    } else {
      const payload: Record<string, unknown> = {
        student_id: student.id,
        paid_date: dateKey,
      };
      if (supportsKind !== false) {
        payload.kind = kind;
      }
      const result = await supabase.from("kas_payments").insert(payload as any);
      error = result.error;
    }

    if (error) {
      toast.error("Gagal memperbarui pembayaran");
      console.error("Toggle payment error:", error);
      return;
    }

    setPaid((current) => {
      const next = { ...current };
      const currentSet = new Set(current[dateKey] ?? []);

      if (paymentExists) {
        currentSet.delete(kind);
      } else {
        currentSet.add(kind);
      }

      if (currentSet.size > 0) {
        next[dateKey] = currentSet;
      } else {
        delete next[dateKey];
      }

      return next;
    });

    toast.success("Status pembayaran diperbarui");
  };

  const totalPaidItems = Object.values(paid).reduce((sum, set) => sum + set.size, 0);
  const totalPaid = totalPaidItems * (KAS_DAILY_AMOUNT / 2) + (student?.saldo_awal || 0);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b animate-fade-up">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {loading || !student ? (
          <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
        ) : (
          <>
            <div className="space-y-1 animate-fade-up">
              <p className="text-sm text-muted-foreground">No Absen {student.absen} · NISN {student.nisn || "—"}</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{student.name}</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up animate-delay-1">
              <Stat label="Setoran" value={`${totalPaidItems}x`} />
              <Stat label="Saldo Awal" value={formatRp(student.saldo_awal || 0)} />
              <Stat label="Tarif Harian" value={formatRp(KAS_DAILY_AMOUNT)} />
              <Stat label="Total Bayar" value={formatRp(totalPaid)} highlight />
            </div>
            <p className="text-xs text-muted-foreground">Setiap hari: Rp1.000 kas + Rp1.000 tabungan.</p>

            {!isAdmin && (
              <p className="text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2 animate-scale-in-soft">
                Mode tampilan. Login admin untuk menandai pembayaran.
              </p>
            )}

            <div className="space-y-8">
              {months.map((m) => {
                const days = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) }).filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
                const monthPaid = days.reduce((sum, d) => {
                  const key = format(d, "yyyy-MM-dd");
                  return sum + (isPaid(key, "kas") ? 1 : 0) + (isPaid(key, "tabungan") ? 1 : 0);
                }, 0);
                return (
                  <section key={m.toISOString()} className="space-y-3 animate-fade-up">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {format(m, "MMMM yyyy", { locale: idLocale })}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {monthPaid}/{days.length * 2} item · {formatRp(monthPaid * (KAS_DAILY_AMOUNT / 2))}
                      </span>
                    </div>
                    <div className="border rounded-xl overflow-hidden bg-card table-shell">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="px-4 py-2.5 font-medium w-20">Tanggal</th>
                              <th className="px-4 py-2.5 font-medium w-28">Hari</th>
                              <th className="px-4 py-2.5 font-medium">Nominal</th>
                              <th className="px-4 py-2.5 font-medium text-center w-24">Kas</th>
                              <th className="px-4 py-2.5 font-medium text-center w-28">Tabungan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {days.map((d) => {
                              const key = format(d, "yyyy-MM-dd");
                              const kasPaid = isPaid(key, "kas");
                              const tabunganPaid = isPaid(key, "tabungan");
                              return (
                                <tr
                                  key={key}
                                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors stagger-row"
                                  style={{ animationDelay: `${Math.min(d.getDate() * 12, 260)}ms` }}
                                >
                                  <td className="px-4 py-2 tabular-nums">{format(d, "dd MMM", { locale: idLocale })}</td>
                                  <td className="px-4 py-2 text-muted-foreground">{format(d, "EEEE", { locale: idLocale })}</td>
                                  <td className="px-4 py-2 tabular-nums">{formatRp(KAS_DAILY_AMOUNT)}</td>
                                  <td className="px-4 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => togglePayment(key, "kas")}
                                      disabled={!isAdmin}
                                      aria-pressed={kasPaid}
                                      className={`inline-flex items-center justify-center size-7 rounded-md border transition-all duration-200 hover:scale-105 active:scale-95 ${
                                        kasPaid
                                          ? "bg-success border-success text-success-foreground"
                                          : "bg-background border-input hover:border-foreground/40"
                                      } ${!isAdmin ? "cursor-not-allowed" : "cursor-pointer"}`}
                                    >
                                      {kasPaid && <Check className="size-4" strokeWidth={3} />}
                                    </button>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => togglePayment(key, "tabungan")}
                                      disabled={!isAdmin}
                                      aria-pressed={tabunganPaid}
                                      className={`inline-flex items-center justify-center size-7 rounded-md border transition-all duration-200 hover:scale-105 active:scale-95 ${
                                        tabunganPaid
                                          ? "bg-success border-success text-success-foreground"
                                          : "bg-background border-input hover:border-foreground/40"
                                      } ${!isAdmin ? "cursor-not-allowed" : "cursor-pointer"}`}
                                    >
                                      {tabunganPaid && <Check className="size-4" strokeWidth={3} />}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="pt-4">
              <Button variant="outline" asChild>
                <Link to="/"><ArrowLeft className="size-4 mr-1" /> Kembali ke daftar</Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`border rounded-xl p-4 hover-lift ${highlight ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
    <p className={`text-xs ${highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</p>
    <p className="text-lg font-semibold tabular-nums mt-0.5">{value}</p>
  </div>
);

export default KasMurid;
