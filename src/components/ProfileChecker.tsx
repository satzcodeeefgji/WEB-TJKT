import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const ProfileChecker = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const nisn = user.email?.split("@")[0];
        const { data } = await supabase
          .from("students")
          .select("is_profile_complete")
          .eq("nisn", nisn)
          .single();

        if (data?.is_profile_complete === true) {
          setProfileComplete(true);
        } else {
          navigate("/profile-setup", { replace: true });
        }
      } catch (error) {
        console.error("Profile check error:", error);
        navigate("/profile-setup", { replace: true });
      } finally {
        setChecking(false);
      }
    };

    if (!loading) {
      checkProfile();
    }
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-dvh bg-background grid place-items-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (!profileComplete) {
    return null;
  }

  return <>{children}</>;
};
