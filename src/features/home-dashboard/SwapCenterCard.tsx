import { ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { SwapRequestRow } from './useHomeDashboardData';

function fmtShift(s: { shift_date: string; start_time: string; end_time: string } | null | undefined): string {
  if (!s) return '—';
  const d = new Date(`${s.shift_date}T00:00:00`);
  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${dm} · ${s.start_time.slice(0, 5)} – ${s.end_time.slice(0, 5)}`;
}

export function SwapCenterCard({
  swaps, agentId, isLoading,
}: { swaps: SwapRequestRow[]; agentId?: string; isLoading?: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ArrowLeftRight className="h-4 w-4 text-primary" /> Permutas
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/agent-panel?tab=permutas')}>Ver todas</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="mt-3 h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : swaps.length === 0 ? (
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

              {/* Aceitar/recusar de verdade acontece na tela de Permutas —
                  aqui é só o resumo, então o único destino é levar pra lá
                  (nada de botão de ação que não faz nada). */}
              <div className="mt-3">
                <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => navigate('/agent-panel?tab=permutas')}>
                  {s.requester_id === agentId ? 'Ver detalhes' : 'Analisar solicitação'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
