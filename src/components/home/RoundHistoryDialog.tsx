import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NIGHT_TZ } from '@/lib/nightShift';
import { getRotatedTeamColor } from '@/lib/teamColors';

export type TeamRoundLogEntry = {
  team: string;
  dateISO: string;
  savedName?: string;
  totalSeconds?: number;
  agentsCount?: number;
};

interface RoundHistoryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entries: TeamRoundLogEntry[];
  onClear: () => void;
  loading?: boolean;
  initialTeamFilter?: string | null;
}

type PeriodKey = 'all' | 'today' | '7d' | '30d';

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: 'all', label: 'Tudo' },
];

function fmtDurationCompact(totalSec: number): string {
  if (!totalSec || totalSec <= 0) return '—';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function inPeriod(dateISO: string, period: PeriodKey): boolean {
  if (period === 'all') return true;
  const d = new Date(dateISO).getTime();
  const now = Date.now();
  if (period === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return d >= start.getTime();
  }
  const days = period === '7d' ? 7 : 30;
  return now - d <= days * 86400_000;
}

export function RoundHistoryDialog({
  open,
  onOpenChange,
  entries,
  onClear,
  loading = false,
  initialTeamFilter = null,
}: RoundHistoryDialogProps) {
  const [teamFilter, setTeamFilter] = useState<string | null>(initialTeamFilter);
  const [period, setPeriod] = useState<PeriodKey>('all');

  useEffect(() => {
    if (open) {
      setTeamFilter(initialTeamFilter);
      setPeriod('all');
    }
  }, [open, initialTeamFilter]);

  const availableTeams = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => s.add(e.team));
    return Array.from(s);
  }, [entries]);

  const filtered = useMemo(() => {
    // Dedupe: mantém apenas o registro mais recente por equipe para
    // simplificar a leitura (data + nº de agentes), evitando várias entradas
    // por membro. `entries` já vem ordenado por data desc.
    const inScope = entries.filter(
      (e) => (!teamFilter || e.team === teamFilter) && inPeriod(e.dateISO, period),
    );
    const seen = new Set<string>();
    const deduped: TeamRoundLogEntry[] = [];
    for (const e of inScope) {
      if (seen.has(e.team)) continue;
      seen.add(e.team);
      deduped.push(e);
    }
    return deduped;
  }, [entries, teamFilter, period]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rm-history w-[calc(100vw-1.5rem)] max-w-md sm:max-w-lg bg-slate-950 border border-slate-800 p-0 overflow-hidden rounded-lg">
        {/* Header compacto — sem hero exagerado */}
        <DialogHeader className="px-3 pt-3 pb-2 border-b border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-sans text-[12.5px] font-bold uppercase tracking-wide">
              Histórico de rondas
            </span>
            <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">
              {loading ? '···' : `${filtered.length}/${entries.length}`}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Filtros: período + equipes — chips compactos */}
        {!loading && entries.length > 0 && (
          <div className="border-b border-slate-800/60 bg-slate-900/30 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 mr-0.5">
                Período
              </span>
              {PERIOD_OPTIONS.map((p) => {
                const active = period === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriod(p.key)}
                    className={
                      'rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors border ' +
                      (active
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-slate-700/70 text-slate-400 hover:text-slate-200')
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {availableTeams.length > 1 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 mr-0.5">
                  Equipe
                </span>
                <button
                  type="button"
                  onClick={() => setTeamFilter(null)}
                  className={
                    'rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors border ' +
                    (teamFilter === null
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-slate-700/70 text-slate-400 hover:text-slate-200')
                  }
                >
                  Todas
                </button>
                {availableTeams.map((t) => {
                  const active = teamFilter === t;
                  const color = getRotatedTeamColor(t, 0);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTeamFilter(active ? null : t)}
                      className={
                        'rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ' +
                        (active ? 'text-slate-100' : 'border-slate-700/70 text-slate-400 hover:text-slate-200')
                      }
                      style={active ? { borderColor: color, background: `${color}20`, color } : undefined}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Corpo */}
        <div className="px-3 py-2.5">
          {loading ? (
            <ul className="grid gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded border border-slate-800/70 bg-slate-900/40 px-2.5 py-2 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="h-2 w-2 rounded-full bg-slate-800 shrink-0" />
                  <span className="h-3 w-14 bg-slate-800 rounded" />
                  <span className="h-3 flex-1 bg-slate-800/60 rounded" />
                  <span className="h-3 w-10 bg-slate-800 rounded" />
                </li>
              ))}
            </ul>
          ) : filtered.length === 0 ? (
            <EmptyState
              hasEntries={entries.length > 0}
              teamFilter={teamFilter}
              period={period}
              onReset={() => { setTeamFilter(null); setPeriod('all'); }}
            />
          ) : (
            <ul className="tactical-scrollbar grid gap-1.5 max-h-[55vh] overflow-y-auto pr-0.5">
              {filtered.map((e, i) => {
                const color = getRotatedTeamColor(e.team, 0);
                const dt = new Date(e.dateISO);
                const date = new Intl.DateTimeFormat('pt-BR', {
                  timeZone: NIGHT_TZ, day: '2-digit', month: '2-digit',
                }).format(dt);
                const time = new Intl.DateTimeFormat('pt-BR', {
                  timeZone: NIGHT_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
                }).format(dt);
                const named = e.savedName && e.savedName.trim().length > 0;
                return (
                  <li
                    key={i}
                    className="rounded border border-slate-800/80 bg-slate-900/50 px-2.5 py-1.5"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    {/* Linha 1: equipe + data/hora */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="font-sans font-bold text-[11.5px] uppercase tracking-wide text-slate-100 shrink-0">
                        {e.team}
                      </span>
                      <span className="font-mono text-[9.5px] tabular-nums text-slate-500 shrink-0">
                        #{String(filtered.length - i).padStart(2, '0')}
                      </span>
                      <span className="ml-auto flex items-baseline gap-1.5 shrink-0">
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-100">{time}</span>
                        <span className="font-mono text-[9.5px] tabular-nums text-slate-500">{date}</span>
                      </span>
                    </div>
                    {/* Linha 2: nome + metadados */}
                    <div className="mt-0.5 flex items-center gap-2 min-w-0">
                      <span
                        className={
                          'min-w-0 flex-1 truncate font-sans text-[11.5px] ' +
                          (named ? 'text-slate-200' : 'text-slate-600 italic')
                        }
                        title={named ? e.savedName : 'Sem nome registrado'}
                      >
                        {named ? e.savedName : 'sem nome'}
                      </span>
                      {(e.totalSeconds || e.agentsCount) && (
                        <span className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-slate-500 shrink-0">
                          {e.totalSeconds ? <span>⏱ {fmtDurationCompact(e.totalSeconds)}</span> : null}
                          {e.agentsCount ? <span>{e.agentsCount}👥</span> : null}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-3 py-2 bg-slate-900/40">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500 truncate">
            {loading ? 'Sincronizando…' : 'Sync · até 15 entradas'}
          </span>
          <button
            type="button"
            disabled={entries.length === 0 || loading}
            onClick={onClear}
            className="rounded border border-slate-700/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300 hover:text-destructive hover:border-destructive/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Limpar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  hasEntries,
  teamFilter,
  period,
  onReset,
}: {
  hasEntries: boolean;
  teamFilter: string | null;
  period: PeriodKey;
  onReset: () => void;
}) {
  const filtered = hasEntries && (teamFilter !== null || period !== 'all');
  return (
    <div className="rounded border border-dashed border-slate-800 bg-slate-900/30 px-4 py-6 text-center">
      <div className="mx-auto mb-2 h-9 w-9 rounded-full border border-slate-700/70 flex items-center justify-center text-slate-500">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
      </div>
      <div className="font-sans text-[12px] font-semibold text-slate-200">
        {filtered
          ? teamFilter
            ? `Sem rondas de ${teamFilter} neste período`
            : 'Sem rondas neste período'
          : 'Nenhuma ronda registrada'}
      </div>
      <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-slate-500">
        {filtered ? 'Ajuste os filtros para ver mais' : 'O histórico aparece ao iniciar rondas'}
      </div>
      {filtered && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 rounded border border-primary/50 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary hover:bg-primary/20 transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

export default RoundHistoryDialog;
