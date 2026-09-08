import { CSSProperties } from "react";

type TeamKey = "ALFA" | "BRAVO" | "CHARLIE" | "DELTA";

interface TeamEmblemProps {
  team: TeamKey;
  className?: string;
  style?: CSSProperties;
}

/**
 * TeamEmblem — heráldica exclusiva por equipe, no mesmo idioma visual
 * do Brasão Sentinela (aço/ouro sobre fundo carvão). Cada emblema é
 * único, sem repetição de imagem entre equipes.
 *
 *  ALFA    — Escudo com losango central (Defensiva)
 *  BRAVO   — Espadas cruzadas sobre estrela (Ofensiva)
 *  CHARLIE — Alvo concêntrico com mira (Reconhecimento)
 *  DELTA   — Raio dentro de diamante (Resposta Rápida)
 */
export function TeamEmblem({ team, className, style }: TeamEmblemProps) {
  const gid = `emblem-gold-${team}`;
  const sid = `emblem-steel-${team}`;
  const cid = `emblem-core-${team}`;

  return (
    <svg
      viewBox="0 0 200 220"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label={`Emblema Equipe ${team}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6d97a" />
          <stop offset="50%" stopColor="#c9a24a" />
          <stop offset="100%" stopColor="#7a5a1c" />
        </linearGradient>
        <linearGradient id={sid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6e6ea" />
          <stop offset="100%" stopColor="#5c5c62" />
        </linearGradient>
        <radialGradient id={cid} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0%" stopColor="rgba(246,217,122,0.35)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Halo comum */}
      <circle cx="100" cy="105" r="90" fill={`url(#${cid})`} />

      {/* Moldura hexagonal — assinatura institucional partilhada */}
      <polygon
        points="100,14 174,52 174,158 100,196 26,158 26,52"
        stroke={`url(#${sid})`}
        strokeWidth="1.2"
        fill="rgba(14,14,10,0.55)"
      />
      <polygon
        points="100,26 162,58 162,152 100,184 38,152 38,58"
        stroke={`url(#${gid})`}
        strokeWidth="1.3"
        fill="none"
      />

      {team === "ALFA" && <AlfaEmblem gid={gid} sid={sid} />}
      {team === "BRAVO" && <BravoEmblem gid={gid} sid={sid} />}
      {team === "CHARLIE" && <CharlieEmblem gid={gid} sid={sid} />}
      {team === "DELTA" && <DeltaEmblem gid={gid} sid={sid} />}

      {/* Rebites cardeais compartilhados */}
      <circle cx="100" cy="14" r="2.2" fill={`url(#${gid})`} />
      <circle cx="100" cy="196" r="2.2" fill={`url(#${gid})`} />
      <circle cx="26" cy="105" r="2.2" fill={`url(#${gid})`} />
      <circle cx="174" cy="105" r="2.2" fill={`url(#${gid})`} />

      {/* Faixa com sigla */}
      <text
        x="100"
        y="170"
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        letterSpacing="6"
        fill={`url(#${gid})`}
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
      >
        {team}
      </text>
    </svg>
  );
}

function AlfaEmblem({ gid, sid }: { gid: string; sid: string }) {
  return (
    <g>
      {/* Escudo interno */}
      <path
        d="M100 46 L138 62 L138 108 C138 128 122 140 100 148 C78 140 62 128 62 108 L62 62 Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.5"
        fill="rgba(201,162,74,0.06)"
      />
      {/* Losango central */}
      <path
        d="M100 68 L118 100 L100 132 L82 100 Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.6"
        fill="none"
      />
      {/* Ponto central */}
      <circle cx="100" cy="100" r="3.5" fill={`url(#${gid})`} />
      {/* Barras horizontais decorativas */}
      <line x1="72" y1="80" x2="82" y2="80" stroke={`url(#${sid})`} strokeWidth="1.2" />
      <line x1="118" y1="80" x2="128" y2="80" stroke={`url(#${sid})`} strokeWidth="1.2" />
      <line x1="72" y1="120" x2="82" y2="120" stroke={`url(#${sid})`} strokeWidth="1.2" />
      <line x1="118" y1="120" x2="128" y2="120" stroke={`url(#${sid})`} strokeWidth="1.2" />
    </g>
  );
}

function BravoEmblem({ gid, sid }: { gid: string; sid: string }) {
  return (
    <g>
      {/* Estrela de fundo */}
      <path
        d="M100 60 L106 84 L131 84 L111 99 L118 122 L100 108 L82 122 L89 99 L69 84 L94 84 Z"
        fill="rgba(201,162,74,0.14)"
        stroke={`url(#${gid})`}
        strokeWidth="1"
      />
      {/* Espada 1 (diagonal ↘) */}
      <g stroke={`url(#${sid})`} fill="none">
        <line x1="66" y1="66" x2="130" y2="130" strokeWidth="2.4" />
        <line x1="60" y1="72" x2="72" y2="60" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M130 130 L138 138 L136 128 Z" fill={`url(#${gid})`} stroke="none" />
      </g>
      {/* Espada 2 (diagonal ↙) */}
      <g stroke={`url(#${sid})`} fill="none">
        <line x1="134" y1="66" x2="70" y2="130" strokeWidth="2.4" />
        <line x1="140" y1="72" x2="128" y2="60" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M70 130 L62 138 L64 128 Z" fill={`url(#${gid})`} stroke="none" />
      </g>
      {/* Rebite central */}
      <circle cx="100" cy="98" r="4" fill={`url(#${gid})`} />
    </g>
  );
}

function CharlieEmblem({ gid, sid }: { gid: string; sid: string }) {
  return (
    <g>
      {/* Círculos concêntricos */}
      <circle cx="100" cy="98" r="38" stroke={`url(#${gid})`} strokeWidth="1.3" fill="none" />
      <circle cx="100" cy="98" r="28" stroke={`url(#${sid})`} strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx="100" cy="98" r="18" stroke={`url(#${gid})`} strokeWidth="1.2" fill="none" />
      <circle cx="100" cy="98" r="4" fill={`url(#${gid})`} />
      {/* Cruz de mira */}
      <line x1="100" y1="52" x2="100" y2="76" stroke={`url(#${gid})`} strokeWidth="1.4" />
      <line x1="100" y1="120" x2="100" y2="144" stroke={`url(#${gid})`} strokeWidth="1.4" />
      <line x1="54" y1="98" x2="78" y2="98" stroke={`url(#${gid})`} strokeWidth="1.4" />
      <line x1="122" y1="98" x2="146" y2="98" stroke={`url(#${gid})`} strokeWidth="1.4" />
      {/* Ticks nos eixos */}
      {[-1, 1].map((s) =>
        [64, 74, 122, 132].map((r, i) => (
          <line
            key={`${s}-${i}`}
            x1={100 + s * (r - 100)}
            y1={92}
            x2={100 + s * (r - 100)}
            y2={104}
            stroke={`url(#${sid})`}
            strokeWidth="0.8"
            opacity="0.6"
          />
        )),
      )}
    </g>
  );
}

function DeltaEmblem({ gid, sid }: { gid: string; sid: string }) {
  return (
    <g>
      {/* Diamante */}
      <path
        d="M100 50 L142 100 L100 150 L58 100 Z"
        stroke={`url(#${sid})`}
        strokeWidth="1.4"
        fill="rgba(201,162,74,0.06)"
      />
      <path
        d="M100 62 L132 100 L100 138 L68 100 Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.2"
        fill="none"
      />
      {/* Raio */}
      <path
        d="M104 70 L82 104 L98 104 L92 132 L118 96 L102 96 L108 70 Z"
        fill={`url(#${gid})`}
        stroke={`url(#${sid})`}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Ondas laterais (velocidade) */}
      <path d="M46 90 Q52 100 46 110" stroke={`url(#${gid})`} strokeWidth="1" fill="none" opacity="0.7" />
      <path d="M154 90 Q148 100 154 110" stroke={`url(#${gid})`} strokeWidth="1" fill="none" opacity="0.7" />
    </g>
  );
}

export default TeamEmblem;
