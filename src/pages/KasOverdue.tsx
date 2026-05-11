import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KAS_DAILY_AMOUNT } from "@/types";

type Student = { id: string; name: string; absen: string; nisn: string; saldo_awal: number };

type PaymentRow = { student_id: string; paid_date: string };

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

const isWeekend = (dateStr: string): boolean => {
  const date = new Date(dateStr + "T00:00:00");
  return date.getDay() === 0 || date.getDay() === 6;
};

const getBusinessDaysDifference = (fromDate: string, toDate: string): number => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  let count = 0;
  const current = new Date(from);

  while (current < to) {
    current.setDate(current.getDate() + 1);
    if (!isWeekend(current.toISOString().split("T")[0])) {
      count++;
    }
  }

  return count;
};

const KasOverdue = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const [studentsResult, paymentsResult] = await Promise.all([
        supabase.from("students").select("id,name,absen,nisn,saldo_awal").order("absen", { ascending: true }),
        supabase.from("kas_payments").select("student_id,paid_date"),
      ]);

      if (studentsResult.error || paymentsResult.error) {
        setError("Gagal memuat data. Silakan coba lagi.");
        console.error("KasOverdue load error", studentsResult.error ?? paymentsResult.error);
      } else {
        setStudents(studentsResult.data ?? []);
        setPayments(paymentsResult.data ?? []);
      }

      setLoading(false);
    };

    load();
  }, []);

  const overdueStudents = useMemo(() => {
    const today = getJakartaDate();
    const lastPaidByStudent = payments.reduce<Record<string, string>>((acc, payment) => {
      if (!acc[payment.student_id] || payment.paid_date > acc[payment.student_id]) {
        acc[payment.student_id] = payment.paid_date;
      }
      return acc;
    }, {});

    return students
      .map((student) => {
        const lastPaid = lastPaidByStudent[student.id] ?? null;
        const daysSince = lastPaid ? getBusinessDaysDifference(lastPaid, today) : Infinity;
        return { student, lastPaid, daysSince };
      })
      .filter((item) => item.lastPaid === null || item.daysSince >= 2)
      .sort((a, b) => Number(a.student.absen) - Number(b.student.absen));
  }, [students, payments]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b animate-fade-up">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
          <Button asChild>
            <Link to="/kas">Daftar Kas</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Murid Belum Bayar</h1>
          <p className="text-sm text-muted-foreground">
            Menampilkan murid dengan pembayaran terakhir lebih dari 2 hari kerja atau belum pernah bayar.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive">{error}</div>
        ) : overdueStudents.length === 0 ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-primary-foreground">Semua murid sudah membayar.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Absen</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Terakhir Bayar</th>
                  <th className="px-4 py-3">Hari Kerja Sejak</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-background">
                {overdueStudents.map(({ student, lastPaid, daysSince }) => (
                  <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{student.absen}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">{student.nisn || "—"}</td>
                    <td className="px-4 py-3">
                      {lastPaid ? format(parseISO(lastPaid), "dd MMM yyyy", { locale: idLocale }) : "Belum pernah bayar"}
                    </td>
                    <td className="px-4 py-3 text-foreground font-semibold">
                      {lastPaid ? `${daysSince} hari kerja` : "Belum bayar"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default KasOverdue;
