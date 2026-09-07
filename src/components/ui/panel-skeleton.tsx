import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PanelSkeletonProps {
  rows?: number;
  showHeader?: boolean;
  showStats?: boolean;
  className?: string;
}

/**
 * Elegant placeholder for loading panels.
 * Uses smooth pulse transitions and tactical spacing.
 */
export function PanelSkeleton({
  rows = 4,
  showHeader = true,
  showStats = true,
  className,
}: PanelSkeletonProps) {
  return (
    <div className={cn('space-y-6 opacity-80', className)}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64 opacity-60" />
        </div>
      )}

      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-2"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2.5 w-1/2 opacity-60" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InlinePanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 p-4 opacity-80">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}
