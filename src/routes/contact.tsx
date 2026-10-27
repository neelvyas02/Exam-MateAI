import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ExamMateAI" },
      {
        name: "description",
        content: "Get in touch with ExamMateAI. Email us at neel.vyas133231@marwadiuniversity.ac.in.",
      },
      { property: "og:title", content: "Contact — ExamMateAI" },
      {
        property: "og:description",
        content: "Get in touch with ExamMateAI. Email us at neel.vyas133231@marwadiuniversity.ac.in.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <PublicHeader />

      <main className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-xl text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground mb-6">
            <Mail className="h-7 w-7 text-secondary" />
          </span>

          <Badge variant="outline" className="rounded-sm text-xs font-sans mb-3">
            Contact
          </Badge>

          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Contact
          </h1>

          <p className="mt-4 font-display text-xl font-medium text-muted-foreground">
            Have a question or feedback?
          </p>

          <Card className="mt-8 rounded-2xl border border-border bg-card shadow-soft">
            <CardContent className="p-8">
              <p className="text-sm text-muted-foreground font-sans mb-2">
                Write to us directly at:
              </p>
              <a
                href="mailto:neel.vyas133231@marwadiuniversity.ac.in"
                className="font-mono text-base font-semibold text-secondary hover:underline break-all"
              >
                neel.vyas133231@marwadiuniversity.ac.in
              </a>
            </CardContent>
          </Card>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
