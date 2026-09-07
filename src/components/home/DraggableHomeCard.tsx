import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { HomeCardId } from '@/hooks/useHomeCardOrder';

interface DraggableHomeCardProps {
  id: HomeCardId;
  onDropCard: (from: HomeCardId, to: HomeCardId) => void;
  className?: string;
  children: ReactNode;
}

/**
 * Home-card wrapper. Drag-to-reorder was intentionally disabled to prevent
 * accidental layout changes on the homepage. Kept as a pass-through so the
 * existing call sites keep working without touching Index.tsx.
 */
export function DraggableHomeCard({ className, children }: DraggableHomeCardProps) {
  return (
    <div
      draggable={false}
      className={cn('card-touch relative rounded-lg outline-none', className)}
      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
