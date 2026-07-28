import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — ExamMate AI" },
      { name: "description", content: "Sign in to your ExamMate AI study workspace." },
      { property: "og:title", content: "Login — ExamMate AI" },
      { property: "og:description", content: "Sign in to your ExamMate AI study workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue with your uploaded materials."
      footer={
        <>
          New to ExamMate AI?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            toast.success("Signed in", { description: "Frontend demo — no backend connected yet." });
            navigate({ to: "/app" });
          }, 700);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" required placeholder="you@college.edu" className="pl-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type="password" required placeholder="••••••••" className="pl-9" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Checkbox id="remember" /> Remember me
          </Label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
