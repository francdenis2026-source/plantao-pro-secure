/**
 * Command-room backdrop — SVG-only, temático (segurança pública / socioeducativo).
 *
 * Camadas (do fundo para o topo):
 *   1. Wash tonal navy → âmbar
 *   2. Vignette radial (legibilidade)
 *   3. Contornos topográficos suaves (linhas orgânicas)
 *   4. Constelação das unidades socioeducativas do Acre (pontos + rede)
 *   5. Composição heráldica central: laurel + escudo + estrela + rosa dos ventos + anéis de radar
 *
 * Totalmente responsivo — não corta em mobile, tablet, desktop ou ultrawide.
 */
import { memo } from 'react';

export const CommandRoomBackground = memo(function CommandRoomBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* 1 · Wash tonal */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, hsl(222 65% 4% / 0.55) 0%, hsl(220 45% 10% / 0.25) 45%, hsl(42 60% 20% / 0.20) 100%)',
        }}
      />

      {/* 2 · Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 0%, hsl(222 65% 3% / 0.45) 60%, hsl(222 70% 2% / 0.85) 100%)',
        }}
      />

      {/* 3 · Topografia + constelação — full-bleed, sem malha quadriculada */}
      <FullBleedLayer />

      {/* 7 · Composição heráldica central */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 'min(94vw, 94vh, 1000px)',
          height: 'min(94vw, 94vh, 1000px)',
        }}
      >
        <HeraldicComposition />
      </div>

      {/* 8 · Corner brackets removidos a pedido — mantém só as hairlines */}


      {/* 9 · Hairlines âmbar removidas a pedido */}

    </div>
  );
});

/* ---------------------------------------------------------------- */
/* CAMADA FULL-BLEED — topografia e constelação, sem grid            */
/* ---------------------------------------------------------------- */
function FullBleedLayer() {
  // 7 unidades — reduzido de 9 para diminuir nós DOM
  const nodes = [
    { x: 16, y: 24 }, { x: 40, y: 18 }, { x: 64, y: 30 },
    { x: 86, y: 42 }, { x: 24, y: 70 }, { x: 54, y: 76 },
    { x: 80, y: 66 },
  ];
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [3, 6], [2, 5],
  ];

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="fadeMask" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="mFade">
          <rect width="100%" height="100%" fill="url(#fadeMask)" />
        </mask>
      </defs>

      {/* Contornos topográficos — 5 linhas mascaradas */}
      <g mask="url(#mFade)" opacity="0.32">
        <TopoLines />
      </g>

      {/* Constelação */}
      <g opacity="0.55">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={`${nodes[a].x}%`} y1={`${nodes[a].y}%`}
            x2={`${nodes[b].x}%`} y2={`${nodes[b].y}%`}
            stroke="hsl(42 80% 60% / 0.16)"
            strokeWidth="0.7"
            strokeDasharray="4 6"
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={`${n.x}%`} cy={`${n.y}%`} r="2.2" fill="hsl(42 90% 62% / 0.55)" />
            <circle cx={`${n.x}%`} cy={`${n.y}%`} r="1" fill="hsl(42 100% 88% / 0.9)" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/* Linhas topográficas — 5 Beziers suaves */
function TopoLines() {
  const rows = [10, 28, 46, 64, 82];
  return (
    <>
      {rows.map((y, i) => (
        <path
          key={i}
          d={`M -5% ${y}% C 25% ${y - 5}%, 55% ${y + 6}%, 80% ${y - 3}% S 110% ${y + 4}%, 115% ${y - 1}%`}
          fill="none"
          stroke="hsl(220 60% 78% / 0.10)"
          strokeWidth={i % 2 === 0 ? '0.9' : '0.55'}
        />
      ))}
    </>
  );
}

