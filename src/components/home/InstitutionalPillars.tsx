/**
 * Tactical capabilities grid — military operations console aesthetic.
 * Hex-shaped SVG icons + stencil typography + dog-tag info panels.
 */

interface Pillar {
  code: string;
  title: string;
  desc: string;
  icon: JSX.Element;
  span?: string;
  accent?: boolean;
}

// Custom SVG icons — military operations style
const ShieldIcon = (
  <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M16 3 L28 8 V16 C28 22 22 28 16 30 C10 28 4 22 4 16 V8 Z" />
    <path d="M16 11 V21 M11 16 H21" />
  </svg>
);
const CalendarIcon = (
  <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="7" width="24" height="22" rx="1" />
    <line x1="4" y1="13" x2="28" y2="13" />
    <line x1="10" y1="3" x2="10" y2="11" />
    <line x1="22" y1="3" x2="22" y2="11" />
    <rect x="9" y="17" width="4" height="4" fill="currentColor" />
    <rect x="19" y="22" width="4" height="4" fill="currentColor" opacity="0.5" />
  </svg>
);
const ClockIcon = (
  <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="16" cy="16" r="13" />
    <path d="M16 8 V16 L22 19" strokeLinecap="round" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    <line x1="16" y1="3" x2="16" y2="5" />
    <line x1="16" y1="27" x2="16" y2="29" />
    <line x1="3" y1="16" x2="5" y2="16" />
    <line x1="27" y1="16" x2="29" y2="16" />
  </svg>
);
const RadioIcon = (
  <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="16" cy="16" r="2.5" fill="currentColor" />
    <path d="M11 11 A7 7 0 0 0 11 21" />
    <path d="M21 11 A7 7 0 0 1 21 21" />
    <path d="M7 7 A13 13 0 0 0 7 25" />
    <path d="M25 7 A13 13 0 0 1 25 25" />
  </svg>
);
const TargetIcon = (
  <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="16" cy="16" r="13" />
    <circle cx="16" cy="16" r="8" />
    <circle cx="16" cy="16" r="3" />
    <line x1="16" y1="1" x2="16" y2="6" />
    <line x1="16" y1="26" x2="16" y2="31" />
    <line x1="1" y1="16" x2="6" y2="16" />
    <line x1="26" y1="16" x2="31" y2="16" />
  </svg>
);
const ChartIcon = (
  <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="1.8">
    <line x1="4" y1="28" x2="28" y2="28" />
    <line x1="4" y1="4" x2="4" y2="28" />
    <rect x="8" y="18" width="4" height="10" fill="currentColor" opacity="0.4" />
    <rect x="14" y="12" width="4" height="16" fill="currentColor" opacity="0.6" />
    <rect x="20" y="6" width="4" height="22" fill="currentColor" />
  </svg>
);

const pillars: Pillar[] = [
  { code: 'OP-01', title: 'Controle Tático', desc: 'Equipes ALFA · BRAVO · CHARLIE · DELTA com isolamento por unidade e RLS auditável.', icon: ShieldIcon, span: 'sm:col-span-2 sm:row-span-2', accent: true },
  { code: 'OP-02', title: 'Escalas Inteligentes', desc: 'Plantões, trocas e calendário 24/7 com detecção de conflitos.', icon: CalendarIcon },
  { code: 'OP-03', title: 'Banco de Horas', desc: 'Quinzenas independentes com limites hierárquicos.', icon: ClockIcon },
  { code: 'OP-04', title: 'Chat Tático', desc: 'Comunicação por unidade e equipe em tempo real.', icon: RadioIcon },
  { code: 'OP-05', title: 'Painel Master', desc: 'Visão consolidada de 9 unidades socioeducativas do Acre.', icon: ChartIcon },
  { code: 'OP-06', title: 'Operação 24/7', desc: 'Alarmes inteligentes, push notifications e modo offline.', icon: TargetIcon },
];

