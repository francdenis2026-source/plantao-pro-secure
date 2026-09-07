import { useEffect, useState } from 'react';
import { Eye, Coffee, Brain, Flame, Compass, Heart, ShieldCheck, Zap, Moon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHRASES: Array<{ icon: typeof Eye; text: string; hue: 'primary' | 'warn' | 'ok' }> = [
  { icon: Eye,          text: 'Mantenha os olhos abertos — o setor conta com você.', hue: 'primary' },
  { icon: ShieldCheck,  text: 'Disciplina é o que separa o profissional do amador.',   hue: 'ok' },
  { icon: Compass,      text: 'Percorra o perímetro. Observe cada detalhe.',           hue: 'primary' },
  { icon: Brain,        text: 'Concentração total. Sua atenção protege vidas.',        hue: 'primary' },
  { icon: Flame,        text: 'Ronda profissional é ronda com propósito.',             hue: 'warn' },
  { icon: Coffee,       text: 'Respire fundo. Alongue. Não permita o cansaço vencer.', hue: 'warn' },
  { icon: Heart,        text: 'Sua presença firme é a segurança da equipe.',           hue: 'ok' },
  { icon: Zap,          text: 'Passos firmes, mente alerta, missão em foco.',          hue: 'primary' },
  { icon: Moon,         text: 'A noite exige mais — e você foi treinado para isso.',   hue: 'primary' },
  { icon: AlertTriangle,text: 'Nunca subestime a rotina. É nela que tudo acontece.',   hue: 'warn' },
  { icon: ShieldCheck,  text: 'Cumpra o percurso completo. Sem atalhos.',              hue: 'ok' },
  { icon: Eye,          text: 'Verifique portas, janelas e áreas críticas.',           hue: 'primary' },
];

interface Props {
  color: string;
  active: boolean;
  /** 0..1 — round progress. Higher = closer to end = faster phrase rotation. */
  progress?: number;
  /** When true, suppresses animations and scanlines but keeps the guidance text. */
  silent?: boolean;
}

/**
 * Rotating motivational strip shown while a round is running.
 * Cycles professional reminders with cadence tied to countdown progress
 * (faster near the end) to keep the agent alert during long shifts.
 */
export function MotivationalTicker({ color, active, progress = 0, silent = false }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    // 5s at start → 1.5s near the end
    const interval = Math.max(1500, 5000 - progress * 3500);
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % PHRASES.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [active, progress]);

  if (!active) return null;

  const item = PHRASES[idx];
  const Icon = item.icon;

  return (
    <div
      key={idx}
      className={cn(
        'relative w-full max-w-2xl mx-auto rounded-lg border overflow-hidden',
        !silent && 'animate-fade-in',
      )}
      style={{
        borderColor: `${color}55`,
        background: `linear-gradient(90deg, ${color}0A, transparent 20%, transparent 80%, ${color}0A)`,
      }}
    >
      {/* Left/right glow bars */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1"
        style={{ background: `linear-gradient(180deg, transparent, ${color}, transparent)` }}
      />
      <span
        aria-hidden
        className="absolute right-0 top-0 h-full w-1"
        style={{ background: `linear-gradient(180deg, transparent, ${color}, transparent)` }}
      />
      {/* Scanline */}
      {!silent && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            animation: 'motivScan 3.5s linear infinite',
          }}
        />
      )}

      <div className="relative flex items-center gap-3 px-4 py-2.5">
        <div
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
          style={{ borderColor: `${color}55`, background: `${color}15` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
          {!silent && (
            <span
              aria-hidden
              className="absolute -inset-1 rounded-md"
              style={{
                boxShadow: `0 0 12px ${color}66`,
                animation: 'motivPulse 2.2s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            Protocolo · orientação {String(idx + 1).padStart(2, '0')}/{String(PHRASES.length).padStart(2, '0')}
          </div>
          <div
            className="text-sm sm:text-[15px] font-semibold leading-snug truncate"
            style={{ color }}
          >
            {item.text}
          </div>
        </div>
        {/* Heartbeat */}
        <svg width="52" height="20" viewBox="0 0 52 20" aria-hidden className="shrink-0 opacity-90">
          <path
            d="M0 10 H10 L14 4 L20 16 L26 6 L30 12 L34 10 H52"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          >
            {!silent && (
              <animate attributeName="stroke-dasharray" values="0 80;80 0" dur="1.6s" repeatCount="indefinite" />
            )}
          </path>
        </svg>
      </div>

      <style>{`
        @keyframes motivScan { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        @keyframes motivPulse { 0%,100% { opacity: 0.35 } 50% { opacity: 0.9 } }
      `}</style>
    </div>
  );
}

export default MotivationalTicker;
