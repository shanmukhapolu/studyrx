"use client";

import Image from "next/image";
import { Home, Layers, BarChart3, Users, FileQuestion, LineChart } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

type NavItem = {
  title: string;
  href: string;
  icon: typeof Home;
};

const userNavItems: NavItem[] = [
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

const adminNavItems: NavItem[] = [
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Questions",
    href: "/admin/questions",
    icon: FileQuestion,
  },
  {
    title: "Site Analytics",
    href: "/admin/site-analytics",
    icon: LineChart,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const fallbackName = user?.displayName?.trim() || "Student";
  const resolvedName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || fallbackName;
  const isAdmin = profile?.role === "admin";
  const navItems = isAdmin ? adminNavItems : userNavItems;
  const homeHref = isAdmin ? "/admin/users" : "/dashboard";

  return (
    <Sidebar className={isAdmin ? "admin-sidebar" : undefined}>
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <Link href={homeHref} className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="StudyRx Logo"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-sidebar-foreground">StudyRx</span>
            {isAdmin ? <span className="admin-badge">ADMIN</span> : null}
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
