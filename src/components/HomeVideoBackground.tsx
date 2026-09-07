import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLowMotion } from '@/hooks/useLowMotion';

const isMobileDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(max-width: 768px)').matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

export function HomeVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { resolvedTheme } = useTheme();
  const { lowMotion } = useLowMotion();
  const [isLoaded, setIsLoaded] = useState(false);
  const [enableVideo] = useState(() => !isMobileDevice() && !lowMotion);

  useEffect(() => {
    if (!enableVideo) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});

    const onVis = () => {
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enableVideo]);


  // Theme-specific overlay colors
  const getOverlayStyle = () => {
    switch (resolvedTheme) {
      case 'tactical':
        return 'from-amber-950/90 via-zinc-900/85 to-amber-950/90';
      case 'cyber':
        return 'from-violet-950/90 via-purple-900/85 to-cyan-950/90';
      case 'crimson':
        return 'from-red-950/90 via-rose-900/85 to-red-950/90';
      case 'arctic':
        return 'from-sky-100/90 via-slate-100/85 to-cyan-100/90';
      case 'sovereign':
        return 'from-slate-950/90 via-indigo-950/85 to-slate-950/90';
      case 'nexus':
        return 'from-slate-950/90 via-teal-950/85 to-slate-950/90';
      default:
        return 'from-background/90 via-card/85 to-background/90';
    }
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Video element - disabled on mobile / low-motion to prevent overheating */}
      {enableVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            isLoaded ? 'opacity-40' : 'opacity-0'
          }`}
          src="/__l5e/assets-v1/733ed63b-0276-4fa5-97f6-4e28cd3a90bf/intro.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
        />
      )}

      
      {/* Gradient overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${getOverlayStyle()}`}
      />
      
      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, 
            transparent 0%, 
            hsl(var(--background) / 0.5) 60%,
            hsl(var(--background) / 0.9) 100%
          )`,
        }}
      />
      
      {/* Scanlines effect for cyber/tactical themes */}
      {['cyber', 'tactical', 'nexus'].includes(resolvedTheme) && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          }}
        />
      )}
      
      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
