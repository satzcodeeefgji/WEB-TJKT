import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const LOGIN_EMAIL_DOMAIN = "xtjkt2.com";

const toEmailFromNisn = (nisn: string) => {
  const clean = nisn.trim().toLowerCase();
  return `${clean}@${LOGIN_EMAIL_DOMAIN}`;
};

const Auth = () => {
  const navigate = useNavigate();
  const { session, loading, signIn, signUp } = useAuth();

  const [nisn, setNisn] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Masuk · X-TJKT 2";
  }, []);

  useEffect(() => {
    if (!loading && session) {
      navigate("/", { replace: true });
    }
  }, [session, loading, navigate]);

  const canSubmit = useMemo(() => {
    return nisn.trim().length > 0 && password.length > 0;
  }, [nisn, password]);

  const handleSignIn = async () => {
    if (busy || !canSubmit) return;
    setBusy(true);

    try {
      const email = toEmailFromNisn(nisn);
      await signIn(email, password);
      navigate("/");
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (busy || !canSubmit) return;

    if (password.length < 6) {
      return toast.error("Password minimal 6 karakter");
    }

    setBusy(true);

    try {
      const email = toEmailFromNisn(nisn);
      await signUp(email, password, nisn);
      // Auto-login after signup
      await signIn(email, password);
      navigate("/");
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-background grid place-items-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background grid place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 animate-slide-in-right">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm animate-scale-in-soft animate-delay-1">
          <div className="relative p-6 sm:p-7 space-y-6">
            <h1 className="text-xl font-bold">Login / Daftar</h1>

            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 mt-5">
                <Input
                  placeholder="NIS"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  disabled={busy}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <Button
                  onClick={handleSignIn}
                  disabled={busy || !canSubmit}
                  className="w-full"
                >
                  {busy ? "Memproses..." : "Masuk"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 mt-5">
                <Input
                  placeholder="NIS"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  disabled={busy}
                />
                <Input
                  type="password"
                  placeholder="Password (minimal 6 karakter)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <Button
                  onClick={handleSignUp}
                  disabled={busy || !canSubmit}
                  className="w-full"
                >
                  {busy ? "Memproses..." : "Daftar"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