/* ---------------------------------------------------------------- */
/* COMPOSIÇÃO HERÁLDICA CENTRAL                                     */
/* ---------------------------------------------------------------- */
function HeraldicComposition() {
  return (
    <svg viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
      <defs>
        <radialGradient id="hCenterGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(42 90% 60% / 0.14)" />
          <stop offset="70%" stopColor="hsl(42 90% 60% / 0.02)" />
          <stop offset="100%" stopColor="hsl(42 90% 60% / 0)" />
        </radialGradient>
        <radialGradient id="hFade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="65%" stopColor="white" stopOpacity="0.55" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="hMask">
          <rect x="-500" y="-500" width="1000" height="1000" fill="url(#hFade)" />
        </mask>
        <linearGradient id="hAmberLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(42 80% 60% / 0)" />
          <stop offset="50%" stopColor="hsl(42 80% 60% / 0.55)" />
          <stop offset="100%" stopColor="hsl(42 80% 60% / 0)" />
        </linearGradient>
      </defs>

      <g mask="url(#hMask)">
        {/* Glow central */}
        <circle r="120" fill="url(#hCenterGlow)" />

        {/* Anéis de radar — reduzidos a 4 */}
        {[110, 220, 340, 460].map((r, i) => (
          <circle key={r} r={r} fill="none" stroke="hsl(42 80% 60% / 0.22)" strokeWidth={0.9 - i * 0.15} />
        ))}

        {/* Marcas de graduação a cada 30° (12 em vez de 24) */}
        <g stroke="hsl(42 80% 60% / 0.30)" strokeWidth="0.7">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const r1 = 450, r2 = i % 3 === 0 ? 428 : 440;
            return (
              <line
                key={i}
                x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
              />
            );
          })}
        </g>

        {/* Cruz de mira tracejada */}
        <line x1="-500" y1="0" x2="500" y2="0" stroke="hsl(42 80% 60% / 0.14)" strokeWidth="0.6" strokeDasharray="6 8" />
        <line x1="0" y1="-500" x2="0" y2="500" stroke="hsl(42 80% 60% / 0.14)" strokeWidth="0.6" strokeDasharray="6 8" />

        {/* Rosa dos ventos */}
        <g fill="hsl(42 80% 60% / 0.32)" stroke="hsl(42 80% 60% / 0.4)" strokeWidth="0.6">
          <polygon points="0,-300 12,-140 0,-160 -12,-140" />
          <polygon points="300,0 140,12 160,0 140,-12" />
          <polygon points="0,300 -12,140 0,160 12,140" />
          <polygon points="-300,0 -140,-12 -160,0 -140,12" />
        </g>
        <g fontFamily="'IBM Plex Mono', ui-monospace, monospace" fontSize="14" fontWeight="600"
           fill="hsl(42 60% 70% / 0.55)" letterSpacing="4">
          <text x="0" y="-315" textAnchor="middle">N</text>
          <text x="315" y="5" textAnchor="middle">L</text>
          <text x="0" y="323" textAnchor="middle">S</text>
          <text x="-315" y="5" textAnchor="middle">O</text>
        </g>

        {/* Laurel wreath — dois arcos espelhados de folhas */}
        <g stroke="hsl(42 80% 60% / 0.45)" strokeWidth="0.9" fill="hsl(42 80% 60% / 0.10)">
          <LaurelArc side="left" />
          <LaurelArc side="right" />
        </g>

        {/* Escudo heráldico central */}
        <g transform="translate(0 0)">
          {/* Fundo do escudo */}
          <path
            d="M 0 -110 L 88 -78 L 88 20 C 88 78, 44 118, 0 138 C -44 118, -88 78, -88 20 L -88 -78 Z"
            fill="hsl(222 55% 8% / 0.85)"
            stroke="hsl(42 80% 60% / 0.6)"
            strokeWidth="1.4"
          />
          {/* Divisão interna (chefe) */}
          <path
            d="M -88 -40 L 88 -40"
            stroke="hsl(42 80% 60% / 0.35)"
            strokeWidth="0.8"
          />
          {/* Estrela central de 5 pontas */}
          <polygon
            points="0,-70 15,-22 66,-22 24,8 40,58 0,28 -40,58 -24,8 -66,-22 -15,-22"
            fill="hsl(42 90% 62% / 0.55)"
            stroke="hsl(42 100% 78% / 0.7)"
            strokeWidth="0.6"
          />
          {/* Barras horizontais inferiores (indicação institucional) */}
          <g stroke="hsl(42 80% 60% / 0.5)" strokeWidth="1.4">
            <line x1="-50" y1="80" x2="50" y2="80" />
            <line x1="-42" y1="94" x2="42" y2="94" />
            <line x1="-32" y1="108" x2="32" y2="108" />
          </g>
        </g>

        {/* Fita heráldica sob o escudo */}
        <g fill="hsl(222 55% 8% / 0.9)" stroke="hsl(42 80% 60% / 0.45)" strokeWidth="0.8">
          <path d="M -140 168 L -110 148 L 110 148 L 140 168 L 110 188 L -110 188 Z" />
        </g>
        <text
          x="0" y="174"
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', ui-monospace, monospace"
          fontSize="10"
          fontWeight="700"
          fill="hsl(42 70% 70% / 0.75)"
          letterSpacing="6"
        >
          SISTEMA · SOCIOEDUCATIVO
        </text>

        {/* Linha horizontal delicada acima do escudo */}
        <rect x="-260" y="-190" width="520" height="1" fill="url(#hAmberLine)" />
        <rect x="-260" y="220" width="520" height="1" fill="url(#hAmberLine)" />
      </g>
    </svg>
  );
}

