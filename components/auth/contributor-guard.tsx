"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function ContributorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isContributor } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isContributor)) {
      router.replace("/dashboard");
    }
  }, [isContributor, loading, router, user]);

  if (loading || !user || !isContributor) {
    return <div className="p-8 text-muted-foreground">Checking contributor access...</div>;
  }

  return <>{children}</>;
}
