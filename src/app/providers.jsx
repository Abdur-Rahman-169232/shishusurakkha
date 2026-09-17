"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/AuthContext";
import { FirebaseAuthProvider } from "@/lib/FirebaseAuthContext";
import { queryClient } from "@/lib/query-client";
import ScrollToTop from "@/components/ScrollToTop";
import Toaster from "@/components/ui/sonner";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <FirebaseAuthProvider>
        <QueryClientProvider client={queryClient}>
          <ScrollToTop />
          {children}
          <Toaster />
        </QueryClientProvider>
      </FirebaseAuthProvider>
    </AuthProvider>
  );
}
