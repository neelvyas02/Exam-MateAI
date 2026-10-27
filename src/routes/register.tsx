import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — ExamMateAI" },
      {
        name: "description",
        content: "Create your ExamMateAI account to get started.",
      },
      { property: "og:title", content: "Create Account — ExamMateAI" },
      {
        property: "og:description",
        content: "Create your ExamMateAI account to get started.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.register({ fullName: name, email, password });
      toast.success(response.message || "Account created successfully");
      navigate({ to: "/app" });
    } catch (error: any) {
      console.error("[AUTH REGISTER ERROR]", {
        status: error?.statusCode,
        endpoint: "/auth/register",
        message: error?.message,
      });
      const errorText =
        error?.errors?.[0] && !error.errors[0].includes("transient failure")
          ? error.errors[0]
          : error?.message || "Registration failed. Please try again.";
      toast.error(errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account."
      subtitle="Sign up for ExamMateAI to manage your study workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-secondary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold">
            Name
          </Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ananya Rao"
            className="rounded-md"
          />
        </div>

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
          <Label htmlFor="password" className="text-xs font-semibold">
            Password
          </Label>
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

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-semibold">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-md"
          />
        </div>

        <Button type="submit" className="w-full rounded-none font-bold tracking-wider uppercase text-xs h-10 mt-2" disabled={loading}>
          {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
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


