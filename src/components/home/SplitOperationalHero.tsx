import { useState, useCallback } from 'react';
import { ClipboardList, Users2, Building2, Radio, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OperationalStatusRibbon } from './OperationalStatusRibbon';
import { RoundsManagerLazy as RoundsManager } from './RoundsManagerLazy';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';

import heroBanner from '@/assets/midias/hero-banner.webp';
import teamAlfaPhoto from '@/assets/midias/team-alfa.webp';
import teamBravoPhoto from '@/assets/midias/team-bravo.webp';
import teamCharliePhoto from '@/assets/midias/team-charlie.webp';
import teamDeltaPhoto from '@/assets/midias/team-delta.webp';

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
      {/* Institutional banner — colunas separadas: foto com espaço de
          verdade pra mostrar detalhe (não cortada em tela cheia atrás do
          texto) e painel de texto com fundo sólido, ligados por uma
          transição larga e gradual em vez de uma linha de corte. */}
      <div className="relative overflow-hidden rounded-2xl border border-border grid grid-cols-1 sm:grid-cols-[1.05fr_1fr]">
        <div
          className="relative z-10 order-2 flex flex-col justify-center gap-5 px-6 py-6 sm:order-1 sm:px-10 sm:py-8"
          style={{ background: 'linear-gradient(155deg, hsl(222 47% 7%) 0%, hsl(217 50% 11%) 55%, hsl(213 55% 14%) 100%)' }}
        >
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

        {/* Coluna de imagem — fundo no MESMO gradiente do painel de texto,
            e a foto some suavemente sobre ele via máscara (mask-image),
            não uma camada de cor por cima. Isso evita o efeito "sujo" de
            tingir a foto — ela literalmente se dissolve no fundo que já
            é da mesma cor, sem sobreposição visível. */}
        <div
          className="relative order-1 h-48 sm:order-2 sm:h-auto sm:min-h-[260px]"
          style={{ background: 'linear-gradient(155deg, hsl(222 47% 7%) 0%, hsl(217 50% 11%) 55%, hsl(213 55% 14%) 100%)' }}
        >
          <img
            src={heroBanner}
            alt="Agente da Socioeducação do Acre, com o brasão do Governo do Acre ao fundo, em unidade operacional"
            loading="eager"
            decoding="async"
            className="hero-photo-fade absolute inset-0 h-full w-full object-cover object-[78%_30%] sm:object-[72%_28%]"
            draggable={false}
          />
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
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
          <p className="mt-1.5 text-lg font-bold tabular-nums text-foreground">{metrics.loading ? '—' : fmt2(metrics.units)}</p>
          <p className="text-[10.5px] text-muted-foreground">Unidades</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <Users2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
          <p className="mt-1.5 text-lg font-bold tabular-nums text-foreground">{metrics.loading ? '—' : fmt2(metrics.agentsRegistered || metrics.agentsActive)}</p>
          <p className="text-[10.5px] text-muted-foreground">Agentes cadastrados</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <Radio className="h-3.5 w-3.5 text-primary" strokeWidth={2.2} />
          <p className="mt-1.5 text-lg font-bold tabular-nums text-foreground">{fmt2(onlineAgents)}</p>
          <p className="text-[10.5px] text-muted-foreground">Online agora</p>
        </div>
      </div>

      {/* Team selector */}
      <div className="mt-4">
        <div className="mb-2.5 flex items-center justify-between">
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
