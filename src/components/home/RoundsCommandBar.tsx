import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useRoundsStats } from '@/hooks/useRoundsStats';

import { RoundsManagerLazy as RoundsManager } from './RoundsManagerLazy';
import { TacticalClock } from './TacticalClock';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';

/**
 * COMANDO UNIFICADO — barra tática única (Mission ID)
 * Substitui as três faixas antigas (TopHudBar, TACTICAL TITLE STRIP e a antiga
 * RoundsCommandBar) por um único HUD horizontal alinhado ao tema de segurança
 * pública socioeducativa.
 *
 * Zonas:
 *   [ MISSION ID · OP // 01 ] · [ GESTOR DE RONDAS ] · [ Telemetria ] · [ Atalho ] · [ Relógio ]
 *
 * Contadores reais (RLS), unidade/equipe do agente logado, relógio sincronizado
 * com o servidor. SVG artesanal — sem imagens raster.
 */
export function RoundsCommandBar() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const rounds = useRoundsStats();
  const navigate = useNavigate();



  const unitLabel = useMemo(() => {
    if (agent?.unit?.name) {
      const municipality = agent.unit.municipality ? ` · ${agent.unit.municipality}` : '';
      return `${agent.unit.name}${municipality}`.toUpperCase();
    }
    return 'FEIJÓ · AC';
  }, [agent?.unit?.name, agent?.unit?.municipality]);

  const shortUnit = useMemo(() => {
    if (agent?.unit?.municipality) return agent.unit.municipality.toUpperCase();
    if (agent?.unit?.name) return agent.unit.name.split(/\s+/).slice(0, 2).join(' ').toUpperCase();
    return 'FEIJÓ · AC';
  }, [agent?.unit?.name, agent?.unit?.municipality]);

  const handleRefresh = () => {
    // Recarrega a página forçando revalidação (bypass de cache) — atualização
    // em tempo real sem depender de navegação SPA.
    try { window.location.reload(); } catch { /* noop */ }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        role="group"
        aria-label="Comando Unificado — Gestor de Rondas, telemetria e horário de rede"
        className={cn(
          'relative w-full',
          'bg-slate-950 border-y border-primary/25',
          'shadow-[0_6px_18px_-12px_hsl(217_62%_2%/0.9)]',
        )}
        style={{ fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
      >
        {/* Cantoneiras SVG (tick corners) — assinatura tática discreta */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full text-primary/50" preserveAspectRatio="none" viewBox="0 0 100 100">
          <g fill="none" stroke="currentColor" strokeWidth="0.35" vectorEffect="non-scaling-stroke">
            <path d="M0.5 3 L0.5 0.5 L3 0.5" />
            <path d="M99.5 3 L99.5 0.5 L97 0.5" />
            <path d="M0.5 97 L0.5 99.5 L3 99.5" />
            <path d="M99.5 97 L99.5 99.5 L97 99.5" />
          </g>
        </svg>
        {/* Linhas de brilho institucional (top/bottom) — estáveis, sem pulso */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,hsl(var(--primary))_30%,hsl(var(--primary))_70%,transparent_100%)] opacity-80" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.5),transparent)]" />

        <div className="relative mx-auto max-w-[1600px] flex items-stretch h-14 px-2 sm:px-3">
          {/* ───── ZONA 1 — MISSION ID ───── */}
          <div className="flex items-center gap-3 pr-3 sm:pr-5 border-r border-slate-800 shrink-0">
            <MissionSeal />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] text-primary/70 tracking-[0.28em] uppercase">MISSION&nbsp;ID</span>
              <div className="flex items-center gap-2">
                <span className="text-primary font-bold text-[11px] sm:text-xs whitespace-nowrap tabular-nums">OP // 01</span>
                <span aria-hidden className="hidden md:inline-block h-3 w-px bg-slate-700" />
                <span className="hidden md:inline text-slate-300 text-[10px] tracking-tight whitespace-nowrap">SISTEMA SOCIOEDUCATIVO</span>
              </div>
            </div>
          </div>

          {/* ───── ZONA 2 — GESTOR + TELEMETRIA ───── */}
          <div className="flex flex-1 items-center px-2 sm:px-4 gap-3 sm:gap-5 min-w-0">
            {/* Trigger customizado do RoundsManager (mantém o modal existente) */}
            <RoundsManager
              customTrigger={
                <button
                  type="button"
                  aria-label="Abrir Gestor de Rondas"
                  className={cn(
                    'group inline-flex items-center gap-2 shrink-0',
                    'bg-primary/10 hover:bg-primary/20 border border-primary/40',
                    'px-2.5 sm:px-3 py-1 rounded-sm',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                  )}
                >
                  <RadarIcon />
                  <span className="text-primary font-bold text-[10px] sm:text-[11px] tracking-[0.2em] uppercase drop-shadow-[0_0_6px_hsl(var(--primary)/0.35)] group-hover:drop-shadow-[0_0_10px_hsl(var(--primary)/0.55)]">
                    Gestor de Rondas
                  </span>
                </button>
              }
            />

            {/* Telemetria */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Metric label="Rondas em curso" value={rounds.active > 0 ? String(rounds.active).padStart(2, '0') : '00'} live={rounds.active > 0} />
              <Divider className="hidden xs:block" />
              <Metric label="Total hoje" value={String(rounds.today).padStart(2, '0')} tone="neutral" className="hidden xs:flex" />
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
                      <div className="hidden lg:flex flex-col leading-tight cursor-default max-w-[160px]">
                        <span className="text-[10px] font-semibold text-amber-200/90 tracking-[0.22em] uppercase">Unidade</span>
                        <span className="text-slate-200 text-[10px] font-semibold uppercase truncate">{shortUnit}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <span className="font-mono uppercase tracking-widest text-[10px] text-muted-foreground">Unidade</span>
                      <div className="font-semibold">{unitLabel}</div>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          </div>

          {/* ───── ZONA 3 — SHORTCUT + RELÓGIO ───── */}
          <div className="flex items-center gap-3 pl-3 sm:pl-5 border-l border-slate-800 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              className="hidden md:flex flex-col items-end leading-tight group focus-visible:outline-none"
              aria-label="Atualizar página em tempo real"
            >
              <span className="text-[10px] font-semibold text-amber-200/90 tracking-[0.22em] uppercase">Sincronizar</span>
              <span className="inline-flex items-center gap-1 text-slate-300 group-hover:text-primary transition-colors text-[10px] font-bold tracking-widest uppercase">
                Atualizar página
                <RefreshCw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-500" strokeWidth={2.4} />
              </span>
            </button>

            {/* Relógio tático — mesmo componente usado no Gestor de Rondas */}
            <TacticalClock accent="hsl(var(--primary))" />

          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ================ atoms ================ */

function Divider({ className }: { className?: string }) {
  return <span aria-hidden className={cn('h-6 w-px bg-slate-800', className)} />;
}

function Metric({
  label,
  value,
  live,
  tone = 'primary',
  className,
}: {
  label: string;
  value: string;
  live?: boolean;
  tone?: 'primary' | 'neutral';
  className?: string;
}) {
  const valueColor = tone === 'primary' ? 'text-slate-100' : 'text-slate-200';
  return (
    <div className={cn('flex flex-col leading-tight min-w-0', className)}>
      <span className="text-[10px] font-semibold text-amber-200/90 tracking-[0.22em] uppercase whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1.5">
        {live && (
          <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
          </span>
        )}
        <span className={cn('font-bold text-xs tabular-nums', valueColor)}>{value}</span>
      </div>
    </div>
  );
}

function TeamChip({ team, className }: { team: string; className?: string }) {
  return (
    <div className={cn('flex flex-col leading-tight', className)}>
      <span className="text-[10px] font-semibold text-amber-200/90 tracking-[0.22em] uppercase">Equipe</span>
      <span className="bg-slate-900 text-primary text-[9px] px-1.5 py-[1px] font-bold border border-primary/30 tracking-[0.2em] uppercase self-start">
        {team}
      </span>
    </div>
  );
}

/* ================ SVG artesanal ================ */

/**
 * Selo de missão — brasão institucional em SVG (dourado sobre grafite).
 * Camadas: anel externo com traços de escala, escudo miolo com chevrons e estrela central.
 */
function MissionSeal() {
  return (
    <span className="relative shrink-0 h-9 w-9 sm:h-10 sm:w-10 inline-flex items-center justify-center" aria-hidden>
      <BrasaoSentinela size="100%" />
    </span>
  );
}

/**
 * Ícone de radar animado — anéis discretos com varredura sutil.
 */
function RadarIcon() {
  return (
    <span className="relative inline-flex h-4 w-4" aria-hidden>
      <Radar className="h-4 w-4 text-primary" strokeWidth={2.2} />
      <span className="absolute inset-0 rounded-full bg-primary/20 blur-[3px] animate-pulse" />
    </span>
  );
}
