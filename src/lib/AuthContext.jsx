"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { publicEnv } from "@/lib/env";

const AuthContext = createContext(null);

function classifyAuthError(error) {
  const status = error?.status || error?.statusCode;
  const message = String(error?.message || "").toLowerCase();
  if (status === 403 || message.includes("not registered") || message.includes("user_not_registered")) {
    return "user_not_registered";
  }
  if (status === 401 || message.includes("unauthorized") || message.includes("not authenticated")) {
    return "auth_required";
  }
  return error?.message || "auth_error";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      if (!publicEnv.base44AppId) {
        setUser({ id: "local-ha", email: "ha@local.dev", full_name: "Demo Health Assistant", role: "user" });
        setIsAuthenticated(true);
        setAuthError(null);
        setIsLoadingAuth(false);
        setHasCheckedAuth(true);
        return;
      }
      const currentUser = await base44.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError("auth_required");
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(classifyAuthError(error));
    } finally {
      setIsLoadingAuth(false);
      setHasCheckedAuth(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback(async () => {
    try {
      await base44.auth.logout(window.location.origin + "/login");
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      hasCheckedAuth,
      checkUserAuth,
      logout,
    }),
    [user, isAuthenticated, isLoadingAuth, authError, hasCheckedAuth, checkUserAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export default AuthProvider;
