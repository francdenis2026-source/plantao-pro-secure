import { useState } from 'react';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface RotatingLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  enableHover?: boolean;
  enablePulse?: boolean;
}

export function RotatingLogo({ 
  size = 'md', 
  className,
  enableHover = true,
  enablePulse = true
}: RotatingLogoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { resolvedTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  // Theme-specific glow colors
  const glowColors = {
    tactical: 'rgba(251, 191, 36, 0.6)',
    cyber: 'rgba(6, 182, 212, 0.6)',
    crimson: 'rgba(239, 68, 68, 0.6)',
    arctic: 'rgba(56, 189, 248, 0.5)',
    sovereign: 'rgba(234, 179, 8, 0.6)',
    nexus: 'rgba(34, 197, 94, 0.6)',
    ember: 'rgba(234, 88, 12, 0.7)',
  };

  const glowColor = glowColors[resolvedTheme as keyof typeof glowColors] || glowColors.tactical;

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => enableHover && setIsHovered(true)}
      onMouseLeave={() => enableHover && setIsHovered(false)}
    >
      {/* Outer glow ring */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-500",
          enablePulse && "animate-pulse"
        )}
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(15px)',
          opacity: isHovered ? 0.9 : 0.5,
          transform: isHovered ? 'scale(1.3)' : 'scale(1.1)',
        }}
      />
      
      {/* Rotating ring effect */}
      <div 
        className="absolute inset-[-4px] rounded-full opacity-60"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${glowColor}, transparent)`,
          animation: 'logoSpin 4s linear infinite',
        }}
      />
      
      {/* Inner glow */}
      <div 
        className="absolute inset-2 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${glowColor.replace('0.6', '0.3')}, transparent 60%)`,
        }}
      />
      
      {/* Brasão Sentinela (unificado) */}
      <BrasaoSentinela
        size="100%"
        className={cn(
          "relative z-10 w-full h-full transition-all duration-500",
          isHovered && "scale-110"
        )}
        style={{
          filter: `drop-shadow(0 0 20px ${glowColor})`,
          animation: isHovered ? 'logoFloat 2s ease-in-out infinite' : 'none',
        }}
      />
      
      {/* Sparkle effects */}
      {isHovered && (
        <>
          <div 
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{ 
              top: '10%', 
              right: '20%',
              animation: 'sparkle 0.8s ease-in-out infinite',
              boxShadow: '0 0 6px 2px white'
            }}
          />
          <div 
            className="absolute w-1.5 h-1.5 bg-white rounded-full"
            style={{ 
              bottom: '15%', 
              left: '15%',
              animation: 'sparkle 0.8s ease-in-out infinite 0.3s',
              boxShadow: '0 0 8px 3px white'
            }}
          />
        </>
      )}
    </div>
  );
}

// Add to global CSS
const styles = `
@keyframes logoSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes logoFloat {
  0%, 100% { transform: scale(1.1) translateY(0px); }
  50% { transform: scale(1.1) translateY(-5px); }
}

@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
}
`;

// Inject styles on component load
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  if (!document.head.querySelector('[data-rotating-logo-styles]')) {
    styleSheet.setAttribute('data-rotating-logo-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}
