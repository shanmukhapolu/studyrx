"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function AuthGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "chapter_admin" }) {
  const { user, loading, onboardingCompleted, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/auth/signin?next=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }

    if (!loading && user && onboardingCompleted !== true) {
      if (requiredRole === "chapter_admin") {
        if (pathname !== "/chapter-admin/onboarding") {
          router.replace("/chapter-admin/onboarding");
        }
        return;
      }
      if (pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
      return;
    }
    if (!loading && user && requiredRole === "chapter_admin" && role !== "chapter_admin" && pathname.startsWith("/chapter-admin")) {
      router.replace("/dashboard");
    }
    if (!loading && user && role === "chapter_admin" && pathname === "/onboarding") {
      router.replace("/chapter-admin/onboarding");
    }
  }, [loading, onboardingCompleted, pathname, requiredRole, role, router, user]);

  if (loading || !user || onboardingCompleted !== true) {
    return <div className="p-8 text-muted-foreground">Checking authentication...</div>;
  }

  return <>{children}</>;
}
