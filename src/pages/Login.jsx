import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getSafeReturnTo, readReturnToFromSearch } from "@/lib/authReturnTo";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkUserAuth } = useAuth();
  const returnTo = getSafeReturnTo(location.state?.returnTo, readReturnToFromSearch(location.search));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      await checkUserAuth();
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to sign in. Check your email and password.");
    } finally {
      setPending(false);
    }
  };

  const onGoogle = () => {
    const fromUrl = `${window.location.origin}${returnTo}`;
    base44.auth.loginWithProvider("google", fromUrl);
  };

  return (
    <AuthLayout title="Sign in" subtitle="Health Assistant access for ShishuSurakkha" footer="EPI field use only">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={pending}>
          <GoogleIcon />
          Continue with Google
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-semibold text-primary">
            Forgot password?
          </Link>
          <Link to={`/register?returnTo=${encodeURIComponent(returnTo)}`} className="font-semibold text-primary">
            Create account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;
