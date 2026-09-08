import { useEffect, useState } from 'react';
import { Bell, BellOff, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  getReminderSettings, setReminderSettings, subscribeReminderSettings,
  type ReminderInterval, type ReminderSettings,
} from '@/lib/reminderSettings';

const OPTIONS: { value: ReminderInterval; label: string; hint: string }[] = [
  { value: 15, label: '15 min', hint: 'Ritmo intenso' },
  { value: 30, label: '30 min', hint: 'Padrão recomendado' },
  { value: 60, label: '60 min', hint: 'Ritmo brando' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * Preferências do lembrete automático de rondas.
 * SVG discreto no cabeçalho, chips para intervalos e switch de ativação.
 * As mudanças são propagadas em tempo real ao hook `useRoundReminder`.
 */
export function ReminderSettingsDialog({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<ReminderSettings>(() => getReminderSettings());

  useEffect(() => subscribeReminderSettings(setSettings), []);

  const update = (patch: Partial<ReminderSettings>) => {
    const result = setReminderSettings(patch);
    if (result.ok === true) {
      setSettings(result.value);
      return;
    }
    const first = Object.values(result.errors)[0];
    toast.error(typeof first === 'string' ? first : 'Valor inválido');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rm-reminder rm-compact tactical-cards w-[min(94vw,380px)] max-w-[380px] p-3 sm:p-4 gap-3">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 42 42" aria-hidden="true" className="shrink-0">
              <defs>
                <linearGradient id="rsgrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                </linearGradient>
              </defs>
              <polygon
                points="21,3 37,12 37,30 21,39 5,30 5,12"
                fill="url(#rsgrad)"
                stroke="hsl(var(--primary))"
                strokeWidth="1.4"
              />
              <g stroke="hsl(var(--primary-foreground))" strokeWidth="1.6" strokeLinecap="round" fill="none">
                <path d="M21 14v8l5 3" />
              </g>
            </svg>
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-1.5 text-[15px] leading-tight">
                <Settings2 className="h-3.5 w-3.5 opacity-80" />
                Configurações do Lembrete
              </DialogTitle>
              <DialogDescription className="text-[11px] leading-snug mt-0.5">
                Ajuste o intervalo e ative/desative o aviso automático.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* Ativação */}
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-2.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {settings.enabled
                ? <Bell className="h-3.5 w-3.5 text-primary shrink-0" />
                : <BellOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <div className="min-w-0">
                <Label className="text-[13px] leading-tight">Lembrete automático</Label>
                <p className="text-[10.5px] text-muted-foreground leading-snug">
                  {settings.enabled ? 'Ativo — aviso periódico.' : 'Desativado.'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => update({ enabled: !!v })}
              aria-label="Ativar lembrete"
            />
          </div>

          {/* Intervalo */}
          <div className={cn('space-y-1.5', !settings.enabled && 'opacity-50 pointer-events-none')}>
            <Label className="text-[12px] uppercase tracking-wider text-muted-foreground">Intervalo</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {OPTIONS.map((o) => {
                const active = settings.intervalMin === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => update({ intervalMin: o.value })}
                    className={cn('rm-chip', active && 'rm-chip--active')}
                    aria-pressed={active}
                    data-active={active ? 'true' : 'false'}
                  >
                    <span className="rm-chip__label">{o.label}</span>
                    <span className="rm-chip__hint">{o.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] text-muted-foreground leading-snug">
              Pausado durante rondas ativas.
            </p>
          </div>

          {/* Modo de exibição */}
          <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card/40 px-2.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
                <defs>
                  <linearGradient id="rs-inapp" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 3 L27 8 V16 C27 22.5 22 27.5 16 29 C10 27.5 5 22.5 5 16 V8 Z"
                  fill="url(#rs-inapp)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 16 L15 20 L22 12"
                  fill="none"
                  stroke="hsl(var(--primary-foreground))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="min-w-0">
                <Label className="text-[13px] leading-tight">Somente alertas in-app</Label>
                <p className="text-[10.5px] text-muted-foreground leading-snug">
                  {settings.inAppOnly ? 'Sem notificações do navegador.' : 'Pode usar notificações nativas.'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.inAppOnly}
              onCheckedChange={(v) => update({ inAppOnly: !!v })}
              aria-label="Usar somente alertas in-app"
            />
          </div>
        </div>

        <div className="mt-1 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-[12px] font-medium"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
