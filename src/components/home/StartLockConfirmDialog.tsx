import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface StartLockConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  color: string;
  teamName: string;
  agentCount: number;
  totalDurationLabel: string;
  silent?: boolean;
}

/**
 * Confirmação de Início — layout compacto e tático.
 * Hero à esquerda com emblema hexagonal específico da equipe (letra + código
 * fonético) e painel de fatos denso à direita. Todo o cromo respeita a cor
 * dinâmica da equipe (ALFA/BRAVO/CHARLIE/DELTA).
 */

type TeamKey = 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';
const TEAM_META: Record<TeamKey, { letter: string; phonetic: string; code: string }> = {
  ALFA:    { letter: 'A', phonetic: 'ALPHA',   code: 'TF-01' },
  BRAVO:   { letter: 'B', phonetic: 'BRAVO',   code: 'TF-02' },
  CHARLIE: { letter: 'C', phonetic: 'CHARLIE', code: 'TF-03' },
  DELTA:   { letter: 'D', phonetic: 'DELTA',   code: 'TF-04' },
};

function getTeamMeta(name: string): { letter: string; phonetic: string; code: string } {
  const key = name.toUpperCase() as TeamKey;
  if (TEAM_META[key]) return TEAM_META[key];
  return { letter: name.charAt(0).toUpperCase() || '•', phonetic: name.toUpperCase(), code: 'TF-XX' };
}

