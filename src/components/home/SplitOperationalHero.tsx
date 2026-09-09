import { useState, useCallback } from 'react';
import { ClipboardList, Users2, Building2, Radio, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OperationalStatusRibbon } from './OperationalStatusRibbon';
import { RoundsManagerLazy as RoundsManager } from './RoundsManagerLazy';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';

import heroBanner from '@/assets/midias/hero-banner.webp';
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

const TEAMS: { key: TeamKey }[] = [
  { key: 'ALFA' },
  { key: 'BRAVO' },
  { key: 'CHARLIE' },
  { key: 'DELTA' },
];

// Cards oficiais (equipe_*_card.png) já trazem brasão, nome da equipe e
// lema aplicados pelo design — o card só precisa exibir a arte e sinalizar
// seleção, sem duplicar texto por cima.
function TeamCard({
  team, isSelected, onSelect,
}: { team: (typeof TEAMS)[number]; isSelected: boolean; onSelect: (k: TeamKey) => void }) {
  const accent = TEAM_COLORS[team.key].hsl;
  return (
    <button
      type="button"
      data-team={team.key}
      aria-pressed={isSelected}
      aria-label={`Selecionar equipe ${team.key}`}
      onClick={() => onSelect(team.key)}
      className={cn(
        'group relative flex aspect-[3/2] w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-300',
        isSelected
          ? 'border-primary shadow-lg shadow-primary/25 -translate-y-1'
          : 'border-border/60 hover:-translate-y-0.5 hover:border-border hover:shadow-md',
      )}
    >
      <img
        src={TEAM_PHOTOS[team.key]}
        alt={`Equipe ${team.key}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        draggable={false}
      />
      {/* Leve escurecimento uniforme — melhora contraste em qualquer tema sem esconder a arte */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-black/10 transition-opacity group-hover:bg-black/0" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5"
        style={{ background: `hsl(${accent})` }}
      />
      {isSelected && (
        <span className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      )}
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
      {/* Institutional banner — editorial de verdade: uma única foto de
          fundo em tela cheia (sem coluna separada, sem costura pra
          disfarçar), com o texto sobreposto sobre um scrim gradiente.
          É o mesmo recurso usado em capas de revista/site institucional
          premium — a foto nunca é "cortada em pedaço", ela preenche o
          banner inteiro e o texto flutua sobre a parte mais escura dela. */}
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div className="relative aspect-[4/5] sm:aspect-[21/9]">
          <img
            src={heroBanner}
            alt="Agente da Socioeducação do Acre, com o brasão do Governo do Acre ao fundo, em unidade operacional"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[68%_28%] sm:object-[62%_30%]"
            draggable={false}
          />

          {/* Scrim desktop — escuro à esquerda (onde o texto fica), some
              gradualmente até revelar a foto por completo à direita. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden sm:block"
            style={{
              background: 'linear-gradient(100deg, hsl(222 47% 6%) 0%, hsl(222 47% 7% / 0.95) 28%, hsl(217 50% 11% / 0.72) 46%, hsl(213 55% 15% / 0.28) 64%, transparent 80%)',
            }}
          />
          {/* Scrim mobile — escuro embaixo (onde o texto fica), foto
              visível por completo na metade superior. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 sm:hidden"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, hsl(222 47% 6% / 0.55) 42%, hsl(222 47% 6% / 0.94) 62%, hsl(222 47% 5%) 100%)',
            }}
          />
          {/* Vinheta geral bem sutil — unifica tom da foto com a paleta da marca */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'hsl(220 60% 20% / 0.08)' }} />

          <div className="relative z-10 flex h-full flex-col justify-end gap-5 px-6 py-7 sm:justify-center sm:px-10 sm:py-10">
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

            <OperationalStatusRibbon />
          </div>
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
