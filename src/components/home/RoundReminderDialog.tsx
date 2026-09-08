import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { useMemo } from 'react';

interface RoundReminderDialogProps {
  open: boolean;
  onDismiss: () => void;
  onOpenRounds: () => void;
  intervalMin?: number;
}

/**
 * Lembrete tático de verificação presencial dos adolescentes.
 *
 * A cada disparo, o dialog rotaciona um "tema operacional" (cor, tipografia,
 * emblema SVG e mensagem profissional) — evita fadiga visual, mantém o
 * operador atento e reforça o protocolo com identidade sempre nova.
 *
 * Ciclo persistido em localStorage para avançar mesmo entre recargas.
 */

type Theme = {
  code: string;
  accent: string;
  accentSoft: string;
  bg: string;
  title: string;
  subtitle: string;
  fontFamily: string;
  fontClass: string;
  emblem: 'shield' | 'radar' | 'compass' | 'crosshair';
};

const THEMES: Theme[] = [
  {
    code: 'ECHO-01',
    accent: '#f59e0b',
    accentSoft: '#fbbf24',
    bg: '#0b0f17',
    title: 'Verificação presencial requerida',
    subtitle:
      'Ciclo operacional concluído. Deslocar até os alojamentos e confirmar visualmente a integridade e contagem dos adolescentes sob custódia.',
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontClass: 'font-mono',
    emblem: 'shield',
  },
  {
    code: 'DELTA-02',
    accent: '#22d3ee',
    accentSoft: '#67e8f9',
    bg: '#020617',
    title: 'Ronda de conferência autorizada',
    subtitle:
      'Executar varredura presencial nos setores designados. Registrar ocorrências, comportamentos atípicos e status individual de cada interno.',
    fontFamily: '"Space Grotesk", "Inter", sans-serif',
    fontClass: '',
    emblem: 'radar',
  },
  {
    code: 'CHARLIE-03',
    accent: '#34d399',
    accentSoft: '#6ee7b7',
    bg: '#04140f',
    title: 'Confirmar estado dos custodiados',
    subtitle:
      'Percorrer os pavilhões e confirmar presença física de cada adolescente. Reportar qualquer divergência de contagem imediatamente ao comando.',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontClass: 'font-mono',
    emblem: 'compass',
  },
  {
    code: 'BRAVO-04',
    accent: '#f87171',
    accentSoft: '#fca5a5',
    bg: '#170a0a',
    title: 'Protocolo de segurança ativo',
    subtitle:
      'Intervalo máximo entre verificações atingido. Realizar inspeção presencial completa e revalidar perímetro dos alojamentos.',
    fontFamily: '"Rajdhani", "Oswald", sans-serif',
    fontClass: '',
    emblem: 'crosshair',
  },
];

const CYCLE_KEY = 'plantaopro_round_reminder_cycle';

