import { Link } from "react-router-dom";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const AuthButton = () => {
  const { session, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!session) {
    return (
      <Button variant="outline" size="sm" asChild className="gap-1.5">
        <Link to="/auth">
          <LogIn className="size-4" /> Masuk
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-fade-in">
      {isAdmin && (
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success animate-bounce-in hover-lift">
          <ShieldCheck className="size-3" /> Admin
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          await signOut();
          navigate("/auth", { replace: true });
          setBusy(false);
        }}
        className="gap-1.5 hover-lift"
      >
        <LogOut className="size-4" /> Keluar
      </Button>
    </div>
  );
};
