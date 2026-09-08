/**
 * Centralized team color tokens.
 * Single source of truth for team accents across cards, dialogs, buttons and chips.
 * Any component that renders team branding must import from here.
 */

export type TeamKey = 'ALFA' | 'BRAVO' | 'CHARLIE' | 'DELTA';

export interface TeamColorToken {
  /** Hex accent (used for inline styles / SVG fills) */
  hex: string;
  /** Same color expressed as HSL triple ("H S% L%") — feeds --primary and Tailwind CSS variables. */
  hsl: string;
  /** Foreground color that guarantees ≥ 4.5:1 contrast when placed on top of the accent. */
  onAccent: string;
  /** Human label */
  label: string;
}

export const TEAM_COLORS: Record<TeamKey, TeamColorToken> = {
  ALFA:    { hex: '#34d399', hsl: '158 64% 52%', onAccent: '#03110b', label: 'ALFA' },
  BRAVO:   { hex: '#fb923c', hsl: '25 95% 61%',  onAccent: '#1a0a02', label: 'BRAVO' },
  CHARLIE: { hex: '#60a5fa', hsl: '213 94% 68%', onAccent: '#04122b', label: 'CHARLIE' },
  DELTA:   { hex: '#fcd34d', hsl: '45 97% 65%',  onAccent: '#1a1204', label: 'DELTA' },
};

export const TEAM_KEYS: readonly TeamKey[] = ['ALFA', 'BRAVO', 'CHARLIE', 'DELTA'] as const;

export function getTeamColor(team: TeamKey): string {
  return TEAM_COLORS[team].hex;
}

export function getTeamOnAccent(team: TeamKey): string {
  return TEAM_COLORS[team].onAccent;
}

export function getTeamHsl(team: TeamKey): string {
  return TEAM_COLORS[team].hsl;
}

/* ==============================================================
 * Color rotation (legacy) — kept for backwards compatibility.
 * Historically the panel offered a "swap colors" novelty that
 * rotated the accent hue among the four teams. Persisted in
 * localStorage under `plantaopro_team_color_rotation`.
 * ============================================================== */

const ROTATION_KEY = 'plantaopro_team_color_rotation';

export function getRotatedTeamColor(team: TeamKey | string, rotation: number = 0): string {
  const idx = TEAM_KEYS.indexOf(team as TeamKey);
  if (idx < 0) return (TEAM_COLORS as Record<string, TeamColorToken>)[team]?.hex ?? '#94a3b8';
  const r = ((rotation % TEAM_KEYS.length) + TEAM_KEYS.length) % TEAM_KEYS.length;
  const nextTeam = TEAM_KEYS[(idx + r) % TEAM_KEYS.length];
  return TEAM_COLORS[nextTeam].hex;
}

export function bumpColorRotation(): number {
  try {
    const current = Number(localStorage.getItem(ROTATION_KEY) ?? '0') || 0;
    const next = (current + 1) % TEAM_KEYS.length;
    localStorage.setItem(ROTATION_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}
