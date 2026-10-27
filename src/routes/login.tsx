import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — ExamMateAI" },
      { name: "description", content: "Log in to your ExamMateAI study workspace." },
      { property: "og:title", content: "Login — ExamMateAI" },
      { property: "og:description", content: "Log in to your ExamMateAI study workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      toast.success(response.message || "Signed in successfully");
      navigate({ to: "/app" });
    } catch (error: any) {
      console.error("[AUTH LOGIN ERROR]", {
        status: error?.statusCode,
        endpoint: "/auth/login",
        message: error?.message,
      });
      const errorText =
        error?.errors?.[0] && !error.errors[0].includes("transient failure")
          ? error.errors[0]
          : error?.message || "Invalid email or password.";
      toast.error(errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to your ExamMateAI account."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-medium text-secondary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.edu"
            className="rounded-md"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold">
              Password
            </Label>
            <Link to="/forgot-password" className="text-xs font-medium text-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-md"
          />
        </div>

        <Button type="submit" className="w-full rounded-none font-bold tracking-wider uppercase text-xs h-10 mt-2" disabled={loading}>
          {loading ? "LOGGING IN..." : "LOG IN"}
        </Button>

        <div className="relative my-3 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-2 text-[11px] font-sans text-muted-foreground uppercase tracking-wider">
            OR
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-none font-bold tracking-wider uppercase text-xs h-10"
          onClick={() => {
            toast.info("Entering ExamMateAI workspace in preview mode.");
            navigate({ to: "/app" });
          }}
        >
          ENTER WORKSPACE AS GUEST
        </Button>
      </form>
    </AuthShell>
  );
}


