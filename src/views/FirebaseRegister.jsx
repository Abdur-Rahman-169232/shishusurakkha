"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, getGoogleProvider } from "@/lib/firebase";
import { getSafeReturnTo, readReturnToFromSearch } from "@/lib/authReturnTo";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function FirebaseRegister() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(null, readReturnToFromSearch(`?${searchParams.toString()}`));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const finish = () => router.replace(returnTo);

  const onSubmit = async (event) => {
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
      await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      finish();
    } catch (err) {
      setError(err?.message || "Firebase registration failed.");
    } finally {
      setPending(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    setPending(true);
    try {
      await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
      finish();
    } catch (err) {
      setError(err?.message || "Google sign-up failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title="Firebase register" subtitle="Create a Firebase account without changing the Base44 session">
      <form onSubmit={onSubmit} className="space-y-4">
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
          {pending ? "Creating account..." : "Create Firebase account"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={pending}>
          <GoogleIcon />
          Sign up with Google
        </Button>
        <p className="text-center text-sm">
          Already have Firebase access?{" "}
          <Link href="/firebase/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default FirebaseRegister;
