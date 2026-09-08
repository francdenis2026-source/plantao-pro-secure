import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { TEAM_COLORS, type TeamKey } from '@/lib/teamColors';

interface TeamConfirmDialogProps {
  open: boolean;
  color: string;
  team?: TeamKey;
  teamLabel: string;
  agentCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmação profissional (SVG puro) para travar a equipe da ronda.
 * O hero muda conforme a equipe selecionada (ALFA/BRAVO/CHARLIE/DELTA)
 * e todas as cores derivam do accent institucional da equipe.
 */
export function TeamConfirmDialog({
  open,
  color,
  team,
  teamLabel,
  agentCount,
  onCancel,
  onConfirm,
}: TeamConfirmDialogProps) {
  const key = (team ?? (teamLabel?.toUpperCase() as TeamKey)) as TeamKey;
  const onAccent = TEAM_COLORS[key]?.onAccent ?? '#0b0f17';

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent
        className="w-[min(92vw,340px)] max-w-[340px] p-0 overflow-hidden border rounded-lg gap-0"
        style={
          {
            borderColor: `${color}55`,
            background:
              `radial-gradient(120% 80% at 50% -20%, ${color}18, transparent 55%),` +
              'linear-gradient(180deg, #0b1220 0%, #050912 100%)',
            boxShadow: `0 20px 50px -25px ${color}, 0 0 0 1px ${color}22`,
            ['--tcd-accent' as string]: color,
            ['--tcd-ink' as string]: onAccent,
          } as React.CSSProperties
        }
      >
        {/* HEADER compacto */}
        <div
          className="relative flex items-center gap-2.5 px-3.5 py-2.5 border-b"
          style={{
            borderColor: `${color}22`,
            background: `linear-gradient(180deg, ${color}12, transparent)`,
          }}
        >
          <div
            className="grid place-items-center h-9 w-9 rounded-md shrink-0"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}55`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px -6px ${color}`,
            }}
          >
            <MiniCrest teamKey={key} color={color} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[8.5px] uppercase tracking-[0.28em] text-slate-500 leading-none">
              Protocolo · {teamCodename(key)}
            </div>
            <div className="mt-0.5 text-[13px] font-semibold tracking-tight text-slate-100 leading-tight truncate">
              Confirmar equipe <span style={{ color }}>{teamLabel}</span>
            </div>
          </div>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse shrink-0" style={{ background: color }} aria-hidden />
        </div>

        {/* CORPO */}
        <div className="px-3.5 pt-3 pb-3.5">
          <p className="text-[11.5px] leading-snug text-slate-400">
            Após confirmar, a equipe fica{' '}
            <b className="text-slate-200">travada</b> até o encerramento da ronda
            ou remoção da programação.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Fact icon="team" label="Equipe" value={teamLabel} color={color} />
            <Fact icon="agents" label="Agentes" value={String(agentCount)} color={color} />
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 rounded-md border border-slate-700/70 bg-slate-900/60 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 hover:text-slate-50 hover:border-slate-500 hover:bg-slate-900 active:translate-y-[1px] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ outlineColor: color }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-9 rounded-md font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-all hover:brightness-110 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: `linear-gradient(180deg, ${color}, ${color}d0)`,
                color: onAccent,
                boxShadow: `0 6px 16px -6px ${color}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                outlineColor: color,
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 10.5 L8 14.5 L16 6" />
                </svg>
                Confirmar
              </span>
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* Mini crest compacto para o header */
function MiniCrest({ teamKey, color }: { teamKey: TeamKey; color: string }) {
  const inner = (() => {
    switch (teamKey) {
      case 'ALFA':
        return <path d="M8 12 L11 15 L16 9" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
      case 'BRAVO':
        return (
          <g stroke={color} strokeWidth="1.8" strokeLinecap="round">
            <line x1="8" y1="8" x2="16" y2="16" />
            <line x1="16" y1="8" x2="8" y2="16" />
          </g>
        );
      case 'CHARLIE':
        return (
          <g fill="none" stroke={color} strokeWidth="1.4">
            <circle cx="12" cy="12" r="4.5" />
            <circle cx="12" cy="12" r="1.6" fill={color} />
          </g>
        );
      case 'DELTA':
        return <path d="M13 6 L8 13 H11 L10 18 L15 11 H12 L13 6 Z" fill={color} />;
      default:
        return null;
    }
  })();
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M12 2 L20 5 V12 C20 17 16.5 20.5 12 22 C7.5 20.5 4 17 4 12 V5 Z" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.2" />
      {inner}
    </svg>
  );
}


function teamCodename(k: TeamKey): string {
  switch (k) {
    case 'ALFA': return 'Escudo · α';
    case 'BRAVO': return 'Espada · β';
    case 'CHARLIE': return 'Alvo · γ';
    case 'DELTA': return 'Raio · δ';
    default: return '—';
  }
}




function Fact({ label, value, color, icon }: { label: string; value: string; color: string; icon?: 'team' | 'agents' }) {
  return (
    <div
      className="rounded-md border bg-slate-900/60 py-1.5 px-2 flex items-center gap-1.5"
      style={{ borderColor: `${color}30` }}
    >
      <span
        className="grid place-items-center h-6 w-6 rounded shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}44`, color }}
        aria-hidden
      >
        {icon === 'team' ? (
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4 L10 2 L16 4 V10 C16 14 13 16.5 10 18 C7 16.5 4 14 4 10 Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7.5" r="2.5" />
            <path d="M2.5 16.5 C3.5 13.5 5.5 12 7 12 C8.5 12 10.5 13.5 11.5 16.5" />
            <circle cx="14" cy="8" r="2" />
            <path d="M12 16.5 C12.5 14.5 14 13 15 13 C16 13 17.2 14 17.7 15.5" />
          </svg>
        )}
      </span>
      <div className="min-w-0 text-left">
        <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-slate-500 leading-none">{label}</div>
        <div className="text-[12px] font-bold text-slate-100 truncate leading-tight mt-0.5" title={value}>{value}</div>
      </div>
    </div>
  );
}


export default TeamConfirmDialog;
