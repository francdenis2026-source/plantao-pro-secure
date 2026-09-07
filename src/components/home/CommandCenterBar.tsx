import { Radio, ShieldCheck, Signal, Users, Clock3, Eye, type LucideIcon } from 'lucide-react';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { useVisitorPresence } from '@/hooks/useVisitorPresence';
import { useServerTime } from '@/hooks/useServerTime';
import { cn } from '@/lib/utils';

/**
 * Command Center status bar — v2 refined, glass + segmented pills.
 * Modern professional HUD strip that sits above the hero.
 */
export function CommandCenterBar() {
  const online = useOnlinePresence();
  const visitors = useVisitorPresence();
  // Horário sincronizado com o servidor (não depende do relógio local)
  const now = useServerTime(1000);

  const hh = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Rio_Branco' });
  const dd = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Rio_Branco' }).replace('.', '');

  type Tone = 'ok' | 'primary' | 'warn' | 'neutral';
  const cells: Array<{ icon: LucideIcon; label: string; value: string; tone?: Tone; live?: boolean }> = [
    { icon: ShieldCheck, label: 'Status',     value: 'Operacional',                     tone: 'ok',      live: true },
    { icon: Radio,       label: 'Rede',       value: 'Online',                          tone: 'primary', live: true },
    { icon: Eye,         label: 'Visitantes', value: `${visitors} agora`,               tone: 'ok',      live: true },
    { icon: Users,       label: 'Agentes',    value: `${online} conectados`,            tone: 'primary'             },
    { icon: Signal,      label: 'Enlace',     value: 'Seguro · 24/7'                                                },
    { icon: Clock3,      label: 'Hora',       value: `${hh}  ·  ${dd}`,                 tone: 'neutral'             },
  ];

  const toneText = (t?: Tone) =>
    t === 'ok' ? 'text-success'
    : t === 'primary' ? 'text-primary'
    : t === 'warn' ? 'text-warning'
    : 'text-foreground/90';

  const toneDot = (t?: Tone) =>
    t === 'ok' ? 'bg-success shadow-[0_0_8px_hsl(var(--success)/0.7)]'
    : t === 'primary' ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.7)]'
    : t === 'warn' ? 'bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.7)]'
    : 'bg-muted-foreground/60';

  return (
    <div
      role="status"
      aria-label="Barra de comando operacional"
      className={cn(
        'relative w-full',
        'border-y border-primary/15',
        'bg-[linear-gradient(180deg,hsl(215_55%_7%/0.85)_0%,hsl(217_62%_4%/0.95)_100%)]',
        'backdrop-blur-xl',
        "before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-[2px]",
        'before:bg-[linear-gradient(90deg,transparent_0%,hsl(var(--primary)/0.9)_30%,hsl(var(--primary)/0.9)_70%,transparent_100%)]',
      )}
    >
      {/* Soft vignette */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(217_62%_2%/0.55)_100%)]"
      />

      <div className="relative mx-auto max-w-[1400px] px-2 sm:px-4">
        <div className="grid grid-cols-3 sm:grid-cols-6">
          {cells.map((c, i) => {
            const Icon = c.icon;
            const text = toneText(c.tone);
            return (
              <div
                key={i}
                className={cn(
                  'group relative flex items-center gap-2.5 px-2.5 sm:px-3.5 py-2 min-w-0',
                  i !== 0 && 'sm:before:content-[""] sm:before:absolute sm:before:left-0 sm:before:top-1/2 sm:before:-translate-y-1/2 sm:before:h-6 sm:before:w-px sm:before:bg-gradient-to-b sm:before:from-transparent sm:before:via-primary/25 sm:before:to-transparent',
                )}
              >
                {/* Icon chip */}
                <span
                  className={cn(
                    'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    'bg-gradient-to-br from-primary/10 to-primary/0 ring-1 ring-primary/25',
                    'group-hover:ring-primary/50 transition-colors',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', text)} strokeWidth={2.3} />
                  {c.live && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                      <span className={cn('absolute inset-0 rounded-full opacity-60 animate-ping', toneDot(c.tone))} />
                      <span className={cn('relative h-1.5 w-1.5 rounded-full', toneDot(c.tone))} />
                    </span>
                  )}
                </span>

                <div className="min-w-0 leading-tight">
                  <div className="text-[8.5px] sm:text-[9.5px] uppercase tracking-[0.26em] text-muted-foreground/70 font-mono truncate">
                    {c.label}
                  </div>
                  <div className={cn('text-[11px] sm:text-[12px] font-semibold tracking-wide font-mono tabular-nums truncate', text)}>
                    {c.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom gold hairline */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.4),transparent)]"
      />
    </div>
  );
}

export default CommandCenterBar;
