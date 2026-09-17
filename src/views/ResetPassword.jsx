"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is missing a token. Request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      router.replace("/login");
    } catch (err) {
      setError(err?.message || "Unable to reset password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a password you can remember in the field">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Update password"}
        </Button>
        <Link href="/login" className="block text-center text-sm font-semibold text-primary">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
