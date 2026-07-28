import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="bg-brand grid h-9 w-9 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-glow">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className={cn("font-display text-lg font-extrabold tracking-tight", textClassName)}>
        ExamMate <span className="text-gradient">AI</span>
      </span>
    </span>
  );
}
