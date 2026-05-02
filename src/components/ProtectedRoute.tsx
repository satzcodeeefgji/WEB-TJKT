import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { session, loading } = useAuth();
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  useEffect(() => {
    // Give session check extra time to complete
    const timer = setTimeout(() => {
      setInitialCheckComplete(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // While still loading, show loading state
  if (loading || !initialCheckComplete) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated after check complete, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
