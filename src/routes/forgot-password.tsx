import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — ExamMateAI" },
      { name: "description", content: "Request a password reset link for your ExamMateAI account." },
      { property: "og:title", content: "Reset Password — ExamMateAI" },
      {
        property: "og:description",
        content: "Request a password reset link for your ExamMateAI account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <AuthShell
      title="Reset your password."
      subtitle="Enter your registered email address to receive a reset link."
      footer={
        <Link to="/login" className="font-medium text-secondary hover:underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-border bg-accent/20 p-4 text-xs font-sans text-foreground leading-relaxed">
          If an account exists for that address, a reset link has been dispatched.
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
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Email
            </Label>
            <Input id="email" type="email" required placeholder="you@college.edu" className="rounded-md" />
          </div>
          <Button type="submit" className="w-full rounded-none font-bold tracking-wider uppercase text-xs h-10 mt-2">
            SEND RESET LINK
          </Button>
        </form>
      )}
    </AuthShell>
  );
}


