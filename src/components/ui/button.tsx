import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button — refresh visual v2
 *
 * Adições (100% aditivas, zero regressão):
 * - `size="xl"` para CTAs mobile (h-12, tap target confortável).
 * - Variantes `success` e `warning` alinhadas aos tokens semânticos.
 * - Micro-press `active:scale-[0.98]` em todos os tamanhos → feedback tátil.
 * - `size="icon"` agora tem `min-h-11 min-w-11 sm:h-10 sm:w-10` → 44px real em touch.
 * - `transition-all` (era só colors) para animar shadow/border/scale suavemente.
 * - Prop opcional `loading` com spinner embutido (evita reinventar em cada tela).
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "ring-offset-background transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98] motion-reduce:active:scale-100",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        success:
          "bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md",
        warning:
          "bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-11 w-11 min-h-11 min-w-11 sm:h-10 sm:w-10 sm:min-h-10 sm:min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Exibe spinner e desabilita o botão. Compatível com asChild=false. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // Loading só funciona quando não é asChild (Slot só aceita 1 filho).
    const showSpinner = loading && !asChild;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || showSpinner}
        aria-busy={showSpinner || undefined}
        {...props}
      >
        {showSpinner ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
