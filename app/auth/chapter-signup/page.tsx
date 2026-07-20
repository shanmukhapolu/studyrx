"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/;

export default function ChapterSignUpPage() {
  const { signUpChapterAdmin, user, onboardingCompleted } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    router.replace(onboardingCompleted ? "/chapter-admin/dashboard" : "/chapter-admin/onboarding");
  }, [onboardingCompleted, router, user]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!PASSWORD_RULE.test(password)) {
      setError("Password must be at least 6 chars and include uppercase, lowercase, number, and special character.");
      return;
    }

    setLoading(true);
    try {
      await signUpChapterAdmin({ fullName, email, password });
      router.replace("/chapter-admin/onboarding");
    } catch (err) {
      setError((err as Error).message || "Unable to create chapter account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass-card tech-border">
        <CardHeader>
          <CardTitle>Create a Chapter Admin Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Creating chapter admin..." : "Continue to Chapter Setup"}
            </Button>
          </form>

          <p className="text-sm text-center">
            Prefer student account? <Link className="underline" href="/auth/signup">Sign up as Student</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
