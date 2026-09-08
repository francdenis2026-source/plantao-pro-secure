import { ArrowLeftRight, Check, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { SwapRequestRow } from './useHomeDashboardData';

function fmtShift(s: { shift_date: string; start_time: string; end_time: string } | null | undefined): string {
  if (!s) return '—';
  const d = new Date(`${s.shift_date}T00:00:00`);
  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${dm} · ${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`;
}

export function SwapCenterCard({ swaps, agentId }: { swaps: SwapRequestRow[]; agentId?: string }) {
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
        <div className="space-y-3">
          {swaps.slice(0, 3).map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={s.requester?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{s.requester?.name?.slice(0, 2).toUpperCase() ?? '--'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{s.requester?.name ?? 'Agente'}</p>
                    <p className="truncate text-xs text-muted-foreground">solicitou uma troca</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {s.requester_id === agentId ? 'Aguardando' : 'Disponível'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Plantão atual</p>
                  <p className="mt-0.5 font-semibold text-foreground">{fmtShift(s.requesterShift)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quer trocar por</p>
                  <p className="mt-0.5 font-semibold text-foreground">{fmtShift(s.targetShift)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {s.requester_id !== agentId && (
                  <Button size="sm" className="h-8 flex-1 gap-1 bg-emerald-600 text-white hover:bg-emerald-600/90">
                    <Check className="h-3.5 w-3.5" /> Aceitar
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => navigate('/agent-panel?tab=permutas')}>
                  Ver detalhes
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" aria-label="Mais opções">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
