import { ArrowRight, Lock } from 'lucide-react';
import { teamColors, teamPosters, teamPostersWebp } from '@/lib/teamAssets';

interface OperationsTeamCardProps {
  team: 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';
  onClick: () => void;
}

const TEAM_META: Record<string, {
  callsign: string;
  motto: string;
  code: string;
  hex: string;
}> = {
  ALFA:    { callsign: 'ALFA',    motto: 'Escudo · Proteção',   code: 'EQ-01', hex: teamColors.ALFA.primary },
  BRAVO:   { callsign: 'BRAVO',   motto: 'Espada · Ação',       code: 'EQ-02', hex: teamColors.BRAVO.primary },
  CHARLIE: { callsign: 'CHARLIE', motto: 'Mira · Precisão',     code: 'EQ-03', hex: teamColors.CHARLIE.primary },
  DELTA:   { callsign: 'DELTA',   motto: 'Raio · Resposta',     code: 'EQ-04', hex: teamColors.DELTA.primary },
};

/**
 * Operations card with cinematic tactical poster background.
 */
export function OperationsTeamCard({ team, onClick }: OperationsTeamCardProps) {
  const meta = TEAM_META[team];
  const poster = teamPosters[team];
  const posterWebp = teamPostersWebp[team];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Acessar equipe ${meta.callsign}`}
      className="group relative w-full text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
      }}
    >
      <div
        className="relative h-full border border-border/70 bg-background/95 backdrop-blur-md transition-colors duration-300 group-hover:border-primary/60"
        style={{ aspectRatio: '3 / 4', minHeight: 240 }}
      >
        {/* Cinematic poster background */}
        <picture>
          <source srcSet={posterWebp} type="image/webp" />
          <img
            src={poster}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        </picture>

        {/* Dark gradient overlay for legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.85) 100%)`,
          }}
        />

        {/* Top dog-tag header */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/40 backdrop-blur-sm">
          <span className="font-mono-mil text-[9px] tracking-[0.2em] text-white/70">
            {meta.code}
          </span>
          <span className="flex items-center gap-1.5 font-mono-mil text-[9px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        </div>

        {/* Team color accent bar */}
        <div className="relative h-[3px] w-full" style={{ backgroundColor: meta.hex, boxShadow: `0 0 12px ${meta.hex}` }} />

        {/* Callsign at bottom */}
        <div className="absolute inset-x-0 bottom-10 px-4 flex flex-col items-center text-center">
          <h3
            className="font-stencil font-bold text-2xl sm:text-3xl lg:text-4xl leading-none text-white uppercase tracking-wider"
          >
            {meta.callsign}
          </h3>
          <p className="mt-2 font-mono-mil text-[10px] tracking-[0.15em] uppercase text-white/80">
            {meta.motto}
          </p>

        </div>




        {/* Bottom access bar */}
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-2.5 border-t transition-all duration-300 bg-black/70 backdrop-blur-sm group-hover:bg-[color:var(--bar)]"
          style={{
            borderColor: `${meta.hex}80`,
            ['--bar' as never]: `${meta.hex}40`,
          }}
        >
          <span className="flex items-center gap-1.5 font-mono-mil text-[10px] text-white/80 group-hover:text-white transition-colors">
            <Lock className="w-3 h-3" />
            ACESSAR
          </span>
          <ArrowRight
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: meta.hex }}
          />
        </div>


        {/* Corner brackets */}
        <span className="absolute top-1 left-1 w-3 h-3 border-l border-t pointer-events-none" style={{ borderColor: meta.hex }} aria-hidden />
        <span className="absolute top-1 right-1 w-3 h-3 border-r border-t pointer-events-none" style={{ borderColor: meta.hex }} aria-hidden />
        <span className="absolute bottom-1 left-1 w-3 h-3 border-l border-b pointer-events-none" style={{ borderColor: meta.hex }} aria-hidden />
        <span className="absolute bottom-1 right-1 w-3 h-3 border-r border-b pointer-events-none" style={{ borderColor: meta.hex }} aria-hidden />
      </div>
    </button>
  );
}