export function StartLockConfirmDialog({
  open,
  onCancel,
  onConfirm,
  color,
  teamName,
  agentCount,
  totalDurationLabel,
  silent = false,
}: StartLockConfirmDialogProps) {
  const [countdown, setCountdown] = useState(3);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) { setCountdown(3); setArmed(false); return; }
    setCountdown(3); setArmed(false);
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { window.clearInterval(id); setArmed(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const meta = getTeamMeta(teamName);
  const gradId = `slcd-hex-${meta.letter}`;
  const glossId = `slcd-gloss-${meta.letter}`;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent
        className="max-w-[420px] p-0 overflow-hidden border bg-slate-950 rounded-lg"
        style={{
          borderColor: `${color}66`,
          boxShadow: `0 20px 60px -20px ${color}66, 0 0 0 1px ${color}22 inset`,
        }}
      >
        {/* ============ TOP RIBBON ============ */}
        <div
          className="relative flex items-center justify-between h-8 px-3 border-b"
          style={{
            borderColor: `${color}33`,
            background: `linear-gradient(90deg, ${color}22 0%, transparent 60%)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="relative flex h-1.5 w-1.5"
            >
              {!silent && (
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
                  style={{ background: color }}
                />
              )}
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
            </span>
            <span
              className="font-mono text-[9.5px] font-bold tracking-[0.28em] uppercase"
              style={{ color }}
            >
              Confirmação de Início
            </span>
          </div>
          <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-slate-500">
            {meta.code}
          </span>
        </div>

        {/* ============ HERO ROW: emblema + título ============ */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          {/* Emblema hexagonal específico da equipe */}
          <div className="relative shrink-0">
            <svg viewBox="0 0 72 72" className="h-16 w-16" aria-hidden>
              <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                  <stop offset="55%" stopColor={color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                </linearGradient>
                <radialGradient id={glossId} cx="35%" cy="25%" r="55%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>
              {/* Outer ring ticks — sutil, um marker por lado */}
              {Array.from({ length: 6 }).map((_, i) => {
                const a = (i * 360) / 6;
                return (
                  <line
                    key={i}
                    x1="36" y1="3" x2="36" y2="7"
                    stroke={color} strokeOpacity="0.7" strokeWidth="1.2"
                    strokeLinecap="round"
                    transform={`rotate(${a} 36 36)`}
                  />
                );
              })}
              {/* Hexágono principal */}
              <polygon
                points="36,10 60,23 60,49 36,62 12,49 12,23"
                fill={`url(#${gradId})`}
                stroke={color}
                strokeWidth="1.4"
                strokeOpacity="0.9"
              />
              {/* Hexágono interno (linhas táticas) */}
              <polygon
                points="36,17 54,27 54,45 36,55 18,45 18,27"
                fill="none"
                stroke={color}
                strokeOpacity="0.35"
                strokeWidth="0.7"
              />
              {/* Gloss */}
              <polygon
                points="36,10 60,23 60,32 36,20 12,32 12,23"
                fill={`url(#${glossId})`}
              />
              {/* Letra da equipe */}
              <text
                x="36" y="45"
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize="26"
                fontWeight="900"
                fill="#f8fafc"
                style={{ letterSpacing: '-0.02em', filter: `drop-shadow(0 1px 2px ${color}80)` }}
              >
                {meta.letter}
              </text>
            </svg>
          </div>

          {/* Título compacto */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-[9.5px] font-bold tracking-[0.24em] uppercase"
                style={{ color }}
              >
                Equipe {meta.phonetic}
              </span>
              <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}66, transparent)` }} />
            </div>
            <h2 className="mt-1 text-[15.5px] font-black leading-tight tracking-tight text-slate-100">
              Selar ordem e cadência
              <span className="block text-slate-400 font-medium text-[12px] mt-0.5">
                Após iniciar, <span style={{ color }} className="font-semibold">pause e reset ficam bloqueados</span> até o término.
              </span>
            </h2>
          </div>
        </div>

        {/* ============ FATOS EM LINHA ============ */}
        <div className="px-4">
          <div
            className="grid grid-cols-3 rounded-md border overflow-hidden"
            style={{ borderColor: `${color}33`, background: 'rgba(15,23,42,0.6)' }}
          >
            <Fact label="Agentes" value={String(agentCount)} color={color} />
            <Fact label="Duração" value={totalDurationLabel} color={color} border />
            <Fact label="Modo" value={silent ? 'Silêncio' : 'Sonoro'} color={color} border />
          </div>
        </div>

        {/* ============ CALLOUT ============ */}
        <div className="px-4 pt-3">
          <div
            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
            style={{ borderColor: `${color}40`, background: `${color}0d` }}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
              <circle cx="8" cy="8" r="7" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.2" />
              <path d="M8 4.5 V9" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="8" cy="11.4" r="0.9" fill={color} />
            </svg>
            <span className="text-[11.5px] leading-snug text-slate-300">
              Silêncio permanece disponível. Ao final, um resumo libera os controles.
            </span>
          </div>
        </div>

        {/* ============ AÇÕES ============ */}
        <div className="px-4 pt-3 pb-4 grid grid-cols-[1fr_1.4fr] gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-slate-700/70 bg-slate-900/60 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!armed}
            onClick={onConfirm}
            className={cn(
              'relative h-10 rounded-md border font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] transition-all overflow-hidden',
              !armed && 'cursor-not-allowed',
            )}
            style={{
              borderColor: color,
              background: armed
                ? `linear-gradient(180deg, ${color}, ${color}cc)`
                : `${color}18`,
              color: armed ? '#0b0f17' : color,
              boxShadow: armed ? `0 0 20px -6px ${color}` : undefined,
            }}
          >
            <span className="relative z-10">
              {armed ? 'Confirmar e Iniciar' : `Aguarde ${countdown}s`}
            </span>
            {!armed && (
              <span
                className="absolute left-0 bottom-0 h-[2px]"
                style={{
                  backgroundColor: color,
                  width: `${((3 - countdown) / 3) * 100}%`,
                  transition: 'width 1s linear',
                }}
              />
            )}
          </button>
        </div>

        {/* ============ FOOTER MICRO ============ */}
        <div
          className="flex items-center justify-between px-4 py-1.5 border-t"
          style={{ borderColor: `${color}22`, background: 'rgba(2,6,23,0.6)' }}
        >
          <span className="font-mono text-[8.5px] tracking-[0.28em] uppercase text-slate-600">
            Protocolo · 07
          </span>
          <span className="font-mono text-[8.5px] tracking-[0.28em] uppercase text-slate-600">
            Disciplina · Segurança
          </span>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Fact({
  label,
  value,
  color,
  border,
}: {
  label: string;
  value: string;
  color: string;
  border?: boolean;
}) {
  return (
    <div
      className="px-2 py-1.5 text-center"
      style={{ borderLeft: border ? `1px solid ${color}22` : undefined }}
    >
      <div className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-0.5 text-[13px] font-black text-slate-100 truncate leading-none" title={value}>{value}</div>
    </div>
  );
}

export default StartLockConfirmDialog;
