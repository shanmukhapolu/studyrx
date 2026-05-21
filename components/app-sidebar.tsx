"use client";

import Image from "next/image";
import { BarChart3, ChevronUp, FileQuestion, Home, Layers, LogOut, Medal, MessageSquarePlus, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { rtdbGet } from "@/lib/rtdb";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Events",
    href: "/events",
    icon: Layers,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Medal,
  },
  {
    title: "Chapter",
    href: "/chapter",
    icon: ShieldCheck,
  },
  {
    title: "Submit Feedback",
    href: "/submit-feedback",
    icon: MessageSquarePlus,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut, isAdmin, isContributor } = useAuth();
  const [showChapterTab, setShowChapterTab] = useState(false);
  useEffect(() => {
    let mounted = true;
    const loadChapterTab = async () => {
      if (!user?.uid) return;
      try {
        const userData = await rtdbGet<{ chapterCode?: string }>(`users/${user.uid}`, {});
        const code = typeof userData?.chapterCode === "string" ? userData.chapterCode : "";
        if (!code) {
          if (mounted) setShowChapterTab(false);
          return;
        }
        const chapter = await rtdbGet<Record<string, unknown> | null>(`chapters/${code}`, null);
        if (mounted) setShowChapterTab(Boolean(chapter));
      } catch {
        if (mounted) setShowChapterTab(false);
      }
    };
    loadChapterTab();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);
  const hasContributorAccess = isContributor || isAdmin;
  const fallbackName = user?.displayName?.trim() || "Student";
  const resolvedName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || fallbackName;
  const firstLabel = profile?.firstName || resolvedName;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-5">
        <Link href="/dashboard" className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="StudyRx Logo"
            width={40}
            height={40}
            className="h-9 w-9"
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground">StudyRx</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarMenu className="space-y-2">
          {navItems
            .filter((item) => item.href !== "/chapter" || showChapterTab)
            .map((item) => (
            <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.title}
                  className="px-3 py-3"
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        {hasContributorAccess && (
          <div className="mt-6">
            <SidebarSeparator className="mb-3" />
            <p className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70">CONTRIBUTOR</p>
            <SidebarMenu className="mt-2 space-y-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/submit-question"}
                  tooltip="Submit Question"
                  className="px-3 py-3"
                >
                  <Link href="/submit-question">
                    <FileQuestion className="h-5 w-5" />
                    <span className="text-sm">Submit Question</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <details className="group rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{resolvedName}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{user?.email || `${firstLabel}'s account`}</p>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/70 transition-transform group-open:rotate-180" />
          </summary>

          <div className="space-y-2 border-t border-sidebar-border/60 px-3 py-2.5">
            {isAdmin && (
              <Button asChild size="sm" variant="outline" className="w-full justify-start bg-transparent">
                <Link href="/admin">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                signOut();
                router.push("/auth/signin");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </details>
      </SidebarFooter>
    </Sidebar>
  );
}
