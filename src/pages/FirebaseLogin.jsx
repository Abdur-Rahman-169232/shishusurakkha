import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getSafeReturnTo, readReturnToFromSearch } from "@/lib/authReturnTo";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function FirebaseLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = getSafeReturnTo(location.state?.returnTo, readReturnToFromSearch(location.search));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const finish = () => navigate(returnTo, { replace: true });

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      finish();
    } catch (err) {
      setError(err?.message || "Firebase sign-in failed.");
    } finally {
      setPending(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    setPending(true);
    try {
      await signInWithPopup(auth, googleProvider);
      finish();
    } catch (err) {
      setError(err?.message || "Google sign-in failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title="Firebase sign in" subtitle="Parallel auth surface — does not replace Base44">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in with Firebase"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={pending}>
          <GoogleIcon />
          Continue with Google
        </Button>
        <p className="text-center text-sm">
          Need an account?{" "}
          <Link to={`/firebase/register?returnTo=${encodeURIComponent(returnTo)}`} className="font-semibold text-primary">
            Register
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default FirebaseLogin;
