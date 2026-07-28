import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ExamMate AI" },
      { name: "description", content: "Request a password reset link for your ExamMate AI account." },
      { property: "og:title", content: "Reset password — ExamMate AI" },
      {
        property: "og:description",
        content: "Request a password reset link for your ExamMate AI account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll send a reset link to your registered email address."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border bg-accent/50 p-5 text-sm text-accent-foreground">
          If an account exists for that address, a reset link is on its way. This is a frontend demo,
          so no email is actually sent.
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success("Reset link requested");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" required placeholder="you@college.edu" className="pl-9" />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-xl">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
