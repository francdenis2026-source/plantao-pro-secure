import { useFontSize } from '@/contexts/FontSizeContext';
import { cn } from '@/lib/utils';
import { Type, Minus, Plus, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const fontSizeOptions = [
  { value: 'small', label: 'Pequeno', scale: '85%', icon: 'A' },
  { value: 'normal', label: 'Normal', scale: '100%', icon: 'A' },
  { value: 'large', label: 'Grande', scale: '115%', icon: 'A' },
  { value: 'xlarge', label: 'Extra Grande', scale: '130%', icon: 'A' },
] as const;

interface FontSizeControlProps {
  variant?: 'button' | 'compact' | 'inline';
  className?: string;
}

export function FontSizeControl({ variant = 'button', className }: FontSizeControlProps) {
  const { fontSize, setFontSize } = useFontSize();

  const currentIndex = fontSizeOptions.findIndex(opt => opt.value === fontSize);

  const handleDecrease = () => {
    if (currentIndex > 0) {
      setFontSize(fontSizeOptions[currentIndex - 1].value);
    }
  };

  const handleIncrease = () => {
    if (currentIndex < fontSizeOptions.length - 1) {
      setFontSize(fontSizeOptions[currentIndex + 1].value);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDecrease}
                disabled={currentIndex === 0}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  "bg-slate-800/60 border border-slate-700/50",
                  "hover:bg-slate-700/60 hover:border-slate-600/50",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "text-slate-400 hover:text-slate-200"
                )}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Diminuir fonte</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/40 rounded-lg border border-slate-700/30">
          <Type className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold text-slate-300 min-w-[32px] text-center">
            {fontSizeOptions[currentIndex].scale}
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleIncrease}
                disabled={currentIndex === fontSizeOptions.length - 1}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  "bg-slate-800/60 border border-slate-700/50",
                  "hover:bg-slate-700/60 hover:border-slate-600/50",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "text-slate-400 hover:text-slate-200"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Aumentar fonte</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Type className="h-4 w-4 text-primary" />
          <span className="font-medium">Tamanho da Fonte</span>
        </div>
        <div className="flex items-center gap-1">
          {fontSizeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFontSize(option.value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all border",
                fontSize === option.value
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-slate-800/40 border-slate-700/30 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200"
              )}
            >
              <span 
                className="font-bold" 
                style={{ 
                  fontSize: option.value === 'small' ? '10px' : 
                           option.value === 'normal' ? '12px' : 
                           option.value === 'large' ? '14px' : '16px' 
                }}
              >
                {option.icon}
              </span>
              <span className="text-[9px]">{option.scale}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default button variant with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative p-2.5 rounded-xl",
            "bg-gradient-to-br from-slate-700/80 to-slate-800/80",
            "border-2 border-slate-600/50 hover:border-primary/50",
            "text-slate-400 hover:text-primary",
            "shadow-lg hover:shadow-primary/20 transition-all duration-300",
            className
          )}
        >
          <Type className="h-4 w-4" />
          {fontSize !== 'normal' && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
              {fontSize === 'small' ? 'P' : fontSize === 'large' ? 'G' : 'XG'}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-3 bg-slate-900/95 border-slate-700/50 backdrop-blur-xl"
        align="end"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-700/50">
            <Type className="h-5 w-5 text-primary" />
            <span className="font-bold text-slate-200">Tamanho da Fonte</span>
          </div>
          
          <div className="space-y-1">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontSize(option.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all",
                  fontSize === option.value
                    ? "bg-primary/20 border border-primary/50"
                    : "bg-slate-800/40 border border-transparent hover:bg-slate-700/40 hover:border-slate-600/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className={cn(
                      "font-bold",
                      fontSize === option.value ? "text-primary" : "text-slate-400"
                    )}
                    style={{ 
                      fontSize: option.value === 'small' ? '12px' : 
                               option.value === 'normal' ? '14px' : 
                               option.value === 'large' ? '16px' : '18px' 
                    }}
                  >
                    Aa
                  </span>
                  <div className="flex flex-col items-start">
                    <span className={cn(
                      "text-sm font-medium",
                      fontSize === option.value ? "text-primary" : "text-slate-300"
                    )}>
                      {option.label}
                    </span>
                    <span className="text-[10px] text-slate-500">{option.scale}</span>
                  </div>
                </div>
                {fontSize === option.value && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 text-center pt-1">
            Ajuste para melhor visualização
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
