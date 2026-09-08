import { useMemo } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useRoundsStats } from '@/hooks/useRoundsStats';

import { RoundsManagerLazy as RoundsManager } from './RoundsManagerLazy';
import { TacticalClock } from './TacticalClock';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Barra de controle — acesso rápido ao Gestor de Rondas, indicadores do
 * turno e relógio sincronizado com o servidor.
 */
export function RoundsCommandBar() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const rounds = useRoundsStats();

  const unitLabel = useMemo(() => {
    if (agent?.unit?.name) {
      const municipality = agent.unit.municipality ? ` · ${agent.unit.municipality}` : '';
      return `${agent.unit.name}${municipality}`;
    }
    return '—';
  }, [agent?.unit?.name, agent?.unit?.municipality]);

  const shortUnit = useMemo(() => {
    if (agent?.unit?.municipality) return agent.unit.municipality;
    if (agent?.unit?.name) return agent.unit.name.split(/\s+/).slice(0, 2).join(' ');
    return '—';
  }, [agent?.unit?.name, agent?.unit?.municipality]);

  const handleRefresh = () => {
    try { window.location.reload(); } catch { /* noop */ }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="group"
        aria-label="Controle de rondas, indicadores e horário"
        className="w-full rounded-lg border border-border bg-card/95"
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-stretch px-2 sm:px-3">
          <div className="flex flex-1 items-center gap-3 min-w-0 sm:gap-5">
            <RoundsManager
              customTrigger={
                <button
                  type="button"
                  aria-label="Abrir Gestor de Rondas"
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-3"
                >
                  <ClipboardList className="h-4 w-4" strokeWidth={2.2} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide sm:text-xs">Gestor de Rondas</span>
                </button>
              }
            />

            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Metric label="Em curso" value={String(rounds.active).padStart(2, '0')} live={rounds.active > 0} />
              <Divider className="hidden xs:block" />
              <Metric label="Hoje" value={String(rounds.today).padStart(2, '0')} className="hidden xs:flex" />
              {agent?.team && (
                <>
                  <Divider className="hidden md:block" />
                  <TeamChip team={agent.team} className="hidden md:flex" />
                </>
              )}
              {user && (
                <>
                  <Divider className="hidden lg:block" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="hidden max-w-[160px] cursor-default flex-col leading-tight lg:flex">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unidade</span>
                        <span className="truncate text-[11px] font-semibold text-foreground">{shortUnit}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Unidade</span>
                      <div className="font-semibold">{unitLabel}</div>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-l border-border pl-3 sm:pl-5">
            <button
              type="button"
              onClick={handleRefresh}
              className="group hidden flex-col items-end leading-tight focus-visible:outline-none md:flex"
              aria-label="Atualizar página"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sincronizar</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground transition-colors group-hover:text-primary">
                Atualizar
                <RefreshCw className="h-3 w-3 transition-transform duration-500 group-hover:rotate-180" strokeWidth={2.2} />
              </span>
            </button>

            <TacticalClock accent="hsl(var(--primary))" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ================ atoms ================ */

function Divider({ className }: { className?: string }) {
  return <span aria-hidden className={cn('h-6 w-px bg-border', className)} />;
}

function Metric({
  label,
  value,
  live,
  className,
}: {
  label: string;
  value: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col leading-tight', className)}>
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {live && (
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        )}
        <span className="text-xs font-bold tabular-nums text-foreground">{value}</span>
      </div>
    </div>
  );
}

function TeamChip({ team, className }: { team: string; className?: string }) {
  return (
    <div className={cn('flex flex-col leading-tight', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Equipe</span>
      <span className="self-start rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-primary">
        {team}
      </span>
    </div>
  );
}
