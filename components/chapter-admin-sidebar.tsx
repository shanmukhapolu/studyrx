"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronUp, Home, FlaskConical, Users, BarChart3, LogOut, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", href: "/chapter-admin/dashboard", icon: Home },
  { title: "Tests", href: "/chapter-admin/tests", icon: FlaskConical },
  { title: "Members", href: "/chapter-admin/members", icon: Users },
  { title: "Analytics", href: "/chapter-admin/analytics", icon: BarChart3 },
];

export function ChapterAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const fallbackName = user?.displayName?.trim() || "Chapter Admin";
  const resolvedName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || fallbackName;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-5">
        <Link href="/chapter-admin/dashboard" className="flex items-center gap-4">
          <Image src="/logo.png" alt="StudyRx Logo" width={40} height={40} className="h-9 w-9" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-sidebar-foreground">StudyRx</span>
            <span className="text-xs text-sidebar-foreground/70">Chapter Admin</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-3">
        <SidebarMenu className="space-y-2">
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title} className="px-3 py-3">
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <details className="group rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">{resolvedName}</p>
                <p className="truncate text-xs text-sidebar-foreground/70">{user?.email || "chapter admin"}</p>
              </div>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-sidebar-foreground/70 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-sidebar-border/60 px-3 py-2.5">
            <Button asChild size="sm" variant="outline" className="w-full justify-start bg-transparent">
              <Link href="/chapter-admin/settings">Settings</Link>
            </Button>
            <Button size="sm" className="w-full justify-start" onClick={() => { signOut(); router.push('/auth/signin'); }}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </details>
      </SidebarFooter>
    </Sidebar>
  );
}
