import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getThemeAssets } from '@/lib/themeAssets';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animate?: boolean;
}

export function AnimatedLogo({ size = 'md', showText = true, animate = true }: AnimatedLogoProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [letterIndex, setLetterIndex] = useState(0);
  const { theme, resolvedTheme, themeConfig } = useTheme();
  const assets = getThemeAssets(theme, resolvedTheme);

  const appName = "PLANTÃO PRO";
  
  useEffect(() => {
    setIsVisible(true);
    
    if (animate && showText) {
      const interval = setInterval(() => {
        setLetterIndex(prev => {
          if (prev < appName.length) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 80);
      return () => clearInterval(interval);
    } else if (showText) {
      setLetterIndex(appName.length);
    }
  }, [animate, showText]);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const MainIcon = assets.mainIcon;
  const [DecorIcon1, DecorIcon2, DecorIcon3] = assets.decorativeIcons;

  return (
    <div className={cn(
      "flex flex-col items-center gap-4",
      isVisible ? "opacity-100" : "opacity-0",
      "transition-opacity duration-500"
    )}>
      {/* Animated Shield Logo */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className={cn(
          "absolute inset-0 rounded-full",
          "bg-gradient-to-r from-primary/40 to-accent/40",
          "blur-xl",
          animate && "animate-pulse"
        )} />
        
        {/* Rotating outer ring */}
        <div className={cn(
          "absolute -inset-4 rounded-full border-2 border-primary/30",
          animate && "animate-[spin_10s_linear_infinite]"
        )}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
        </div>
        
        {/* Second rotating ring */}
        <div className={cn(
          "absolute -inset-2 rounded-full border border-accent/20",
          animate && "animate-[spin_7s_linear_infinite_reverse]"
        )}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
        </div>

        {/* Main icon container */}
        <div className={cn(
          "relative z-10 p-4 rounded-2xl",
          themeConfig.colors.isLight 
            ? "bg-gradient-to-br from-white via-gray-50 to-gray-100 border-primary/30" 
            : "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950",
          "border border-primary/50",
          "shadow-lg shadow-primary/20",
          animate && "animate-[pulse-glow_3s_ease-in-out_infinite]"
        )}>
          <MainIcon className={cn(sizeClasses[size], "text-primary drop-shadow-lg")} />
          
          {/* Inner decorative icons */}
          {DecorIcon1 && <DecorIcon1 className="absolute top-1 right-1 h-3 w-3 text-primary/60" />}
          {DecorIcon2 && <DecorIcon2 className="absolute bottom-1 left-1 h-3 w-3 text-accent/60" />}
          {DecorIcon3 && <DecorIcon3 className="absolute bottom-1 right-1 h-3 w-3 text-primary/40" />}
        </div>
      </div>

      {/* Animated App Name */}
      {showText && (
        <div className="flex flex-col items-center gap-1">
          <h1 
            className={cn(
              textSizeClasses[size],
              "font-bold tracking-wider"
            )}
            style={{ textShadow: assets.logoStyle.textShadow }}
          >
            <span className={cn(
              "bg-gradient-to-r bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]",
              assets.logoStyle.gradient
            )}>
              {appName.slice(0, letterIndex)}
            </span>
            <span className={cn(
              "inline-block w-0.5 h-[1em] bg-primary ml-1",
              letterIndex < appName.length && "animate-pulse"
            )} />
          </h1>
          <p className={cn(
            "text-muted-foreground tracking-widest uppercase",
            size === 'lg' ? 'text-sm' : 'text-xs'
          )}>
            {assets.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
