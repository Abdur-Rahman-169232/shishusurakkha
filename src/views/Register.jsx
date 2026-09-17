"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { base44 } from "@/api/base44Client";
import { getSafeReturnTo, readReturnToFromSearch } from "@/lib/authReturnTo";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function Register() {
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(null, readReturnToFromSearch(`?${searchParams.toString()}`, "/login"));
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onRegister = async (event) => {
    event.preventDefault();
    setError("");
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
      await base44.auth.register({ email: email.trim(), password });
      setStep("otp");
    } catch (err) {
      setError(err?.message || "Unable to register.");
    } finally {
      setPending(false);
    }
  };

  const onVerify = async (event) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode: otp.trim() });
      const token = result?.access_token || result?.token;
      if (token) {
        base44.auth.setToken(token, true);
      }
      window.location.href = returnTo.startsWith("/login") ? "/login" : returnTo;
    } catch (err) {
      setError(err?.message || "Invalid verification code.");
    } finally {
      setPending(false);
    }
  };

  const onResend = async () => {
    setError("");
    setPending(true);
    try {
      await base44.auth.resendOtp(email.trim());
    } catch (err) {
      setError(err?.message || "Could not resend the code.");
    } finally {
      setPending(false);
    }
  };

  const onGoogle = () => {
    base44.auth.loginWithProvider("google", `${window.location.origin}${returnTo}`);
  };

  if (step === "otp") {
    return (
      <AuthLayout title="Verify email" subtitle={`Enter the OTP sent to ${email}`}>
        <form onSubmit={onVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification code</Label>
            <Input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </div>
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verifying..." : "Verify and continue"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onResend} disabled={pending}>
            Resend OTP
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create account" subtitle="Register as a Health Assistant" footer="You will sign in after email verification">
      <form onSubmit={onRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account..." : "Register"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={pending}>
          <GoogleIcon />
          Sign up with Google
        </Button>
        <p className="text-center text-sm">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default Register;
