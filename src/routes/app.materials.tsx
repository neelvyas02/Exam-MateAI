import { createFileRoute } from "@tanstack/react-router";
import { BookOpenCheck, Eye, FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/page-header";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { studyMaterials as seed } from "@/data/placeholder";

export const Route = createFileRoute("/app/materials")({
  head: () => ({
    meta: [
      { title: "Study Materials — ExamMate AI" },
      { name: "description", content: "Upload and manage the study PDFs your AI assistant reads from." },
      { property: "og:title", content: "Study Materials — ExamMate AI" },
      {
        property: "og:description",
        content: "Upload and manage the study PDFs your AI assistant reads from.",
      },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const [files, setFiles] = useState(seed);

  return (
    <>
      <PageHeader
        icon={BookOpenCheck}
        title="Study Materials"
        description="Your uploaded notes, textbooks and handouts. Every AI answer is sourced from these files."
      />

      <UploadDropzone
        label="Drop your study PDFs here"
        hint="Lecture notes, textbook chapters or handouts. PDF only, up to 50 MB per file."
      />

      {files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No study materials yet"
          description="Upload your first PDF to unlock the AI assistant, summaries and quiz generation."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.map((f, i) => (
            <Card
              key={f.id}
              className="animate-rise rounded-2xl shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" title={f.name}>
                      {f.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.subject}</p>
                  </div>
                  <Badge
                    variant={f.status === "processed" ? "secondary" : "outline"}
                    className="shrink-0 rounded-full text-[11px]"
                  >
                    {f.status === "processed" ? "Processed" : "Processing"}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center">
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Pages</dt>
                    <dd className="text-sm font-semibold">{f.pages}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Size</dt>
                    <dd className="text-sm font-semibold">{f.sizeMb} MB</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">Uploaded</dt>
                    <dd className="truncate text-sm font-semibold">{f.uploadedAt}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => toast.info("Viewer opens here once a backend serves the file.")}
                  >
                    <Eye className="mr-1.5 h-4 w-4" /> View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${f.name}`}
                    className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setFiles((prev) => prev.filter((x) => x.id !== f.id));
                      toast.success("Removed from the list");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
