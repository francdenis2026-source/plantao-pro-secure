import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useServerTime } from '@/hooks/useServerTime';

interface GridNode {
  id: number;
  x: number;
  y: number;
  active: boolean;
  intensity: number;
}

interface TacticalGridProps {
  className?: string;
  nodeCount?: number;
  animationSpeed?: 'slow' | 'medium' | 'fast';
}

export function TacticalGrid({ 
  className, 
  nodeCount = 50,
  animationSpeed = 'medium' 
}: TacticalGridProps) {
  const [nodes, setNodes] = useState<GridNode[]>([]);
  const [scanPosition, setScanPosition] = useState(0);
  const now = useServerTime(1000);

  // Initialize grid nodes
  useEffect(() => {
    const newNodes: GridNode[] = Array.from({ length: nodeCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      active: Math.random() > 0.7,
      intensity: 0.3 + Math.random() * 0.7,
    }));
    setNodes(newNodes);
  }, [nodeCount]);

  // Animate scan line
  useEffect(() => {
    const speeds = { slow: 50, medium: 30, fast: 15 };
    const interval = setInterval(() => {
      setScanPosition(prev => (prev + 1) % 100);
    }, speeds[animationSpeed]);

    return () => clearInterval(interval);
  }, [animationSpeed]);

  // Randomly activate/deactivate nodes
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        active: Math.random() > 0.7,
        intensity: node.active ? 0.5 + Math.random() * 0.5 : node.intensity,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      {/* Horizontal grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
        <defs>
          <pattern id="tactical-grid" patternUnits="userSpaceOnUse" width="60" height="60">
            <path 
              d="M 60 0 L 0 0 0 60" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="0.5"
              className="text-primary"
            />
          </pattern>
          <linearGradient id="scan-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#tactical-grid)" />
      </svg>

      {/* Horizontal scan line */}
      <div 
        className="absolute left-0 right-0 h-[2px] transition-all duration-100"
        style={{
          top: `${scanPosition}%`,
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)',
          boxShadow: '0 0 20px hsl(var(--primary) / 0.3)',
        }}
      />

      {/* Vertical scan line (slower) */}
      <div 
        className="absolute top-0 bottom-0 w-[1px] transition-all duration-100"
        style={{
          left: `${(scanPosition * 1.3) % 100}%`,
          background: 'linear-gradient(180deg, transparent, hsl(var(--primary) / 0.3), transparent)',
        }}
      />

      {/* Data nodes */}
      {nodes.map(node => (
        <div
          key={node.id}
          className={cn(
            "absolute w-1 h-1 rounded-full transition-all duration-500",
            node.active 
              ? "bg-primary scale-150" 
              : "bg-primary/30 scale-100"
          )}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            opacity: node.intensity,
            boxShadow: node.active ? '0 0 8px hsl(var(--primary))' : 'none',
          }}
        />
      ))}

      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/30" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/30" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/30" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/30" />

      {/* Status indicators */}
      <div className="absolute top-4 left-14 flex items-center gap-2 text-[9px] font-mono text-primary/50">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        SYS:ONLINE
      </div>
      <div className="absolute top-4 right-14 text-[9px] font-mono text-primary/50">
        {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Rio_Branco' })}
      </div>

      {/* Hexagonal overlay (subtle) */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.02]">
        <defs>
          <pattern id="hexagons-tactical" patternUnits="userSpaceOnUse" width="50" height="43.3">
            <polygon 
              points="25,0 50,12.5 50,37.5 25,50 0,37.5 0,12.5" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="0.5" 
              className="text-primary"
              transform="translate(0, -6)"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons-tactical)" />
      </svg>

      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.6) 100%)',
        }}
      />
    </div>
  );
}