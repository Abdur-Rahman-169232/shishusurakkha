"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

function UnauthenticatedRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }) {
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
    return <UnauthenticatedRedirect />;
  }

  return children;
}

export default ProtectedRoute;
