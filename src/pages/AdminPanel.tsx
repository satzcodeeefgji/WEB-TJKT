import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Student = {
  id: string;
  name: string;
  absen: string;
  nisn: string;
  phone: string | null;
  profile_photo_path: string | null;
  saldo_awal: number;
  created_at: string;
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/", { replace: true });
      return;
    }

    const loadStudents = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .order("absen", { ascending: true });

        if (error) {
          toast.error("Gagal memuat data murid");
          console.error("Load error:", error);
          return;
        }

        setStudents(data || []);
      } catch (error) {
        console.error("Error:", error);
        toast.error("Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
    document.title = "Database Murid · X-TJKT 2";
  }, [isAdmin, navigate]);

  const exportToCSV = () => {
    const headers = ["No", "Absen", "Nama", "NIS", "Nomor WA", "Saldo Awal"];
    const data = students.map((s, i) => [
      i + 1,
      s.absen,
      s.name,
      s.nisn,
      s.phone || "-",
      s.saldo_awal || "-",
    ]);

    const csv = [
      headers.join(","),
      ...data.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-murid-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Data berhasil diexport");
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b animate-fade-up">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
          <Button onClick={exportToCSV} size="sm" variant="outline" className="gap-2">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Database Murid</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total {students.length} murid
            </p>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Belum ada data murid</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 text-left font-semibold">No</th>
                      <th className="px-4 py-3 text-left font-semibold">Absen</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama</th>
                      <th className="px-4 py-3 text-left font-semibold">NIS</th>
                      <th className="px-4 py-3 text-left font-semibold">Nomor WA</th>
                      <th className="px-4 py-3 text-left font-semibold">Saldo Awal</th>
                      <th className="px-4 py-3 text-left font-semibold">Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, i) => (
                      <tr key={student.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">{String(i + 1).padStart(2, "0")}</td>
                        <td className="px-4 py-3 font-semibold">{student.absen}</td>
                        <td className="px-4 py-3">{student.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{student.nisn}</td>
                        <td className="px-4 py-3">{student.phone || "-"}</td>
                        <td className="px-4 py-3 tabular-nums">
                          Rp{(student.saldo_awal || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3">
                          {student.profile_photo_path ? (
                            <div className="size-8 rounded bg-muted flex items-center justify-center text-xs">
                              ✓
                            </div>
                          ) : (
                            <div className="size-8 rounded bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                              -
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
