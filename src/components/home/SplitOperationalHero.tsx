import { useState, useCallback } from 'react';
import { ClipboardList, Users2, Building2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OperationalStatusRibbon } from './OperationalStatusRibbon';
import { RoundsManagerLazy as RoundsManager } from './RoundsManagerLazy';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';

import iseLogo from '@/assets/logo-ise-socioeducativo.png';
import teamAlfaPhoto from '@/assets/midias/team-alfa.png';
import teamBravoPhoto from '@/assets/midias/team-bravo.png';
import teamCharliePhoto from '@/assets/midias/team-charlie.png';
import teamDeltaPhoto from '@/assets/midias/team-delta.png';

import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';

interface Props {
  onTeamClick: (team: string) => void;
}

const TEAM_PHOTOS: Record<TeamKey, string> = {
  ALFA: teamAlfaPhoto,
  BRAVO: teamBravoPhoto,
  CHARLIE: teamCharliePhoto,
  DELTA: teamDeltaPhoto,
};

const TEAMS: { key: TeamKey; role: string }[] = [
  { key: 'ALFA', role: 'Contenção' },
  { key: 'BRAVO', role: 'Intervenção' },
  { key: 'CHARLIE', role: 'Vigilância' },
  { key: 'DELTA', role: 'Comando' },
];

function TeamCard({
  team, isSelected, onSelect,
}: { team: (typeof TEAMS)[number]; isSelected: boolean; onSelect: (k: TeamKey) => void }) {
  const accent = TEAM_COLORS[team.key].hsl;
  return (
    <button
      type="button"
      data-team={team.key}
      aria-pressed={isSelected}
      onClick={() => onSelect(team.key)}
      className={cn(
        'group relative flex aspect-[4/5] w-full flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300',
        isSelected
          ? 'border-primary shadow-lg shadow-primary/20 -translate-y-1'
          : 'border-border hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      <img
        src={TEAM_PHOTOS[team.key]}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        draggable={false}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
        style={{ background: `hsl(${accent})` }}
      />
      <div className="relative z-10 mt-auto flex flex-col gap-0.5 p-3.5">
        <span className="text-base font-bold tracking-wide text-white">{team.key}</span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">{team.role}</span>
      </div>
    </button>
  );
}

export function SplitOperationalHero({ onTeamClick }: Props) {
  const metrics = useOperationalMetrics();
  const trackedAgents = useOnlineAgents().size;
  const visitorsNow = useVisitorPresence();
  const onlineAgents = Math.max(trackedAgents, visitorsNow);
  const [selectedTeam, setSelectedTeam] = useState<TeamKey | null>(null);

  const handleSelect = useCallback((k: TeamKey) => {
    setSelectedTeam(k);
    onTeamClick(k);
  }, [onTeamClick]);

  const fmt2 = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* Institutional banner */}
      <div
        className="relative overflow-hidden rounded-2xl border border-border"
        style={{ background: 'linear-gradient(120deg, hsl(222 47% 9%) 0%, hsl(213 60% 16%) 55%, hsl(205 70% 20%) 100%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(120% 100% at 100% 0%, transparent 30%, hsl(222 47% 8% / 0.55) 100%)' }}
        />

        <div className="relative z-10 flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-12">
          <div className="flex items-start gap-4 sm:gap-5">
            <img
              src={iseLogo}
              alt="Instituto Socioeducativo do Acre"
              loading="eager"
              decoding="async"
              className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)] sm:h-16 sm:w-16"
              draggable={false}
            />
            <div className="max-w-lg">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Sistema Socioeducativo · Acre
              </span>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                Gestão de plantões e rondas para agentes socioeducativos
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Escalas, banco de horas e rondas georreferenciadas em um único lugar.
              </p>
            </div>
          </div>

          <OperationalStatusRibbon />
        </div>
      </div>

      {/* Gestor de Rondas quick entry (mobile) */}
      <div className="mt-3 sm:hidden">
        <RoundsManager
          customTrigger={
            <button
              type="button"
              aria-label="Abrir Gestor de Rondas"
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Gestor de Rondas</span>
                <span className="block text-xs text-muted-foreground">Ver rondas em andamento</span>
              </span>
            </button>
          }
        />
      </div>

      {/* Quick metrics strip */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <Building2 className="h-4 w-4 text-primary" strokeWidth={2.2} />
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{metrics.loading ? '—' : fmt2(metrics.units)}</p>
          <p className="text-[11px] text-muted-foreground">Unidades</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5">
          <Users2 className="h-4 w-4 text-primary" strokeWidth={2.2} />
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{metrics.loading ? '—' : fmt2(metrics.agentsRegistered || metrics.agentsActive)}</p>
          <p className="text-[11px] text-muted-foreground">Agentes cadastrados</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5">
          <Radio className="h-4 w-4 text-primary" strokeWidth={2.2} />
          <p className="mt-2 text-xl font-bold tabular-nums text-foreground">{fmt2(onlineAgents)}</p>
          <p className="text-[11px] text-muted-foreground">Online agora</p>
        </div>
      </div>

      {/* Team selector */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Selecionar equipe</h2>
          <span className="text-xs font-medium text-muted-foreground">4 equipes</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEAMS.map((t) => (
            <TeamCard key={t.key} team={t} isSelected={selectedTeam === t.key} onSelect={handleSelect} />
          ))}
        </div>
      </div>
    </section>
  );
}
