import { Link } from "react-router-dom";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const AuthButton = () => {
  const { session, isAdmin, signOut } = useAuth();

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
    <div className="flex items-center gap-2">
      {isAdmin && (
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
          <ShieldCheck className="size-3" /> Admin
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await signOut();
          toast.success("Keluar");
        }}
        className="gap-1.5"
      >
        <LogOut className="size-4" /> Keluar
      </Button>
    </div>
  );
};
