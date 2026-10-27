import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  label = "Upload anything you study from.",
  hint = "PDF · DOCX · PPTX · XLSX · TXT · Images · More",
  onFiles,
}: {
  label?: string;
  hint?: string;
  onFiles?: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    onFiles?.(list);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all shadow-soft",
        dragging
          ? "border-secondary bg-accent scale-[1.005]"
          : "border-border bg-card hover:border-secondary/50 hover:bg-muted/30",
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
        <UploadCloud className="h-6 w-6 text-secondary" />
      </span>
      <h3 className="mt-4 font-display font-medium text-lg text-foreground">{label}</h3>
      <p className="mt-1 max-w-md text-sm font-sans text-muted-foreground">{hint}</p>
      <Button className="mt-5 rounded-none" onClick={() => inputRef.current?.click()}>
        Drop files here or Browse Files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.md,.html"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
