import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base styles - professional tactical look
      "flex h-11 w-full items-center justify-between gap-2",
      "rounded-lg border-2 border-slate-700/50",
      "bg-slate-800/80 backdrop-blur-sm",
      "px-4 py-2.5 text-sm font-medium text-slate-100",
      // Placeholder styling
      "placeholder:text-slate-400",
      // Focus states — outline-none nos dois pseudo-estados (focus E
      // focus-visible) porque a regra global de foco em index.css (aplicada
      // depois dos utilitários do Tailwind na cascata) sobrescreveria um
      // "focus:outline-none" sozinho quando o foco volta pro trigger via
      // teclado/Radix, duplicando o indicador (o anel do :focus-visible
      // global + o ring do proprio componente ficavam ambos visiveis, um
      // "retangulo" extra ao redor do seletor, mais evidente no tema claro).
      "ring-offset-background transition-[background-color,border-color,box-shadow] duration-200 ease-out",
      "focus:outline-none focus-visible:!outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
      "focus:border-primary/70",
      // Hover state
      "hover:bg-slate-700 hover:border-slate-500/70",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Icon alignment
      "[&>span]:line-clamp-1 [&>span]:text-left [&>span]:flex-1",
      // Data states
      "data-[state=open]:border-primary/70 data-[state=open]:ring-2 data-[state=open]:ring-primary/30",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 text-primary/70 transition-transform duration-200 data-[state=open]:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-pointer items-center justify-center py-2",
      "text-primary hover:text-primary transition-colors",
      "bg-gradient-to-b from-slate-800 to-transparent",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-pointer items-center justify-center py-2",
      "text-primary hover:text-primary transition-colors",
      "bg-gradient-to-t from-slate-800 to-transparent",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Base container
        "relative z-[100] max-h-[320px] min-w-[12rem] origin-[--radix-select-content-transform-origin] overflow-hidden",
        "rounded-lg border-2 border-slate-700/50",
        "bg-slate-800/80 backdrop-blur-md",
        "text-slate-100 shadow-2xl shadow-black/40",
        // Animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        // Position adjustments
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "w-full min-w-[var(--radix-select-trigger-width)] max-h-[min(var(--radix-select-content-available-height),20rem)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label 
    ref={ref} 
    className={cn(
      "py-2 pl-3 pr-2 text-xs font-semibold uppercase tracking-wider",
      "text-primary/80",
      className
    )} 
    {...props} 
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // Base styles
      "relative flex w-full cursor-pointer select-none items-center",
      "rounded-md py-2.5 pl-9 pr-3 text-sm font-medium",
      "outline-none transition-colors duration-150 ease-out",
      // Default state
      "text-slate-200",
      // Hover/Focus state
      "focus:bg-primary/20 focus:text-primary-foreground",
      "hover:bg-slate-700",
      // Highlighted state (keyboard navigation)
      "data-[highlighted]:bg-primary/20 data-[highlighted]:text-primary-foreground",
      // Selected state
      "data-[state=checked]:bg-primary/30 data-[state=checked]:text-primary-foreground",
      // Disabled state
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator 
    ref={ref} 
    className={cn(
      "-mx-1 my-1.5 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent", 
      className
    )} 
    {...props} 
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
