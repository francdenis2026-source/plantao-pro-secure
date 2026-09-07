import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeRoundsState } from '@/lib/roundsState';
import {
  Users, Plus, Trash2, Copy, FileDown, Timer,
  Play, Pause, RotateCcw, Radio, ChevronRight, AlertTriangle,
  CheckCircle2, Volume2, VolumeX, Lock, CalendarClock, XCircle, Settings,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { areNativeNotificationsAllowed } from '@/lib/reminderSettings';
import { ConfirmDialog } from './ConfirmDialog';
import { MissionLockDialog } from './MissionLockDialog';
import { RoundSummaryDialog } from './RoundSummaryDialog';
import { StartLockConfirmDialog } from './StartLockConfirmDialog';
import { TeamConfirmDialog } from './TeamConfirmDialog';
import { RoundHistoryDialog } from './RoundHistoryDialog';
import { ReminderSettingsDialog } from './ReminderSettingsDialog';
import { HourglassSVG } from './HourglassSVG';
import { getRotatedTeamColor, bumpColorRotation, TEAM_COLORS } from '@/lib/teamColors';
import { TacticalClock } from './TacticalClock';
import { TeamGlyph } from './TeamGlyph';
import { getServerDate, getServerOffsetMs, syncServerTime } from '@/hooks/useServerTime';
import {
  isNightShift, getNightWindow, formatAcreClock,
  NIGHT_TZ,
} from '@/lib/nightShift';
import { useAuth } from '@/contexts/AuthContext';
import { SecurityDoctrineCard } from './SecurityDoctrineCard';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useLowMotion } from '@/hooks/useLowMotion';

/** Registra ação no histórico de atividades (activity_logs). */
async function logRoundActivity(
  action: 'create' | 'update' | 'abort',
  details: Record<string, unknown>,
) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;
    let agentId: string | null = null;
    let agentName: string | null = null;
    if (email) {
      const cpf = email.split('@')[0];
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name')
        .eq('cpf', cpf)
        .maybeSingle();
      if (agent) { agentId = agent.id; agentName = agent.name; }
    }
    await supabase.from('activity_logs').insert({
      agent_id: agentId,
      agent_name: agentName,
      action,
      resource_type: 'rounds',
      details: details as any,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : null,
    });
  } catch (err) {
    console.warn('[rounds] activity log falhou', err);
  }
}

/** Minutos (float, com segundos) do horário local em America/Rio_Branco. */
function acreMinutesFloat(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: NIGHT_TZ,
  }).formatToParts(d);
  const g = (t: string) => +((parts.find((p) => p.type === t)?.value) || '0');
  return (g('hour') % 24) * 60 + g('minute') + g('second') / 60;
}



/* ================= helpers ================= */
const pad = (n: number) => n.toString().padStart(2, '0');

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}
function fromMinutes(total: number): string {
  // Aceita minutos fracionários — mostra HH:mm:ss quando houver segundos, senão HH:mm.
  const totalSec = Math.round(total * 60);
  const daySec = 24 * 3600;
  const t = ((totalSec % daySec) + daySec) % daySec;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return s === 0 ? `${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function fmtDuration(mins: number): string {
  // Aceita minutos fracionários (com segundos).
  const totalSec = Math.max(0, Math.round(mins * 60));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${pad(m)}min`);
  if (s) parts.push(`${pad(s)}s`);
  return parts.length ? parts.join('') : '0min';
}
function fmtHMS(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

// HourglassSVG foi extraído para um componente padronizado e otimizado.
// Ver: src/components/home/HourglassSVG.tsx

const TEAM_PRESETS = [
  { key: 'ALFA',    label: TEAM_COLORS.ALFA.label,    color: TEAM_COLORS.ALFA.hex },
  { key: 'BRAVO',   label: TEAM_COLORS.BRAVO.label,   color: TEAM_COLORS.BRAVO.hex },
  { key: 'CHARLIE', label: TEAM_COLORS.CHARLIE.label, color: TEAM_COLORS.CHARLIE.hex },
  { key: 'DELTA',   label: TEAM_COLORS.DELTA.label,   color: TEAM_COLORS.DELTA.hex },
] as const;

type TeamKey = typeof TEAM_PRESETS[number]['key'];
type Mode = 'split' | 'interval';
// Sanitiza qualquer valor legado ('proportional', string desconhecida, null) que
// possa vir do localStorage, de uma template antiga ou de uma linha antiga em
// round_sessions. É a fonte única de verdade para hidratação.
const sanitizeMode = (m: unknown): Mode => (m === 'interval' ? 'interval' : 'split');


/** Cadência-base padrão (regra de ouro: 1 ronda a cada X minutos). */
const DEFAULT_CADENCE_MIN = 30;
const CADENCE_KEY = 'plantaopro_rounds_cadence_v1';

/**
 * Expande a lista de agentes para o modo Proporcional.
 * Regra: nRondas = arredondar(totalMin / cadenceMin), com piso = nAgentes
 * (garante mínimo de 1 ronda por agente). Distribui as rondas ciclicamente
 * entre os agentes (A, B, A, B, ...), respeitando a ordem informada.
 */
function expandProportionalAgents(baseAgents: string[], totalMin: number, cadenceMin: number): string[] {
  const n = baseAgents.length;
  if (n === 0) return [];
  const cadence = Math.max(1, Math.round(cadenceMin));
  const raw = Math.round(totalMin / cadence);
  const rounds = Math.max(n, raw); // mínimo: 1 por agente
  const out: string[] = [];
  for (let i = 0; i < rounds; i++) out.push(baseAgents[i % n]);
  return out;
}
type Rounding = 'exact' | 'floor' | 'ceil' | 'distribute';

/* ================= templates (localStorage) ================= */
type Template = {
  id: string;
  name: string;
  team: TeamKey;
  mode: Mode;
  startTime: string;
  endTime: string;
  intervalMin: number;
  rounding: Rounding;
  agents: string[];
  updatedAt: number;
};
const TPL_KEY = 'plantaopro_rounds_templates_v1';
const readTemplates = (): Template[] => {
  try {
    const raw = localStorage.getItem(TPL_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};
const writeTemplates = (arr: Template[]) => {
  try { localStorage.setItem(TPL_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
};

/* ================= history (localStorage) ================= */
type HistoryEntry = {
  id: string;
  team: TeamKey;
  mode: Mode;
  startTime: string;
  endTime: string;
  intervalMin: number;
  agents: string[];
  startedAt: number;
  endedAt: number | null;
};
const HIST_KEY = 'plantaopro_rounds_history_v1';
const readHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};
const writeHistory = (arr: HistoryEntry[]) => {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(0, 20))); } catch { /* ignore */ }
};

/* ================= alert sound settings ================= */
type SoundSettings = { muted: boolean; volume: number; tone: 'chime' | 'pulse' | 'siren' };
const SND_KEY = 'plantaopro_rounds_sound_v1';
const DEFAULT_SOUND: SoundSettings = { muted: false, volume: 60, tone: 'chime' };
const readSound = (): SoundSettings => {
  try {
    const raw = localStorage.getItem(SND_KEY);
    return raw ? { ...DEFAULT_SOUND, ...JSON.parse(raw) } : DEFAULT_SOUND;
  } catch { return DEFAULT_SOUND; }
};
const writeSound = (s: SoundSettings) => {
  try { localStorage.setItem(SND_KEY, JSON.stringify(s)); } catch { /* ignore */ }
};
function playAlert(settings: SoundSettings) {
  if (settings.muted || settings.volume <= 0) return;
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const gain = ctx.createGain();
    const vol = Math.min(1, Math.max(0, settings.volume / 100)) * 0.35;
    gain.gain.value = vol;
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    const beep = (freq: number, start: number, dur: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(vol, now + start + 0.02);
      g.gain.linearRampToValueAtTime(0, now + start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + start); o.stop(now + start + dur + 0.02);
    };

    if (settings.tone === 'chime') {
      beep(880, 0, 0.18, 'sine');
      beep(1320, 0.16, 0.28, 'sine');
    } else if (settings.tone === 'pulse') {
      beep(1000, 0, 0.1, 'square');
      beep(1000, 0.16, 0.1, 'square');
      beep(1000, 0.32, 0.14, 'square');
    } else {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(600, now);
      o.frequency.linearRampToValueAtTime(1200, now + 0.3);
      o.frequency.linearRampToValueAtTime(600, now + 0.6);
      g.gain.setValueAtTime(vol, now);
      g.gain.linearRampToValueAtTime(0, now + 0.65);
      o.connect(g); g.connect(ctx.destination);
      o.start(now); o.stop(now + 0.7);
    }
    setTimeout(() => ctx.close(), 1200);
  } catch { /* ignore */ }
}

