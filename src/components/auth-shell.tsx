import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
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
    <div className="grid-hero flex min-h-screen flex-col">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="min-w-0">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="animate-rise glass w-full max-w-md rounded-3xl shadow-glow">
          <CardContent className="p-7 sm:p-8">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
