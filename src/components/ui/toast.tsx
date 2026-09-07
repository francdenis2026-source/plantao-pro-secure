import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-2 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col sm:p-4 max-w-[340px] mx-auto sm:mx-0 md:max-w-[380px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-2.5 overflow-hidden rounded-lg border p-2.5 pr-8 sm:gap-3 sm:p-3.5 sm:pr-10 shadow-2xl backdrop-blur-md transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default:
          "border-amber-500/30 bg-zinc-950/95 text-zinc-100 [--toast-accent:theme(colors.amber.400)]",
        success:
          "border-emerald-500/40 bg-zinc-950/95 text-zinc-100 [--toast-accent:theme(colors.emerald.400)]",
        warning:
          "border-amber-500/50 bg-zinc-950/95 text-zinc-100 [--toast-accent:theme(colors.amber.400)]",
        info:
          "border-sky-500/40 bg-zinc-950/95 text-zinc-100 [--toast-accent:theme(colors.sky.400)]",
        destructive:
          "destructive group border-red-500/50 bg-zinc-950/95 text-zinc-100 [--toast-accent:theme(colors.red.400)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type ToastVariant = "default" | "success" | "warning" | "info" | "destructive";

function ToastIcon({ variant = "default" }: { variant?: ToastVariant | null }) {
  const common = "h-4 w-4 sm:h-5 sm:w-5 shrink-0 drop-shadow-[0_0_6px_var(--toast-accent)]";
  const stroke = "var(--toast-accent)";
  switch (variant) {
    case "success":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.5" />
          <path d="m7.5 12.5 3 3 6-7" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path d="M12 3 2.5 20h19L12 3Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 10v5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17.5" r="1" fill={stroke} />
        </svg>
      );
    case "destructive":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.5" />
          <path d="m9 9 6 6M15 9l-6 6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "info":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <circle cx="12" cy="12" r="10" stroke={stroke} strokeWidth="1.5" />
          <path d="M12 11v6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill={stroke} />
        </svg>
      );
    default:
      // Tactical shield emblem for default (Noir & Gold identity)
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="m8.5 12 2.5 2.5L15.5 10" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
  return (
    <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props}>
      {/* Accent side bar */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: "var(--toast-accent)", boxShadow: "0 0 12px var(--toast-accent)" }}
      />
      <ToastIcon variant={variant as ToastVariant} />
      <div className="flex-1 min-w-0">{children}</div>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-transparent px-3 text-xs font-semibold uppercase tracking-wider text-amber-300 ring-offset-background transition-colors hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-zinc-400 opacity-70 transition-opacity hover:text-zinc-100 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-amber-400",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-[13px] sm:text-sm font-semibold tracking-wide text-zinc-50", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("mt-0.5 text-[11px] sm:text-xs leading-snug text-zinc-300", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
