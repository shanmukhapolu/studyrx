"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/auth/signin?next=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }

    if (profile?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, pathname, profile?.role, router, user]);

  if (loading || !user) {
    return <div className="p-8 text-muted-foreground">Checking authentication...</div>;
  }

  if (profile?.role !== "admin") {
    return <div className="p-8 text-muted-foreground">Checking admin access...</div>;
  }

  return <>{children}</>;
}
