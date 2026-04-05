"use client";

import Image from "next/image";
import { BarChart3, ChevronUp, FileQuestion, Home, Layers, LogOut, MessageSquarePlus, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
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
    title: "Submit Feedback",
    href: "/submit-feedback",
    icon: MessageSquarePlus,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut, isAdmin, isContributor } = useAuth();
  const hasContributorAccess = isContributor || isAdmin;
  const fallbackName = user?.displayName?.trim() || "Student";
  const resolvedName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || fallbackName;
  const firstLabel = profile?.firstName || resolvedName;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <Link href="/dashboard" className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="StudyRx Logo"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-sidebar-foreground">StudyRx</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu className="space-y-2">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.title}
                className="py-6"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-base">{item.title}</span>
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
                  className="py-6"
                >
                  <Link href="/submit-question">
                    <FileQuestion className="h-5 w-5" />
                    <span className="text-base">Submit Question</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <details className="group rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{resolvedName}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{user?.email || `${firstLabel}'s account`}</p>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/70 transition-transform group-open:rotate-180" />
          </summary>

          <div className="space-y-2 border-t border-sidebar-border/60 px-3 py-3">
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
