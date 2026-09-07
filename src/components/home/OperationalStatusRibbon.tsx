import { useAgentProfile } from '@/hooks/useAgentProfile';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';

const TEAM_ACCENT: Record<string, { h: string; s: string; l: string; label: string }> = {
  ALFA:    { h: '43',  s: '96%', l: '56%', label: 'Defensiva' },
  BRAVO:   { h: '14',  s: '82%', l: '58%', label: 'Ofensiva' },
  CHARLIE: { h: '38',  s: '96%', l: '60%', label: 'Reconhecimento' },
  DELTA:   { h: '210', s: '90%', l: '62%', label: 'Resposta Rápida' },
};

const fmt2 = (n: number) => n.toString().padStart(2, '0');

/**
 * Operational status ribbon — professional SVG HUD footer.
 * When logged in, surfaces the agent's Unit + Team + role.
 * When public, shows institutional KPIs + live agent presence counters.
 */
export function OperationalStatusRibbon() {
  const { agent } = useAgentProfile();
  const metrics = useOperationalMetrics();
  const onlineAgents = Math.max(useOnlineAgents().size, useVisitorPresence());

  const teamKey = (agent?.team ?? '').toUpperCase();
  const isLogged = Boolean(agent?.id);
  const accent = TEAM_ACCENT[teamKey];
  const accentColor = accent ? `hsl(${accent.h} ${accent.s} ${accent.l})` : 'hsl(42 90% 55%)';
  const accentSoft = accent ? `hsl(${accent.h} ${accent.s} ${accent.l} / 0.18)` : 'hsl(42 90% 55% / 0.18)';

  const unitName = agent?.unit?.name ?? '';
  const municipality = agent?.unit?.municipality ?? '';
  const agentShort = (agent?.name ?? '').split(' ').slice(0, 2).join(' ').toUpperCase();
  const matricula = agent?.matricula ?? '——';
  const efetivoTotal = metrics.loading ? '——' : fmt2(metrics.agentsActive);
  const onlineNow = fmt2(onlineAgents);

  return (
    <div className="relative mt-2 sm:mt-3 px-1">
      {/* ============ MOBILE — compact tactical strip (< sm) ============ */}
      <div
        className="sm:hidden relative rounded-lg border overflow-hidden"
        style={{
          borderColor: `${accentColor.replace(')', ' / 0.45)')}`,
          background: 'linear-gradient(180deg, hsl(222 55% 6% / 0.98) 0%, hsl(222 45% 10% / 0.92) 100%)',
          boxShadow: `0 0 0 1px rgba(0,0,0,0.55), 0 10px 24px -14px ${accentColor.replace(')', ' / 0.55)')}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        {/* top accent line */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
        {/* corner brackets */}
        <span aria-hidden className="absolute top-1 left-1 w-2 h-2 border-t border-l" style={{ borderColor: accentColor }} />
        <span aria-hidden className="absolute top-1 right-1 w-2 h-2 border-t border-r" style={{ borderColor: accentColor }} />
        <span aria-hidden className="absolute bottom-1 left-1 w-2 h-2 border-b border-l" style={{ borderColor: accentColor }} />
        <span aria-hidden className="absolute bottom-1 right-1 w-2 h-2 border-b border-r" style={{ borderColor: accentColor }} />

        {/* Header strip — protocol + LIVE presence counter */}
        <div
          className="flex items-center justify-between px-2 py-[4px] border-b"
          style={{ borderColor: `${accentColor.replace(')', ' / 0.22)')}`, background: accentSoft }}
        >
          <span className="flex items-center gap-1.5">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: 'hsl(142 72% 55%)' }} />
              <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(142 72% 55%)', boxShadow: '0 0 5px hsl(142 72% 55% / 0.9)' }} />
            </span>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-emerald-200">
              {isLogged ? 'OPERACIONAL' : 'CANAL SEGURO'}
            </span>
            <span aria-hidden className="h-2 w-px bg-white/15 mx-0.5" />
            {/* Protocolo institucional — substitui contador (evita redundância com célula ONLINE) */}
            <span
              className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] rounded-sm px-1 py-[1px]"
              style={{
                color: accentColor,
                background: accentSoft,
                border: `1px solid ${accentColor.replace(')', ' / 0.35)')}`,
              }}
            >
              <svg width="8" height="8" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 7V5a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span className="tabular-nums">ISE-AC · 2026</span>
            </span>
          </span>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] opacity-90" style={{ color: accentColor }}>
            {isLogged ? (teamKey || 'ISE') : 'ISE · AC'}
          </span>
        </div>

        {/* Data grid — 3 columns compact, uniform gutters */}
        {isLogged ? (
          <div className="grid grid-cols-3 gap-px bg-black/40">
            <div className="px-2 py-1.5 bg-slate-950/60">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: accentColor }}>Agente</div>
              <div className="font-mono text-[11.5px] font-bold text-amber-50 truncate mt-0.5">{agentShort || '——'}</div>
              <div className="font-mono text-[9px] text-amber-200/80 mt-0.5 truncate">MAT {matricula}</div>
            </div>
            <div className="px-2 py-1.5 bg-slate-950/60">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: accentColor }}>Unidade</div>
              <div className="font-mono text-[11.5px] font-bold text-amber-50 truncate mt-0.5">{(unitName || 'ISE').slice(0, 14)}</div>
              <div className="font-mono text-[9px] text-amber-200/80 mt-0.5 truncate">{(municipality || 'ACRE').toUpperCase()}</div>
            </div>
            <div className="px-2 py-1.5 bg-slate-950/60">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: accentColor }}>Equipe</div>
              <div className="font-mono text-[12px] font-black tracking-[0.14em] mt-0.5" style={{ color: accentColor, textShadow: `0 0 6px ${accentColor.replace(')', ' / 0.7)')}` }}>
                {teamKey || '——'}
              </div>
              <div className="font-mono text-[9px] text-amber-200/80 mt-0.5 truncate">{accent?.label ?? 'OP'}</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px bg-black/40">
            {/* EFETIVO — total ativo */}
            <div className="px-2 py-1.5 bg-slate-950/60">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-amber-300 flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M2 14c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Efetivo
              </div>
              <div className="font-mono text-[14px] font-black text-amber-50 mt-0.5 tabular-nums leading-none">{efetivoTotal}</div>
              <div className="font-mono text-[9px] text-amber-200/80 mt-0.5">Agentes ativos</div>
            </div>

            {/* ONLINE AGORA — presença ao vivo (destaque) */}
            <div
              className="relative px-2 py-1.5 bg-slate-950/60 overflow-hidden"
              style={{ boxShadow: 'inset 0 0 0 1px hsl(142 72% 45% / 0.22)' }}
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${onlineNow} agentes online agora`}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(142 72% 55% / 0.7), transparent)' }}
              />
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-emerald-300 flex items-center gap-1">
                <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
                  <span className="absolute inset-0 rounded-full animate-ping opacity-60 bg-emerald-400" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_hsl(142_72%_55%_/_0.9)]" />
                </span>
                Online
              </div>
              <div className="font-mono text-[14px] font-black text-emerald-200 mt-0.5 tabular-nums leading-none" style={{ textShadow: '0 0 6px hsl(142 72% 55% / 0.55)' }}>
                {onlineNow}
              </div>
              <div className="font-mono text-[9px] text-emerald-300/80 mt-0.5">Presença agora</div>
            </div>

            {/* CRIPTO */}
            <div className="px-2 py-1.5 bg-slate-950/60">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-amber-300 flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M5 7V5a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Cripto
              </div>
              <div className="font-mono text-[11.5px] font-bold text-emerald-300 mt-0.5">AES-256</div>
              <div className="flex items-center gap-[2px] mt-1" aria-hidden>
                {[0,1,2,3].map((i) => (
                  <span key={i} className="w-[3px] rounded-sm bg-emerald-400" style={{ height: `${3 + i}px`, opacity: 0.55 + i*0.12 }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============ DESKTOP / TABLET — original SVG ribbon (≥ sm) ============ */}
      <div className="hidden sm:block">
      <svg
        viewBox="0 0 800 52"
        preserveAspectRatio="none"
        overflow="hidden"
        style={{ overflow: 'hidden' }}
        className="block w-full h-11 sm:h-14 overflow-hidden"
        role="img"
        aria-label={isLogged ? `Painel operacional — ${unitName}` : 'Status operacional em tempo real'}
      >
        <defs>
          <linearGradient id="ribbonBg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="hsl(222 55% 5%)" stopOpacity="0.98" />
            <stop offset="50%"  stopColor="hsl(222 45% 10%)" stopOpacity="0.88" />
            <stop offset="100%" stopColor="hsl(222 55% 5%)" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="ribbonEdge2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={`${accentColor.replace(')', ' / 0)')}`} />
            <stop offset="50%"  stopColor={`${accentColor.replace(')', ' / 0.9)')}`} />
            <stop offset="100%" stopColor={`${accentColor.replace(')', ' / 0)')}`} />
          </linearGradient>
          <pattern id="ribbonHatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke={`${accentColor.replace(')', ' / 0.10)')}`} strokeWidth="1" />
          </pattern>
          <filter id="ribbonGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="1.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* chapa metálica com chanfros */}
        <path
          d="M0,6 L16,6 L22,0 L778,0 L784,6 L800,6 L800,46 L784,46 L778,52 L22,52 L16,46 L0,46 Z"
          fill="url(#ribbonBg2)"
          stroke={`${accentColor.replace(')', ' / 0.45)')}`}
          strokeWidth="0.7"
        />
        <rect x="0" y="0" width="800" height="52" fill="url(#ribbonHatch2)" opacity="0.55" />
        <rect x="0" y="0"  width="800" height="1" fill="url(#ribbonEdge2)" />
        <rect x="0" y="51" width="800" height="1" fill="url(#ribbonEdge2)" />

        {/* varredura removida — barra estática */}


        {/* Selo esquerdo: brasão + status */}
        <g transform="translate(28,26)">
          <g filter="url(#ribbonGlow)">
            {/* mini shield */}
            <path
              d="M0,-12 L11,-8 V2 C11,9 6,14 0,16 C-6,14 -11,9 -11,2 V-8 Z"
              fill={accentSoft}
              stroke={accentColor}
              strokeWidth="1.2"
            />
            <path d="M-6,3 L0,-2 L6,3" stroke={accentColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M-6,8 L0,3 L6,8" stroke={accentColor} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
          </g>
          <circle cx="14" cy="-10" r="3" fill="hsl(142 72% 45%)">
            <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Divisores */}
        {[62, 340, 560, 700].map((x) => (
          <line key={x} x1={x} y1="12" x2={x} y2="40" stroke={`${accentColor.replace(')', ' / 0.25)')}`} strokeWidth="0.6" strokeDasharray="2 2" />
        ))}

        {isLogged ? (
          <>
            {/* IDENTIFICAÇÃO — Agente / Matrícula */}
            <g transform="translate(80,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace">
              <text y="-6" fontSize="8.5" fontWeight="700" letterSpacing="2.2" fill={accentColor}>AGENTE</text>
              <text y="6" fontSize="11" fontWeight="700" fill="hsl(48 100% 92%)">
                {agentShort || 'IDENTIFICADO'}
              </text>
              <text y="16" fontSize="8.5" letterSpacing="1.4" fill="hsl(45 92% 85%)" fontWeight="600">
                MAT · {matricula}
              </text>
            </g>

            {/* UNIDADE */}
            <g transform="translate(350,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace">
              <text y="-6" fontSize="8.5" fontWeight="700" letterSpacing="2.2" fill={accentColor}>UNIDADE</text>
              <text y="6" fontSize="11" fontWeight="700" fill="hsl(48 100% 92%)">
                {(unitName || 'ISE').slice(0, 26)}
              </text>
              <text y="16" fontSize="8.5" letterSpacing="1.4" fill="hsl(45 92% 85%)" fontWeight="600">
                {(municipality || 'ACRE').toUpperCase()} · BR
              </text>
            </g>

            {/* EQUIPE */}
            <g transform="translate(580,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace">
              <text y="-6" fontSize="8.5" fontWeight="700" letterSpacing="2.2" fill={accentColor}>EQUIPE</text>
              <text y="7" fontSize="13" fontWeight="700" letterSpacing="3" fill={accentColor} style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}>
                {teamKey || '——'}
              </text>
              <text y="17" fontSize="8.5" letterSpacing="1.4" fill="hsl(45 92% 85%)" fontWeight="600">
                {accent?.label ?? 'OPERACIONAL'}
              </text>
            </g>

            {/* STATUS + UPLINK */}
            <g transform="translate(720,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace">
              <text y="-6" fontSize="8.5" fontWeight="700" letterSpacing="2.2" fill={accentColor}>STATUS</text>
              <g transform="translate(0,2)">
                <circle cx="3" cy="0" r="2.5" fill="hsl(142 72% 55%)">
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <text x="10" y="3" fontSize="10" fontWeight="700" fill="hsl(142 72% 78%)">ATIVO</text>
              </g>
              <g transform="translate(0,14)">
                {[0,1,2,3,4].map((i) => (
                  <rect key={i} x={i*5} y={-i} width="3" height={3 + i*1.5} fill="hsl(142 72% 55%)" rx="0.5">
                    <animate attributeName="opacity" values="1;0.55;1" dur={`${1.2 + i*0.15}s`} repeatCount="indefinite" />
                  </rect>
                ))}
              </g>
            </g>
          </>
        ) : (
          <>
            {/* Estado público — sem login: sem duplicar KPIs do Briefing */}
            <g transform="translate(80,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace">
              <text y="-6" fontSize="9" letterSpacing="2" fill="hsl(45 98% 80%)" fontWeight="700">PROTOCOLO</text>
              <text y="7" fontSize="11" fontWeight="700" fill="hsl(48 100% 90%)">ISE-AC / 2026</text>
              <text y="17" fontSize="8.5" letterSpacing="1.4" fill="hsl(45 92% 85%)" fontWeight="600">SISTEMA SOCIOEDUCATIVO</text>
            </g>

            <g transform="translate(350,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace" textAnchor="middle">
              <text y="-6" fontSize="9" letterSpacing="2" fill="hsl(45 98% 80%)" fontWeight="700">TURNO</text>
              <text y="8" fontSize="12" fontWeight="700" fill="hsl(48 100% 92%)">24 / 7</text>
              <text y="18" fontSize="8.5" letterSpacing="1.2" fill="hsl(45 92% 85%)" fontWeight="600">COBERTURA CONTÍNUA</text>
            </g>

            <g transform="translate(580,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace" textAnchor="middle">
              <text y="-6" fontSize="9" letterSpacing="2" fill="hsl(45 98% 80%)" fontWeight="700">JURISDIÇÃO</text>
              <text y="8" fontSize="12" fontWeight="700" fill="hsl(48 100% 92%)">ACRE · BR</text>
              <text y="18" fontSize="8.5" letterSpacing="1.2" fill="hsl(45 92% 85%)" fontWeight="600">GOV / SEJUSP</text>
            </g>

            <g transform="translate(778,26)" fontFamily="'IBM Plex Mono', ui-monospace, monospace" textAnchor="end">
              <text y="-6" fontSize="9" letterSpacing="2" fill="hsl(45 98% 80%)" fontWeight="700">CANAL</text>
              <text y="8" fontSize="9" fontWeight="700" letterSpacing="1.6" fill="hsl(48 100% 88%)">SEGURO</text>
              <text y="18" fontSize="8.5" fontWeight="700" letterSpacing="1.2" fill="hsl(142 78% 75%)">AES-256 · ONLINE</text>
            </g>
          </>
        )}
      </svg>
      </div>
    </div>
  );
}
