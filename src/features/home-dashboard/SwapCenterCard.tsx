import { ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { SwapRequestRow } from './useHomeDashboardData';

export function SwapCenterCard({ swaps }: { swaps: SwapRequestRow[] }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ArrowLeftRight className="h-4 w-4 text-primary" /> Central de trocas
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/agent-panel?tab=permutas')}>Ver todas</Button>
      </div>

      {swaps.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma troca pendente.</p>
      ) : (
        <div className="space-y-2">
          {swaps.slice(0, 3).map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {s.requester?.name?.slice(0, 2).toUpperCase() ?? '--'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.requester?.name ?? 'Agente'}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.reason || 'Solicitou uma troca'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