/* ================= color helpers ================= */
function hexToHslTriple(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hh = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/* ================= Emblem FX — reusable metallic / shadow / highlight generator =================
 * Use for any new team emblem to keep the same visual language:
 *   const fx = useEmblemFx('BEAR', color);
 *   <svg viewBox="0 0 64 64" style={{ filter: fx.drop }}>
 *     {fx.defs}
 *     <circle cx="32" cy="32" r="28" fill={fx.url('rim')} />
 *     ...
 *   </svg>
 */
type FxKey = 'dome' | 'gloss' | 'rim' | 'steel' | 'gold' | 'accent' | 'iris' | 'innerShadow';

function useEmblemFx(scope: string, color: string) {
  const id = (k: FxKey) => `fx-${scope}-${k}`;
  const url = (k: FxKey) => `url(#${id(k)})`;
  const drop = `drop-shadow(0 8px 16px ${color}80) drop-shadow(0 2px 4px #00000099)`;
  const defs = (
    <defs>
      {/* Bevelled color dome */}
      <radialGradient id={id('dome')} cx="32%" cy="26%" r="82%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="18%" stopColor={color} stopOpacity="0.95" />
        <stop offset="65%" stopColor={color} stopOpacity="0.55" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>
      {/* Glossy top highlight */}
      <radialGradient id={id('gloss')} cx="35%" cy="20%" r="38%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      {/* Metallic rim */}
      <linearGradient id={id('rim')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
        <stop offset="50%" stopColor={color} stopOpacity="0.6" />
        <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
      </linearGradient>
      {/* Brushed steel */}
      <linearGradient id={id('steel')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="45%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      {/* Golden accents */}
      <linearGradient id={id('gold')} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="55%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      {/* Accent radial (team-color aura) */}
      <radialGradient id={id('accent')} cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor={color} stopOpacity="0.95" />
        <stop offset="60%" stopColor={color} stopOpacity="0.55" />
        <stop offset="100%" stopColor="#020617" />
      </radialGradient>
      {/* Iris (eye) */}
      <radialGradient id={id('iris')} cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="55%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#0b0f17" />
      </radialGradient>
      {/* Inner shadow filter */}
      <filter id={id('innerShadow')} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" />
        <feOffset dy="0.6" />
        <feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
  return { defs, url, drop, id };
}

/* ================= Team hero (realistic 3D SVG emblem) ================= */
function TeamHero({ team, color }: { team: TeamKey; color: string }) {
  const fx = useEmblemFx(team, color);
  const svgProps = {
    viewBox: '0 0 64 64',
    className: 'h-12 w-12 shrink-0',
    style: { filter: fx.drop },
    'aria-hidden': true as const,
  };

  if (team === 'ALFA') {
    // Shield with bevelled rim, glossy dome and golden cross
    return (
      <svg {...svgProps}>
        {fx.defs}
        <path d="M32 3 L55 12 V33 C55 47 44 56 32 61 C20 56 9 47 9 33 V12 Z" fill={fx.url('rim')} />
        <path d="M32 6 L52 14 V32 C52 44 43 53 32 57 C21 53 12 44 12 32 V14 Z" fill={fx.url('dome')} />
        <path d="M32 6 L52 14 V22 C52 25 43 28 32 28 C21 28 12 25 12 22 V14 Z" fill={fx.url('gloss')} />
        <path d="M32 18 V46 M20 30 H44" stroke="#000000" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
        <path d="M32 18 V46 M20 30 H44" stroke={fx.url('gold')} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M32 18 V46 M20 30 H44" stroke="#fef3c7" strokeOpacity="0.7" strokeWidth="0.9" strokeLinecap="round" />
        <circle cx="32" cy="30" r="1.4" fill="#fef3c7" />
      </svg>
    );
  }

  if (team === 'BRAVO') {
    // Distintivo tático realista — estrela de 7 pontas em ouro sobre disco metálico com faixa colorida
    return (
      <svg {...svgProps}>
        {fx.defs}
        {/* Disco base bevelado */}
        <circle cx="32" cy="32" r="28" fill={fx.url('rim')} />
        <circle cx="32" cy="32" r="25" fill={fx.url('steel')} stroke="#0f172a" strokeWidth="0.6" />

        {/* Anel interno (accent da equipe) */}
        <circle cx="32" cy="32" r="22" fill="none" stroke={fx.url('accent')} strokeWidth="1.2" />
        <circle cx="32" cy="32" r="20" fill="none" stroke="#0b0f17" strokeOpacity="0.6" strokeWidth="0.6" />

        {/* Estrela 7 pontas — sombra */}
        <path
          d="M32 6 L36 22 L52 22 L39 31 L44 47 L32 37 L20 47 L25 31 L12 22 L28 22 Z"
          fill="#000000" fillOpacity="0.6" transform="translate(0.8 1)"
        />
        {/* Estrela 7 pontas — ouro */}
        <path
          d="M32 6 L36 22 L52 22 L39 31 L44 47 L32 37 L20 47 L25 31 L12 22 L28 22 Z"
          fill={fx.url('gold')} stroke="#78350f" strokeWidth="0.7" strokeLinejoin="round"
        />
        {/* Highlight nas pontas superiores */}
        <path
          d="M32 6 L34 20 M32 6 L30 20"
          stroke="#fef3c7" strokeOpacity="0.75" strokeWidth="0.5" strokeLinecap="round"
        />

        {/* Medalhão central */}
        <circle cx="32" cy="30" r="7" fill={fx.url('dome')} stroke="#0b0f17" strokeWidth="0.8" />
        <circle cx="32" cy="30" r="7" fill="none" stroke={fx.url('gold')} strokeOpacity="0.9" strokeWidth="0.6" />

        {/* Sigla "B" (BRAVO) em ouro */}
        <text
          x="32" y="33.6" textAnchor="middle"
          fontFamily="ui-serif, Georgia, serif" fontSize="9" fontWeight="700"
          fill={fx.url('gold')} stroke="#78350f" strokeWidth="0.3"
        >
          B
        </text>

        {/* Faixa "POLICE-BAR" inferior */}
        <path d="M14 46 L50 46 L46 52 L18 52 Z" fill={fx.url('accent')} stroke="#0b0f17" strokeWidth="0.6" />
        <path d="M15 46.6 L49 46.6" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.4" />
        <text
          x="32" y="50.6" textAnchor="middle"
          fontFamily="ui-monospace, monospace" fontSize="3.6" fontWeight="700"
          letterSpacing="0.6" fill="#f8fafc"
        >
          BRAVO
        </text>

        {/* Rebites nas pontas cardinais */}
        <circle cx="32" cy="10" r="0.9" fill="#fef3c7" />
        <circle cx="32" cy="54" r="0.9" fill="#fef3c7" opacity="0.6" />
        <circle cx="10" cy="32" r="0.9" fill="#fef3c7" opacity="0.6" />
        <circle cx="54" cy="32" r="0.9" fill="#fef3c7" opacity="0.6" />

        {/* Highlight especular superior */}
        <ellipse cx="26" cy="14" rx="11" ry="4" fill={fx.url('gloss')} />
      </svg>
    );
  }







  if (team === 'CHARLIE') {
    // Target: bevelled ring, colored bullseye, crosshair with drop shadow
    return (
      <svg {...svgProps}>
        {fx.defs}
        <circle cx="32" cy="32" r="28" fill={fx.url('rim')} />
        <circle cx="32" cy="32" r="25" fill={fx.url('dome')} />
        <circle cx="32" cy="32" r="19" fill="none" stroke="#0b0f17" strokeOpacity="0.6" strokeWidth="1.4" />
        <circle cx="32" cy="32" r="19" fill="none" stroke={color} strokeOpacity="0.9" strokeWidth="0.7" />
        <circle cx="32" cy="32" r="12" fill="none" stroke="#0b0f17" strokeOpacity="0.55" strokeWidth="1.2" />
        <circle cx="32" cy="32" r="12" fill="none" stroke={color} strokeOpacity="0.85" strokeWidth="0.6" />
        <circle cx="32" cy="32" r="5" fill={color} stroke="#0b0f17" strokeWidth="0.8" />
        <line x1="32" y1="2"  x2="32" y2="18" stroke="#000000" strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="32" y1="46" x2="32" y2="62" stroke="#000000" strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="2"  y1="32" x2="18" y2="32" stroke="#000000" strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="46" y1="32" x2="62" y2="32" stroke="#000000" strokeOpacity="0.55" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="32" y1="2"  x2="32" y2="18" stroke={fx.url('steel')} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="32" y1="46" x2="32" y2="62" stroke={fx.url('steel')} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="2"  y1="32" x2="18" y2="32" stroke={fx.url('steel')} strokeWidth="1.6" strokeLinecap="round" />
        <line x1="46" y1="32" x2="62" y2="32" stroke={fx.url('steel')} strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="32" cy="32" r="1.4" fill="#fef3c7" />
        <ellipse cx="26" cy="22" rx="10" ry="5" fill={fx.url('gloss')} />
      </svg>
    );
  }

  // DELTA — lightning inside a bevelled disc
  return (
    <svg {...svgProps}>
      {fx.defs}
      <circle cx="32" cy="32" r="28" fill={fx.url('rim')} />
      <circle cx="32" cy="32" r="25" fill={fx.url('dome')} />
      <path d="M37 8 L18 34 H30 L26 56 L47 28 H34 Z"
            fill="#000000" fillOpacity="0.55" transform="translate(0.6 0.8)" />
      <path d="M36 8 L18 34 H30 L26 56 L46 28 H34 Z"
            fill={fx.url('gold')} stroke="#78350f" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M36 8 L21 32 H29" fill="none" stroke="#fef3c7" strokeOpacity="0.85" strokeWidth="0.8" strokeLinecap="round" />
      <ellipse cx="26" cy="22" rx="10" ry="5" fill={fx.url('gloss')} />
    </svg>
  );
}

/* ================= Team-varying animated stripe =================
 * Ocupa a área ociosa do cabeçalho "Operação em tempo real" com
 * uma assinatura visual profissional que MUDA conforme a equipe.
 *  - ALFA    → onda senoidal contínua (escudo/defesa fluida)
 *  - BRAVO   → pulsos radar/heartbeat (ataque cadenciado)
 *  - CHARLIE → mira/varredura de precisão (retículo deslizante)
 *  - DELTA   → sinal de rádio / barras de transmissão
 */
function TeamOperationsStripe({
  team,
  color,
  active,
  alertLevel = 'ok',
  alertLabel,
}: {
  team: TeamKey;
  color: string;
  active: boolean;
  alertLevel?: 'ok' | 'warn' | 'danger';
  alertLabel?: string;
}) {
  const uid = `tos-${team}`;
  const alertColor = alertLevel === 'danger' ? '#f87171' : alertLevel === 'warn' ? '#fbbf24' : color;
  const channel = { ALFA: '01', BRAVO: '02', CHARLIE: '03', DELTA: '04' }[team];
  const freq = { ALFA: '148.325', BRAVO: '151.775', CHARLIE: '154.190', DELTA: '158.640' }[team];
  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 320 46"
        preserveAspectRatio="none"
        className="h-9 w-full sm:h-11"
        aria-hidden
        role="img"
      >
        {/* Régua de escala — estática, tipo painel de rádio */}
        <g stroke={color} strokeOpacity="0.14" strokeWidth="0.5">
          {Array.from({ length: 33 }).map((_, i) => (
            <line key={i} x1={i * 10} y1="34" x2={i * 10} y2={i % 5 === 0 ? 40 : 37} />
          ))}
          <line x1="0" y1="34" x2="320" y2="34" strokeOpacity="0.22" />
        </g>

        {/* Marcadores de canal estáticos */}
        <g stroke={color} strokeWidth="0.7" fill="none">
          <line x1="80" y1="30" x2="80" y2="40" strokeOpacity="0.5" />
          <line x1="160" y1="26" x2="160" y2="40" strokeOpacity="0.75" />
          <line x1="240" y1="30" x2="240" y2="40" strokeOpacity="0.5" />
        </g>

        {/* Diamante central — indicador de sintonia */}
        <g transform="translate(160 20)" fill="none" stroke={color} strokeWidth="0.9">
          <polygon points="0,-4 4,0 0,4 -4,0" fill={color} fillOpacity="0.18" />
        </g>

        {/* Rótulos institucionais */}
        <g fontFamily="ui-monospace, monospace" fill={color}>
          <text x="4" y="10" fontSize="6" letterSpacing="1.4" opacity="0.75">CANAL {channel}</text>
          <text x="316" y="10" fontSize="6" letterSpacing="1.4" textAnchor="end" opacity="0.75">{freq} MHz</text>
        </g>

        {/* Microalerta visual — sem animação, apenas indicador estático */}
        {alertLevel !== 'ok' && (
          <g>
            <circle cx="8" cy="20" r="2.5" fill={alertColor} opacity="0.9" />
            <circle cx="8" cy="20" r="4.5" fill="none" stroke={alertColor} strokeOpacity="0.55" strokeWidth="0.7" />
          </g>
        )}
      </svg>


      {/* Linha institucional estática — sem letreiro dinâmico */}
      <div
        className="mt-1 flex items-center justify-between gap-2 rounded-sm border px-2 py-1"
        style={{ borderColor: `${color}22`, background: `linear-gradient(90deg, ${color}0c, transparent 60%)` }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono text-[9px] uppercase tracking-[0.28em] px-1.5 py-[1px] rounded-sm border"
            style={{ color, borderColor: `${color}55`, background: `${color}10` }}
          >
            CH-{team.slice(0, 3)}
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/80">
            {active ? 'Em serviço' : 'Standby'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Barras de sinal — puro CSS, tema tático */}
          <div className="flex items-end gap-[2px] h-3" aria-hidden>
            {[3, 5, 7, 9].map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-[1px]"
                style={{
                  height: `${h}px`,
                  background: color,
                  opacity: active ? 0.35 + i * 0.18 : 0.18 + i * 0.08,
                  boxShadow: active ? `0 0 4px ${color}55` : 'none',
                }}
              />
            ))}
          </div>
          {/* Pips de estado */}
          <div className="flex items-center gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: i === 0 ? color : `${color}44`,
                  boxShadow: i === 0 && active ? `0 0 6px ${color}` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>



      {/* Fallback acessível quando o SVG não renderizar */}
      <noscript>
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground px-2 py-1">
          Operação em tempo real · Equipe {team}
        </div>
      </noscript>

      {/* Rótulo de alerta legível — sobreposto ao SVG quando ativo */}
      {alertLevel !== 'ok' && (
        <div
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center"
          role="status"
          aria-live="polite"
        >
          <span
            className="rounded-sm border px-1.5 py-0.5 text-[9.5px] font-mono uppercase tracking-widest bg-background/70 backdrop-blur-sm"
            style={{ color: alertColor, borderColor: `${alertColor}66` }}
          >
            {alertLabel || (alertLevel === 'danger' ? 'Acesso suspeito' : 'Atenção')}
          </span>
        </div>
      )}
    </div>
  );
}

/* ================= Doutrina institucional por equipe ================= */
const TEAM_DOCTRINE: Record<TeamKey, string[]> = {
  ALFA: [
    'ESCUDO ATIVO · PROTEÇÃO INTEGRAL DO SOCIOEDUCANDO',
    'PRESENÇA CONSTANTE · DISCIPLINA E LEGALIDADE',
    'DEFESA DA VIDA · PRIMADO DOS DIREITOS HUMANOS',
    'PERÍMETRO ESTÁVEL · POSTOS COBERTOS 24/7',
    'CONDUTA ÉTICA · USO PROGRESSIVO DA FORÇA',
    'PROTOCOLO ECA · MEDIDAS SOCIOEDUCATIVAS RESPEITADAS',
    'CUSTÓDIA SEGURA · INTEGRIDADE FÍSICA PRESERVADA',
    'VIGÍLIA PERMANENTE · ZERO INCIDENTES',
  ],
  BRAVO: [
    'PRONTIDÃO OPERACIONAL · RESPOSTA IMEDIATA',
    'AÇÃO CADENCIADA · CONTENÇÃO PROPORCIONAL',
    'INTERVENÇÃO SEGURA · TÉCNICA E LEGITIMIDADE',
    'REAÇÃO TÁTICA · COMANDO ÚNICO E COORDENADO',
    'PROTOCOLO DE CRISE · NEGOCIAÇÃO ANTES DA FORÇA',
    'EQUIPE MOBILIZADA · TEMPO DE RESPOSTA SOB CONTROLE',
    'CONTENÇÃO LEGAL · REGISTRO OBRIGATÓRIO DE OCORRÊNCIA',
    'BACKUP DISPONÍVEL · REDUNDÂNCIA OPERACIONAL',
  ],
  CHARLIE: [
    'VIGILÂNCIA PRECISA · MONITORAMENTO PERMANENTE',
    'ANÁLISE DE RISCO · ANTECIPAÇÃO DE INCIDENTES',
    'INTELIGÊNCIA TÁTICA · ROTAS E PERÍMETROS SOB CONTROLE',
    'CFTV ATIVO · PONTOS CEGOS MAPEADOS',
    'INSPEÇÃO CONTÍNUA · RONDA COM CHECAGEM CRUZADA',
    'DADOS EM TEMPO REAL · DECISÃO BASEADA EM EVIDÊNCIA',
    'RECONHECIMENTO ATIVO · DESVIOS SINALIZADOS',
    'AUDITORIA DE ACESSO · LOG IMUTÁVEL',
  ],
  DELTA: [
    'COMUNICAÇÃO INTEGRADA · CANAL SEMPRE ABERTO',
    'REDE SEGURA · COORDENAÇÃO INTERUNIDADES',
    'TRANSMISSÃO CONFIÁVEL · RESPOSTA COORDENADA',
    'RÁDIO CRIPTOGRAFADO · SIGILO OPERACIONAL',
    'COMANDO E CONTROLE · PONTE COM AUTORIDADES',
    'ESCALADA CONTROLADA · ACIONAMENTO CONFORME PROTOCOLO',
    'REGISTRO DE OCORRÊNCIA · CADEIA DE CUSTÓDIA DIGITAL',
    'INTEROPERABILIDADE · SUPORTE À SEGURANÇA PÚBLICA',
  ],
};

/**
 * Frases institucionais rotativas — divulgação profissional do PlantãoPro
 * e do desenvolvedor. Injetadas em ciclo controlado dentro do ticker.
 */
const BRAND_PROMOS: string[] = [
  'PLANTÃO PRO · GESTÃO INTELIGENTE DE PLANTÕES SOCIOEDUCATIVOS',
  'PLANTÃO PRO · ESCALAS, BANCO DE HORAS E RONDAS EM TEMPO REAL',
  'PLANTÃO PRO · SEGURANÇA, AUDITORIA E CONFORMIDADE OPERACIONAL',
  'PLANTÃO PRO · TECNOLOGIA A SERVIÇO DA SEGURANÇA PÚBLICA',
  "DESENVOLVIDO POR FRANC D'NIS · AGENTE SOCIOEDUCATIVO · FEIJÓ/AC",
  "ENGENHARIA DE SOFTWARE POR FRANC D'NIS · SOLUÇÕES PARA O SISTEMA SOCIOEDUCATIVO",
];
const brandQueue: { queue: string[]; last: string | null } = { queue: [], last: null };
function nextBrand(): string {
  if (!brandQueue.queue.length) {
    const arr = [...BRAND_PROMOS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (brandQueue.last && arr[0] === brandQueue.last && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    brandQueue.queue = arr;
  }
  const p = brandQueue.queue.shift()!;
  brandQueue.last = p;
  return p;
}

/**
 * Sorteia frases sem repetir a mesma sequência entre chamadas por equipe.
 * Injeta 1 frase institucional (PlantãoPro / desenvolvedor) na posição 2
 * para divulgação profissional contínua, sem poluir a doutrina da equipe.
 */
const phraseQueue = new Map<TeamKey, { queue: string[]; last: string | null }>();
function nextPhrases(team: TeamKey, count = 4): string[] {
  const state = phraseQueue.get(team) ?? { queue: [], last: null as string | null };
  const out: string[] = [];
  const source = TEAM_DOCTRINE[team];
  const refill = () => {
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (state.last && arr[0] === state.last && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    state.queue = arr;
  };
  while (out.length < count) {
    if (!state.queue.length) refill();
    const p = state.queue.shift()!;
    if (out.includes(p)) continue;
    out.push(p);
    state.last = p;
  }
  phraseQueue.set(team, state);
  // Injeta uma frase institucional na segunda posição (rotativa, sem repetir).
  if (out.length >= 2) out.splice(2, 0, nextBrand());
  else out.push(nextBrand());
  return out;
}


/**
 * Ciclo profissional: 60s exibindo doutrina → 180s em pausa (só efeitos) → repete.
 * A cada retomada, novas frases são sorteadas sem repetir a última sequência.
 */
/* Painel de programação removido — a ronda agora só inicia manualmente. */





function TeamDoctrineTicker({ team, color, uid }: { team: TeamKey; color: string; uid: string }) {
  const [visible, setVisible] = useState(true);
  const [phrases, setPhrases] = useState<string[]>(() => nextPhrases(team, 4));
  // Só revela o ticker depois que a IBM Plex Sans estiver realmente pronta —
  // elimina o FOUT (flash com fallback) em qualquer navegador com FontFace API.
  // Navegadores sem `document.fonts` (muito antigos) revelam imediatamente.
  const [fontReady, setFontReady] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true;
    const fs = (document as Document & { fonts?: FontFaceSet }).fonts;
    return !fs;
  });

  useEffect(() => {
    if (fontReady) return;
    const fs = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fs) { setFontReady(true); return; }
    let cancelled = false;
    // Pré-carrega os dois pesos usados (600 corpo, 700 caso apareça)
    Promise.all([
      fs.load('600 12.5px "IBM Plex Sans"').catch(() => null),
      fs.load('700 12.5px "IBM Plex Sans"').catch(() => null),
    ]).then(() => { if (!cancelled) setFontReady(true); });
    // Fallback duro após 2s para nunca deixar o ticker invisível
    const t = window.setTimeout(() => { if (!cancelled) setFontReady(true); }, 2000);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [fontReady]);

  useEffect(() => {
    setPhrases(nextPhrases(team, 4));
    setVisible(true);
  }, [team]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (visible) {
      t = setTimeout(() => setVisible(false), 60_000);
    } else {
      t = setTimeout(() => {
        setPhrases(nextPhrases(team, 4));
        setVisible(true);
      }, 180_000);
    }
    return () => clearTimeout(t);
  }, [visible, team]);

  if (!visible || !fontReady) return null;


  const sep = ' \u2022 ';
  const line = phrases.join(sep);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center overflow-hidden"
      style={{
        height: 22,
        background: `linear-gradient(90deg, transparent, ${color}12 12%, ${color}12 88%, transparent), rgba(0,0,0,0.55)`,
        borderTop: `1px solid ${color}44`,
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        opacity: 0,
        animation: `${uid}-tfade 700ms ease-out forwards`,
      }}
      aria-live="polite"
    >
      <style>{`
        @keyframes ${uid}-tfade { to { opacity: 1 } }
        @keyframes ${uid}-tscroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="flex whitespace-nowrap will-change-transform"
        style={{
          animation: `${uid}-tscroll 75s linear infinite`,
          fontFamily: '"IBM Plex Sans", "Inter", "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif',
          fontSize: 12.5,
          lineHeight: 1,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#ffffff',
          textShadow: `0 1px 0 rgba(0,0,0,0.9), 0 0 8px ${color}55`,
          padding: '0 12px',
        }}
      >
        <span style={{ paddingRight: 40 }}>{line}</span>
        <span style={{ paddingRight: 40 }} aria-hidden>{line}</span>
      </div>
    </div>
  );
}



/* ================= Ready-to-start banner — flat, token-based ================= */
function ReadyToStartBanner({ team, color, count, ready }: { team: TeamKey; color: string; count: number; ready: boolean }) {
  return (
    <div
      className="mb-1.5 flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 sm:px-2.5 [&_*]:transition-none [&_*]:animate-none hover:bg-card"
      style={{ transition: 'none', animation: 'none' }}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden>
        {ready ? (
          <path d="M5 12.5 L10 17 L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <>
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <path d="M12 7 V12 L15.5 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
      </svg>

      <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground leading-none">
          {ready ? 'Cronograma pronto' : 'Aguardando configuração'}
        </span>
        <span className="text-[11.5px] sm:text-[12px] font-medium text-foreground leading-tight truncate">
          {ready
            ? <>Equipe <span style={{ color }}>{team}</span> · {count} agente{count === 1 ? '' : 's'}</>
            : <>Defina intervalo e agentes</>}
        </span>
      </div>

      {ready && (
        <span className="hidden sm:inline-flex items-center rounded-sm border border-border px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Pronto
        </span>
      )}
    </div>
  );
}





function RoundsHeroSVG({ color, active, silent }: { color: string; active: boolean; silent: boolean }) {
  const uid = `rh-${color.replace('#', '')}`;
  return (
    <svg viewBox="0 0 220 116" className="h-20 w-36 sm:h-24 sm:w-44 shrink-0" aria-hidden>
      <style>{`
        @keyframes ${uid}-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ${uid}-pulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.9; } }
        @keyframes ${uid}-tick  { 0% { transform: translateX(0); } 100% { transform: translateX(-12px); } }
      `}</style>
      <defs>
        <linearGradient id={`${uid}-frame`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--card))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="60%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id={`${uid}-sweep-grad`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${uid}-bar`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.15" />
        </linearGradient>
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`${uid}-clip`}>
          <rect x="8" y="12" width="204" height="92" rx="8" />
        </clipPath>
      </defs>

      {/* Frame — command console */}
      <rect x="6" y="10" width="208" height="96" rx="9" fill={`url(#${uid}-frame)`} stroke={color} strokeOpacity="0.32" />
      <rect x="8" y="12" width="204" height="92" rx="8" fill="none" stroke="hsl(var(--border))" strokeOpacity="0.5" />

      {/* Corner ticks */}
      {[[10,14],[210,14,-1,1],[10,102,1,-1],[210,102,-1,-1]].map((c, i) => {
        const [x, y, sx = 1, sy = 1] = c as number[];
        return (
          <g key={i} stroke={color} strokeOpacity="0.7" strokeWidth="1">
            <line x1={x} y1={y} x2={x + 6 * sx} y2={y} />
            <line x1={x} y1={y} x2={x} y2={y + 5 * sy} />
          </g>
        );
      })}

      <g clipPath={`url(#${uid}-clip)`}>
        {/* Grid backdrop */}
        <g stroke="hsl(var(--border))" strokeOpacity="0.18" strokeWidth="0.5">
          {[24, 40, 56, 72, 88].map((y) => <line key={`h${y}`} x1="10" y1={y} x2="210" y2={y} />)}
          {[30, 60, 90, 120, 150, 180].map((x) => <line key={`v${x}`} x1={x} y1="14" x2={x} y2="102" />)}
        </g>

        {/* Left telemetry column */}
        <g fontFamily="ui-monospace, monospace" fontSize="5" fill={color} opacity="0.72" letterSpacing="0.5">
          <text x="12" y="22">SYS</text>
          <text x="12" y="34">NET</text>
          <text x="12" y="46">GPS</text>
          <text x="12" y="58">PWR</text>
        </g>
        {[18, 30, 42, 54].map((y, i) => (
          <g key={y}>
            <rect x="26" y={y - 3} width="34" height="4" rx="1" fill="hsl(var(--border))" fillOpacity="0.35" />
            <rect x="26" y={y - 3} width={[30, 24, 32, 20][i]} height="4" rx="1" fill={`url(#${uid}-bar)`} />
          </g>
        ))}

        {/* Radar core */}
        <g transform="translate(128 58)" filter={`url(#${uid}-shadow)`}>
          <circle r="34" fill={`url(#${uid}-glow)`} />
          <circle r="30" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
          <circle r="22" fill="none" stroke={color} strokeOpacity="0.28" strokeWidth="0.8" />
          <circle r="14" fill="none" stroke={color} strokeOpacity="0.22" strokeWidth="0.6" />
          <circle r="6"  fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="0.6" />
          <line x1="-30" y1="0" x2="30" y2="0" stroke={color} strokeOpacity="0.22" strokeWidth="0.5" />
          <line x1="0" y1="-30" x2="0" y2="30" stroke={color} strokeOpacity="0.22" strokeWidth="0.5" />
          {/* Sweep wedge */}
          <g style={{ transformOrigin: '0px 0px', animation: active && !silent ? `${uid}-sweep 3.2s linear infinite` : undefined }}>
            <path d="M0 0 L30 0 A30 30 0 0 1 12 27 Z" fill={`url(#${uid}-sweep-grad)`} />
          </g>
          {/* Contacts */}
          <circle cx="10"  cy="-8"  r="1.5" fill={color}>
            {active && !silent && <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />}
          </circle>
          <circle cx="-14" cy="6"   r="1.2" fill={color} opacity="0.75" />
          <circle cx="18"  cy="14"  r="1.2" fill={color} opacity="0.55" />
          {/* Center pip */}
          <circle r="2.4" fill={color} />
          <circle r="4.2" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="0.6">
            {active && !silent && <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />}
            {active && !silent && <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />}
          </circle>
        </g>

        {/* Bearing ticks (bottom) */}
        <g stroke={color} strokeOpacity="0.5">
          {Array.from({ length: 21 }).map((_, i) => (
            <line key={i} x1={12 + i * 9.4} y1="96" x2={12 + i * 9.4} y2={i % 5 === 0 ? 90 : 93} strokeWidth={i % 5 === 0 ? 1 : 0.6} />
          ))}
        </g>
        <text x="12"  y="102" fontFamily="ui-monospace, monospace" fontSize="5" fill={color} opacity="0.8">000</text>
        <text x="105" y="102" fontFamily="ui-monospace, monospace" fontSize="5" fill={color} opacity="0.8">090</text>
        <text x="198" y="102" fontFamily="ui-monospace, monospace" fontSize="5" fill={color} opacity="0.8">180</text>

        {/* Status LED */}
        <g transform="translate(200 20)">
          <circle r="2.4" fill={active ? color : 'hsl(var(--muted-foreground))'} opacity={active ? 1 : 0.5}>
            {active && !silent && <animate attributeName="opacity" values="0.35;1;0.35" dur="1.2s" repeatCount="indefinite" />}
          </circle>
        </g>
        <text x="174" y="22" fontFamily="ui-monospace, monospace" fontSize="5" fill={color} opacity="0.85" letterSpacing="0.8">
          {silent ? 'SILENT' : active ? 'LIVE' : 'IDLE'}
        </text>
      </g>

      {/* Bottom title bar */}
      <text x="110" y="112" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="5.4" letterSpacing="2.6" fill={color} opacity="0.7">
        C2 · RONDA OPERACIONAL
      </text>
    </svg>
  );
}

