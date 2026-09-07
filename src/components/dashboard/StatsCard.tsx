import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: string;
  loading?: boolean;
}

export function StatsCard({ title, value, icon: Icon, description, trend, loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card className="glass glass-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass glass-border hover:border-primary/30 transition-all duration-200 group">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-foreground">{value}</p>
              {trend && (
                <span className={cn(
                  "text-[10px] font-medium",
                  trend.includes('+') || trend === 'positivo' ? 'text-green-400' : 'text-muted-foreground'
                )}>
                  {trend}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
