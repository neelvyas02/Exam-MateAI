import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  to: string;
}

export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="min-w-0">
          <Logo />
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <nav className="mr-4 hidden items-center gap-1 lg:flex">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive =
                item.to === "/"
                  ? currentPath === "/"
                  : currentPath.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "px-3.5 py-1.5 text-sm font-medium transition-colors font-sans",
                    isActive
                      ? "bg-accent text-secondary font-semibold border-b-2 border-secondary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <ThemeToggle />

          <Button
            asChild
            variant="outline"
            className="hidden rounded-none font-bold tracking-wider uppercase text-xs sm:inline-flex h-9 px-4"
          >
            <Link to="/login">LOG IN</Link>
          </Button>

          <Button
            asChild
            className="hidden rounded-none font-bold tracking-wider uppercase text-xs sm:inline-flex h-9 px-4"
          >
            <Link to="/register">SIGN UP</Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-none"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="border-t border-border px-6 pb-4 pt-3 lg:hidden bg-background">
          <nav className="flex flex-col space-y-1">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive =
                item.to === "/"
                  ? currentPath === "/"
                  : currentPath.startsWith(item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-none px-3 py-2 text-sm font-medium transition-colors font-sans",
                    isActive
                      ? "bg-accent text-secondary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 flex gap-2">
            <Button
              asChild
              variant="outline"
              className="flex-1 rounded-none font-bold tracking-wider uppercase text-xs h-10"
            >
              <Link to="/login">LOG IN</Link>
            </Button>
            <Button
              asChild
              className="flex-1 rounded-none font-bold tracking-wider uppercase text-xs h-10"
            >
              <Link to="/register">SIGN UP</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-10 bg-background">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Logo />
          <p className="mt-2 text-xs text-muted-foreground font-sans">
            A simple academic study companion.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground font-sans">
          {PUBLIC_NAV_ITEMS.map((item) => (
            <Link key={item.label} to={item.to} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
          <Link to="/login" className="hover:text-foreground">
            Log In
          </Link>
          <Link to="/register" className="hover:text-foreground">
            Sign Up
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-[1200px] px-6 text-[11px] text-muted-foreground font-sans">
        © {new Date().getFullYear()} ExamMateAI. All rights reserved.
      </p>
    </footer>
  );
}
