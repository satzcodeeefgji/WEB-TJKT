import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, User, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ProfileMenu = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Berhasil logout");
    } catch (error) {
      toast.error("Gagal logout");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg hover-scale">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <div className="space-y-4 mt-8 animate-fade-in">
          <div className="px-4 py-3 border rounded-lg bg-muted/50 animate-slide-in-left hover-lift-sm">
            <p className="text-xs text-muted-foreground">Akun</p>
            <p className="font-semibold truncate animate-fade-in animate-delay-1">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1 animate-fade-in animate-delay-2">
              {isAdmin ? "👨‍💼 Admin" : "👤 Murid"}
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground px-4 py-2 animate-fade-in animate-delay-1">
              Menu
            </h3>
            <Link
              to="/edit-profile"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-muted transition-colors hover-lift-sm animate-slide-in-left animate-delay-2"
              onClick={() => setOpen(false)}
            >
              <User className="size-4" />
              <span className="text-sm">Edit Profil</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-muted transition-colors hover-lift-sm animate-slide-in-left animate-delay-3"
                onClick={() => setOpen(false)}
              >
                <Database className="size-4" />
                <span className="text-sm">Database Murid</span>
              </Link>
            )}
          </div>

          <div className="border-t pt-4 animate-fade-in animate-delay-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors hover-lift-sm"
            >
              <LogOut className="size-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
