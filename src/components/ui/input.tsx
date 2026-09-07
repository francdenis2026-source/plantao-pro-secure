import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, min, onKeyDown, ...props }, ref) => {
    // For number inputs, prevent negative values by default (unless min is explicitly set to allow negatives)
    const effectiveMin = type === "number" && min === undefined ? 0 : min;
    
    // Prevent minus sign input for number fields that don't allow negatives
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (type === "number" && effectiveMin !== undefined && Number(effectiveMin) >= 0) {
        // Prevent minus sign and 'e' for negative exponents
        if (e.key === '-' || e.key === 'e' || e.key === 'E') {
          e.preventDefault();
        }
      }
      onKeyDown?.(e);
    };

    return (
      <input
        type={type}
        min={effectiveMin}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles - professional tactical look
          "flex w-full items-center",
          "h-11 rounded-lg border-2 border-slate-600/50",
          "bg-slate-800/90 backdrop-blur-sm",
          "px-4 py-2.5 text-sm font-medium text-slate-100",
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
          // File input styles
          "file:border-0 file:bg-amber-500/20 file:text-amber-300 file:text-sm file:font-medium",
          "file:mr-4 file:py-2 file:px-4 file:rounded-md file:cursor-pointer",
          "file:hover:bg-amber-500/30 file:transition-colors",
          // Number input - hide spinners
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
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
