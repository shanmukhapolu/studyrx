"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ChapterAdminSidebar } from "@/components/chapter-admin-sidebar";

export default function ChapterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="chapter_admin">
      <div className="flex min-h-screen w-full">
        <SidebarProvider>
          <ChapterAdminSidebar />
          <SidebarInset>
            <div className="flex flex-col flex-1">
              <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center gap-3 px-4 md:gap-4 md:px-6">
                  <SidebarTrigger className="md:hidden" />
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-foreground md:text-2xl">Chapter Admin</h1>
                    <p className="text-sm text-muted-foreground">Manage your chapter members, tests, and analytics.</p>
                  </div>
                </div>
              </header>
              <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </AuthGuard>
  );
}
