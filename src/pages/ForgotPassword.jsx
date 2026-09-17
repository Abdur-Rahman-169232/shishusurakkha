import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AuthLayout from "@/components/AuthLayout";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    try {
      await base44.auth.resetPasswordRequest(email.trim());
    } catch {
      // Always show the same generic success to avoid account enumeration.
    } finally {
      setSubmitted(true);
      setPending(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="We will email reset instructions if the account exists">
      {submitted ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            If an account exists for that email, password reset instructions have been sent. Check your inbox and spam folder.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending..." : "Send reset link"}
          </Button>
          <Link to="/login" className="block text-center text-sm font-semibold text-primary">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
