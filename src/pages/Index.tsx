import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TugasTab } from "@/components/TugasTab";
import { DokumentasiTab } from "@/components/DokumentasiTab";
import { KasTab } from "@/components/KasTab";
import { LiburTab } from "../components/LiburTab";
import { PengeluaranTab } from "@/components/PengeluaranTab";
import { AuthButton } from "@/components/AuthButton";
import { ProfileMenu } from "@/components/ProfileMenu";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { isAdmin, role: authRole, roleError, user } = useAuth();
  const role = isAdmin ? "admin" : "user";

  useEffect(() => {
    document.title = "X-TJKT 2 — Kelas Digital";
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b animate-slide-in-left">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 hover-scale">
            <div className="size-9 bg-primary text-primary-foreground grid place-items-center font-bold text-sm rounded-lg transition-transform duration-300 hover:rotate-3 hover:scale-105 animate-bounce-in">
              X2
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground animate-fade-in animate-delay-1">SMK · TJKT</span>
              <span className="font-semibold tracking-tight animate-fade-in animate-delay-2">X-TJKT 2</span>
            </div>
          </div>
          <div className="flex items-center gap-2 animate-slide-in-right">
            <ProfileMenu />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        <section className="mb-12 max-w-2xl animate-fade-up animate-delay-1">
          <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground mb-4 animate-scale-in-soft animate-delay-2 hover-glow">
            Ruang digital kelas
          </span>
          <div className="video-text-bg">
            <video autoPlay muted loop playsInline className="absolute">
              <source src="/aurora1.mp4" type="video/mp4" />
            </video>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] animate-fade-up animate-delay-3 video-text-bg-text">
              Semua tentang kelas X-TJKT 2, di satu tempat.
            </h1>
          </div>
        </section>

        {/* 🔥 PANEL ADMIN */}
        {role === "admin" && (
          <div className="mb-6 p-4 border rounded-xl bg-green-100 animate-bounce-in hover-lift">
            <h2 className="font-bold text-lg mb-2 animate-fade-in">Panel Admin</h2>
            <p className="text-sm animate-fade-in animate-delay-1">Admin aktif ✅</p>
          </div>
        )}

        <Tabs defaultValue="dokumentasi" className="w-full animate-fade-up animate-delay-4">
          <TabsList className="bg-muted/60 p-1 h-auto flex-wrap animate-scale-in-soft animate-delay-5">
            <TabsTrigger value="dokumentasi" className="hover-scale transition-all duration-200">Dokumentasi</TabsTrigger>
            <TabsTrigger value="tugas" className="hover-scale transition-all duration-200">Tugas</TabsTrigger>
            <TabsTrigger value="kas" className="hover-scale transition-all duration-200">Kas</TabsTrigger>
            <TabsTrigger value="libur" className="hover-scale transition-all duration-200">Libur</TabsTrigger>
            <TabsTrigger value="pengeluaran" className="hover-scale transition-all duration-200">Pengeluaran</TabsTrigger>
          </TabsList>

          <div className="mt-8 animate-fade-in animate-delay-5">
            <TabsContent value="dokumentasi">
              <DokumentasiTab role={role} />
            </TabsContent>

            <TabsContent value="tugas">
              <TugasTab role={role} />
            </TabsContent>

            <TabsContent value="kas">
              <KasTab role={role} />
            </TabsContent>

            <TabsContent value="libur">
              <LiburTab role={role} />
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
        </div>
      </footer>
    </div>
  );
};

export default Index;
