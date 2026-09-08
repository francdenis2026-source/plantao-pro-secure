import * as React from "react";
import { Minus, Plus, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  suffix?: string;
  disabled?: boolean;
  label?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  className,
  size = "md",
  showValue = true,
  suffix = "",
  disabled = false,
  label,
}: NumberStepperProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(String(value));
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(Number(newValue.toFixed(2)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const newValue = parseFloat(inputValue);
    if (!isNaN(newValue)) {
      onChange(Math.min(max, Math.max(min, newValue)));
    } else {
      setInputValue(String(value));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setInputValue(String(value));
      setIsEditing(false);
    }
  };

  const sizeClasses = {
    sm: {
      container: "h-9",
      button: "h-9 w-9",
      icon: "h-3.5 w-3.5",
      input: "w-16 text-sm h-9",
      value: "text-sm min-w-[60px]",
    },
    md: {
      container: "h-11",
      button: "h-11 w-11",
      icon: "h-4 w-4",
      input: "w-20 text-base h-11",
      value: "text-base min-w-[70px]",
    },
    lg: {
      container: "h-12",
      button: "h-12 w-12",
      icon: "h-5 w-5",
      input: "w-24 text-lg h-12",
      value: "text-lg font-semibold min-w-[80px]",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <div
        className={cn(
          "inline-flex items-center rounded-xl border-2 overflow-hidden transition-all duration-200",
          "bg-gradient-to-b from-card/90 to-card border-border/60",
          "shadow-sm hover:shadow-md hover:border-primary/40",
          disabled && "opacity-50 cursor-not-allowed",
          classes.container
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={cn(
            classes.button,
            "rounded-none border-r border-border/40 text-muted-foreground",
            "hover:bg-destructive/10 hover:text-destructive active:scale-95",
            "transition-all duration-150 ease-out",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          )}
        >
          <Minus className={classes.icon} />
        </Button>

        {showValue && (
          <div 
            className={cn(
              "flex-1 flex items-center justify-center px-2 cursor-pointer group",
              classes.value
            )}
            onClick={() => !disabled && setIsEditing(true)}
          >
            {isEditing ? (
              <Input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className={cn(
                  classes.input,
                  "bg-transparent text-center font-bold text-primary border-none p-0",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                )}
              />
            ) : (
              <div className="flex items-center gap-1">
                <span className="font-bold text-primary tabular-nums">
                  {value.toLocaleString('pt-BR', { minimumFractionDigits: suffix === 'h' || suffix === 'R$' ? 0 : 0 })}
                </span>
                {suffix && (
                  <span className="text-muted-foreground text-xs font-medium">{suffix}</span>
                )}
                <Edit3 className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
              </div>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className={cn(
            classes.button,
            "rounded-none border-l border-border/40 text-muted-foreground",
            "hover:bg-emerald-500/10 hover:text-emerald-500 active:scale-95",
            "transition-all duration-150 ease-out",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          )}
        >
          <Plus className={classes.icon} />
        </Button>
      </div>
    </div>
  );
}
