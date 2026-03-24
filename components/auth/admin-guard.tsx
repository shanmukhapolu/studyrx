"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/");
    }
  }, [isAdmin, loading, router, user]);

  if (loading || !user || !isAdmin) {
    return <div className="p-8 text-muted-foreground">Checking admin access...</div>;
  }

  return <>{children}</>;
}