function AgentStatusSVG({ status, color, compact = false }: { status: 'active' | 'done' | 'waiting'; color: string; compact?: boolean }) {
  const label = status === 'active' ? 'EM RONDA' : status === 'done' ? 'CUMPRIDA' : 'NA FILA';
  const tone = status === 'done' ? 'hsl(var(--success))' : status === 'waiting' ? `${color}b3` : color;
  return (
    <svg viewBox="0 0 116 24" className={cn('shrink-0', compact ? 'h-[22px] w-[92px]' : 'h-6 w-28')} aria-label={label} role="img">
      <path d="M8 2H108L114 12L108 22H8L2 12Z" fill="hsl(var(--card))" fillOpacity="0.72" stroke={tone} strokeOpacity="0.62" />
      <path d="M10 5H106" stroke={tone} strokeOpacity="0.34" />
      {status === 'active' && (
        <circle cx="15" cy="12" r="3" fill={tone}>
          <animate attributeName="opacity" values="0.35;1;0.35" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      {status === 'done' && <path d="M11 12.2L14.2 15.4L19.6 8.8" fill="none" stroke={tone} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {status === 'waiting' && <path d="M12 8H18M12 12H18M12 16H18" stroke={tone} strokeWidth="1.4" strokeLinecap="round" />}
      <text x="63" y="16" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="0.8" fill={tone}>{label}</text>
    </svg>
  );
}

/* ================= SVG time field ================= */

function TimeField({
  id, value, onChange, label, invalid, accent, locked, lockedHint, onLockedAttempt, lockedBadgeText,
}: { id: string; value: string; onChange: (v: string) => void; label: string; invalid?: boolean; accent: string; locked?: boolean; lockedHint?: string; onLockedAttempt?: () => void; lockedBadgeText?: string }) {


  // Buffer LOCAL de digitação — evita que o valor externo (com pad) atropele
  // o usuário enquanto ele digita ("1" → "10" precisa ser possível sem travar).
  const [hStr, mStr] = value.split(':');
  const extH = hStr ?? '';
  const extM = mStr ?? '';
  const [hLocal, setHLocal] = useState(extH);
  const [mLocal, setMLocal] = useState(extM);
  const [hFocused, setHFocused] = useState(false);
  const [mFocused, setMFocused] = useState(false);
  const [hOpen, setHOpen] = useState(false);
  const [mOpen, setMOpen] = useState(false);

  useEffect(() => { if (!hFocused) setHLocal(extH); }, [extH, hFocused]);
  useEffect(() => { if (!mFocused) setMLocal(extM); }, [extM, mFocused]);

  const commit = (rawH: string, rawM: string) => {
    const hi = Math.max(0, Math.min(23, parseInt(rawH || '0', 10) || 0));
    const mi = Math.max(0, Math.min(59, parseInt(rawM || '0', 10) || 0));
    onChange(`${pad(hi)}:${pad(mi)}`);
  };
  const bump = (which: 'h' | 'm', delta: number) => {
    const curH = parseInt(hLocal || extH || '0', 10) || 0;
    const curM = parseInt(mLocal || extM || '0', 10) || 0;
    if (which === 'h') {
      const nv = (curH + delta + 24) % 24;
      setHLocal(pad(nv));
      commit(String(nv), String(curM));
    } else {
      const nv = (curM + delta + 60) % 60;
      setMLocal(pad(nv));
      commit(String(curH), String(nv));
    }
  };
  const pickH = (nv: number) => {
    setHLocal(pad(nv));
    commit(String(nv), mLocal || extM || '0');
    setHOpen(false);
  };
  const pickM = (nv: number) => {
    setMLocal(pad(nv));
    commit(hLocal || extH || '0', String(nv));
    setMOpen(false);
  };
  const onHKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); bump('h', 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bump('h', -1); }
    else if (e.key === 'Enter') { commit(hLocal, mLocal); (e.currentTarget as HTMLInputElement).blur(); }
  };
  const onMKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); bump('m', 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); bump('m', -1); }
    else if (e.key === 'Enter') { commit(hLocal, mLocal); (e.currentTarget as HTMLInputElement).blur(); }
  };

  const curHNum = parseInt(hLocal || extH || '0', 10) || 0;
  const curMNum = parseInt(mLocal || extM || '0', 10) || 0;
  const nearestM5 = Math.min(55, Math.round(curMNum / 5) * 5);

  return (
    <div className="grid gap-1">
      <label htmlFor={`${id}-h`} className="text-[11px] font-sans uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        {label}
        {locked && (
          <span
            title={lockedHint || 'Configuração bloqueada'}
            data-testid="night-lock-badge"
            className="inline-flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[9.5px] font-mono uppercase text-amber-300"
          >
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5"><path d="M4 7V5a4 4 0 118 0v2h1v7H3V7h1zm2 0h4V5a2 2 0 10-4 0v2z" fill="currentColor"/></svg>
            {lockedBadgeText || 'BLOQUEADO'}
          </span>
        )}

      </label>
      <div className={cn(
        'group relative flex items-center gap-0.5 rounded-md border bg-background pl-1.5 pr-1 h-8 transition-colors min-w-0 overflow-hidden',
        invalid ? 'border-destructive/70' : 'border-border focus-within:border-primary/70',
        locked && 'opacity-70 cursor-not-allowed',
      )}>
        {locked && (
          <button
            type="button"
            onClick={() => onLockedAttempt?.()}
            aria-label={lockedHint || 'Campo bloqueado'}
            title={lockedHint || 'Bloqueado'}
            className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
          />
        )}

        <svg viewBox="0 0 32 32" className="h-3.5 w-3.5 shrink-0" aria-hidden>
          <circle cx="16" cy="16" r="13" fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1.2" />
          <circle cx="16" cy="16" r="13" fill="none" stroke={accent} strokeOpacity="0.9" strokeWidth="1.4"
                  strokeDasharray="4 3" strokeLinecap="round" />
          <line x1="16" y1="16" x2="16" y2="7"   stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
          <line x1="16" y1="16" x2="22" y2="16"  stroke={accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <circle cx="16" cy="16" r="1.2" fill={accent} />
        </svg>

        {/* HORA */}
        <input
          id={`${id}-h`}
          inputMode="numeric"
          maxLength={2}
          value={hLocal}
          onChange={(e) => setHLocal(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onFocus={(e) => { setHFocused(true); e.currentTarget.select(); }}
          onBlur={() => { setHFocused(false); commit(hLocal, mLocal); }}
          onKeyDown={onHKey}
          className="w-6 shrink-0 bg-transparent text-center font-mono text-[13px] font-light tabular-nums text-foreground outline-none"
          aria-label={`${label} horas`}
          autoComplete="off"
          disabled={locked}
        />
        <Popover open={hOpen} onOpenChange={setHOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={locked}
              aria-label={`Escolher ${label} horas`}
              className="h-5 w-4 shrink-0 flex items-center justify-center rounded-sm border border-border/50 bg-card/50 text-primary/80 hover:text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 4 L6 9 L10 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="z-[200] w-20 p-1 max-h-56 overflow-y-auto bg-popover border border-border shadow-lg">
            <div className="grid grid-cols-1 gap-0.5">
              {Array.from({ length: 24 }, (_, i) => i).map((n) => {
                const selected = n === curHNum;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pickH(n)}
                    className={cn(
                      'w-full rounded px-1.5 py-1 text-[12px] font-mono tabular-nums text-center transition-colors',
                      selected
                        ? 'bg-primary/20 text-primary font-medium ring-1 ring-primary/40'
                        : 'text-foreground/80 hover:bg-primary/10 hover:text-primary',
                    )}
                  >
                    {pad(n)}h
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <span className="font-mono text-[13px] text-muted-foreground/70 select-none shrink-0">:</span>

        {/* MINUTO */}
        <input
          inputMode="numeric"
          maxLength={2}
          value={mLocal}
          onChange={(e) => setMLocal(e.target.value.replace(/\D/g, '').slice(0, 2))}
          onFocus={(e) => { setMFocused(true); e.currentTarget.select(); }}
          onBlur={() => { setMFocused(false); commit(hLocal, mLocal); }}
          onKeyDown={onMKey}
          className="w-6 shrink-0 bg-transparent text-center font-mono text-[13px] font-light tabular-nums text-foreground outline-none"
          aria-label={`${label} minutos`}
          autoComplete="off"
          disabled={locked}
        />
        <Popover open={mOpen} onOpenChange={setMOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={locked}
              aria-label={`Escolher ${label} minutos`}
              className="h-5 w-4 shrink-0 flex items-center justify-center rounded-sm border border-border/50 bg-card/50 text-primary/80 hover:text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2 4 L6 9 L10 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={4} className="z-[200] w-24 p-1 max-h-56 overflow-y-auto bg-popover border border-border shadow-lg">
            <div className="grid grid-cols-2 gap-0.5">
              {Array.from({ length: 12 }, (_, i) => i * 5).map((n) => {
                const selected = n === nearestM5;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pickM(n)}
                    className={cn(
                      'rounded px-1.5 py-1 text-[12px] font-mono tabular-nums text-center transition-colors',
                      selected
                        ? 'bg-primary/20 text-primary font-medium ring-1 ring-primary/40'
                        : 'text-foreground/80 hover:bg-primary/10 hover:text-primary',
                    )}
                  >
                    {pad(n)}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex flex-col shrink-0 ml-auto">
          <button type="button" onClick={() => bump('m', 1)} aria-label="Mais 1 min" disabled={locked}
            className="h-[14px] w-3.5 flex items-center justify-center rounded-t hover:bg-muted/60 text-muted-foreground hover:text-foreground disabled:opacity-40">
            <svg viewBox="0 0 12 12" className="h-2 w-2"><path d="M2 8 L6 3 L10 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" onClick={() => bump('m', -1)} aria-label="Menos 1 min" disabled={locked}
            className="h-[14px] w-3.5 flex items-center justify-center rounded-b hover:bg-muted/60 text-muted-foreground hover:text-foreground disabled:opacity-40">
            <svg viewBox="0 0 12 12" className="h-2 w-2"><path d="M2 4 L6 9 L10 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>


      </div>

    </div>
  );
}


/* ================= validation ================= */
type Issue = { field: string; message: string };
function validate(input: {
  mode: Mode; startTime: string; endTime: string; intervalMin: number; agents: string[];
}): Issue[] {
  const issues: Issue[] = [];
  const s = toMinutes(input.startTime);
  if (s === null) issues.push({ field: 'start', message: 'Horário de início inválido.' });

  if (input.mode === 'split') {
    const e = toMinutes(input.endTime);
    if (e === null) issues.push({ field: 'end', message: 'Horário de término inválido.' });
    if (s !== null && e !== null) {
      if (s === e) issues.push({ field: 'end', message: 'Início e término não podem ser iguais.' });
    }
  } else {
    if (!Number.isFinite(input.intervalMin) || input.intervalMin < 1) {
      issues.push({ field: 'interval', message: 'Intervalo deve ser de pelo menos 1 minuto.' });
    }
    if (input.intervalMin > 240) {
      issues.push({ field: 'interval', message: 'Intervalo máximo é 240 minutos.' });
    }
  }

  if (input.agents.length === 0) {
    issues.push({ field: 'agents', message: 'Adicione ao menos 1 agente.' });
  }
  const trimmed = input.agents.map((a) => a.trim());
  if (trimmed.some((a) => !a)) {
    issues.push({ field: 'agents', message: 'Existem agentes sem nome preenchido.' });
  }
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const a of trimmed) {
    const k = a.toLowerCase();
    if (!k) continue;
    if (seen.has(k)) dupes.add(a);
    seen.add(k);
  }
  if (dupes.size) {
    issues.push({ field: 'agents', message: `Nomes repetidos: ${Array.from(dupes).join(', ')}.` });
  }

  // Total-time vs minimum-per-agent
  const MIN_PER_AGENT = 1; // minutos
  if (input.mode === 'split' && s !== null) {
    const e = toMinutes(input.endTime);
    if (e !== null && s !== e && trimmed.length > 0) {
      let total = e - s;
      if (total <= 0) total += 24 * 60;
      const per = total / trimmed.length;
      if (per < MIN_PER_AGENT) {
        issues.push({
          field: 'end',
          message: `Tempo total (${total}min) insuficiente para ${trimmed.length} agentes — mínimo de ${MIN_PER_AGENT}min por agente.`,
        });
      }
    }
  }
  return issues;
}

/* ================= component ================= */
/* ================= Section colapsável (mobile/tablet) — sempre aberta em lg+ ================= */
function Section({
  icon, title, defaultOpen = false, children,
}: { icon?: React.ReactNode; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const sync = () => { if (mql.matches) setOpen(true); };
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group min-w-0"
    >
      <summary className="lg:hidden flex items-center gap-2 cursor-pointer py-2 select-none list-none [&::-webkit-details-marker]:hidden border-b border-border">
        {icon}
        <span className="font-sans text-[13.5px] uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>
      <div className="hidden lg:flex items-center gap-2 pb-1.5 mb-2 border-b border-border/40">
        {icon}
        <span className="font-sans text-[12.5px] uppercase tracking-[0.18em] text-muted-foreground">{title}</span>
      </div>
      <div className="grid gap-2 pt-2 lg:pt-0">{children}</div>
    </details>
  );
}

/* ================= HandoffHighlight — troca de posto (SVG profissional) ================= */
function HandoffHighlight({
  open, onClose, team, teamColor, postNumber, agentName,
}: {
  open: boolean;
  onClose: () => void;
  team: string;
  teamColor: string;
  postNumber: number;
  agentName: string;
}) {
  // Auto-dismiss em 4s — sem confirmação intermediária.
  const AUTO_DISMISS_MS = 4000;
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-x-0 top-4 z-[100] flex justify-center px-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onClose}
        className="pointer-events-auto group relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 max-w-[520px] w-full"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.96), hsl(var(--card) / 0.88))',
          borderColor: `${teamColor}66`,
          boxShadow: `0 0 0 1px ${teamColor}33, 0 12px 40px -8px ${teamColor}55`,
        }}
      >
        {/* Faixa luminosa intermitente */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] animate-pulse"
          style={{ background: `linear-gradient(90deg, transparent, ${teamColor}, transparent)` }}
        />
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Ícone SVG animado — anel radar + seta de troca */}
          <svg
            width="46" height="46" viewBox="0 0 46 46" className="shrink-0"
            aria-hidden
          >
            <defs>
              <radialGradient id="ho-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={teamColor} stopOpacity="0.55" />
                <stop offset="70%" stopColor={teamColor} stopOpacity="0.05" />
                <stop offset="100%" stopColor={teamColor} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="23" cy="23" r="22" fill="url(#ho-glow)" />
            <circle cx="23" cy="23" r="14" fill="none" stroke={teamColor} strokeWidth="1.5" opacity="0.35">
              <animate attributeName="r" values="10;18;10" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.05;0.7" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="23" cy="23" r="7" fill={teamColor} opacity="0.9" />
            <path
              d="M15 23 L21 23 M25 23 L31 23 M28 20 L31 23 L28 26"
              stroke="#0b0f14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
            />
          </svg>
          <div className="flex-1 min-w-0 text-left">
            <div
              className="text-[10.5px] font-mono uppercase tracking-[0.18em]"
              style={{ color: teamColor }}
            >
              EQUIPE {team} · POSTO {String(postNumber).padStart(2, '0')} · TROCA EM CURSO
            </div>
            <div className="text-[15px] font-semibold text-foreground leading-tight truncate mt-0.5">
              Assumindo agora: <span style={{ color: teamColor }}>{agentName}</span>
            </div>
            <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">
              Repasse concluído. Próximo agente já está em serviço.
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 shrink-0 hidden sm:block">
            OK
          </span>
        </div>
        {/* Barra de progresso do auto-dismiss */}
        <span
          key={`${postNumber}-${agentName}`}
          aria-hidden
          className="absolute left-0 bottom-0 h-[2px] rm-handoff-progress"
          style={{
            background: `linear-gradient(90deg, ${teamColor}, ${teamColor}aa)`,
            boxShadow: `0 0 8px ${teamColor}80`,
          }}
        />
        <style>{`
          @keyframes rmHandoffProgress { from { width: 100% } to { width: 0% } }
          .rm-handoff-progress {
            width: 100%;
            animation: rmHandoffProgress ${AUTO_DISMISS_MS}ms linear forwards;
          }
        `}</style>
      </button>
    </div>
  );
}



