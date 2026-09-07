import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { getNext22Ms, NIGHT_TZ } from '@/lib/nightShift';

interface PreNightScheduleDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Confirma o agendamento — recebe o timestamp-alvo (22:00 Acre). */
  onSchedule: (targetMs: number) => void;
  color: string;
  teamName: string;
  agentCount: number;
  /** Relógio (ms UTC) atual do servidor — usado para o countdown. */
  nowMs: number;
}

/**
 * Aviso profissional exibido quando o operador tenta iniciar a ronda
 * entre 18:00 e 21:59 (horário do Acre). A ronda noturna só começa
 * às 22:00; aqui oferecemos AGENDAR para as 22:00 ou cancelar.
 * Arte em SVG puro — sem ícones externos.
 */
export function PreNightScheduleDialog({
  open,
  onCancel,
  onSchedule,
  color,
  teamName,
  agentCount,
  nowMs,
}: PreNightScheduleDialogProps) {
  const [targetMs, setTargetMs] = useState<number>(() => getNext22Ms(new Date(nowMs)));

  useEffect(() => {
    if (open) setTargetMs(getNext22Ms(new Date(nowMs)));
  }, [open, nowMs]);

  const remainingMs = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(remainingMs / 1000);
  const hh = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const mm = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');

  const targetLabel = new Intl.DateTimeFormat('pt-BR', {
    timeZone: NIGHT_TZ,
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(targetMs));

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent
        className="max-w-md p-0 overflow-hidden border-2 bg-slate-950"
        style={{ borderColor: `${color}80`, boxShadow: `0 0 80px -20px ${color}` }}
      >
        {/* Faixa superior */}
        <div
          className="relative h-11 flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${color}22, ${color}66, ${color}22)` }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 10px, transparent 10px 22px)`,
            }}
          />
          <div className="relative font-mono text-[11px] font-bold tracking-[0.36em] uppercase" style={{ color }}>
            Janela Pré-Noturna
          </div>
        </div>

        {/* Emblema SVG — relógio com marcador em 22h */}
        <div className="flex justify-center pt-6 pb-2">
          <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden>
            <defs>
              <radialGradient id="pnsd-dome" cx="35%" cy="28%" r="80%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="22%" stopColor={color} stopOpacity="0.9" />
                <stop offset="70%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
              <radialGradient id="pnsd-gloss" cx="35%" cy="22%" r="42%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="pnsd-gold" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="55%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <filter id="pnsd-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Anel externo com ticks (destaque em 22h/06h) */}
            <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="1" />
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i * 360) / 24;
              const key22 = i === 22;
              const key06 = i === 6;
              const long = key22 || key06 || i % 6 === 0;
              return (
                <line
                  key={i}
                  x1="60" y1="10" x2="60" y2={long ? 18 : 14}
                  stroke={key22 ? color : '#94a3b8'}
                  strokeOpacity={key22 ? 1 : key06 ? 0.7 : long ? 0.7 : 0.3}
                  strokeWidth={key22 ? 2 : long ? 1.2 : 0.7}
                  strokeLinecap="round"
                  transform={`rotate(${a} 60 60)`}
                />
              );
            })}

            {/* Disco central */}
            <circle cx="60" cy="60" r="34" fill="url(#pnsd-dome)" stroke={color} strokeOpacity="0.7" strokeWidth="1.2" filter="url(#pnsd-glow)" />
            <ellipse cx="55" cy="46" rx="20" ry="8" fill="url(#pnsd-gloss)" />

            {/* Lua crescente estilizada */}
            <path
              d="M66 44 a20 20 0 1 0 12 30 a15 15 0 1 1 -12 -30 Z"
              fill="url(#pnsd-gold)" stroke="#78350f" strokeWidth="0.8"
            />

            {/* Etiqueta 22:00 */}
            <text
              x="60" y="94" textAnchor="middle"
              fontFamily="ui-monospace, monospace" fontSize="9" fontWeight="700"
              letterSpacing="0.28em" fill="#f8fafc"
            >
              22:00
            </text>
          </svg>
        </div>

        <div className="px-6 pb-6 text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.32em] text-slate-500 mb-1">
            Protocolo Operacional 12
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-100 leading-tight">
            Rondas noturnas só iniciam <span style={{ color }}>às 22:00</span>
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
            Estamos na janela pré-noturna (18:00 – 21:59). Para preservar a
            cadência e a integridade do turno, o sistema não permite iniciar
            agora — apenas <b className="text-slate-200">agendar</b> o início
            automático para as 22:00.
          </p>

          {/* Fatos da missão */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Fact label="Equipe" value={teamName} color={color} />
            <Fact label="Agentes" value={String(agentCount)} color={color} />
            <Fact label="Início" value={targetLabel} color={color} />
          </div>

          {/* Countdown */}
          <div
            className="mt-4 rounded-md border py-2.5"
            style={{ borderColor: `${color}55`, background: `${color}0f` }}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-slate-500">
              Faltam para o início
            </div>
            <div className="mt-0.5 font-mono text-2xl font-black tabular-nums text-slate-100">
              {hh}<span className="text-slate-500">:</span>{mm}<span className="text-slate-500">:</span>{ss}
            </div>
          </div>

          {/* Ações */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-md border border-slate-700/70 bg-slate-900/60 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSchedule(targetMs)}
              className="h-11 rounded-md border font-mono text-[11px] uppercase tracking-[0.18em] transition-all"
              style={{
                borderColor: color,
                background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                color: '#0b0f17',
                boxShadow: `0 0 24px -6px ${color}`,
              }}
            >
              Agendar 22:00
            </button>
          </div>

          <p className="mt-4 font-mono text-[10px] tracking-[0.28em] uppercase text-slate-600">
            Disciplina é segurança
          </p>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md border bg-slate-900/60 py-2 px-1" style={{ borderColor: `${color}40` }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-slate-100 truncate" title={value}>{value}</div>
    </div>
  );
}

export default PreNightScheduleDialog;
