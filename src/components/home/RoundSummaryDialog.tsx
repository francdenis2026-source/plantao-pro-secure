import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Clock, Users, CheckCircle2, ArrowRight, Sparkles, AlertTriangle, ShieldCheck, WifiOff } from 'lucide-react';

const AUTO_CLOSE_SECONDS = 10;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (savedName: string) => Promise<void> | void;
  color: string;
  team: string;
  totalSeconds: number;
  agentsCount: number;
  completedCount: number;
  nextAction?: string;
  silent?: boolean;
  /** When true, the parent already persisted the record and we may auto-close. */
  saved?: boolean;
  /** When false, salvo apenas no cache local — retentativa automática quando online. */
  syncedOnline?: boolean;
}

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Post-round celebration summary. Requires an explicit "team name / responsible"
 * to be saved before allowing the divider to close. Blocks auto-close and any
 * dialog dismiss attempt until the record is persisted upstream.
 */
export function RoundSummaryDialog({
  open, onClose, onSave, color, team,
  totalSeconds, agentsCount, completedCount,
  nextAction = 'Registrar ocorrências e preparar próxima ronda',
  silent = false,
  saved = false,
  syncedOnline = true,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS);
  const [savedName, setSavedName] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pct = agentsCount > 0 ? Math.round((completedCount / agentsCount) * 100) : 0;

  useEffect(() => {
    if (!open) {
      setProgress(0); setSavedName(''); setWarning(null); setSubmitting(false);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setProgress(Math.round(pct * p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [open, pct]);

  // Auto-close countdown — ONLY runs after the record has been persisted (saved).
  // Until then, dialog is locked open.
  useEffect(() => {
    if (!open || !saved) { setCountdown(AUTO_CLOSE_SECONDS); return; }
    setCountdown(AUTO_CLOSE_SECONDS);
    const tick = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { window.clearInterval(tick); onClose(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [open, saved, onClose]);

  const handleSave = async () => {
    const name = savedName.trim();
    if (name.length === 0) {
      setWarning('Digite o nome da equipe antes de salvar.');
      return;
    }
    if (name.length < 2) {
      setWarning('Nome muito curto — informe pelo menos 2 caracteres.');
      return;
    }
    setWarning(null);
    setSubmitting(true);
    try {
      await onSave(name);
    } catch (e) {
      setWarning((e as Error)?.message || 'Não foi possível salvar o registro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const attemptDismiss = () => {
    if (saved) { onClose(); return; }
    setWarning('É necessário salvar o nome da equipe da última ronda antes de encerrar.');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) attemptDismiss(); }}>
      <DialogContent
        className="max-w-md w-[calc(100vw-2rem)] sm:w-full p-0 overflow-hidden border-2 min-h-[620px] flex flex-col"
        style={{ borderColor: `${color}70` }}
        onEscapeKeyDown={(e) => { if (!saved) { e.preventDefault(); attemptDismiss(); } }}
        onPointerDownOutside={(e) => { if (!saved) { e.preventDefault(); attemptDismiss(); } }}
        onInteractOutside={(e) => { if (!saved) { e.preventDefault(); attemptDismiss(); } }}
      >
        {/* Top glow header */}
        <div className="relative h-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}30, transparent 60%), radial-gradient(circle at 30% 20%, ${color}55, transparent 60%)` }}>
          {!silent && (
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${color}22 0 2px, transparent 2px 6px)`,
                animation: 'summaryStripe 6s linear infinite',
              }}
            />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative">
              <div className={!silent ? 'absolute inset-0 rounded-full blur-2xl opacity-60' : ''} style={{ backgroundColor: color }} />
              <div className="relative w-14 h-14 rounded-full flex items-center justify-center border-2" style={{ borderColor: color, background: `${color}22` }}>
                <Trophy className="h-7 w-7" style={{ color }} />
              </div>
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color }}>
              EQUIPE {team} · Ronda concluída
            </div>
          </div>
        </div>

        <div className="p-6 pt-2">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black uppercase tracking-tight flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color }} />
              Missão Cumprida
              <Sparkles className="h-4 w-4" style={{ color }} />
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Registro consolidado da última ronda executada.
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <span>Progresso alcançado</span>
              <span className="font-bold" style={{ color }}>{progress}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full overflow-hidden bg-muted/50">
              <div
                className="h-full transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, boxShadow: `0 0 12px ${color}` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatCard icon={Clock}       label="Tempo Total"   value={fmt(totalSeconds)} color={color} />
            <StatCard icon={Users}       label="Agentes"       value={`${completedCount}/${agentsCount}`} color={color} />
            <StatCard icon={CheckCircle2} label="Status"        value="OK" color={color} />
          </div>

          {/* Required save field */}
          <div className="mt-4 rounded-lg border p-3 space-y-2" style={{ borderColor: `${color}40`, background: `${color}0A` }}>
            <Label htmlFor="last-team-name" className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" style={{ color }} />
              Nome da equipe da última ronda *
            </Label>
            <Input
              id="last-team-name"
              value={savedName}
              onChange={(e) => { setSavedName(e.target.value); if (warning) setWarning(null); }}
              placeholder={`Ex.: ${team} · Responsável / observação`}
              autoComplete="off"
              disabled={saved || submitting}
              className="bg-background/60 font-sans text-sm"
              maxLength={80}
            />
            {warning && (
              <div className="flex items-start gap-1.5 rounded border border-destructive/40 bg-destructive/10 p-1.5 text-[11px] text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            )}
            {saved && syncedOnline && (
              <div className="flex items-start gap-1.5 rounded border border-success/40 bg-success/10 p-1.5 text-[11px] text-success">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Registro salvo e sincronizado com a unidade.</span>
              </div>
            )}
            {saved && !syncedOnline && (
              <div className="flex items-start gap-1.5 rounded border border-amber-500/50 bg-amber-500/10 p-1.5 text-[11px] text-amber-300">
                <WifiOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <b>Salvo apenas neste dispositivo (offline).</b> A sincronização com a unidade acontece automaticamente quando a conexão voltar — você já pode fechar.
                </span>
              </div>
            )}
          </div>

          {/* Next action */}
          <div className="mt-3 rounded-lg border p-3" style={{ borderColor: `${color}40`, background: `${color}0A` }}>
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3" style={{ color }} /> Próxima ação
            </div>
            <div className="mt-1 text-sm font-semibold" style={{ color }}>{nextAction}</div>
          </div>

          <DialogFooter className="mt-5 sm:justify-center flex-col sm:flex-row gap-2 items-center">
            {saved ? (
              <>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground text-center">
                  Encerramento automático em{' '}
                  <span className="font-bold tabular-nums" style={{ color }}>
                    {String(countdown).padStart(2, '0')}s
                  </span>
                </div>
                <Button
                  onClick={onClose}
                  className="min-w-40 font-bold uppercase tracking-wide"
                  style={{ backgroundColor: color, color: '#0b0f14' }}
                >
                  Liberar agora
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSave}
                disabled={submitting}
                className="min-w-52 font-bold uppercase tracking-wide"
                style={{ backgroundColor: color, color: '#0b0f14' }}
              >
                {submitting ? 'Salvando...' : 'Salvar e encerrar'}
              </Button>
            )}
          </DialogFooter>
        </div>


        <style>{`@keyframes summaryStripe { from { background-position: 0 0 } to { background-position: 120px 0 } }`}</style>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Clock; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-2.5 text-center">
      <Icon className="h-4 w-4 mx-auto mb-1" style={{ color }} />
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground truncate">{label}</div>
      <div className="font-mono text-sm font-bold tabular-nums truncate" style={{ color }}>{value}</div>
    </div>
  );
}

export default RoundSummaryDialog;