export function RoundsManager({ customTrigger }: { customTrigger?: React.ReactNode } = {}) {

  const [open, setOpen] = useState(false);
  // Escuta evento global — permite abrir o Gestor por atalhos externos
  // (ex.: botão "Fazer ronda" do lembrete de 30 min).
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('rounds:open', handler);
    return () => window.removeEventListener('rounds:open', handler);
  }, []);

  const { isAdmin, masterSession } = useAuth();
  const isAdminUser = isAdmin || !!masterSession;

  // Microalertas — assina falhas recentes de autenticação e reflete na faixa "Operação em tempo real"
  const [securityAlert, setSecurityAlert] = useState<{ level: 'ok' | 'warn' | 'danger'; label?: string }>({ level: 'ok' });
  const alertTimerRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const clearLater = (ms: number) => {
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
      alertTimerRef.current = window.setTimeout(() => {
        if (!cancelled) setSecurityAlert({ level: 'ok' });
      }, ms);
    };
    // Verificação inicial: janela de 2 min
    (async () => {
      try {
        await syncServerTime();
        const since = new Date(getServerDate().getTime() - 2 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('login_attempts')
          .select('id, success, attempt_time')
          .eq('success', false)
          .gte('attempt_time', since)
          .limit(5);
        if (!cancelled && (data?.length || 0) >= 3) {
          setSecurityAlert({ level: 'danger', label: `${data!.length} falhas recentes` });
          clearLater(12000);
        }
      } catch { /* ignore */ }
    })();

    const ch = supabase
      .channel(`rounds-security-alerts-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_attempts' }, (payload) => {
        const rec = payload.new as { success?: boolean } | null;
        if (rec && rec.success === false) {
          setSecurityAlert({ level: 'danger', label: 'Falha de autenticação' });
          clearLater(8000);
        }
      })
      .subscribe();
    return () => {
      cancelled = true;
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
      supabase.removeChannel(ch);
    };
  }, []);


  const [team, setTeam] = useState<TeamKey>(() => {
    try {
      const raw = localStorage.getItem('plantaopro_team_lock_state');
      if (!raw) return 'ALFA';
      const p = JSON.parse(raw) as { team?: TeamKey };
      return (p?.team as TeamKey) ?? 'ALFA';
    } catch { return 'ALFA'; }
  });
  const [mode, setMode] = useState<Mode>('split');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('19:00');
  const [intervalMin, setIntervalMin] = useState(30);
  const [cadenceMin, setCadenceMin] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(CADENCE_KEY);
      const v = raw ? parseInt(raw, 10) : DEFAULT_CADENCE_MIN;
      return Number.isFinite(v) && v >= 5 && v <= 240 ? v : DEFAULT_CADENCE_MIN;
    } catch { return DEFAULT_CADENCE_MIN; }
  });
  useEffect(() => {
    try { localStorage.setItem(CADENCE_KEY, String(cadenceMin)); } catch { /* ignore */ }
  }, [cadenceMin]);
  const [rounding, setRounding] = useState<Rounding>('distribute');
  const [agents, setAgents] = useState<string[]>(['Agente 1', 'Agente 2', 'Agente 3']);

  /* Ref para focar/scrollar até o painel de validação vermelho */
  const validationPanelRef = useRef<HTMLDivElement | null>(null);
  const focusValidationPanel = () => {
    const el = validationPanelRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('rm-validation-flash');
    window.setTimeout(() => el.classList.remove('rm-validation-flash'), 1200);
  };

  /* templates */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tplName, setTplName] = useState('');
  useEffect(() => { setTemplates(readTemplates()); }, [open]);

  const saveTemplate = () => {
    const serverNow = getServerDate();
    const name = tplName.trim() || `EQUIPE ${team} · ${serverNow.toLocaleDateString('pt-BR')}`;
    const tpl: Template = {
      id: crypto.randomUUID?.() ?? String(serverNow.getTime()),
      name: name.slice(0, 50),
      team, mode, startTime, endTime, intervalMin, rounding,
      agents: agents.map((a) => a.trim()).filter(Boolean),
      updatedAt: serverNow.getTime(),
    };
    const next = [tpl, ...templates].slice(0, 20);
    writeTemplates(next);
    setTemplates(next);
    setTplName('');
    toast({ title: 'Template salvo', description: name });
  };
  const loadTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTeam(t.team);
    setMode(sanitizeMode(t.mode));
    setStartTime(t.startTime);
    setEndTime(t.endTime);
    setIntervalMin(t.intervalMin);
    setRounding(t.rounding);
    setAgents(t.agents.length ? t.agents : ['Agente 1']);
    toast({ title: 'Template carregado', description: t.name });
  };
  const deleteTemplate = (id: string) => {
    const next = templates.filter((x) => x.id !== id);
    writeTemplates(next);
    setTemplates(next);
  };

  /* history */
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyIdRef = useRef<string | null>(null);
  useEffect(() => { setHistory(readHistory()); }, [open]);
  const clearHistory = () => { writeHistory([]); setHistory([]); };

  /* ---- Log resumido de equipes das rondas realizadas ----
     Persistido em Supabase (`team_round_log`) para sincronizar entre
     dispositivos da mesma unidade. Mantém cache local como fallback
     offline. */
  const TEAM_LOG_KEY = 'plantaopro_team_round_log';
  type TeamLogEntry = {
    team: string;
    dateISO: string;
    savedName?: string;
    id?: string;
    totalSeconds?: number;
    agentsCount?: number;
  };
  const readTeamLogLocal = (): TeamLogEntry[] => {
    try {
      const raw = localStorage.getItem(TEAM_LOG_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, 15) : [];
    } catch { return []; }
  };
  const writeTeamLogLocal = (list: TeamLogEntry[]) => {
    try { localStorage.setItem(TEAM_LOG_KEY, JSON.stringify(list.slice(0, 15))); } catch { /* ignore */ }
  };
  const [teamLog, setTeamLog] = useState<TeamLogEntry[]>([]);
  const [teamLogLoading, setTeamLogLoading] = useState(false);
  const [historyTeamFilter, setHistoryTeamFilter] = useState<string | null>(null);
  // Local optimistic append (started rounds). Cloud is written when a
  // round is completed and the operator saves the team name.
  const appendTeamLog = (teamName: string) => {
    const entry: TeamLogEntry = { team: teamName, dateISO: getServerDate().toISOString() };
    const next = [entry, ...readTeamLogLocal()].slice(0, 15);
    writeTeamLogLocal(next);
    setTeamLog(next);
  };


  /* ---- Confirmação e trava da equipe (persistida) ---- */
  const TEAM_LOCK_KEY = 'plantaopro_team_lock_state';
  type TeamLockState = { team: TeamKey; teamConfirmed: boolean; scheduledFor: number | null };
  const readTeamLock = (): TeamLockState | null => {
    try {
      const raw = localStorage.getItem(TEAM_LOCK_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as TeamLockState;
      // Descarta agendamento vencido (>24h no passado)
      if (p.scheduledFor && getServerDate().getTime() - p.scheduledFor > 24 * 3600_000) p.scheduledFor = null;
      return p;
    } catch { return null; }
  };
  const [teamConfirmed, setTeamConfirmed] = useState<boolean>(() => readTeamLock()?.teamConfirmed ?? false);
  const [teamConfirmOpen, setTeamConfirmOpen] = useState(false);
  const [pendingTeam, setPendingTeam] = useState<TeamKey | null>(null);

  /* ---- Rodízio de cores (persistido) ---- */
  const [colorRotation, setColorRotation] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('plantaopro_team_color_rotation');
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? ((n % 4) + 4) % 4 : 0;
    } catch { return 0; }
  });

  /* ---- Modal de histórico detalhado ---- */
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const { lowMotion } = useLowMotion();

  /* ---- Efeito de foco: desfoca a homepage por trás enquanto o modal está aberto ---- */
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('rm-focus-mode');
    if (lowMotion) document.body.classList.add('rm-low-motion');
    return () => {
      document.body.classList.remove('rm-focus-mode');
      document.body.classList.remove('rm-low-motion');
    };
  }, [open, lowMotion]);

  /* server clock: fonte única = get_server_now(), avançando por relógio monotônico */
  const sessionIdRef = useRef<string | null>(null);
  // Guard de concorrência: bloqueia reentrada do startTimer enquanto uma
  // execução ainda está em vôo (fetch + insert), evitando corrida entre o
  // auto-disparo da programação e cliques manuais.
  const startingRef = useRef(false);
  const clockSkewWarnedRef = useRef(false);
  const syncServerClock = async () => {
    try {
      await syncServerTime(true);
      const offset = getServerOffsetMs();
      // Alerta quando o relógio do dispositivo está > 5 min fora do servidor.
      const skewMin = Math.abs(offset) / 60_000;
      if (skewMin > 5 && !clockSkewWarnedRef.current) {
        clockSkewWarnedRef.current = true;
        const ahead = offset < 0; // servidor está atrás → dispositivo adiantado
        toast({
          title: 'Relógio do dispositivo fora do horário',
          description: `Diferença de ${Math.round(skewMin)} min em relação ao servidor (${ahead ? 'adiantado' : 'atrasado'}). Ajuste a hora do sistema para evitar registros incorretos.`,
          variant: 'destructive',
        });
      } else if (skewMin <= 5) {
        clockSkewWarnedRef.current = false;
      }
    } catch { /* offline: keep last known server clock */ }
  };
  const nowServer = () => getServerDate().getTime();

  /* ---------- Night shift status (manual hours enabled) ---------- */
  const [nightLocked, setNightLocked] = useState<boolean>(() => {
    const d = getServerDate();
    return isNightShift(d);
  });
  const [preNightScheduled, setPreNightScheduled] = useState<boolean>(() => {
    return false;
  });

  const [serverClock, setServerClock] = useState<Date>(() => getServerDate());
  const [nightWindow, setNightWindow] = useState(() => getNightWindow(getServerDate()));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const now = new Date(nowServer());
      setServerClock(now);
      setNightWindow(getNightWindow(now));
      const actualNight = isNightShift(now);
      const preNight = false;
      const night = actualNight;
      setNightLocked(night);
      setPreNightScheduled(false);
      // Diagnóstico: ative com localStorage.setItem('plantaopro_rounds_debug','1')
      try {
        if (localStorage.getItem('plantaopro_rounds_debug') === '1') {
          // eslint-disable-next-line no-console
          console.log('[RoundsManager][tick]', {
            acre: formatAcreClock(now),
            actualNight, preNight, nightLocked: night,
          });
        }
      } catch { /* ignore */ }
    };

    // Sync com o servidor apenas na abertura e a cada 60s, para não
    // sobrecarregar a RPC. O relógio continua avançando localmente a cada
    // segundo com o offset em cache, então mesmo que o dispositivo esteja
    // com a hora errada o horário exibido permanece correto (fuso Acre).
    syncServerClock().finally(tick);
    const syncIv = setInterval(() => { syncServerClock().finally(tick); }, 60_000);
    const tickIv = setInterval(tick, 1000);
    return () => { cancelled = true; clearInterval(syncIv); clearInterval(tickIv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const nightEffectivelyLocked = false;

  // Guard: modo "proportional" foi descontinuado da UI. Se restar salvo em
  // localStorage/estado antigo, cai automaticamente para "split".
  useEffect(() => {
    if ((mode as string) === 'proportional') setMode('split');
  }, [mode]);

  /* ---------- Auto-ancorar início no horário ATUAL ao abrir (turno diurno) ----------
   * Regra de negócio: sempre que o operador abre o Gestor de Rondas para criar
   * ou dividir uma ronda durante o dia, o "Início do turno" passa a refletir
   * o horário atual do servidor (arredondado a 5 min), para que as divisões
   * sejam calculadas a partir do momento em que ele está — e não de um valor
   * fixo (07:00) que já ficou no passado. Só aplicamos UMA vez por abertura do
   * modal para não brigar com edições manuais posteriores do operador.
   */
  const autoAnchoredRef = useRef(false);
  useEffect(() => {
    if (!open) { autoAnchoredRef.current = false; return; }
    if (nightEffectivelyLocked) return;
    if (autoAnchoredRef.current) return;
    autoAnchoredRef.current = true;
    // Usa hora do servidor CONVERTIDA para o fuso do Acre (não o fuso do
    // dispositivo). Assim, mesmo que o celular esteja em SP/UTC/errado,
    // a âncora reflete o horário operacional real.
    const now = new Date(nowServer());
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: NIGHT_TZ, hour12: false, hour: '2-digit', minute: '2-digit',
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
    const hNow = get('hour') % 24;
    const mNow = get('minute');
    const totalMin = hNow * 60 + mNow;
    const rounded = Math.round(totalMin / 5) * 5;
    const h = String(Math.floor(rounded / 60) % 24).padStart(2, '0');
    const m = String(rounded % 60).padStart(2, '0');
    setStartTime(`${h}:${m}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nightEffectivelyLocked]);

  const addAgent = () => {
    setAgents((a) => [...a, `Agente ${a.length + 1}`]);
  };
  const removeAgent = (i: number) => {
    setAgents((a) => a.filter((_, idx) => idx !== i));
  };
  const updateAgent = (i: number, v: string) => {
    setAgents((a) => a.map((x, idx) => (idx === i ? v : x)));
  };


  // Cor rotacionada — muda a cada nova ronda para evitar repetição visual.
  const teamColor = getRotatedTeamColor(team, colorRotation);

  /* sound settings */
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUND);
  useEffect(() => { setSound(readSound()); }, [open]);
  const updateSound = (patch: Partial<SoundSettings>) => {
    setSound((prev) => { const next = { ...prev, ...patch }; writeSound(next); return next; });
  };
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);


  /* ---------- validation ---------- */
  const baseIssues = useMemo(
    () => validate({ mode, startTime, endTime, intervalMin, agents }),
    [mode, startTime, endTime, intervalMin, agents],
  );

  /* Aviso de transição de turno (janela ±5 min em 22:00 e 06:00 Acre) —
   * bloqueia iniciar/salvar para evitar divisões inconsistentes quando o
   * relógio está exatamente na virada do turno. Depende de `tick` para
   * reavaliar em tempo real enquanto o modal está aberto. */
  const transitionIssues = useMemo<Issue[]>(() => {
    const list: Issue[] = [];
    const N22 = 22 * 60;

    // Split cruzando a fronteira do noturno (22:00) durante o dia
    if (!nightEffectivelyLocked && mode === 'split') {

      const s = toMinutes(startTime);
      const e = toMinutes(endTime);
      if (s !== null && e !== null && s !== e) {
        const crosses = s < N22 && (e > N22 || e <= s);
        if (crosses) {
          list.push({
            field: 'end',
            message: 'A janela cruza 22:00 (início do turno noturno). Finalize antes das 22:00 ou aguarde o bloqueio noturno.',
          });
        }
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverClock, mode, startTime, endTime, nightEffectivelyLocked]);

  const issues = useMemo(() => [...baseIssues, ...transitionIssues], [baseIssues, transitionIssues]);
  const hasError = (field: string) => issues.some((i) => i.field === field);

  // Diagnóstico: loga quando a lista de validações muda (útil para entender
  // por que o painel do Cronograma some entre janelas de horário).
  useEffect(() => {
    try {
      if (localStorage.getItem('plantaopro_rounds_debug') === '1') {
        // eslint-disable-next-line no-console
        console.log('[RoundsManager][issues]', {
          count: issues.length,
          items: issues.map((i) => `${i.field}: ${i.message}`),
          mode, startTime, endTime, agentsCount: agents.length,
        });
      }
    } catch { /* ignore */ }
  }, [issues, mode, startTime, endTime, agents.length]);


  // Estado do cronômetro (hoisted — usado no cálculo do início efetivo abaixo).
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);

  // Programação antecipada foi removida — a ronda só inicia manualmente.
  // Também limpamos qualquer chave legada de programação armazenada em
  // localStorage para não travar a UI de nenhum usuário que atualize o app.
  useEffect(() => {
    try {
      (['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const).forEach((k) => {
        localStorage.removeItem(`plantaopro_armed_${k}`);
      });
    } catch { /* ignore */ }
  }, []);
  const armed = false;




  /* ---------- início efetivo (turno noturno) ----------
   * REGRA DE ANCORAGEM (22:00–06:00):
   * O cronograma é sempre ancorado no relógio de parede às 22:00, dividido em N
   * fatias iguais (8h ÷ N). Cada agente ocupa uma janela fixa (ex.: 3 agentes →
   * 22:00–00:40, 00:40–03:20, 03:20–06:00). Se o operador iniciar a contagem
   * atrasado (ex.: 23:00), o Agente 1 continua com fim em 00:40 (recebe apenas
   * o tempo restante do próprio slot); ao esgotar, é riscado e passa-se ao
   * próximo agente com o slot inteiro. Se iniciar tão tarde que o slot do
   * primeiro já venceu, ele entra "cumprido" e a ronda começa no agente ativo.
   *
   * Fora do turno noturno, mantém o comportamento anterior (início = campo).
   */
  const frozenStartMinRef = useRef<number | null>(null);
  const effectiveStartMin = useMemo<number | null>(() => {
    if (mode === 'split' && nightEffectivelyLocked) {
      return toMinutes(startTime);
    }
    if (mode === 'split' && running && frozenStartMinRef.current != null) {
      return frozenStartMinRef.current;
    }
    return toMinutes(startTime);
  }, [mode, nightEffectivelyLocked, running, startTime]);


  /* ---------- schedule com RECALIBRAGEM AUTOMÁTICA (precisão em segundos) ---------- */
  const schedule = useMemo(() => {
    if (issues.length) return null;
    if (agents.length === 0) return null;
    if (effectiveStartMin == null) return null;
    const s = effectiveStartMin;
    const startSec = Math.round(s * 60);

    // Total em minutos da janela (usado apenas por split). Interval usa outra base.
    let windowTotalMin = 0;
    if (mode === 'split') {
      const e = toMinutes(endTime)!;
      let totalMin = e - s;
      if (totalMin <= 0) totalMin += 24 * 60; // suporta virada de meia-noite
      windowTotalMin = totalMin;
    }

    const effectiveAgents = agents;
    const n = effectiveAgents.length;
    if (n === 0) return null;

    // Total em segundos
    let totalSec: number;
    if (mode === 'interval') {
      totalSec = Math.max(1, Math.round(intervalMin * 60)) * n;
    } else {
      totalSec = Math.max(1, Math.round(windowTotalMin * 60));
    }

    // No turno noturno travado usamos distribuição EXATA em segundos.
    const effRounding: Rounding =
      (nightEffectivelyLocked && mode === 'split') ? 'exact' : rounding;


    const slotsSec: number[] = new Array(n).fill(0);
    if (mode === 'interval') {
      const per = Math.round(intervalMin * 60);
      for (let i = 0; i < n; i++) slotsSec[i] = per;
    } else if (effRounding === 'exact') {
      const base = Math.floor(totalSec / n);
      let leftover = totalSec - base * n;
      for (let i = 0; i < n; i++) {
        slotsSec[i] = base + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover--;
      }
    } else if (effRounding === 'floor') {
      const perMin = Math.floor(totalSec / 60 / n);
      for (let i = 0; i < n; i++) slotsSec[i] = perMin * 60;
    } else if (effRounding === 'ceil') {
      const perMin = Math.ceil(totalSec / 60 / n);
      for (let i = 0; i < n; i++) slotsSec[i] = perMin * 60;
    } else {
      const totalMin = Math.round(totalSec / 60);
      const baseMin = Math.floor(totalMin / n);
      let leftoverMin = totalMin - baseMin * n;
      for (let i = 0; i < n; i++) {
        const extra = leftoverMin > 0 ? 1 : 0;
        slotsSec[i] = (baseMin + extra) * 60;
        if (leftoverMin > 0) leftoverMin--;
      }
      const drift = totalSec - slotsSec.reduce((a, v) => a + v, 0);
      if (drift !== 0) slotsSec[n - 1] += drift;
    }

    let cursorSec = startSec;
    const rows = effectiveAgents.map((name, i) => {
      const fromSec = cursorSec;
      const toSec = cursorSec + slotsSec[i];
      cursorSec = toSec;
      return {
        name: name.trim() || `Agente ${i + 1}`,
        from: fromMinutes(fromSec / 60),
        to: fromMinutes(toSec / 60),
        fromAbs: fromSec / 60,
        toAbs: toSec / 60,
        duration: slotsSec[i] / 60,
      };
    });

    const totalMinOut = slotsSec.reduce((a, v) => a + v, 0) / 60;
    const baseSlot = totalSec / 60 / n;
    const hasSeconds = slotsSec.some((v) => v % 60 !== 0);

    return {
      total: totalMinOut,
      totalSec,
      slot: baseSlot,
      rows,
      startMin: s,
      hasRemainder: hasSeconds,
      effectiveRounding: effRounding,
      // Modo proporcional foi descontinuado — mantemos o campo como null
      // para compatibilidade com consumidores existentes.
      proportional: null as null,

    };
  }, [issues, mode, startTime, endTime, intervalMin, cadenceMin, rounding, agents, effectiveStartMin, nightEffectivelyLocked]);



  /* ---------- live timer ---------- */
  const [lockOpen, setLockOpen] = useState(false);

  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  /** Timestamp-alvo (ms UTC) para início automático às 22:00. Null = sem agendamento. */
  const [scheduledFor, setScheduledFor] = useState<number | null>(null);
  // Momento (ms) em que a programação foi armada — usado para desenhar a
  // barra de progresso do "PRÉ-INÍCIO" (proporção de espera consumida).
  const scheduledArmedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (scheduledFor == null) { scheduledArmedAtRef.current = null; return; }
    if (scheduledArmedAtRef.current == null) scheduledArmedAtRef.current = getServerDate().getTime();
  }, [scheduledFor]);

  /* Persistência local: trava de equipe/agendamento em cache. */
  useEffect(() => {
    try {
      localStorage.setItem(
        'plantaopro_team_lock_state',
        JSON.stringify({ team, teamConfirmed, scheduledFor }),
      );
    } catch { /* ignore */ }
  }, [team, teamConfirmed, scheduledFor]);

  /* ---- Sincronização multi-dispositivo via backend (team_lock_state) ---- */
  const [unitId, setUnitId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const applyingRemoteRef = useRef(false);
  const lastSyncedRef = useRef<string>('');

  // Descobre unit_id do agente autenticado (pelo CPF do email).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email;
        if (!email) return;
        const cpf = email.split('@')[0];
        const { data } = await supabase
          .from('agents')
          .select('unit_id')
          .eq('cpf', cpf)
          .maybeSingle();
        if (!cancelled && data?.unit_id) setUnitId(data.unit_id as string);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Puxa estado remoto inicial + assina realtime.
  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;

    const applyRemote = (row: {
      team?: string; team_confirmed?: boolean; scheduled_for?: string | null;
    } | null) => {
      if (!row || cancelled) return;
      applyingRemoteRef.current = true;
      try {
        const remoteTeam = (row.team as TeamKey) ?? team;
        const remoteConfirmed = !!row.team_confirmed;
        const remoteScheduled = null;
        setTeam((prev) => (prev !== remoteTeam ? remoteTeam : prev));
        setTeamConfirmed((prev) => (prev !== remoteConfirmed ? remoteConfirmed : prev));
        setScheduledFor((prev) => (prev !== remoteScheduled ? remoteScheduled : prev));
        lastSyncedRef.current = JSON.stringify({
          team: remoteTeam, teamConfirmed: remoteConfirmed, scheduledFor: remoteScheduled,
        });
      } finally {
        // libera o flag no próximo tick para não disparar upsert de eco.
        setTimeout(() => { applyingRemoteRef.current = false; }, 0);
      }
    };

    (async () => {
      const { data } = await supabase
        .from('team_lock_state')
        .select('team, team_confirmed, scheduled_for')
        .eq('unit_id', unitId)
        .maybeSingle();
      if (data) applyRemote(data);
    })();

    const ch = supabase
      .channel(`team-lock-sync-${unitId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_lock_state', filter: `unit_id=eq.${unitId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as any;
          if (payload.eventType === 'DELETE') return;
          applyRemote(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  // Empurra alterações locais para o backend (debounced curto).
  useEffect(() => {
    if (!unitId) return;
    if (applyingRemoteRef.current) return;
    const signature = JSON.stringify({ team, teamConfirmed, scheduledFor });
    if (signature === lastSyncedRef.current) return;
    lastSyncedRef.current = signature;
    const t = window.setTimeout(async () => {
      try {
        await supabase.from('team_lock_state').upsert(
          {
            unit_id: unitId,
            team,
            team_confirmed: teamConfirmed,
            scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
            updated_at: getServerDate().toISOString(),
          },
          { onConflict: 'unit_id' },
        );
      } catch (err) {
        console.warn('[rounds] sync team_lock_state falhou', err);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [unitId, team, teamConfirmed, scheduledFor]);

  /* ---- Sincroniza teamLog (últimas rondas) com Supabase por unidade ---- */
  const hydrateTeamLogFromCloud = useCallback(async () => {
    if (!unitId) return;
    setTeamLogLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_round_log')
        .select('id, team, saved_name, completed_at, total_seconds, agents_count')
        .eq('unit_id', unitId)
        .order('completed_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      const mapped: TeamLogEntry[] = (data ?? []).map((r: any) => ({
        id: r.id,
        team: r.team,
        dateISO: r.completed_at,
        savedName: r.saved_name ?? undefined,
        totalSeconds: typeof r.total_seconds === 'number' ? r.total_seconds : undefined,
        agentsCount: typeof r.agents_count === 'number' ? r.agents_count : undefined,
      }));
      setTeamLog(mapped);
      writeTeamLogLocal(mapped);
    } catch {
      // fallback: cache local
      setTeamLog(readTeamLogLocal());
    } finally {
      setTeamLogLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    if (!open) return;
    // Hidrata imediatamente do cache local + tenta nuvem
    setTeamLog(readTeamLogLocal());
    void hydrateTeamLogFromCloud();
  }, [open, hydrateTeamLogFromCloud]);

  // Realtime: reflete inserções/limpezas feitas por outros dispositivos.
  useEffect(() => {
    if (!unitId) return;
    const ch = supabase
      .channel(`team-round-log-${unitId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_round_log', filter: `unit_id=eq.${unitId}` },
        () => { void hydrateTeamLogFromCloud(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [unitId, hydrateTeamLogFromCloud]);

  const saveTeamRoundToCloud = async (params: {
    team: string; savedName: string; totalSeconds: number; agentsCount: number;
  }) => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) throw new Error('Sessão expirada. Faça login novamente.');
    if (!unitId) throw new Error('Unidade não encontrada para o agente atual.');
    const { error } = await supabase.from('team_round_log').insert({
      unit_id: unitId,
      team: params.team,
      saved_name: params.savedName,
      total_seconds: params.totalSeconds,
      agents_count: params.agentsCount,
      completed_by: uid,
    });
    if (error) throw new Error(error.message);
    await hydrateTeamLogFromCloud();
  };

  /* ============ Fila de sincronização (retentativa quando volta online) ============ */
  const PENDING_KEY = 'plantaopro_pending_team_rounds_v1';
  type PendingItem = {
    id: string;
    team: string;
    savedName: string;
    totalSeconds: number;
    agentsCount: number;
    createdAt: number;
    attempts: number;
  };
  const readPending = (): PendingItem[] => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const writePending = (arr: PendingItem[]) => {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(arr.slice(0, 50))); } catch { /* ignore */ }
  };
  const enqueuePending = (item: Omit<PendingItem, 'id' | 'createdAt' | 'attempts'>) => {
    const next = [...readPending(), { ...item, id: crypto.randomUUID?.() ?? String(Date.now()), createdAt: Date.now(), attempts: 0 }];
    writePending(next);
  };

  const flushPendingRounds = useCallback(async (silent = false) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const queue = readPending();
    if (queue.length === 0) return;
    const remaining: PendingItem[] = [];
    let synced = 0;
    for (const item of queue) {
      try {
        await saveTeamRoundToCloud({
          team: item.team,
          savedName: item.savedName,
          totalSeconds: item.totalSeconds,
          agentsCount: item.agentsCount,
        });
        synced++;
      } catch (e) {
        // Mantém na fila para próxima tentativa; incrementa attempts.
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
    writePending(remaining);
    if (synced > 0) {
      setSummarySyncedOnline(true);
      if (!silent) {
        toast({
          title: 'Sincronização concluída',
          description: `${synced} registro${synced === 1 ? '' : 's'} de ronda sincronizado${synced === 1 ? '' : 's'} com a unidade.`,
        });
      }
    }
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retenta ao voltar online, ao ganhar foco, e a cada 60s se houver fila.
  useEffect(() => {
    void flushPendingRounds(true);
    const onOnline = () => { void flushPendingRounds(); };
    const onFocus = () => { void flushPendingRounds(true); };
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    const iv = window.setInterval(() => { void flushPendingRounds(true); }, 60_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(iv);
    };
  }, [flushPendingRounds]);

  const clearTeamLog = async () => {
    // Limpa nuvem (RLS restringe à mesma unidade) + cache local.
    if (unitId) {
      try {
        await supabase.from('team_round_log').delete().eq('unit_id', unitId);
      } catch (e) {
        console.warn('[rounds] falha ao limpar team_round_log', e);
      }
    }
    writeTeamLogLocal([]);
    setTeamLog([]);
  };



  // Enquanto uma ronda está agendada (pré-noturno → 22:00), a configuração
  // do lado esquerdo é travada para preservar o cronograma pactuado.
  const configLocked = false;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<{ totalSec: number; completed: number } | null>(null);
  const [summarySaved, setSummarySaved] = useState(false);
  const [summarySyncedOnline, setSummarySyncedOnline] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [historyClearConfirmOpen, setHistoryClearConfirmOpen] = useState(false);

  const [silentMode, setSilentMode] = useState<boolean>(() => {
    try { return localStorage.getItem('plantaopro_rounds_silent') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('plantaopro_rounds_silent', silentMode ? '1' : '0'); } catch { /* ignore */ }
  }, [silentMode]);
  const startedAtRef = useRef<number | null>(null);
  const firedRef = useRef<Set<number>>(new Set());
  // Estado real de pausa (preserva startedAt para retomar snapshot)
  const [isPaused, setIsPaused] = useState(false);
  const pauseSnapshotRef = useRef<{ slotRemainingSec: number; activeName?: string; nextName?: string } | null>(null);
  const [alarm, setAlarm] = useState<{ open: boolean; index: number; name: string }>({
    open: false, index: -1, name: '',
  });

  useEffect(() => {
    // Ticka também no modo noturno em preview (sem estar rodando) para que o
    // "quanto falta pro slot do agente atual terminar" atualize em tempo real
    // enquanto o operador só configura a ronda.
    const needsPreview = nightEffectivelyLocked && mode === 'split' && !!schedule;
    const needsSchedule = scheduledFor != null;
    if (!running && !needsPreview && !armed && !needsSchedule) return;
    // Se o modal está fechado, o único motivo válido para continuar
    // ticando é disparar o auto-start no horário programado — nesse
    // caso um tick lento (3s) já basta e economiza CPU.
    // Quando aberto: 1s em máquinas normais, 2s em dispositivos lentos.
    const intervalMs = !open
      ? (needsSchedule ? 3000 : 1000)
      : (lowMotion ? 2000 : 1000);
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [running, nightEffectivelyLocked, mode, schedule, armed, scheduledFor, open, lowMotion]);

  /* ---------- Auto-start quando bater 22:00 (pré-agendado) ---------- */
  useEffect(() => {
    if (scheduledFor == null) return;
    if (nowServer() >= scheduledFor) {
      const target = scheduledFor;
      setScheduledFor(null);
      // Ancora o início no exato 22:00 para preservar a divisão de tempo.
      startTimer({ anchorOverrideMs: target });
    }
    // Depende de `tick` para reavaliar a cada 500ms enquanto agendado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, scheduledFor]);

  const live = useMemo(() => {
    if (!schedule || !running || startedAtRef.current == null) return null;
    const elapsedSec = (nowServer() - startedAtRef.current) / 1000;
    const boundaries = schedule.rows.map((r) => (r.toAbs - schedule.startMin) * 60);
    const totalSec = boundaries[boundaries.length - 1];
    if (elapsedSec >= totalSec) {
      return { done: true, index: schedule.rows.length - 1, remaining: 0, elapsed: elapsedSec };
    }
    let idx = 0;
    while (idx < boundaries.length && elapsedSec >= boundaries[idx]) idx++;
    const prevBoundary = idx === 0 ? 0 : boundaries[idx - 1];
    const remaining = boundaries[idx] - elapsedSec;
    return { done: false, index: idx, remaining, elapsed: elapsedSec, prevBoundary, slotSec: boundaries[idx] - prevBoundary };
  }, [schedule, running, tick]);

  /* ---------- Preview em tempo real (turno noturno, antes de Iniciar) ----------
   * Mesmo sem clicar em Iniciar, o painel mostra qual agente está "no ar" agora
   * baseado no relógio de parede ancorado às 22:00, e quanto falta para o slot
   * dele terminar. Se o slot do primeiro já venceu, mostra o segundo, e assim
   * sucessivamente — exatamente a experiência pedida pelo operador.
   */
  const preview = useMemo(() => {
    if (running) return null;
    if (!schedule || !nightEffectivelyLocked || mode !== 'split') return null;
    const anchorMs = getNightWindow(new Date(nowServer())).startsAt.getTime();
    const elapsedSec = (nowServer() - anchorMs) / 1000;
    const boundaries = schedule.rows.map((r) => (r.toAbs - schedule.startMin) * 60);
    const totalSec = boundaries[boundaries.length - 1];
    if (elapsedSec < 0) {
      // Ainda não bateu 22:00 (não deve ocorrer sob nightEffectivelyLocked, mas seguro).
      return { done: false, index: 0, remaining: boundaries[0], elapsed: 0, prevBoundary: 0, slotSec: boundaries[0] };
    }
    if (elapsedSec >= totalSec) {
      return { done: true, index: schedule.rows.length - 1, remaining: 0, elapsed: elapsedSec, prevBoundary: totalSec, slotSec: 0 };
    }
    let idx = 0;
    while (idx < boundaries.length && elapsedSec >= boundaries[idx]) idx++;
    const prevBoundary = idx === 0 ? 0 : boundaries[idx - 1];
    return {
      done: false,
      index: idx,
      remaining: boundaries[idx] - elapsedSec,
      elapsed: elapsedSec,
      prevBoundary,
      slotSec: boundaries[idx] - prevBoundary,
    };
  }, [running, schedule, nightEffectivelyLocked, mode, tick]);

  const currentView = live ?? preview;
  const activeRoundName = currentView && !currentView.done ? schedule?.rows[currentView.index]?.name : undefined;
  const totalRemainingSeconds = schedule
    ? Math.max(0, schedule.totalSec - (currentView?.elapsed ?? 0))
    : 0;

  // ==== Sinais luminosos intermitentes ANTES da troca de agente ====
  // Ativa nos últimos 60s (âmbar) e 15s (vermelho) do slot do agente atual.
  const slotRemainingSec = live && !live.done ? Math.max(0, live.remaining) : 0;
  const handoffSoon = !!(live && !live.done && slotRemainingSec > 0 && slotRemainingSec <= 60);
  const handoffImminent = !!(live && !live.done && slotRemainingSec > 0 && slotRemainingSec <= 15);
  const nextAgentName = live && !live.done && schedule?.rows[live.index + 1]?.name;

  // Beep discreto na aproximação da troca (uma vez em 60s e outra em 15s por posto)
  const handoffBeepRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!live || live.done) return;
    const key60 = `${live.index}-60`;
    const key15 = `${live.index}-15`;
    if (handoffSoon && !handoffBeepRef.current.has(key60)) {
      handoffBeepRef.current.add(key60);
      try { playAlert(soundRef.current); } catch { /* ignore */ }
    }
    if (handoffImminent && !handoffBeepRef.current.has(key15)) {
      handoffBeepRef.current.add(key15);
      try { playAlert(soundRef.current); } catch { /* ignore */ }
      try {
        if (!soundRef.current.muted && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.([120, 60, 120]);
        }
      } catch { /* ignore */ }
    }
    // Reset ao trocar de posto
    if (!handoffSoon && !handoffImminent && live.remaining > 65) {
      // sem ação — mantém sinalizado
    }
  }, [handoffSoon, handoffImminent, live?.index, live?.done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Alerta visual/sonoro nos últimos minutos da operação inteira
  const endingSoon = running && totalRemainingSeconds > 0 && totalRemainingSeconds <= 300; // ≤ 5 min
  const endingCritical = running && totalRemainingSeconds > 0 && totalRemainingSeconds <= 60; // ≤ 1 min
  const endingWarnFiredRef = useRef<Set<number>>(new Set());
  // (removido) endingConfirmOpen — não pedimos mais confirmação nos últimos 5 min.
  useEffect(() => {
    if (!running || totalRemainingSeconds <= 0) {
      if (totalRemainingSeconds > 305) endingWarnFiredRef.current.clear();
      return;
    }
    const thresholds = [300, 60, 10];
    for (const t of thresholds) {
      if (
        totalRemainingSeconds <= t &&
        totalRemainingSeconds > t - 2 &&
        !endingWarnFiredRef.current.has(t)
      ) {
        endingWarnFiredRef.current.add(t);
        const label = t === 300 ? '5 minutos' : t === 60 ? '1 minuto' : '10 segundos';
        toast({
          title: `⏳ Operação encerra em ${label}`,
          description: `EQUIPE ${team} · finalize as rondas em andamento`,
        });
        try { playAlert(soundRef.current); } catch { /* ignore */ }
        // Alerta apenas informativo (SVG/toast). Sem confirmação: a operação
        // segue seu curso natural e o operador NÃO precisa clicar em nada.

      }
    }
  }, [totalRemainingSeconds, running, team]);




  // Trava persistida: quais postos já dispararam a notificação
  const notifiedRef = useRef<Set<number>>(new Set());

  const markNotified = async (finishedIdx: number) => {
    if (notifiedRef.current.has(finishedIdx)) return false;
    notifiedRef.current.add(finishedIdx);
    if (sessionIdRef.current) {
      try {
        const arr = Array.from(notifiedRef.current).sort((a, b) => a - b);
        await supabase.from('round_sessions')
          .update({ notified_indices: arr })
          .eq('id', sessionIdRef.current);
      } catch { /* ignore */ }
    }
    return true;
  };

  useEffect(() => {
    if (!live || !schedule) return;
    const currentIdx = live.index;
    if (!firedRef.current.has(currentIdx)) {
      firedRef.current.add(currentIdx);
      // Individual "MISSÃO CUMPRIDA" para o agente que acabou de terminar
      const finishedIdx = live.done ? currentIdx : currentIdx - 1;
      if (finishedIdx >= 0 && !notifiedRef.current.has(finishedIdx)) {
        void markNotified(finishedIdx).then((ok) => {
          if (!ok) return;
          const finishedRow = schedule.rows[finishedIdx];
          toast({
            title: `✅ MISSÃO CUMPRIDA — ${finishedRow.name}`,
            description: `Posto ${pad(finishedIdx + 1)} concluído · EQUIPE ${team}`,
          });
          playAlert(soundRef.current);
          try {
            if (!soundRef.current.muted && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate?.([220, 90, 220, 90, 380]);
            }
          } catch { /* ignore */ }
          // Notificações nativas do navegador foram removidas — todos os
          // avisos são exibidos in-app via toast/diálogo SVG profissional.
        });
      }
      if (!live.done && currentIdx > 0) {
        const row = schedule.rows[currentIdx];
        setAlarm({ open: true, index: currentIdx, name: row.name });
      }
    }
    if (live.done) {
      setRunning(false);
      setSummaryData({ totalSec: Math.round(live.elapsed), completed: schedule.rows.length });
      setSummarySaved(false);
      setSummaryOpen(true);

      if (historyIdRef.current) {
        const endedAt = nowServer();
        const finished = readHistory().map((h) =>
          h.id === historyIdRef.current ? { ...h, endedAt } : h,
        );
        writeHistory(finished);
        setHistory(finished);
        historyIdRef.current = null;
      }
      if (sessionIdRef.current) {
        supabase.from('round_sessions').update({ is_active: false, ended_at: getServerDate().toISOString() })
          .eq('id', sessionIdRef.current).then(() => { sessionIdRef.current = null; });
      }
      void logRoundActivity('update', {
        event: 'rounds_completed',
        team,
        mode,
        start_time: startTime,
        end_time: endTime,
        interval_min: intervalMin,
        agents_count: schedule.rows.length,
        total_seconds: Math.round(live.elapsed),
        completed_at: getServerDate().toISOString(),
      });
    }
  }, [live, schedule, team]);

  /* Restaurar sessão ativa ao montar / abrir + Realtime */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const hydrateFrom = (data: {
      id: string; team: string; mode: string; start_time: string; end_time: string;
      interval_min: number; rows: unknown; server_started_at: string;
      notified_indices?: number[] | null; is_active?: boolean;
    }) => {
      setTeam(data.team as TeamKey);
      setMode(sanitizeMode(data.mode));
      setStartTime(data.start_time);
      setEndTime(data.end_time);
      setIntervalMin(data.interval_min);
      const rows = (data.rows as Array<{ name: string }>) || [];
      if (rows.length) setAgents(rows.map((r) => r.name));
      sessionIdRef.current = data.id;
      startedAtRef.current = new Date(data.server_started_at).getTime();
      notifiedRef.current = new Set(data.notified_indices || []);
      // Marca como já "vistos" localmente para não re-disparar toasts históricos
      firedRef.current = new Set(data.notified_indices || []);
      setRunning(data.is_active !== false);
    };

    (async () => {
      await syncServerClock();
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid || cancelled) return;
      const { data } = await supabase
        .from('round_sessions')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('server_started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) hydrateFrom(data);

      // Realtime: sincroniza status entre navegadores do mesmo usuário
      channel = supabase
        .channel(`round_sessions_${uid}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'round_sessions', filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = (payload.new || payload.old) as {
              id: string; is_active: boolean; notified_indices?: number[] | null;
            } | null;
            if (!row) return;
            // Nova sessão ou sessão ativa detectada em outra aba: hidrata do zero
            if ((payload.eventType === 'INSERT' || !sessionIdRef.current) && row.is_active) {
              hydrateFrom(payload.new as Parameters<typeof hydrateFrom>[0]);
              return;
            }
            if (row.id !== sessionIdRef.current) return;
            // Absorve trava de notificações de outros dispositivos (dedupe)
            const arr = row.notified_indices || [];
            notifiedRef.current = new Set([...notifiedRef.current, ...arr]);
            arr.forEach((i) => firedRef.current.add(i));
            if (row.is_active === false) {
              setRunning(false);
              sessionIdRef.current = null;
            }
          })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [open]);


  const startTimer = async (opts?: { anchorOverrideMs?: number }) => {
    if (!schedule) {
      toast({ title: 'Corrija os erros antes de iniciar.', variant: 'destructive' });
      return;
    }
    if (startingRef.current || running) return; // idempotência local (evita corrida)
    startingRef.current = true;
    try {
    await syncServerClock();
    const nowMs = nowServer();
    //    imune a atraso do tick (fire pode ocorrer alguns ms após o alvo).
    // 2) Turno noturno em split — ancora em 22:00 (regra de negócio).
    // 3) Caso geral — âncora = agora.
    const anchorMs = opts?.anchorOverrideMs != null
      ? opts.anchorOverrideMs
      : (nightEffectivelyLocked && mode === 'split')
        ? getNightWindow(new Date(nowMs)).startsAt.getTime()
        : nowMs;
    startedAtRef.current = anchorMs;
    // Congela o "início efetivo" — a partir daqui, a divisão não desliza mais.
    frozenStartMinRef.current = effectiveStartMin ?? toMinutes(startTime) ?? 0;

    firedRef.current = new Set();
    notifiedRef.current = new Set();
    setRunning(true);
    setIsPaused(false);
    pauseSnapshotRef.current = null;
    // Log resumido (cache local) — equipe + data da ronda realizada
    try { appendTeamLog(team); } catch { /* ignore */ }
    // Rodízio profissional de cores — próxima ronda usará paleta diferente.
    try { setColorRotation(bumpColorRotation()); } catch { /* ignore */ }

    try {
      // Respeita a preferência "somente in-app" (Configurações do Lembrete).
      // Só solicitamos permissão nativa quando o modo permite Notifications.
      if (areNativeNotificationsAllowed() && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => { /* ignore */ });
      }
    } catch { /* ignore */ }
    // Persist history (localStorage)
    const serverNowMs = nowServer();
    const entry: HistoryEntry = {
      id: crypto.randomUUID?.() ?? String(serverNowMs),
      team, mode, startTime, endTime, intervalMin,
      agents: schedule.rows.map((r) => r.name),
      startedAt: anchorMs,
      endedAt: null,
    };
    historyIdRef.current = entry.id;
    const next = [entry, ...readHistory()].slice(0, 20);
    writeHistory(next);
    setHistory(next);
    // Persist active session (Supabase) — encerra qualquer anterior do mesmo usuário
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (uid) {
        const rows = schedule.rows.map((r) => ({ name: r.name, duration: r.duration }));
        await supabase.from('round_sessions')
          .update({ is_active: false, ended_at: getServerDate().toISOString() })
          .eq('user_id', uid).eq('is_active', true);
        const { data, error } = await supabase.from('round_sessions').insert({
          user_id: uid,
          team, mode, start_time: startTime, end_time: endTime,
          interval_min: intervalMin,
          rows,
          server_started_at: new Date(anchorMs).toISOString(),
          is_active: true,
        }).select('id').maybeSingle();
        if (error) throw error;
        if (data?.id) sessionIdRef.current = data.id;
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      const code = (e as { code?: string })?.code ?? '';
      // Idempotência de servidor: se já existe uma sessão ativa para este
      // user_id + server_started_at, o índice único bloqueia o duplicado.
      // Silenciamos o erro e mantemos a sessão anterior — nada é duplicado.
      if (code === '23505' || msg.includes('round_sessions_user_started_active_unique') || msg.toLowerCase().includes('duplicate key')) {
        console.info('[rounds] insert duplicado ignorado (trava idempotente)');
        return;
      }
      /* ignore other errors — offline: sessão só local */
    }
    // Registro profissional no histórico de atividades
    void logRoundActivity('create', {
      event: 'rounds_started',
      team,
      mode,
      start_time: startTime,
      end_time: endTime,
      interval_min: intervalMin,
      agents_count: schedule.rows.length,
      agents: schedule.rows.map((r) => r.name),
      night_locked: nightEffectivelyLocked,
      started_at: new Date(anchorMs).toISOString(),
    });
    } finally {
      startingRef.current = false;
    }
  };

  const pauseTimer = () => {
    // Congela snapshot do slot atual para exibir "tempo restante do próximo evento"
    if (live && !live.done && schedule) {
      pauseSnapshotRef.current = {
        slotRemainingSec: Math.max(0, live.remaining),
        activeName: schedule.rows[live.index]?.name,
        nextName: schedule.rows[live.index + 1]?.name,
      };
    }
    setIsPaused(true);
    setRunning(false);
  };

  /* Programação antecipada removida — sem armRoundForStart / disarmRound. */




  const resetTimer = () => {
    setRunning(false);
    setIsPaused(false);
    pauseSnapshotRef.current = null;
    startedAtRef.current = null;
    firedRef.current = new Set();
    notifiedRef.current = new Set();
    setTick(0);
    setTeamConfirmed(false);
    if (sessionIdRef.current) {
      supabase.from('round_sessions').update({ is_active: false, ended_at: getServerDate().toISOString() })
        .eq('id', sessionIdRef.current).then(() => { sessionIdRef.current = null; });
    }
  };


  /* ---------- share actions ---------- */
  const copyToClipboard = async () => {
    if (!schedule) return;
    const modeTxt = mode === 'split' ? `Divisão · ${startTime}→${endTime}` : `Intervalo · ${intervalMin}min a partir de ${startTime}`;
    const header = `📋 EQUIPE ${team} — Escala de Rondas\n⏱ ${modeTxt} · ${agents.length} agentes\n\n`;
    const body = schedule.rows
      .map((r, i) => `${pad(i + 1)}. ${r.name}  ${r.from} — ${r.to}  (${fmtDuration(r.duration)})`)
      .join('\n');
    await navigator.clipboard.writeText(header + body);
    toast({ title: 'Copiado', description: 'Escala copiada para a área de transferência.' });
  };

  const exportPDF = async () => {
    if (!schedule) return;
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const modeTxt = mode === 'split'
      ? `Divisão · ${startTime} → ${endTime}`
      : `Intervalo · ${intervalMin}min desde ${startTime}`;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`EQUIPE ${team} — ESCALA DE RONDAS`, pageW / 2, 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90);
    doc.text(`${modeTxt} · ${agents.length} agentes · ${fmtDuration(schedule.slot)}/agente · ${rounding}`, pageW / 2, 25, { align: 'center' });
    const generatedAt = getServerDate();
    doc.text(`Gerado em ${generatedAt.toLocaleString('pt-BR')}`, pageW / 2, 30, { align: 'center' });
    doc.setTextColor(0);

    const statusFor = (i: number): 'Concluído' | 'Em ronda' | 'Aguardando' => {
      if (!running || !live) return 'Aguardando';
      if (live.done ? i <= live.index : i < live.index) return 'Concluído';
      if (!live.done && i === live.index) return 'Em ronda';
      return 'Aguardando';
    };
    autoTable(doc, {
      startY: 38,
      head: [['#', 'Agente', 'Início', 'Término', 'Duração', 'Status']],
      body: schedule.rows.map((r, i) => [pad(i + 1), r.name, r.from, r.to, fmtDuration(r.duration), statusFor(i)]),
      theme: 'grid',
      headStyles: { fillColor: [10, 15, 26], textColor: 245, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const st = statusFor(data.row.index);
        if (st === 'Concluído') {
          // "Risco" no nome e badge verde "MISSÃO CUMPRIDA"
          if (data.column.index === 1) {
            data.cell.styles.textColor = [120, 120, 120];
            (data.cell.styles as { fontStyle?: string }).fontStyle = 'italic';
          }
          if (data.column.index === 5) {
            data.cell.text = ['✓ MISSÃO CUMPRIDA'];
            data.cell.styles.fillColor = [16, 185, 129];
            data.cell.styles.textColor = 255;
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (st === 'Em ronda' && data.column.index === 5) {
          data.cell.styles.fillColor = [245, 158, 11];
          data.cell.styles.textColor = 20;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawCell: (data) => {
        // Desenha o "risco" (strike-through) sobre nome de agentes concluídos
        if (data.section === 'body' && data.column.index === 1 && statusFor(data.row.index) === 'Concluído') {
          const { x, y, width, height } = data.cell;
          doc.setDrawColor(200, 60, 60);
          doc.setLineWidth(0.6);
          doc.line(x + 1.5, y + height / 2, x + width - 1.5, y + height / 2);
        }
      },
    });

    doc.save(`rondas_equipe_${team}_${generatedAt.toISOString().split('T')[0]}.pdf`);
    toast({ title: 'PDF exportado', description: 'A escala foi salva como PDF.' });
  };

  const currentIdx = live?.index ?? -1;

  /* Exit guard — evita fechamento acidental (bloqueio forte quando rodando) */
  const [confirmExit, setConfirmExit] = useState(false);
  const requestExit = () => setConfirmExit(true);
  const confirmAndClose = () => {
    // Registra abortagem quando a ronda estava em execução
    if (running && live && !live.done) {
      void logRoundActivity('abort', {
        team,
        mode,
        agents: agents.filter((a) => a.trim()),
        interrupted_at: getServerDate().toISOString(),
        current_index: live.index,
        current_agent: schedule?.rows[live.index]?.name ?? null,
        remaining_seconds: live.remaining,
        total_remaining_seconds: totalRemainingSeconds,
        reason: 'user_abort',
      });
    }
    setConfirmExit(false);
    setRunning(false);
    setOpen(false);
    setDrag({ x: 0, y: 0 });
  };

  /* ================= Drag da janela (rAF + transform direto no DOM) ================= */
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startX: number; startY: number; baseX: number; baseY: number;
    boundX: number; boundY: number; nx: number; ny: number; raf: number | null;
  } | null>(null);
  const canDrag = true;

  const applyTransform = (x: number, y: number) => {
    const el = dialogRef.current;
    if (el) el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  };

  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, [role="button"]')) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const dialog = (e.currentTarget as HTMLDivElement).closest('[role="dialog"]') as HTMLElement | null;
    if (dialog) dialogRef.current = dialog as HTMLDivElement;
    const rect = dialog?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = rect?.width ?? 0;
    const h = rect?.height ?? 0;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      baseX: drag.x, baseY: drag.y,
      boundX: Math.max(0, (vw - w) / 2),
      boundY: Math.max(0, (vh - h) / 2),
      nx: drag.x, ny: drag.y, raf: null,
    };
  };
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    d.nx = Math.max(-d.boundX, Math.min(d.boundX, d.baseX + dx));
    d.ny = Math.max(-d.boundY, Math.min(d.boundY, d.baseY + dy));
    if (d.raf == null) {
      d.raf = requestAnimationFrame(() => {
        if (dragRef.current) {
          applyTransform(dragRef.current.nx, dragRef.current.ny);
          dragRef.current.raf = null;
        }
      });
    }
  };
  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d) {
      if (d.raf != null) cancelAnimationFrame(d.raf);
      const { nx, ny } = d;
      dragRef.current = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
      setDrag({ x: nx, y: ny });
    }
  };
  const resetPosition = () => { applyTransform(0, 0); setDrag({ x: 0, y: 0 }); };

  // Recentra a janela se a viewport encolher.
  useEffect(() => {
    const clampToViewport = () => {
      setDrag((prev) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const boundX = Math.max(0, vw / 2 - 40);
        const boundY = Math.max(0, vh / 2 - 40);
        const nx = Math.max(-boundX, Math.min(boundX, prev.x));
        const ny = Math.max(-boundY, Math.min(boundY, prev.y));
        return nx === prev.x && ny === prev.y ? prev : { x: nx, y: ny };
      });
    };
    window.addEventListener('resize', clampToViewport);
    window.addEventListener('orientationchange', clampToViewport);
    return () => {
      window.removeEventListener('resize', clampToViewport);
      window.removeEventListener('orientationchange', clampToViewport);
    };
  }, []);

  /* Refs mantidos para eventual medição futura — conteúdo agora rola verticalmente */
  const fitRef = useRef<HTMLDivElement>(null);
  const fitInnerRef = useRef<HTMLDivElement>(null);








  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); else requestExit(); }}>
        <DialogTrigger asChild>
          {customTrigger ?? (
          <button
            type="button"
            aria-label="Abrir Gestor de Rondas"
            className={cn(
              'group relative inline-flex items-center gap-2.5 sm:gap-4 p-1 sm:p-1.5 pr-3 sm:pr-6 rounded-xl sm:rounded-2xl',
              'bg-card backdrop-blur-sm border border-border/80',
              'transition-all duration-300',
              'hover:bg-card hover:border-primary/40 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            {/* Icon module — inset panel with radar crosshair */}
            <span className="relative flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-lg sm:rounded-xl border border-border/90 bg-background shadow-inner">
              {/* subtle radar tint */}
              <span aria-hidden className="absolute inset-0 bg-primary/[0.04]" />
              {/* crosshair */}
              <span aria-hidden className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-primary/15" />
              <span aria-hidden className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-primary/15" />
              <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4 sm:h-6 sm:w-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 17h.01" />
                <path d="M19 10.5c0-3.87-3.13-7-7-7s-7 3.13-7 7" />
                <path d="M16.5 14.5c0-2.48-2.02-4.5-4.5-4.5s-4.5 2.02-4.5 4.5" />
                <circle cx="12" cy="12" r="10" strokeOpacity="0.1" />
              </svg>
            </span>

            {/* Content */}
            <span className="flex flex-col items-start leading-none">
              <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.15em] text-primary">
                <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
                Ferramenta Tática
              </span>
              <span className="sm:mt-1 text-sm sm:text-lg font-bold tracking-tight text-foreground">
                Gestor de Rondas
              </span>
            </span>

            {running && live && !live.done && schedule && (
              <span
                className={cn(
                  'ml-1 hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[12.5px] font-semibold tabular-nums transition',
                  handoffImminent && 'animate-pulse ring-2 ring-red-500/70',
                  handoffSoon && !handoffImminent && 'animate-pulse',
                )}
                style={{
                  color: handoffImminent ? '#fca5a5' : handoffSoon ? '#fcd34d' : teamColor,
                  border: `1px solid ${handoffImminent ? '#ef4444aa' : handoffSoon ? '#f59e0baa' : teamColor + '55'}`,
                  backgroundColor: handoffImminent ? '#ef444422' : handoffSoon ? '#f59e0b1a' : `${teamColor}12`,
                  boxShadow: handoffImminent ? '0 0 12px #ef444488' : handoffSoon ? '0 0 8px #f59e0b66' : undefined,
                }}
                title={handoffSoon ? `Troca de posto em ${Math.max(0, Math.ceil(slotRemainingSec))}s${nextAgentName ? ` — próximo: ${nextAgentName}` : ''}` : undefined}
              >
                <Timer className="h-3 w-3" />
                {fmtHMS(live.remaining)}
                {handoffSoon && <span aria-hidden className="ml-1 h-1.5 w-1.5 rounded-full bg-current animate-ping" />}
              </span>
            )}


            <ChevronRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" strokeWidth={2.5} />


            {/* glass reflection */}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          )}
        </DialogTrigger>


        <DialogContent
          ref={dialogRef as any}
          className="rm-dialog w-[min(100vw-0.25rem,50rem)] sm:w-[min(100vw-0.75rem,50rem)] xl:w-[min(100vw-1rem,54rem)] max-w-none max-h-[calc(100dvh-0.25rem)] sm:max-h-[calc(100dvh-0.75rem)] overflow-hidden bg-card border border-border text-foreground p-0 gap-0 [&>button.absolute]:hidden flex flex-col rounded-lg !transition-none !duration-0 !animate-none"

          style={{
            ['--primary' as string]: hexToHslTriple(teamColor),
            ['--rm-accent' as string]: teamColor,
            ['--rm-accent-ink' as string]: TEAM_COLORS[team]?.onAccent ?? '#0b0f17',
            ['--rm-accent-hsl' as string]: hexToHslTriple(teamColor),
            ['--rm-accent-glow' as string]: `${teamColor}66`,
            borderColor: `${teamColor}44`,
            transform: `translate(calc(-50% + ${drag.x}px), calc(-50% + ${drag.y}px))`,
            willChange: 'transform',
          }}

          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Tactical corner brackets tinted with team accent */}
          <span aria-hidden className="pointer-events-none absolute top-0 left-0 z-40 h-3 w-3 border-t-2 border-l-2" style={{ borderColor: `${teamColor}80` }} />
          <span aria-hidden className="pointer-events-none absolute top-0 right-0 z-40 h-3 w-3 border-t-2 border-r-2" style={{ borderColor: `${teamColor}80` }} />
          <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 z-40 h-3 w-3 border-b-2 border-l-2" style={{ borderColor: `${teamColor}80` }} />
          <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 z-40 h-3 w-3 border-b-2 border-r-2" style={{ borderColor: `${teamColor}80` }} />

          {/* Sticky header — sempre visível */}
          <DialogHeader
            className={cn(
              'sticky top-0 z-20 border-b bg-background px-2.5 sm:px-3 py-1.5 select-none touch-none',
              canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
            )}
            style={{ borderColor: `${teamColor}33` }}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            title="Arraste pelo topo para reposicionar a janela"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="min-w-0 flex-1 basis-44">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-[12.5px] uppercase tracking-wider text-muted-foreground">
                  <TeamGlyph team={team} color={teamColor} size={13} className="shrink-0" />
                  <span>Equipe</span>
                  <span className="font-semibold tracking-wide" style={{ color: teamColor }}>{team}</span>
                </div>
                <DialogTitle className="font-display text-lg sm:text-xl font-bold tracking-tight leading-tight text-foreground truncate">
                  Gestor de Rondas
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Gestor de rondas — escala, cronômetro, alarme e histórico.
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">

              <TacticalClock accent={teamColor} />

              {running && live && !live.done && schedule && (
                  <span
                    className="hidden md:inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[13.5px] font-bold tabular-nums"
                    style={{ color: teamColor, border: `1px solid ${teamColor}77`, backgroundColor: `${teamColor}22` }}
                    title="Tempo decorrido do agente em ronda (crescente)"
                  >
                    <span aria-hidden className="text-[10px] opacity-80">▲</span>
                    {fmtHMS(Math.max(0, Math.min(live.slotSec ?? 0, (live.slotSec ?? 0) - live.remaining)))}
                    <span aria-hidden className="text-[9.5px] font-sans font-medium uppercase tracking-wider opacity-70">/{fmtHMS(live.slotSec ?? 0)}</span>
                </span>
              )}


              {(drag.x !== 0 || drag.y !== 0) && (
                <button type="button" onClick={resetPosition} aria-label="Recentrar janela"
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/90 bg-card text-muted-foreground hover:text-foreground transition-colors"
                  title="Recentrar janela">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Configurações do lembrete"
                onPointerDown={(e) => e.stopPropagation()}
                title="Configurações do lembrete de rondas"
                className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/90 bg-card text-muted-foreground hover:text-foreground transition-colors">
                <Settings className="h-3.5 w-3.5" />
              </button>

              <button type="button" onClick={requestExit} aria-label="Sair da ferramenta"
                onPointerDown={(e) => e.stopPropagation()}
                className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/90 bg-card text-muted-foreground hover:text-foreground transition-colors">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 8l-4 4 4 4M6 12h11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              </div>
            </div>
          </DialogHeader>

          {/* Corpo compacto — deixa só o operacional essencial visível */}
          <div
            ref={fitRef}
            className="tactical-scrollbar rounds-tap-boost max-h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-3.75rem)] overflow-y-auto overscroll-contain"
          >
            <div
              ref={fitInnerRef}
               className="px-2 sm:px-3 py-2"
            >
              <div
                className="mx-auto mb-1.5 overflow-hidden rounded-md border border-border bg-card"
              >
                <div className="relative flex items-center gap-2 px-2.5 py-1 sm:px-3">
                  <TeamGlyph team={team} color={teamColor} size={12} className="shrink-0 opacity-90" />
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.22em] font-medium whitespace-nowrap"
                    style={{ color: teamColor }}
                  >
                    Central · {team}
                  </span>
                  <span className="hidden sm:inline text-[11px] leading-none text-foreground/70 tracking-tight">
                    Operação em tempo real
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground/90">
                    <span
                      className={`rounded-sm border px-1.5 py-[1px] transition-colors ${
                        endingCritical
                          ? 'border-red-500/70 bg-red-500/15 text-red-200 animate-pulse'
                          : endingSoon
                          ? 'border-amber-400/60 bg-amber-400/10 text-amber-200 animate-pulse'
                          : 'text-foreground/85'
                      }`}
                      style={endingSoon ? undefined : { borderColor: `${teamColor}33` }}
                      title={endingSoon ? 'Operação encerrando em breve' : undefined}
                    >
                      {fmtHMS(totalRemainingSeconds)}
                      {endingSoon && <HourglassSVG size="md" className="ml-1" />}
                    </span>

                    <span className="hidden xs:inline">· {schedule?.rows.length ?? agents.length} ag.</span>
                    {activeRoundName && (
                      <span className="hidden sm:inline truncate max-w-[140px]">
                        · <b className="uppercase text-foreground/90">{activeRoundName}</b>
                      </span>
                    )}
                  </span>
                </div>

                {/* Readout tático estático — sóbrio, sem animação */}
                <div
                  className="relative border-t grid grid-cols-2 sm:grid-cols-4"
                  style={{ borderColor: `${teamColor}33` }}
                >
                  {[
                    { k: 'Canal', v: { ALFA: '01', BRAVO: '02', CHARLIE: '03', DELTA: '04' }[team] },
                    { k: 'Freq.', v: { ALFA: '148.325', BRAVO: '151.775', CHARLIE: '154.190', DELTA: '158.640' }[team] },
                    { k: 'Status', v: (!!currentView && !currentView.done) ? 'Em serviço' : 'Standby' },
                    { k: 'Setor', v: `S-${team.slice(0, 2)}` },
                  ].map((it, idx) => (
                    <div
                      key={it.k}
                      className={cn(
                        'flex items-baseline justify-between gap-2 px-2.5 py-1 sm:px-3 min-w-0',
                        idx > 0 && 'border-l',
                        idx === 2 && 'sm:border-l border-l-0 border-t sm:border-t-0',
                        idx === 3 && 'border-t sm:border-t-0',
                      )}
                      style={{ borderColor: `${teamColor}33` }}
                    >
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.22em] shrink-0"
                        style={{ color: `${teamColor}` , opacity: 0.75 }}
                      >
                        {it.k}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-foreground/90 truncate uppercase">
                        {it.v}
                      </span>
                    </div>
                  ))}
                </div>

                {isAdminUser && (
                  <div
                    className="relative border-t px-2.5 py-1 sm:px-3"
                    style={{ borderColor: `${teamColor}1c` }}
                  >
                    <SecurityDoctrineCard color={teamColor} />
                  </div>
                )}

              </div>



              <div className="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[0.7fr_1.3fr] gap-x-4 gap-y-2 items-start lg:divide-x lg:divide-border/40">

                <div className="min-w-0 lg:pr-3">


              {/* ============ COLUNA ESQUERDA — CONFIGURAÇÃO ============ */}
              <Section icon={<Radio className="h-3.5 w-3.5 text-primary" />} title="Configuração" defaultOpen>
                {/* Indicador discreto — programação ativa (pré-noturno → 22:00) */}
                {scheduledFor != null && !running && (() => {
                  const remSec = Math.max(0, Math.ceil((scheduledFor - nowServer()) / 1000));
                  const hh = Math.floor(remSec / 3600).toString().padStart(2, '0');
                  const mm = Math.floor((remSec % 3600) / 60).toString().padStart(2, '0');
                  const ss = (remSec % 60).toString().padStart(2, '0');
                  const _t = new Date(scheduledFor);
                  const targetLabel = `${pad(_t.getHours())}:${pad(_t.getMinutes())}`;
                  return (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
                      style={{ borderColor: `${teamColor}55`, background: `${teamColor}0d` }}
                    >
                      <span
                        aria-hidden
                        className="relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: teamColor, boxShadow: `0 0 0 3px ${teamColor}22` }}
                      />
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" style={{ color: teamColor }} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground">
                          Programação ativa
                        </div>
                        <div className="font-sans text-[11.5px] text-foreground truncate">
                          Início automático às <b className="font-semibold" style={{ color: teamColor }}>{targetLabel}</b>
                          <span className="text-muted-foreground"> · em </span>
                          <b className="font-mono tabular-nums">{hh}:{mm}:{ss}</b>
                        </div>
                      </div>
                    </div>
                  );
                })()}


                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-[12.5px] font-sans tracking-wide text-muted-foreground flex items-center gap-1">
                      <Radio className="h-3 w-3" /> Equipe
                      {(teamConfirmed || running || scheduledFor != null) && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-300">
                          <Lock className="h-2.5 w-2.5" /> Confirmada
                        </span>
                      )}
                    </Label>
                    {teamConfirmed && !running && scheduledFor == null && (
                      <button
                        type="button"
                        onClick={() => setTeamConfirmed(false)}
                        className="font-sans text-[10.5px] uppercase tracking-wide text-muted-foreground hover:text-primary"
                      >
                        Trocar equipe
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TEAM_PRESETS.map((t) => {
                      const active = team === t.key;
                      const teamLocked = teamConfirmed || running || scheduledFor != null;
                      const disabled = teamLocked && !active;
                      const c = getRotatedTeamColor(t.key, colorRotation);
                      return (
                        <button key={t.key} type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (teamLocked) return;
                            setPendingTeam(t.key);
                            setTeamConfirmOpen(true);
                          }}
                          title={teamLocked ? 'Equipe travada — cancele a programação ou finalize a ronda para trocar' : `Selecionar ${t.label}`}
                          className={cn(
                            'group relative rounded-sm border px-1 py-1.5 font-mono font-bold uppercase tracking-[0.04em] text-[10.5px] transition-all duration-200',
                            'flex items-center justify-center',

                            disabled && 'opacity-40 cursor-not-allowed',
                            active
                              ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]'
                              : 'bg-card/60 hover:bg-card',
                          )}
                          style={
                            active
                              ? { borderColor: c, backgroundColor: `${c}1a`, color: c, boxShadow: `0 0 14px -4px ${c}` }
                              : { borderColor: `${c}33`, color: `${c}b3` }
                          }
                        >
                          <span className="truncate leading-none">{t.label}</span>
                          <span
                            aria-hidden
                            className={cn(
                              'absolute top-1 right-1 inline-block h-1.5 w-1.5 rounded-full transition-all',
                              active ? 'animate-pulse' : 'opacity-60',
                            )}
                            style={{
                              backgroundColor: c,
                              boxShadow: active ? `0 0 8px ${c}` : 'none',
                            }}
                          />
                        </button>

                      );
                    })}
                  </div>


                  {/* Histórico resumido — equipes das rondas realizadas.
                      Sempre visível (mesmo vazio) para expor botão Limpar e
                      não redimensionar a tela ao aparecer/sumir. */}
                  <div className="rounded-md border border-border/70 bg-card/60 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => { setHistoryTeamFilter(null); setHistoryDialogOpen(true); }}
                        className="group inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground hover:text-primary transition-colors"
                        title="Abrir histórico detalhado"
                      >
                        <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-sm border border-primary/30 bg-primary/10 px-1 font-mono text-[9px] font-bold text-primary group-hover:bg-primary/20">
                          {teamLog.length}
                        </span>
                        Rondas realizadas
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setClearConfirmOpen(true)}
                        disabled={teamLog.length === 0}
                        className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
                      >
                        Limpar
                      </button>
                    </div>

                    {/* Topo do resumo — última equipe registrada com duração + agentes */}
                    {(() => {
                      const last = teamLog.find((e) => e.savedName && e.savedName.trim().length > 0);
                      if (!last) return null;
                      const preset = TEAM_PRESETS.find((p) => p.key === last.team);
                      const color = preset ? getRotatedTeamColor(last.team, colorRotation) : '#94a3b8';
                      const label = preset?.label ?? last.team;
                      const fmtDur = (s?: number) => {
                        if (!s || s <= 0) return null;
                        const h = Math.floor(s / 3600);
                        const m = Math.floor((s % 3600) / 60);
                        return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}m`;
                      };
                      const dur = fmtDur(last.totalSeconds);
                      return (
                        <button
                          type="button"
                          onClick={() => { setHistoryTeamFilter(last.team); setHistoryDialogOpen(true); }}
                          className="mb-1.5 w-full text-left rounded border border-primary/25 bg-primary/5 px-2 py-1 hover:bg-primary/10 transition-colors"
                          style={{ borderLeft: `3px solid ${color}` }}
                          title={`Abrir histórico filtrado por ${label}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                            <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-primary/80 shrink-0">
                              Última
                            </span>
                            <span className="font-sans font-bold text-[11px] uppercase tracking-wide text-foreground truncate">
                              {label}
                            </span>
                            <span className="font-sans text-[10.5px] text-primary/90 truncate flex-1" title={last.savedName}>
                              · {last.savedName}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-[9.5px] tabular-nums text-muted-foreground">
                            {dur && <span>⏱ {dur}</span>}
                            {last.agentsCount ? <span>👥 {last.agentsCount} agentes</span> : null}
                          </div>
                        </button>
                      );
                    })()}

                    {teamLog.length === 0 ? null : (

                      <ul className="tactical-scrollbar grid gap-0.5 max-h-24 overflow-y-auto pr-1">
                        {teamLog.map((e, i) => {
                          const preset = TEAM_PRESETS.find((p) => p.key === e.team);
                          const color = preset ? getRotatedTeamColor(e.team, colorRotation) : '#94a3b8';
                          const label = preset?.label ?? e.team;
                          const dt = new Date(e.dateISO);
                          const when = new Intl.DateTimeFormat('pt-BR', {
                            timeZone: NIGHT_TZ, day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit', hour12: false,
                          }).format(dt);
                          return (
                            <li key={i}>
                              <button
                                type="button"
                                onClick={() => { setHistoryTeamFilter(e.team); setHistoryDialogOpen(true); }}
                                className="w-full flex items-center gap-2 min-w-0 rounded px-1 py-0.5 hover:bg-muted/40 transition-colors text-left"
                                title={`Abrir histórico filtrado por ${label}`}
                              >
                                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                                <span className="font-sans font-semibold text-[11px] uppercase tracking-wide text-foreground truncate">{label}</span>
                                {e.savedName && e.savedName.trim().length > 0 && (
                                  <span
                                    className="font-sans text-[10.5px] text-primary/90 truncate max-w-[45%]"
                                    title={e.savedName}
                                  >
                                    · {e.savedName}
                                  </span>
                                )}
                                <span className="ml-auto font-mono text-[10.5px] tabular-nums text-muted-foreground whitespace-nowrap">{when}</span>
                              </button>
                            </li>
                          );
                        })}



                      </ul>
                    )}
                  </div>

                </div>

                {!nightEffectivelyLocked && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['split', 'interval'] as Mode[]).map((m) => (
                      <button key={m} type="button" onClick={() => setMode(m)} disabled={configLocked}
                        className={cn(
                          'rounded-md border px-1.5 py-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-tight leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis',
                          mode === m ? 'border-border bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground',
                          configLocked && 'opacity-60 cursor-not-allowed',
                        )}
                        title={
                          m === 'split' ? 'Divide o turno igualmente entre agentes'
                          : 'Intervalo fixo por agente'
                        }>
                        {m === 'split' ? 'Dividir' : 'Intervalo'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Modo Proporcional descontinuado — bloco de Cadência removido. */}





                {/* Times / interval */}
                {nightLocked && (
                  <div
                    data-testid="night-shift-banner"
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-[12px]',
                      'border-amber-500/30 bg-amber-500/5 text-amber-200/90',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>
                            Agora&nbsp;
                            <b className="font-mono tabular-nums text-foreground/90" data-testid="server-clock">
                              {formatAcreClock(serverClock)}
                            </b>
                          </span>
                          <span data-testid="night-window">
                            Turno <b className="font-mono">{nightWindow.startLabel}</b>→<b className="font-mono">{nightWindow.endLabel}</b>
                          </span>
                          {schedule && mode === 'split' && (
                            <span data-testid="night-total-remaining">
                              Restante&nbsp;
                              <b
                                className={`font-mono tabular-nums ${
                                  endingCritical
                                    ? 'text-red-300 animate-pulse'
                                    : endingSoon
                                    ? 'text-amber-300 animate-pulse'
                                    : 'text-amber-100'
                                }`}
                              >
                                {fmtHMS(totalRemainingSeconds)}
                                {endingSoon && <HourglassSVG size="md" className="ml-1" />}
                              </b>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {nightEffectivelyLocked ? (
                  <button
                    type="button"
                    onClick={() => toast({
                      title: 'Configuração indisponível',
                      description: 'Os horários noturnos estão liberados; atualize a configuração ativa para editar.',
                    })}
                    className="w-full text-left cursor-not-allowed"
                    aria-label="Configuração indisponível"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1.5">
                        <div className="text-[10.5px] uppercase tracking-wide text-amber-300/80 flex items-center gap-1">
                          Início {preNightScheduled && <span className="font-mono text-[8.5px]">· programado</span>}
                        </div>
                        <div className="font-mono text-sm text-foreground">22:00</div>
                      </div>
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-2 py-1.5">
                        <div className="text-[10.5px] uppercase tracking-wide text-amber-300/80 flex items-center gap-1">
                          Final {preNightScheduled && <span className="font-mono text-[8.5px]">· programado</span>}
                        </div>
                        <div className="font-mono text-sm text-foreground">06:00</div>
                      </div>
                    </div>
                    {preNightScheduled && (
                      <p className="mt-1 text-[10.5px] leading-snug text-amber-200/80">
                        🌙 Turno noturno programado automaticamente. Só é possível alterar a <b>quantidade de agentes</b>.
                      </p>
                    )}
                  </button>

                ) : mode === 'split' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TimeField id="rm-start" label="Início do turno" value={startTime}
                      onChange={setStartTime} invalid={hasError('start')} accent={teamColor}
                      locked={nightEffectivelyLocked || configLocked}
                      lockedBadgeText={undefined}
                      lockedHint={
                        configLocked ? 'Programação ativa — cancele para editar'
                        : 'Configuração bloqueada'
                      }
                      onLockedAttempt={() => toast({
                        title: 'Configuração bloqueada',
                        description: 'Cancele a operação ativa para editar os horários.',
                      })}
                    />
                    <TimeField id="rm-end" label="Término do turno" value={endTime}
                      onChange={setEndTime} invalid={hasError('end')} accent={teamColor}
                      locked={nightEffectivelyLocked || configLocked}
                      lockedBadgeText={undefined}
                      lockedHint={
                        configLocked ? 'Programação ativa — cancele para editar'
                        : 'Configuração bloqueada'
                      }
                      onLockedAttempt={() => toast({
                        title: 'Configuração bloqueada',
                        description: 'Cancele a operação ativa para editar os horários.',
                      })}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TimeField id="rm-start2" label="Início" value={startTime}
                      onChange={setStartTime} invalid={hasError('start')} accent={teamColor}
                      locked={nightEffectivelyLocked || configLocked}
                      lockedBadgeText={undefined}
                      lockedHint={
                        configLocked ? 'Programação ativa — cancele para editar'
                        : 'Configuração bloqueada'
                      }
                      onLockedAttempt={() => toast({
                        title: 'Configuração bloqueada',
                        description: 'Cancele a operação ativa para editar os horários.',
                      })}
                    />



                    <div className="grid gap-1.5">
                      <label htmlFor="rm-int" className="text-[12.5px] font-sans uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <Timer className="h-3 w-3" /> Intervalo (min)
                      </label>
                      <Input id="rm-int" type="number" min={1} max={240} value={intervalMin} disabled={configLocked}
                        onChange={(e) => setIntervalMin(Math.max(1, Math.min(240, +e.target.value || 1)))}
                        className={cn('bg-background border-border font-mono text-lg font-light tabular-nums h-11', hasError('interval') && 'border-destructive', configLocked && 'opacity-60 cursor-not-allowed')}
                        autoComplete="off" onKeyDown={(e) => e.key === 'e' && e.preventDefault()} />
                    </div>
                  </div>
                )}




                {/* Agents */}
                <div className="grid gap-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <Label className="text-[12.5px] font-sans tracking-wide text-muted-foreground flex items-center gap-1 min-w-0 truncate">
                      <Users className="h-3 w-3 shrink-0" /> <span className="truncate">Agentes ({agents.length})</span>
                      {configLocked && (
                        <span className="ml-1 inline-flex items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-amber-300 shrink-0">
                          <Lock className="h-2.5 w-2.5" /> Programado
                        </span>
                      )}
                    </Label>
                    <Button type="button" size="icon" variant="outline" onClick={addAgent} disabled={configLocked} className={cn('h-6 w-6 shrink-0 border-border text-primary hover:bg-primary/10', configLocked && 'opacity-60 cursor-not-allowed')} aria-label="Adicionar agente" title={configLocked ? 'Bloqueado: programação ativa' : 'Adicionar agente'}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className={cn('tactical-scrollbar flex flex-col gap-0.5 max-h-[min(45dvh,420px)] overflow-y-auto overflow-x-hidden pr-1 rounded-md min-w-0 scroll-smooth overscroll-contain', hasError('agents') && 'ring-1 ring-destructive/40 p-1')}>
                    {agents.map((a, i) => (
                      <div key={i} className="flex items-center gap-1 min-w-0 h-[26px] shrink-0">
                        <span className="w-4 sm:w-5 shrink-0 text-center font-mono text-[10px] sm:text-[10.5px] font-semibold text-muted-foreground tabular-nums leading-[26px]">{pad(i + 1)}</span>
                        <Input value={a} onChange={(e) => updateAgent(i, e.target.value.toUpperCase().slice(0, 40))} disabled={configLocked}
                          placeholder={`AGENTE ${i + 1}`}
                          title={a || `Agente ${i + 1}`}
                          className={cn('bg-card border-border h-[26px] px-1.5 sm:px-2 py-0 text-[11.5px] sm:text-[12px] leading-[26px] uppercase tracking-tight sm:tracking-wide min-w-0 flex-1 font-medium text-foreground placeholder:text-muted-foreground/60 text-ellipsis', !a.trim() && 'border-destructive/60', configLocked && 'opacity-70 cursor-not-allowed')}
                          autoComplete="off"
                          autoCapitalize="characters"
                          spellCheck={false} />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeAgent(i)}
                           disabled={agents.length <= 1 || configLocked} className="h-[26px] w-[24px] sm:w-[26px] shrink-0 text-muted-foreground hover:text-destructive"
                           aria-label={`Remover ${i + 1}`} title={`Remover ${a || `Agente ${i + 1}`}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Validation panel */}
                {issues.length > 0 && (
                  <div
                    ref={validationPanelRef}
                    tabIndex={-1}
                    className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 scroll-mt-20 transition-shadow"
                  >
                    <style>{`
                      .rm-validation-flash {
                        animation: rm-validation-flash 1.2s ease-out;
                        box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.55), 0 0 24px hsl(var(--destructive) / 0.35);
                      }
                      @keyframes rm-validation-flash {
                        0%, 100% { transform: translateX(0); }
                        15% { transform: translateX(-6px); }
                        30% { transform: translateX(6px); }
                        45% { transform: translateX(-4px); }
                        60% { transform: translateX(4px); }
                        75% { transform: translateX(-2px); }
                      }
                    `}</style>
                    <div className="flex items-center gap-2 font-sans text-[12.5px] uppercase tracking-wider text-destructive mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Corrija os itens abaixo
                    </div>
                    <ul className="grid gap-1.5 text-xs text-destructive/90 list-disc pl-4 break-words">
                      {issues.map((iss, k) => {
                        const isNightCross = iss.message.includes('cruza 22:00');
                        return (
                          <li key={k}>
                            {iss.message}
                            {isNightCross && (
                              <div className="mt-1.5 ml-[-1rem] list-none flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEndTime('21:55')}
                                  className="inline-flex items-center gap-1 rounded-md border border-destructive/60 bg-destructive/20 hover:bg-destructive/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive transition-colors"
                                >
                                  Corrigir para 21:55
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEndTime('21:59')}
                                  className="inline-flex items-center gap-1 rounded-md border border-destructive/60 bg-destructive/20 hover:bg-destructive/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-destructive transition-colors"
                                >
                                  Corrigir para 21:59
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              </Section>
              </div>

              {/* ============ COLUNA DIREITA — OPERAÇÃO ============ */}
              <div className="grid gap-3 min-w-0 lg:pl-4">

                <Section icon={<Timer className="h-3.5 w-3.5 text-primary" />} title="Cronograma" defaultOpen={!!schedule}>
                  {/* ReadyToStartBanner removido a pedido — informação redundante. */}

                  {!schedule ? (
                    <div className="grid gap-3">
                      <div className="rounded-lg border border-dashed border-border bg-card/95 p-4 text-center text-[13px] text-muted-foreground font-sans">
                        {issues.length > 0
                          ? 'Existem itens a corrigir — o cronograma será gerado assim que todos forem resolvidos.'
                          : 'Preencha a configuração para gerar o cronograma.'}
                      </div>
                      {/* Iniciar Rondas sempre visível (desabilitado quando há validações). */}
                      <div className="flex justify-center">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          aria-disabled
                          onClick={() => {
                            focusValidationPanel();
                            toast({
                              title: 'Corrija os itens em vermelho antes de iniciar.',
                              description: issues[0]?.message ?? 'Preencha a configuração.',
                              variant: 'destructive',
                            });
                          }}
                          className="h-10 sm:h-9 px-4 sm:px-5 border font-mono font-bold uppercase tracking-[0.16em] text-[12px] sm:text-[11.5px] rounded-sm opacity-50 cursor-not-allowed grayscale"
                          style={{
                            backgroundColor: teamColor,
                            borderColor: teamColor,
                            color: TEAM_COLORS[team]?.onAccent ?? '#0a0a0a',
                          }}
                        >
                          <Play className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1.5" /> Iniciar Rondas
                        </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-[12px] leading-snug">
                              <p className="font-semibold mb-1">Início bloqueado</p>
                              <p className="text-muted-foreground">
                                Existem itens de validação pendentes. Ajuste a configuração para prosseguir.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ) : (

                    <div>


                      {/* Countdown — aberto, centralizado */}
                      <div className="relative mb-2 flex flex-col items-center text-center gap-1 overflow-hidden rounded-lg">
                        {/* SVG tático realista de fundo — radar + grid, não intercepta cliques */}
                        <svg
                          aria-hidden
                          viewBox="0 0 400 260"
                          preserveAspectRatio="xMidYMid slice"
                          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.09]"
                        >
                          <defs>
                            <radialGradient id="rm-radar-grad" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor={teamColor} stopOpacity="0.9" />
                              <stop offset="70%" stopColor={teamColor} stopOpacity="0.15" />
                              <stop offset="100%" stopColor={teamColor} stopOpacity="0" />
                            </radialGradient>
                            <pattern id="rm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                              <path d="M20 0H0V20" fill="none" stroke={teamColor} strokeWidth="0.4" />
                            </pattern>
                          </defs>
                          <rect width="400" height="260" fill="url(#rm-grid)" />
                          <circle cx="200" cy="130" r="110" fill="none" stroke={teamColor} strokeWidth="0.8" />
                          <circle cx="200" cy="130" r="75"  fill="none" stroke={teamColor} strokeWidth="0.6" />
                          <circle cx="200" cy="130" r="40"  fill="none" stroke={teamColor} strokeWidth="0.6" />
                          <line x1="200" y1="20"  x2="200" y2="240" stroke={teamColor} strokeWidth="0.5" />
                          <line x1="90"  y1="130" x2="310" y2="130" stroke={teamColor} strokeWidth="0.5" />
                          <path d="M200 130 L310 130 A110 110 0 0 0 285 65 Z" fill="url(#rm-radar-grad)">
                            <animateTransform attributeName="transform" type="rotate" from="0 200 130" to="360 200 130" dur="6s" repeatCount="indefinite" />
                          </path>
                        </svg>

                        {(() => {
                          // Estado explícito (idle | before_start | running | paused | done).
                          // Regra dura: `before_start` NUNCA exibe contador de agente.
                          const phaseState = computeRoundsState({
                            hasSchedule: !!schedule,
                            totalSec: schedule?.totalSec ?? 0,
                            scheduledStartMs: scheduledFor,
                            startedAtMs: (running || isPaused) ? startedAtRef.current : null,
                            paused: isPaused,
                            nowMs: nowServer(),
                          });
                          const scheduledPending = phaseState.phase === 'before_start';
                          const isPausedPhase = phaseState.phase === 'paused';
                          const secToStart = phaseState.secondsUntilStart;
                          // "view" unifica live (rodando) e preview (turno noturno, antes de Iniciar)
                          const view = (scheduledPending || isPausedPhase) ? null : (live ?? preview);
                          const isPreview = !scheduledPending && !isPausedPhase && !live && !!preview;
                          const scheduledTargetLabel = scheduledPending && scheduledFor != null
                            ? (() => { const d = new Date(scheduledFor); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; })()
                            : null;
                          const pauseSnap = isPausedPhase ? pauseSnapshotRef.current : null;
                          const statusLabel =
                            scheduledPending ? `Início programado ${scheduledTargetLabel} — falta` :
                            isPausedPhase ? 'Pausado — restante do slot atual' :
                            phaseState.phase === 'running' && live && !live.done ? 'Restante do agente em ronda' :
                            phaseState.phase === 'done' ? 'Concluído' :
                            isPreview && view?.done ? 'Turno encerrado (06:00)' :
                            isPreview ? 'Prévia · agente atual' :
                            'Aguardando início';
                          const urgent = !scheduledPending && !isPausedPhase && view && !view.done && view.remaining <= 10;
                          const critical = !scheduledPending && !isPausedPhase && view && !view.done && view.remaining <= 5;
                          const slotProgress = view && !view.done && 'slotSec' in view && view.slotSec > 0
                            ? 1 - view.remaining / view.slotSec : 0;
                          const activeAgentName = view && !view.done ? schedule.rows[view.index]?.name : (pauseSnap?.activeName);

                          // ==== Badge visual de fase ====
                          const phaseMeta: Record<typeof phaseState.phase, { label: string; color: string; dot: string }> = {
                            idle:         { label: 'AGUARDANDO',   color: 'text-muted-foreground border-border/60 bg-muted/20', dot: 'bg-muted-foreground' },
                            before_start: { label: 'PRÉ-INÍCIO',   color: 'text-amber-200 border-amber-500/50 bg-amber-500/10', dot: 'bg-amber-400 animate-pulse' },
                            running:      { label: 'EM RONDA',     color: 'text-emerald-200 border-emerald-500/50 bg-emerald-500/10', dot: 'bg-emerald-400 animate-pulse' },
                            paused:       { label: 'PAUSADO',      color: 'text-sky-200 border-sky-500/50 bg-sky-500/10', dot: 'bg-sky-400' },
                            done:         { label: 'CONCLUÍDO',    color: 'text-primary border-primary/60 bg-primary/10', dot: 'bg-primary' },
                          };
                          const meta = phaseMeta[phaseState.phase];

                          return (
                            <>
                              <div className="flex items-center justify-center gap-2 flex-wrap">
                                <span
                                  data-testid="rounds-phase-badge"
                                  data-phase={phaseState.phase}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]',
                                    meta.color,
                                  )}
                                >
                                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} aria-hidden />
                                  {meta.label}
                                </span>
                                <span
                                  className="relative font-sans text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground"
                                  data-testid="rounds-status-label"
                                  data-phase={phaseState.phase}
                                >
                                  {statusLabel}
                                </span>
                              </div>





                              <div className="flex items-center justify-center gap-3">
                                <span
                                  className={cn(
                                    'font-mono font-light tabular-nums tracking-tight leading-none break-all',
                                    urgent
                                      ? 'text-2xl sm:text-3xl md:text-4xl font-black'
                                      : 'text-xl sm:text-2xl md:text-3xl',

                                  )}
                                  style={{
                                    color: urgent
                                      ? 'hsl(var(--destructive))'
                                      : (view || scheduledPending || isPausedPhase) ? teamColor : 'hsl(var(--muted-foreground))',
                                  }}
                                  data-testid="rounds-primary-timer"
                                >
                                  {scheduledPending
                                    ? fmtHMS(secToStart!)
                                    : isPausedPhase
                                      ? fmtHMS(pauseSnap?.slotRemainingSec ?? 0)
                                      : view && !view.done
                                        ? fmtHMS(view.remaining)
                                        : view?.done
                                          ? '00:00:00'
                                          : fmtHMS(schedule.rows[0].duration * 60)}
                                </span>
                              </div>

                              {isPausedPhase && pauseSnap?.nextName && (
                                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
                                  Próximo evento: <b className="text-sky-100">{pauseSnap.nextName}</b>
                                </div>
                              )}

                              {urgent && view && (
                                <div className="font-mono text-[12.5px] uppercase tracking-[0.35em] font-bold text-destructive">
                                  ⚠ {critical ? 'ALERTA FINAL · ' : 'Contagem final · '}
                                  {String(Math.max(0, Math.ceil(view.remaining))).padStart(2, '0')} segundos
                                </div>
                              )}

                              {/* Nome grande — agente ATIVO agora (live ou preview) */}
                              {activeAgentName && (
                                <div
                                  className="font-display font-black uppercase tracking-tight text-base sm:text-xl md:text-2xl leading-none break-words max-w-full px-2"
                                  style={{ color: teamColor }}
                                >
                                  {activeAgentName}
                                </div>

                              )}
                              {!view && (
                                <div className="font-sans font-medium text-base text-foreground break-words max-w-full px-2">
                                  {schedule.rows[0].name}
                                </div>
                              )}
                              {view?.done && (
                                <div className="font-sans font-black uppercase tracking-[0.15em] text-lg sm:text-2xl md:text-3xl text-emerald-500 flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7" /> {isPreview ? 'TURNO ENCERRADO' : 'MISSÃO CUMPRIDA'}
                                </div>
                              )}


                              {/* ============ Relógio + horário de início ============ */}
                              {(() => {
                                const nowD = new Date(nowServer());
                                const nowLabel = `${pad(nowD.getHours())}:${pad(nowD.getMinutes())}:${pad(nowD.getSeconds())}`;
                                let startLabel: string | null = null;
                                let startCaption = 'Início';
                                if (scheduledPending && scheduledFor != null) {
                                  const d = new Date(scheduledFor);
                                  startLabel = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                  startCaption = 'Início programado';
                                } else if ((phaseState.phase === 'running' || phaseState.phase === 'paused' || phaseState.phase === 'done') && startedAtRef.current != null) {
                                  const d = new Date(startedAtRef.current);
                                  startLabel = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                  startCaption = 'Iniciado às';
                                } else if (schedule?.rows[0]?.from) {
                                  startLabel = schedule.rows[0].from;
                                  startCaption = 'Primeiro slot';
                                }
                                return (
                                  <div
                                    className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground"
                                    data-testid="rounds-clock-row"
                                  >
                                    <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/60 px-2 py-0.5">
                                      <span className="opacity-70">Agora</span>
                                      <b className="tabular-nums text-foreground" data-testid="rounds-now">{nowLabel}</b>
                                    </span>
                                    {startLabel && (
                                      <span
                                        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5"
                                        style={{ borderColor: `${teamColor}55`, color: teamColor, background: `${teamColor}0d` }}
                                        data-testid="rounds-start-label"
                                      >
                                        <span className="opacity-80">{startCaption}</span>
                                        <b className="tabular-nums">{startLabel}</b>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* ============ Barra de progresso do slot atual ============ */}
                              {(() => {
                                if (phaseState.phase === 'running' || phaseState.phase === 'paused') {
                                  const slotSec = phaseState.phase === 'paused'
                                    ? (live && !live.done && 'slotSec' in live ? live.slotSec : (pauseSnap?.slotRemainingSec ?? 0))
                                    : (view && !view.done && 'slotSec' in view ? view.slotSec : 0);
                                  const remaining = phaseState.phase === 'paused'
                                    ? (pauseSnap?.slotRemainingSec ?? 0)
                                    : (view && !view.done ? view.remaining : 0);
                                  if (slotSec <= 0) return null;
                                  const elapsed = Math.max(0, slotSec - remaining);
                                  const pct = Math.min(100, (elapsed / slotSec) * 100);
                                  const barColor = phaseState.phase === 'paused'
                                    ? 'hsl(200 90% 55%)'
                                    : (urgent ? 'hsl(var(--destructive))' : teamColor);
                                  return (
                                    <div className="w-full max-w-xs flex flex-col items-center gap-1">
                                      <div
                                        className="h-1.5 w-full overflow-hidden rounded-full bg-border/60"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(pct)}
                                        data-testid="rounds-slot-progress"
                                        data-phase={phaseState.phase}
                                      >
                                        <div
                                          className={cn('h-full', phaseState.phase === 'paused' ? '' : 'transition-all')}
                                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                                        />
                                      </div>
                                      <div className="flex w-full justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
                                        <span>▲ {fmtHMS(elapsed)}</span>
                                        <span>{Math.round(pct)}%</span>
                                        <span>▼ {fmtHMS(remaining)}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                if (scheduledPending && scheduledFor != null && scheduledArmedAtRef.current != null) {
                                  const totalWait = Math.max(1000, scheduledFor - scheduledArmedAtRef.current);
                                  const consumed = Math.max(0, Math.min(totalWait, nowServer() - scheduledArmedAtRef.current));
                                  const pct = (consumed / totalWait) * 100;
                                  return (
                                    <div className="w-full max-w-xs flex flex-col items-center gap-1">
                                      <div
                                        className="h-1.5 w-full overflow-hidden rounded-full bg-border/60"
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={Math.round(pct)}
                                        data-testid="rounds-slot-progress"
                                        data-phase="before_start"
                                      >
                                        <div
                                          className="h-full transition-all"
                                          style={{ width: `${pct}%`, backgroundColor: 'hsl(45 95% 55%)' }}
                                        />
                                      </div>
                                      <div className="flex w-full justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
                                        <span>▲ {fmtHMS(Math.floor(consumed / 1000))}</span>
                                        <span>{Math.round(pct)}%</span>
                                        <span>▼ {fmtHMS(secToStart ?? 0)}</span>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* Contadores enxutos — sem duplicação */}
                              {schedule && (
                                <div
                                  className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11.5px] tabular-nums"
                                  data-testid="round-card-remaining"
                                >
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/5 px-2 py-0.5 text-amber-200">
                                    <Timer className="h-3 w-3" />
                                    Turno {nightEffectivelyLocked ? '(até 06:00)' : 'total'}:&nbsp;
                                    <b className="text-amber-100">
                                      {view
                                        ? fmtHMS(Math.max(0, schedule.totalSec - view.elapsed))
                                        : fmtHMS(schedule.totalSec)}
                                    </b>
                                  </span>
                                  {(() => {
                                    const nextIdx = view && !view.done ? view.index + 1 : (!view ? 1 : -1);
                                    if (nextIdx < 0 || nextIdx >= schedule.rows.length) return null;
                                    const nextRow = schedule.rows[nextIdx];
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2 py-0.5 text-primary">
                                        Próximo: <b className="uppercase">{nextRow.name}</b>
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}


                            </>
                          );
                        })()}


                        <div className="flex items-center gap-2 pt-1">
                          {scheduledFor != null && !running ? (() => {
                            const remSec = Math.max(0, Math.ceil((scheduledFor - nowServer()) / 1000));
                            const hh = Math.floor(remSec / 3600).toString().padStart(2, '0');
                            const mm = Math.floor((remSec % 3600) / 60).toString().padStart(2, '0');
                            const ss = (remSec % 60).toString().padStart(2, '0');
                            return (
                              <div
                                className="inline-flex items-center gap-2 h-9 rounded-md border px-3"
                                style={{ borderColor: `${teamColor}80`, background: `${teamColor}14` }}
                                role="status"
                                aria-live="polite"
                              >
                                <CalendarClock className="h-3.5 w-3.5" style={{ color: teamColor }} />
                                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">
                                  Agendada {(() => { const d = new Date(scheduledFor); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; })()} · inicia em&nbsp;
                                  <b className="tabular-nums text-slate-100">{hh}:{mm}:{ss}</b>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScheduledFor(null);
                                    toast({ title: 'Agendamento cancelado.' });
                                  }}
                                  className="ml-1 rounded border border-slate-700/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 hover:text-slate-100 hover:border-slate-500"
                                >
                                  Cancelar
                                </button>
                              </div>
                            );
                          })() : !running ? (
                            <div className="relative inline-flex">
                              <style>{`
                                @keyframes rm-ring-pulse {
                                  0%   { box-shadow: 0 0 0 0 ${teamColor}44; }
                                  70%  { box-shadow: 0 0 0 8px ${teamColor}00; }
                                  100% { box-shadow: 0 0 0 0 ${teamColor}00; }
                                }
                                .rm-play-btn { position: relative; animation: rm-ring-pulse 2.8s ease-out infinite; }
                                .rm-play-btn:hover { filter: brightness(1.05); }
                                .rm-play-btn:active { transform: scale(0.97); }
                                @media (prefers-reduced-motion: reduce) {
                                  .rm-play-btn { animation: none !important; }
                                }
                              `}</style>

                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                aria-disabled={issues.length > 0 || !schedule}
                                onClick={() => {
                                  if (issues.length > 0 || !schedule) {
                                    focusValidationPanel();
                                    toast({
                                      title: 'Corrija os itens em vermelho antes de iniciar.',
                                      description: issues[0]?.message,
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  setStartConfirmOpen(true);
                                }}
                                className={cn(
                                  'rm-play-btn h-10 sm:h-9 px-4 sm:px-5 border font-mono font-bold uppercase tracking-[0.16em] text-[12px] sm:text-[11.5px] rounded-sm transition-transform',
                                  (issues.length > 0 || !schedule) && 'opacity-50 cursor-not-allowed grayscale',
                                )}
                                style={{
                                  backgroundColor: teamColor,
                                  borderColor: teamColor,
                                  color: TEAM_COLORS[team]?.onAccent ?? '#0a0a0a',
                                  boxShadow: `0 0 18px -6px ${teamColor}, 0 0 0 1px ${teamColor}66 inset, 0 1px 0 rgba(255,255,255,0.18) inset`,
                                  textShadow: '0 1px 0 rgba(255,255,255,0.15)',
                                }}
                              >
                                <Play className="rm-play-icon h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1.5" /> Iniciar Rondas
                              </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-[12px] leading-snug">
                                    {issues.length > 0 || !schedule ? (
                                      <>
                                        <p className="font-semibold mb-1">Início bloqueado</p>
                                        <p className="text-muted-foreground">
                                          Existem itens pendentes na configuração. Ajuste-os para liberar o início da ronda.
                                        </p>
                                      </>
                                    ) : nightLocked ? (
                                      <>
                                        <p className="font-semibold mb-1">Turno noturno ativo</p>
                                        <p className="text-muted-foreground">
                                          Horários liberados para ajuste manual antes de iniciar a ronda.
                                        </p>
                                      </>
                                    ) : (
                                      <p className="text-muted-foreground">Inicia o cronograma de rondas para toda a equipe.</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>


                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setLockOpen(true)}
                              aria-label="Pausa bloqueada durante a ronda"
                              title="Pausa bloqueada — clique para ver o protocolo"
                              className="h-9 px-4 border border-destructive/45 bg-destructive/10 text-destructive hover:bg-destructive/15"
                            >
                              <Pause className="h-3.5 w-3.5 mr-1.5" /> Bloqueado
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if ((running && live && !live.done) || summaryOpen) { setLockOpen(true); return; }
                              resetTimer();
                            }}
                            className="h-9 w-9 text-muted-foreground hover:text-primary"
                            aria-label="Reiniciar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                          {/* Silent mode toggle — never allows pause; only mutes visuals/sounds */}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSilentMode((v) => {
                                const next = !v;
                                soundRef.current = { ...soundRef.current, muted: next };
                                return next;
                              });
                            }}
                            className={cn('h-9 w-9', silentMode ? 'text-muted-foreground' : 'text-primary')}
                            aria-label={silentMode ? 'Ativar animações e sons' : 'Modo silêncio'}
                            title={silentMode ? 'Modo silêncio ATIVO — sem sons/animações' : 'Modo silêncio — desativa sons e animações'}
                          >
                            {silentMode ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>

                      <MissionLockDialog
                        open={lockOpen}
                        onClose={() => setLockOpen(false)}
                        color={teamColor}
                        agentName={live && !live.done ? schedule.rows[live.index]?.name : undefined}
                        remainingLabel={live && !live.done ? fmtHMS(live.remaining) : undefined}
                        silent={silentMode}
                      />

                      <StartLockConfirmDialog
                        open={startConfirmOpen}
                        onCancel={() => setStartConfirmOpen(false)}
        onConfirm={() => {
          setStartConfirmOpen(false);
          // Se o operador programou um horário futuro para o início do
          // primeiro turno, NÃO começamos a contagem agora. Agendamos e
          // deixamos o efeito de auto-start disparar exatamente no horário.
          const mins = toMinutes(startTime);
          if (mins != null) {
            const nowMs = nowServer();
            const target = new Date(nowMs);
            target.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
            const targetMs = target.getTime();
            // Tolerância de 30s: cliques feitos "em cima da hora" iniciam já.
            if (targetMs - nowMs > 30_000) {
              setScheduledFor(targetMs);
              toast({
                title: 'Ronda programada',
                description: `Início automático às ${startTime}. A contagem só começa nesse horário.`,
              });
              return;
            }
          }
          startTimer();
        }}
                        color={teamColor}
                        teamName={team}
                        agentCount={schedule.rows.length}
                        totalDurationLabel={fmtDuration(schedule.rows.reduce((sum, r) => sum + r.duration, 0))}
                        silent={silentMode}
                      />

                      <RoundHistoryDialog
                        open={historyDialogOpen}
                        onOpenChange={(v) => { setHistoryDialogOpen(v); if (!v) setHistoryTeamFilter(null); }}
                        entries={teamLog}
                        loading={teamLogLoading}
                        initialTeamFilter={historyTeamFilter}
                        onClear={() => { setHistoryDialogOpen(false); setClearConfirmOpen(true); }}
                      />


                      <TeamConfirmDialog
                        open={teamConfirmOpen}
                        team={(pendingTeam ?? team) as TeamKey}
                        color={pendingTeam ? getRotatedTeamColor(pendingTeam, colorRotation) : teamColor}
                        teamLabel={pendingTeam ? (TEAM_PRESETS.find((p) => p.key === pendingTeam)?.label ?? pendingTeam) : team}
                        agentCount={agents.filter((a) => a.trim()).length}
                        onCancel={() => { setTeamConfirmOpen(false); setPendingTeam(null); }}
                        onConfirm={() => {
                          if (pendingTeam) setTeam(pendingTeam);
                          setTeamConfirmed(true);
                          setTeamConfirmOpen(false);
                          setPendingTeam(null);
                        }}
                      />

                      <RoundSummaryDialog
                        open={summaryOpen}
                        saved={summarySaved}
                        syncedOnline={summarySyncedOnline}
                        onSave={async (savedName) => {
                          // Cache local (sempre grava — funciona offline / sem unidade)
                          const entry: TeamLogEntry = {
                            team, dateISO: getServerDate().toISOString(), savedName,
                          };
                          const next = [entry, ...readTeamLogLocal()].slice(0, 15);
                          writeTeamLogLocal(next);
                          setTeamLog(next);

                          // Tenta sincronizar com a nuvem, mas NÃO bloqueia o
                          // encerramento do relatório se falhar. Em caso de
                          // falha, enfileira para retentativa automática ao
                          // voltar online / ganhar foco / a cada 60s.
                          let cloudErr: string | null = null;
                          try {
                            await saveTeamRoundToCloud({
                              team,
                              savedName,
                              totalSeconds: summaryData?.totalSec ?? 0,
                              agentsCount: schedule.rows.length,
                            });
                          } catch (e) {
                            cloudErr = (e as Error)?.message || 'falha desconhecida';
                            console.warn('[rounds] saveTeamRoundToCloud falhou — enfileirado p/ retry:', cloudErr);
                            enqueuePending({
                              team,
                              savedName,
                              totalSeconds: summaryData?.totalSec ?? 0,
                              agentsCount: schedule.rows.length,
                            });
                          }
                          setSummarySyncedOnline(!cloudErr);
                          setSummarySaved(true);
                          toast(
                            cloudErr
                              ? { title: 'Salvo localmente (offline)', description: 'Sincronização automática quando a conexão voltar. Você já pode fechar.' }
                              : { title: 'Registro salvo', description: `Equipe ${team} registrada e sincronizada.` }
                          );
                        }}
                        onClose={() => {
                          setSummaryOpen(false);
                          setSummaryData(null);
                          setSummarySaved(false);
                          setSummarySyncedOnline(true);
                          // Reseta timer e fecha o divisor de rondas, deixando o
                          // painel pronto para uma nova equipe.
                          try { resetTimer(); } catch { /* ignore */ }
                          setOpen(false);
                          window.setTimeout(() => {
                            try { window.location.reload(); } catch { /* ignore */ }
                          }, 250);
                        }}
                        color={teamColor}
                        team={team}
                        totalSeconds={summaryData?.totalSec ?? 0}
                        agentsCount={schedule.rows.length}
                        completedCount={summaryData?.completed ?? schedule.rows.length}
                        silent={silentMode}
                      />



                      {/* Rows — grid responsivo, se adapta a qualquer quantidade de agentes */}
                      <ul
                        className={cn(
                          'tactical-scrollbar grid gap-1 gap-x-2 max-h-[13rem] sm:max-h-[18rem] overflow-y-auto pr-1',
                          agents.length <= 6
                            ? 'grid-cols-1 sm:grid-cols-2'
                            : agents.length <= 16
                              ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                              : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4',
                        )}
                      >

                        {schedule.rows.map((r, i) => {
                          const view = live ?? preview;
                          const isCurrent = !!view && !view.done && i === view.index;
                          const isDone = !!view && (view.done ? i <= view.index : i < view.index);
                          const remainingForRow = isCurrent && view && !view.done ? view.remaining : Math.max(0, r.duration * 60);
                          return (
                            <li key={i}
                                className={cn(
                                   'relative grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-2 rounded-sm border bg-card/70 pl-2.5 pr-1.5 py-1 min-w-0 overflow-hidden',
                                  isCurrent && 'bg-[color:var(--rm-tint,transparent)]',
                                  isDone && 'opacity-70',
                                )}
                                style={{
                                  borderColor: isCurrent ? teamColor : isDone ? 'hsl(var(--success) / 0.32)' : `${teamColor}22`,
                                  borderLeftWidth: 3,
                                  borderLeftColor: isDone ? 'hsl(var(--success) / 0.6)' : teamColor,
                                  boxShadow: isCurrent ? `0 0 14px -6px ${teamColor}, inset 0 0 0 1px ${teamColor}33` : undefined,
                                  ['--rm-tint' as string]: `${teamColor}14`,
                                }}>
                              {/* tactical corner brackets — always visible in team color */}
                              <span aria-hidden className="pointer-events-none absolute top-0 left-0 h-1.5 w-1.5 border-t border-l" style={{ borderColor: isDone ? 'hsl(var(--success)/0.5)' : `${teamColor}80` }} />
                              <span aria-hidden className="pointer-events-none absolute top-0 right-0 h-1.5 w-1.5 border-t border-r" style={{ borderColor: isDone ? 'hsl(var(--success)/0.5)' : `${teamColor}80` }} />
                              <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l" style={{ borderColor: isDone ? 'hsl(var(--success)/0.5)' : `${teamColor}80` }} />
                              <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r" style={{ borderColor: isDone ? 'hsl(var(--success)/0.5)' : `${teamColor}80` }} />
                              {/* LED indicator */}
                              <span className="flex items-center gap-1.5 font-mono text-[10.5px] tabular-nums" style={{ color: isCurrent ? teamColor : isDone ? 'hsl(var(--success))' : `${teamColor}b3` }}>
                                <span
                                  aria-hidden
                                  className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', isCurrent && 'animate-pulse')}
                                  style={{
                                    background: isDone ? 'hsl(var(--success))' : teamColor,
                                    boxShadow: isCurrent ? `0 0 8px ${teamColor}` : 'none',
                                  }}
                                />
                                {pad(i + 1)}
                              </span>

                              <span className="min-w-0">
                                <span className={cn(
                                  'font-sans font-semibold text-[13px] leading-tight truncate min-w-0 flex items-center gap-1.5',
                                  isDone && 'line-through text-muted-foreground decoration-success/70',
                                )}>
                                  {r.name}
                                  {isDone && <CheckCircle2 className="h-3 w-3 text-success no-underline shrink-0" />}
                                </span>
                                <span className="mt-0.5 block truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {isCurrent
                                    ? `Em ronda · faltam ${fmtHMS(remainingForRow)}`
                                    : isDone
                                      ? 'Cumprida · encerrado'
                                      : `Em espera · ${fmtDuration(r.duration)}`}
                                </span>
                              </span>
                              <span className="flex flex-col items-end gap-0.5">
                                <AgentStatusSVG status={isCurrent ? 'active' : isDone ? 'done' : 'waiting'} color={teamColor} compact />
                                <span className="font-mono text-[11.5px] tabular-nums flex items-center gap-x-1 text-muted-foreground whitespace-nowrap">
                                  <span className="text-foreground">{r.from}</span>
                                  <span style={{ color: teamColor }}>→</span>
                                  <span className="text-foreground">{r.to}</span>
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="mt-1.5 flex flex-wrap gap-1.5 justify-center sm:justify-end pt-1.5 border-t border-border/40">
                        <Button type="button" size="icon" variant="ghost" onClick={copyToClipboard} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label="Copiar cronograma">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={exportPDF} className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" aria-label="Exportar PDF">
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                  )}
                </Section>

                <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-1.5">
                  <button
                    type="button"
                    onClick={() => { setHistoryTeamFilter(null); setHistoryDialogOpen(true); }}
                    className="font-sans text-[11.5px] uppercase tracking-wide text-primary hover:underline"
                  >
                    Histórico ({history.length})
                  </button>
                  {history.length > 0 && (
                    <button type="button" onClick={() => setHistoryClearConfirmOpen(true)} className="font-sans text-[11.5px] uppercase tracking-wide text-muted-foreground hover:text-destructive">
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </DialogContent>

      </Dialog>

      {/* Troca de posto — destaque SVG profissional, sem confirmação (auto-dismiss) */}
      <HandoffHighlight
        open={alarm.open}
        onClose={() => setAlarm((a) => ({ ...a, open: false }))}
        team={team}
        teamColor={teamColor}
        postNumber={alarm.index + 1}
        agentName={alarm.name}
      />


      {/* Confirmação de saída — hardened quando a ronda está em execução */}
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        variant={running && live && !live.done ? 'warning' : 'exit'}
        kicker={running && live && !live.done ? 'Operação em andamento' : 'Confirmação'}
        title={running && live && !live.done ? 'Abortar ronda em execução?' : 'Encerrar sessão de rondas?'}
        description={
          running && live && !live.done ? (
            <div className="space-y-1.5">
              <p className="text-slate-300 text-[11.5px] leading-snug">
                Encerrar agora <b className="text-slate-100">compromete a cobertura da equipe {team}</b>.
              </p>
              <div className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] text-destructive/95 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" aria-hidden>
                  <path d="M12 3 L22 20 H2 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M12 10 V14 M12 17 V17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span>Abortagem será registrada no histórico</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-snug">
                Ativo: <b className="text-slate-200">{schedule?.rows[live.index]?.name ?? '—'}</b> · restam <b className="text-slate-200 tabular-nums">{fmtHMS(live.remaining)}</b>
              </p>
            </div>
          ) : (
            'Os dados desta escala permanecerão salvos no histórico local.'
          )
        }

        accent={running && live && !live.done ? '#ef4444' : teamColor}
        primaryLabel={running && live && !live.done ? 'Manter no posto' : 'Continuar'}
        onPrimary={() => setConfirmExit(false)}
        secondaryLabel={running && live && !live.done ? 'Abortar mesmo assim' : 'Sim, sair'}
        onSecondary={confirmAndClose}
      />

      {/* Removido: dialog "Encerrar a operação agora?" — era um pedido de
          confirmação desnecessário. O sistema agora apenas emite um toast
          informativo (⏳ Operação encerra em 5 minutos) e segue seu curso. */}






      <ReminderSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Confirmação de limpeza do histórico de rondas realizadas */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="max-w-sm border-2 border-destructive/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Limpar histórico de rondas?
            </DialogTitle>
            <DialogDescription>
              Esta ação removerá o <b>nome da última equipe</b> e todas as
              <b> rondas registradas</b> desta unidade — em todos os dispositivos.
              Não é possível desfazer.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive/95">
            {teamLog.length} registro{teamLog.length === 1 ? '' : 's'} serão apagados.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await clearTeamLog();
                setClearConfirmOpen(false);
                toast({ title: 'Histórico apagado', description: 'Registros removidos da unidade.' });
              }}
            >
              Sim, apagar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Confirmação para limpar HISTÓRICO LOCAL de sessões — SVG profissional */}
      <Dialog open={historyClearConfirmOpen} onOpenChange={setHistoryClearConfirmOpen}>
        <DialogContent className="max-w-sm border-2 border-destructive/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
              Apagar histórico de sessões?
            </DialogTitle>
            <DialogDescription>
              Isso remove <b>todas as {history.length} sessão{history.length === 1 ? '' : 'ões'} registrada{history.length === 1 ? '' : 's'}</b> localmente neste dispositivo. Os registros da unidade na nuvem não são afetados.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive/95 flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Ação irreversível. Deseja realmente continuar?</span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setHistoryClearConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearHistory();
                setHistoryClearConfirmOpen(false);
                toast({ title: 'Histórico apagado', description: 'Sessões locais removidas deste dispositivo.' });
              }}
            >
              Sim, apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
