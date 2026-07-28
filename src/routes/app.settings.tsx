import { createFileRoute } from "@tanstack/react-router";
import { Info, KeyRound, Moon, Settings as SettingsIcon, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ExamMate AI" },
      {
        name: "description",
        content: "Manage your ExamMate AI profile, appearance, notifications and optional API key.",
      },
      { property: "og:title", content: "Settings — ExamMate AI" },
      {
        property: "og:description",
        content: "Manage your ExamMate AI profile, appearance, notifications and optional API key.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <PageHeader
        icon={SettingsIcon}
        title="Settings"
        description="Profile, appearance, notifications and integration preferences."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Full name</Label>
              <Input id="fullname" defaultValue="Ananya Rao" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mail">Email</Label>
              <Input id="mail" type="email" defaultValue="ananya@college.edu" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course / branch</Label>
              <Input id="course" defaultValue="B.E. Computer Science" className="rounded-xl" />
            </div>
            <Button className="rounded-xl" onClick={() => toast.success("Profile saved locally")}>
              Save changes
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Moon className="h-4 w-4 text-primary" /> Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Easier on the eyes for late-night revision.</p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Upload processing complete", desc: "Notify me when a PDF finishes indexing." },
                { label: "Paper analysis ready", desc: "Notify me when repeated-question analysis finishes." },
                { label: "Product updates", desc: "Occasional emails about new features." },
              ].map((n, i) => (
                <div key={n.label}>
                  {i > 0 ? <Separator className="mb-4" /> : null}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <Switch defaultChecked={i < 2} aria-label={n.label} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> API key
              <Badge variant="outline" className="rounded-full text-[11px]">
                Optional
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reserved for a future backend integration. Nothing is stored or sent in this build.
            </p>
            <Input placeholder="Paste your key here" className="rounded-xl font-mono" />
            <Button variant="outline" className="rounded-xl" onClick={() => toast.info("Not connected yet")}>
              Save key
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-primary" /> About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">ExamMate AI</span> — intelligent question
              paper analysis and study assistant.
            </p>
            <p>Version 1.0.0 · Frontend preview build</p>
            <p>
              Every feature is designed around documents you upload, so answers stay traceable to a
              source PDF and page number.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
