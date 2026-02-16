"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4 text-muted-foreground">Loading sign up...</div>}>
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const { signUp, signInWithGoogleCredential, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    if (user) {
      router.replace(next);
    }
  }, [next, router, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!PASSWORD_RULE.test(password)) {
      setError("Password must be at least 6 chars and include uppercase, lowercase, number, and special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUp({ firstName, lastName, email, password });
      router.replace(next);
    } catch (err) {
      setError((err as Error).message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-card tech-border">
        <CardHeader>
          <CardTitle>Create your StudyRx account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account..." : "Sign Up"}</Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">or</div>
          <GoogleSignInButton onCredential={async (credential) => {
            setError("");
            setLoading(true);
            try {
              await signInWithGoogleCredential(credential);
              router.replace(next);
            } catch (err) {
              setError((err as Error).message || "Google sign up failed");
            } finally {
              setLoading(false);
            }
          }} />

          <p className="text-sm text-center">Already have an account? <Link className="underline" href="/auth/signin">Sign in</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
