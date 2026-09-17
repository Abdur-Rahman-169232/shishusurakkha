import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { FirebaseAuthProvider } from "@/lib/FirebaseAuthContext";
import { queryClient } from "@/lib/query-client";
import ScrollToTop from "@/components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import Toaster from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Scanner from "@/pages/Scanner";
import Children from "@/pages/Children";
import ChildDetail from "@/pages/ChildDetail";
import VoiceReminders from "@/pages/VoiceReminders";
import DHIS2Sync from "@/pages/DHIS2Sync";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import FirebaseLogin from "@/pages/FirebaseLogin";
import FirebaseRegister from "@/pages/FirebaseRegister";
import PageNotFound from "@/pages/PageNotFound";

function AuthenticatedApp() {
  const { isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authError === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/firebase/login" element={<FirebaseLogin />} />
      <Route path="/firebase/register" element={<FirebaseRegister />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scanner />} />
          <Route path="/children" element={<Children />} />
          <Route path="/children/:id" element={<ChildDetail />} />
          <Route path="/voice" element={<VoiceReminders />} />
          <Route path="/dhis2" element={<DHIS2Sync />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <FirebaseAuthProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ScrollToTop />
            <AuthenticatedApp />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </FirebaseAuthProvider>
    </AuthProvider>
  );
}

export default App;