function nextCycleIndex(): number {
  try {
    const raw = localStorage.getItem(CYCLE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    const idx = Number.isFinite(n) ? n : 0;
    return idx % THEMES.length;
  } catch {
    return 0;
  }
}

function Emblem({ theme }: { theme: Theme }) {
  const { accent, accentSoft, emblem } = theme;
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden>
      <defs>
        <radialGradient id={`rrd-dome-${emblem}`} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor={accentSoft} stopOpacity="0.95" />
          <stop offset="35%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="85%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={theme.bg} />
        </radialGradient>
        <filter id={`rrd-glow-${emblem}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Anel externo pulsante */}
      <circle cx="60" cy="60" r="54" fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1">
        <animate attributeName="r" values="52;56;52" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.55;0.15;0.55" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="60" r="46" fill={`url(#rrd-dome-${emblem})`} filter={`url(#rrd-glow-${emblem})`} />

      {emblem === 'shield' && (
        <g transform="translate(60 60)" stroke={accent} strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round">
          <path d="M0 -26 L20 -18 V4 C20 16 12 24 0 28 C-12 24 -20 16 -20 4 V-18 Z" fill={`${accent}22`} />
          <path d="M-9 0 L-3 7 L10 -7" strokeWidth="2.6" />
        </g>
      )}

      {emblem === 'radar' && (
        <g transform="translate(60 60)" stroke={accent} fill="none" strokeLinecap="round">
          <circle r="24" strokeWidth="1.2" strokeOpacity="0.6" />
          <circle r="16" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle r="8" strokeWidth="1.2" strokeOpacity="0.3" />
          <line x1="0" y1="0" x2="24" y2="0" strokeWidth="2">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="3s" repeatCount="indefinite" />
          </line>
          <circle r="2" fill={accentSoft} stroke="none" />
        </g>
      )}

      {emblem === 'compass' && (
        <g transform="translate(60 60)" stroke={accent} fill="none">
          <circle r="26" strokeWidth="1.6" />
          <path d="M0 -22 L6 0 L0 22 L-6 0 Z" fill={`${accent}55`} strokeWidth="1.6" strokeLinejoin="round" />
          <circle r="3" fill={accentSoft} stroke="none" />
          <g strokeWidth="1.2">
            <line x1="0" y1="-30" x2="0" y2="-26" />
            <line x1="0" y1="30" x2="0" y2="26" />
            <line x1="-30" y1="0" x2="-26" y2="0" />
            <line x1="30" y1="0" x2="26" y2="0" />
          </g>
        </g>
      )}

      {emblem === 'crosshair' && (
        <g transform="translate(60 60)" stroke={accent} fill="none" strokeLinecap="round">
          <circle r="22" strokeWidth="1.6" />
          <circle r="4" strokeWidth="1.6" fill={`${accent}55`} />
          <line x1="0" y1="-30" x2="0" y2="-10" strokeWidth="2" />
          <line x1="0" y1="10" x2="0" y2="30" strokeWidth="2" />
          <line x1="-30" y1="0" x2="-10" y2="0" strokeWidth="2" />
          <line x1="10" y1="0" x2="30" y2="0" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

export function RoundReminderDialog({
  open,
  onDismiss,
  onOpenRounds,
  intervalMin = 30,
}: RoundReminderDialogProps) {
  // Escolhe o tema quando o dialog abre e avança o contador para o próximo ciclo.
  const theme = useMemo(() => {
    if (!open) return THEMES[0];
    const idx = nextCycleIndex();
    try { localStorage.setItem(CYCLE_KEY, String(idx + 1)); } catch { /* ignore */ }
    return THEMES[idx];
  }, [open]);

  const { accent, accentSoft, bg, title, subtitle, fontFamily, fontClass, code } = theme;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <AlertDialogContent
        className="rm-reminder max-w-md p-0 overflow-hidden border-2"
        style={{
          borderColor: `${accent}90`,
          boxShadow: `0 0 80px -18px ${accent}`,
          background: bg,
          fontFamily,
        }}
      >
        {/* Faixa superior */}
        <div
          className="relative h-11 flex items-center justify-between px-4 overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${accent}22, ${accent}77, ${accent}22)` }}
        >
          <div
            className="absolute inset-0 opacity-25 animate-pulse"
            style={{ backgroundImage: `repeating-linear-gradient(45deg, ${accent} 0 10px, transparent 10px 22px)` }}
          />
          <div className={`relative font-mono text-[11px] font-black tracking-[0.38em] uppercase`} style={{ color: accent }}>
            Alerta Operacional
          </div>
          <div className="relative font-mono text-[10px] tracking-[0.28em] uppercase" style={{ color: `${accent}dd` }}>
            {code}
          </div>
        </div>

        <div className="flex justify-center pt-6 pb-2">
          <Emblem theme={theme} />
        </div>

        <div className="px-6 pb-6 text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-slate-500 mb-1">
            Protocolo · Verificação a cada {intervalMin}min
          </div>
          <h2
            className={`text-[19px] font-black tracking-tight leading-tight ${fontClass}`}
            style={{ color: accentSoft }}
          >
            {title}
          </h2>
          <p className={`mt-2 text-[12.5px] leading-relaxed text-slate-300/85 ${fontClass}`}>
            {subtitle}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="h-11 rounded-md border border-slate-700/70 bg-slate-900/60 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
            >
              Adiar {intervalMin}min
            </button>
            <button
              type="button"
              onClick={onOpenRounds}
              className="h-11 rounded-md border font-mono text-[11px] uppercase tracking-[0.18em] transition-all"
              style={{
                borderColor: accent,
                background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                color: '#0b0f17',
                boxShadow: `0 0 24px -6px ${accent}`,
              }}
            >
              Iniciar verificação
            </button>
          </div>

          <p className="mt-4 font-mono text-[10px] tracking-[0.28em] uppercase text-slate-600">
            Disciplina · Presença · Registro
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RoundReminderDialog;
