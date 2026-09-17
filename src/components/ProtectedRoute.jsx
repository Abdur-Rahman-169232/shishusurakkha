import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

function ProtectedRoute({ unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authError, hasCheckedAuth, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkUserAuth();
    }
  }, [hasCheckedAuth, checkUserAuth]);

  if (isLoadingAuth || !hasCheckedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}

export default ProtectedRoute;
