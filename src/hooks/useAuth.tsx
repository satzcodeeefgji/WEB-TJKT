import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: "admin" | "user" | null;
  roleError: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nisn: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setRole(null);
    setRoleError(null);
    setIsAdmin(false);
  };

  // Check session on mount
  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          4000,
          "Session check timeout"
        );

        if (!active) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          void fetchUserRole(data.session.user);
        } else {
          // Ensure minimum 500ms loading time for UI stability
          setTimeout(() => {
            if (active) setLoading(false);
          }, 500);
          return;
        }

        // Small delay to ensure UI feels snappy but safe
        setTimeout(() => {
          if (active) setLoading(false);
        }, 100);
      } catch (error) {
        console.error("Error checking session:", error);
        if (active) {
          clearAuthState();
          // Ensure minimum 500ms loading time even on error
          setTimeout(() => {
            if (active) setLoading(false);
          }, 500);
        }
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        void fetchUserRole(session.user);
      } else {
        clearAuthState();
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          const nisn = currentUser.email?.split("@")[0] ?? currentUser.id;
          const { error: createError } = await supabase.from("profiles").upsert({
            id: currentUser.id,
            nisn,
          });

          if (!createError) {
            setRole("user");
            setRoleError(null);
            setIsAdmin(false);
            return;
          }
        }

        console.error("Error fetching user role:", error);
        setRole(null);
        setRoleError(`${error.code ?? "unknown"}: ${error.message}`);
        setIsAdmin(false);
        return;
      }

      setRole(data?.role ?? null);
      setRoleError(null);
      setIsAdmin(data?.role === "admin");
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
      setRoleError(error instanceof Error ? error.message : "Unknown role error");
      setIsAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      toast.success("Berhasil masuk");
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, nisn: string) => {
    try {
      // Sign up with auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      if (!data.user) {
        throw new Error("User tidak ditemukan setelah sign up");
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        nisn: nisn.trim(),
      });

      if (profileError) {
        toast.error("Gagal membuat profil pengguna");
        throw profileError;
      }

      toast.success("Akun berhasil dibuat. Silakan login.");
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    clearAuthState();

    try {
      const { error } = await withTimeout(
        supabase.auth.signOut({ scope: "local" }),
        2000,
        "Sign out timeout"
      );

      if (error) {
        console.error("Supabase sign out error:", error);
      }

      toast.success("Berhasil keluar");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.success("Berhasil keluar");
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, user, role, roleError, isAdmin, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan dalam AuthProvider");
  }
  return context;
};
