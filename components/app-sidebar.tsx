"use client";

import Image from "next/image";
import { Home, Layers, BarChart3, Users, ShieldCheck, FileQuestion } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";

const studentNavItems = [
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
];

const adminNavItems = [
  { title: "Users", href: "/admin?tab=users", icon: Users },
  { title: "Questions", href: "/admin?tab=questions", icon: FileQuestion },
  { title: "Site Analytics", href: "/admin?tab=analytics", icon: ShieldCheck },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, user, signOut, isAdmin } = useAuth();
  const fallbackName = user?.displayName?.trim() || "Student";
  const resolvedName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || fallbackName;

  return (
    <Sidebar className={isAdmin ? "bg-sidebar/95 border-r-2 border-amber-500/30" : ""}>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="StudyRx Logo"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-sidebar-foreground">StudyRx</span>
            {isAdmin && <span className="text-xs tracking-[0.25em] text-amber-400 font-semibold">ADMIN</span>}
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarMenu className="space-y-2">
          {(isAdmin ? adminNavItems : studentNavItems).map((item) => {
            const itemTab = item.href.split("tab=")[1];
            const active = isAdmin
              ? pathname === "/admin" && searchParams.get("tab") === itemTab
              : pathname === item.href;

            return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.title}
                className="py-6"
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="text-base">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )})}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {resolvedName}
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              signOut();
              router.push("/auth/signin");
            }}
          >
            Sign out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
