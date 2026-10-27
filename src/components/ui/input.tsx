import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full bg-card px-3 py-2 text-sm font-sans text-foreground transition-all placeholder:text-muted-foreground border-b border-border border-t-transparent border-x-transparent rounded-none focus-visible:outline-none focus-visible:border-primary focus-visible:border-t-border focus-visible:border-x-border focus-visible:rounded-md focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

