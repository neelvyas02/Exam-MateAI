import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — ExamMate AI" },
      {
        name: "description",
        content: "Create an ExamMate AI account to upload study materials and previous year papers.",
      },
      { property: "og:title", content: "Create account — ExamMate AI" },
      {
        property: "og:description",
        content: "Create an ExamMate AI account to upload study materials and previous year papers.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start uploading study material and previous year papers."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
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
            toast.success("Account created", {
              description: "Frontend demo — no backend connected yet.",
            });
            navigate({ to: "/app" });
          }, 700);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="name" required placeholder="Ananya Rao" className="pl-9" />
          </div>
        </div>
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
        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
