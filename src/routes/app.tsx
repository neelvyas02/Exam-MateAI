import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Bell, LogOut } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="glass sticky top-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-t-0 px-3 py-2.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="shrink-0" />
              <span className="truncate text-sm font-medium text-muted-foreground">
                ExamMate AI Workspace
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Sign out">
                <Link to="/login">
                  <LogOut className="h-4 w-4" />
                </Link>
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand text-xs font-bold text-primary-foreground">
                  AR
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
