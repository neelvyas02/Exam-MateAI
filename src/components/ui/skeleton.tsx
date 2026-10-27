import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-pulse rounded-md bg-[#F1F5F9] dark:bg-muted/60", className)} {...props} />;
}

export { Skeleton };
