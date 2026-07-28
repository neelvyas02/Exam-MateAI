import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UploadDropzone({
  label,
  hint,
  onFiles,
}: {
  label: string;
  hint: string;
  onFiles?: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    onFiles?.(list);
    toast.success(`${list.length} file(s) selected`, {
      description: "Files stay in the browser — connect a backend to store and process them.",
    });
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
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all",
        dragging
          ? "border-primary bg-accent/60 scale-[1.01]"
          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-accent/30",
      )}
    >
      <span className="bg-brand grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground shadow-glow">
        <UploadCloud className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{label}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
      <Button className="mt-5" onClick={() => inputRef.current?.click()}>
        Choose PDF files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </div>
  );
}
