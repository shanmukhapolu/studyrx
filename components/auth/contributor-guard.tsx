"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function ContributorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isContributor, isAdmin } = useAuth();
  const hasContributorAccess = isContributor || isAdmin;
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !hasContributorAccess)) {
      router.replace("/dashboard");
    }
  }, [hasContributorAccess, loading, router, user]);

  if (loading || !user || !hasContributorAccess) {
    return <div className="p-8 text-muted-foreground">Checking contributor access...</div>;
  }

  return <>{children}</>;
}