/* Arco de louros — folhas ao longo de uma elipse */
function LaurelArc({ side }: { side: 'left' | 'right' }) {
  const sign = side === 'left' ? -1 : 1;
  const startAngle = side === 'left' ? 210 : -30;
  const endAngle = side === 'left' ? 330 : 90;
  const steps = 8;
  const rx = 220, ry = 240;

  const items = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = startAngle + (endAngle - startAngle) * t;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * rx;
    const y = Math.sin(rad) * ry;
    // Folha: elipse pequena rotacionada tangente à curva
    const tangentDeg = angle + 90;
    items.push(
      <g key={i} transform={`translate(${x} ${y}) rotate(${tangentDeg + sign * 25})`}>
        <ellipse cx="0" cy="0" rx="14" ry="5" />
        <line x1="-14" y1="0" x2="14" y2="0" stroke="hsl(42 60% 55% / 0.4)" strokeWidth="0.4" />
      </g>,
    );
  }
  return <>{items}</>;
}

/* ---------------------------------------------------------------- */
/* CORNER BRACKETS                                                   */
/* ---------------------------------------------------------------- */
type CornerPosition = 'tl' | 'tr' | 'bl' | 'br';

function CornerMark({ position, label, sub }: { position: CornerPosition; label: string; sub?: string }) {
  const anchor: Record<CornerPosition, string> = {
    tl: 'top-2 left-2 sm:top-4 sm:left-4',
    tr: 'top-2 right-2 sm:top-4 sm:right-4',
    bl: 'bottom-2 left-2 sm:bottom-4 sm:left-4',
    br: 'bottom-2 right-2 sm:bottom-4 sm:right-4',
  };
  const path: Record<CornerPosition, string> = {
    tl: 'M0 22 L0 0 L22 0',
    tr: 'M96 22 L96 0 L74 0',
    bl: 'M0 12 L0 34 L22 34',
    br: 'M96 12 L96 34 L74 34',
  };
  const textAnchor: Record<CornerPosition, 'start' | 'end'> = {
    tl: 'start', tr: 'end', bl: 'start', br: 'end',
  };
  const tx = position === 'tl' || position === 'bl' ? 28 : 68;

  return (
    <svg
      className={`absolute ${anchor[position]}`}
      width="96"
      height="34"
      viewBox="0 0 96 34"
      aria-hidden
    >
      <path d={path[position]} fill="none" stroke="hsl(42 80% 60% / 0.45)" strokeWidth="1.2" />
      <text
        x={tx}
        y={14}
        textAnchor={textAnchor[position]}
        fontFamily="'IBM Plex Mono', ui-monospace, monospace"
        fontSize="9"
        fontWeight="600"
        letterSpacing="2"
        fill="hsl(42 70% 68% / 0.55)"
      >
        {label}
      </text>
      {sub && (
        <text
          x={tx}
          y={26}
          textAnchor={textAnchor[position]}
          fontFamily="'IBM Plex Mono', ui-monospace, monospace"
          fontSize="8"
          letterSpacing="1.5"
          fill="hsl(42 40% 60% / 0.4)"
        >
          {sub}
        </text>
      )}
    </svg>
  );
}
