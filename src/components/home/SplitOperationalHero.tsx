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
      {/* Institutional banner — layout dividido de verdade: texto e imagem
          em colunas separadas, então nunca podem se sobrepor. No mobile a
          imagem vira uma faixa acima do texto (nunca atrás dele). */}
      <div className="relative overflow-hidden rounded-2xl border border-border grid grid-cols-1 sm:grid-cols-[1.3fr_1fr]">
        <div
          className="relative z-10 order-2 flex flex-col justify-center gap-6 px-6 py-7 sm:order-1 sm:px-10 sm:py-12"
          style={{ background: 'linear-gradient(160deg, hsl(222 47% 8%) 0%, hsl(213 55% 13%) 100%)' }}
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

        <div
          className="relative order-1 h-48 sm:order-2 sm:h-auto sm:min-h-[280px]"
          style={{ background: 'linear-gradient(200deg, hsl(213 55% 13%) 0%, hsl(222 47% 8%) 100%)' }}
        >
          {/* Foto inteira, sem cortar (object-contain) — o fundo da coluna
              usa o mesmo gradiente do painel de texto, então onde a foto
              não preenche (letterbox) parece parte do design, não um
              vazio. Selo do Governo do Acre (canto superior direito da
              foto) fica sempre visível por completo. */}
          <img
            src={heroBanner}
            alt="Agente da Socioeducação do Acre, com o brasão do Governo do Acre ao fundo, em unidade operacional"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain object-center"
            draggable={false}
          />
          {/* Costura larga e suave entre as duas colunas — a foto "nasce"
              do fundo escuro do texto em vez de ter uma linha de corte. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28"
            style={{ background: 'linear-gradient(90deg, hsl(213 55% 13%) 0%, hsl(213 55% 13% / 0.5) 45%, transparent 100%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-10 sm:hidden"
            style={{ background: 'linear-gradient(180deg, hsl(222 47% 8%) 0%, hsl(222 47% 8% / 0.5) 45%, transparent 100%)' }}
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
