"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4 text-muted-foreground">Loading sign in...</div>}>
      <SignInContent />
    </Suspense>
  );
}

function SignInContent() {
  const { signIn, signInWithGoogleCredential, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-card tech-border">
        <CardHeader>
          <CardTitle>Sign In to StudyRx</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">or</div>
          <GoogleSignInButton onCredential={async (credential) => {
            setError("");
            setLoading(true);
            try {
              await signInWithGoogleCredential(credential);
              router.replace(next);
            } catch (err) {
              setError((err as Error).message || "Google sign in failed");
            } finally {
              setLoading(false);
            }
          }} />

          <p className="text-sm text-center">New here? <Link className="underline" href="/auth/signup">Create an account</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
