"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";

const items = [
  { label: "Dashboard", href: "/chapter-admin/dashboard" },
  { label: "Tests", href: "/chapter-admin/tests" },
  { label: "Members", href: "/chapter-admin/members" },
  { label: "Analytics", href: "/chapter-admin/analytics" },
  { label: "Settings", href: "/chapter-admin/settings" },
];

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGuard requiredRole="chapter_admin">
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-r border-border p-4 space-y-2 bg-card/40">
          <h2 className="text-lg font-bold mb-3">Chapter Admin</h2>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded px-3 py-2 text-sm ${pathname === item.href ? "bg-primary/15 font-semibold" : "hover:bg-muted"}`}
            >
              {item.label}
            </Link>
          ))}
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
