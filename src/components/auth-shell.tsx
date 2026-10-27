import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      {/* HEADER */}
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity">
          ExamMate<span className="text-secondary">AI</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* CENTERED AUTH CONTAINER */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md rounded-2xl border border-border bg-card shadow-soft">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1.5 text-xs font-sans text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>
            <div className="space-y-4">{children}</div>
            <div className="mt-6 text-center text-xs font-sans text-muted-foreground pt-4 border-t border-border">{footer}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


