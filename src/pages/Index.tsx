import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TugasTab } from "@/components/TugasTab";
import { DokumentasiTab } from "@/components/DokumentasiTab";
import { KasTab } from "@/components/KasTab";
import { PengeluaranTab } from "@/components/PengeluaranTab";
import { AuthButton } from "@/components/AuthButton";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { isAdmin, role: authRole, roleError, user } = useAuth();
  const role = isAdmin ? "admin" : "user";

  useEffect(() => {
    document.title = "X-TJKT 2 — Kelas Digital";
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b animate-fade-up">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-primary text-primary-foreground grid place-items-center font-bold text-sm rounded-lg transition-transform duration-300 hover:rotate-3 hover:scale-105">
              X2
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground">SMK · TJKT</span>
              <span className="font-semibold tracking-tight">X-TJKT 2</span>
            </div>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <section className="mb-12 max-w-2xl animate-fade-up animate-delay-1">
          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground mb-4 animate-scale-in-soft animate-delay-2">
            Ruang digital kelas
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Semua tentang kelas <span className="text-primary">X-TJKT 2</span>, di satu tempat.
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            Dokumentasi kenangan, daftar tugas, dan kas kelas — rapi, simpel, dan bisa diakses dari device mana saja.
          </p>
        </section>

        {/* 🔥 DEBUG ROLE */}
        <div className="mb-4 text-sm animate-fade-up animate-delay-2">
          <strong>Role:</strong> {role ?? "null"}
          <div className="mt-1 text-xs text-muted-foreground break-all">
            Auth email: {user?.email ?? "-"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground break-all">
            Auth id: {user?.id ?? "-"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground break-all">
            Profile role: {authRole ?? "-"}
          </div>
          {roleError && (
            <div className="mt-1 text-xs text-destructive break-all">
              Role error: {roleError}
            </div>
          )}
        </div>

        {/* 🔥 PANEL ADMIN */}
        {role === "admin" && (
          <div className="mb-6 p-4 border rounded-xl bg-green-100 animate-scale-in-soft">
            <h2 className="font-bold text-lg mb-2">Panel Admin</h2>
            <p className="text-sm">Admin aktif ✅</p>
          </div>
        )}

        <Tabs defaultValue="dokumentasi" className="w-full animate-fade-up animate-delay-3">
          <TabsList className="bg-muted/60 p-1 h-auto flex-wrap">
            <TabsTrigger value="dokumentasi">Dokumentasi</TabsTrigger>
            <TabsTrigger value="tugas">Tugas</TabsTrigger>
            <TabsTrigger value="kas">Kas</TabsTrigger>
            <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="dokumentasi">
              <DokumentasiTab role={role} />
            </TabsContent>

            <TabsContent value="tugas">
              <TugasTab role={role} />
            </TabsContent>

            <TabsContent value="kas">
              <KasTab role={role} />
            </TabsContent>

            <TabsContent value="pengeluaran">
              <PengeluaranTab role={role} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <footer className="mt-20 border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} X-TJKT 2</span>
          <span>Dibuat untuk kelas, oleh kelas.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