export function InstitutionalPillars() {
  return (
    <section
      className="relative w-full max-w-6xl mx-auto px-3 sm:px-0 py-8 sm:py-12 overflow-hidden"
      aria-label="Capacidades operacionais"
    >
      {/* SVG background grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" aria-hidden>
        <defs>
          <pattern id="pillarGrid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(38 92% 50% / 0.15)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pillarGrid)" />
      </svg>

      {/* Section header — briefing style */}
      <header className="relative flex items-end justify-between mb-6 sm:mb-8 pb-3 border-b border-primary/30">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono-mil text-[10px] text-primary/80">
            <span className="h-px w-6 bg-primary/60" />
            SECTION 02 / CAPABILITIES
          </div>
          <h2 className="font-stencil font-bold text-2xl sm:text-3xl lg:text-4xl text-foreground uppercase leading-none">
            Plataforma Operacional
          </h2>
          <p className="font-mono-mil text-[10px] sm:text-xs text-muted-foreground mt-2 max-w-md">
            &gt; Tecnologia de comando e controle dedicada aos agentes socioeducativos.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 font-mono-mil text-[10px] text-muted-foreground">
          <span className="text-primary">ISE // ACRE</span>
          <span>6 MÓDULOS · 9 UNIDADES</span>
        </div>
      </header>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 auto-rows-[140px] sm:auto-rows-[160px]">
        {pillars.map(({ code, title, desc, icon, span, accent }, i) => (
          <article
            key={code}
            className={[
              'group relative overflow-hidden p-4 sm:p-5 animate-fade-in',
              'border border-primary/30 bg-card/85 backdrop-blur-md',
              'transition-all duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_hsl(38_92%_50%/0.5)]',
              span ?? '',
              accent
                ? 'bg-gradient-to-br from-card via-card to-primary/15 border-primary/60'
                : '',
            ].join(' ')}
            style={{
              animationDelay: `${i * 70}ms`,
              clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
            }}
          >
            {/* OP code header */}
            <div className="flex items-start justify-between mb-3">
              <span className="font-mono-mil text-[9px] text-primary tracking-widest border border-primary/40 px-1.5 py-0.5">
                {code}
              </span>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden />
            </div>

            <div className="flex items-start gap-3 h-[calc(100%-2rem)]">
              {/* Hex-framed icon */}
              <div className={[
                'relative shrink-0 flex items-center justify-center',
                accent ? 'w-14 h-14 sm:w-16 sm:h-16 text-primary-foreground' : 'w-10 h-10 sm:w-12 sm:h-12 text-primary',
              ].join(' ')}>
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
                  <polygon
                    points="50,4 92,28 92,72 50,96 8,72 8,28"
                    fill={accent ? 'hsl(38 92% 50%)' : 'hsl(38 92% 50% / 0.12)'}
                    stroke="hsl(38 92% 50%)"
                    strokeWidth="1.5"
                  />
                </svg>
                <div className="relative w-1/2 h-1/2">{icon}</div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <h3 className={[
                  'font-stencil font-bold uppercase leading-tight text-foreground',
                  accent ? 'text-base sm:text-xl' : 'text-sm sm:text-base',
                ].join(' ')}>
                  {title}
                </h3>
                <p className={[
                  'font-mono-mil text-muted-foreground mt-1.5 leading-snug',
                  accent ? 'text-[11px] sm:text-xs line-clamp-4' : 'text-[10px] sm:text-[11px] line-clamp-3',
                ].join(' ')}>
                  {desc}
                </p>
              </div>
            </div>

            {/* corner brackets */}
            <span className="absolute top-0 left-0 w-3 h-3 border-l border-t border-primary opacity-60" aria-hidden />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-primary opacity-60" aria-hidden />
          </article>
        ))}
      </div>

      {/* Footer line */}
      <div className="mt-6 flex items-center justify-between font-mono-mil text-[9px] sm:text-[10px] text-muted-foreground/70 pt-3 border-t border-primary/20">
        <span>// END_SECTION_02</span>
        <span className="hidden sm:inline">ENCRYPTED // VERIFIED // RLS</span>
        <span className="text-primary">[OK]</span>
      </div>
    </section>
  );
}
