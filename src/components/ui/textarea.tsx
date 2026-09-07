import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Base styles - professional tactical look matching Input
        "flex min-h-[100px] w-full",
        "rounded-lg border-2 border-slate-600/50",
        "bg-slate-800/90 backdrop-blur-sm",
        "px-4 py-3 text-sm font-medium text-slate-100",
        // Placeholder styling
        "placeholder:text-slate-400",
        // Focus states
        "ring-offset-background transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
        "focus-visible:border-amber-500/70",
        // Hover state
        "hover:bg-slate-700/90 hover:border-slate-500/70",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Resize handle styling
        "resize-y",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
