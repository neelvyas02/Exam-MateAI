import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className={cn("font-display text-lg font-bold tracking-tight text-foreground", textClassName)}>
        Recall <span className="text-secondary font-medium">AI</span>
      </span>
    </span>
  );
}

