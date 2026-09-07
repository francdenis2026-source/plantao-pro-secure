import { Radio, Shield } from 'lucide-react';
import { SignalUplink } from './SignalUplink';
import { useServerTime } from '@/hooks/useServerTime';


import { cn } from '@/lib/utils';
import bannerBg from '@/assets/institutional-banner-bg.webp';


/**
 * CommandStrip — faixa institucional Noir & Gold.
 * Tipografia/cores alinhadas ao Header e Footer.
 * Triple-click no brasão abre o login master (com feedback visual).
 */
export function CommandStrip() {
  // Relógio via rede/servidor — não confia no relógio local do dispositivo
  const now = useServerTime(1000);

  const handleShieldClick = () => {
    const w = window as unknown as { __logoClicks?: number; __logoTimer?: number };
    w.__logoClicks = (w.__logoClicks || 0) + 1;
    if (w.__logoTimer) window.clearTimeout(w.__logoTimer);
    w.__logoTimer = window.setTimeout(() => {
      w.__logoClicks = 0;
    }, 800);
    if ((w.__logoClicks ?? 0) >= 3) {
      w.__logoClicks = 0;
      window.dispatchEvent(new CustomEvent('open-master-login'));
    }
  };

  const date = now.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Rio_Branco',
  });
  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Rio_Branco',
  });


  return (
    <section
      aria-label="Faixa institucional"
      className={cn(
        'relative mx-2 sm:mx-6 -mt-2 sm:-mt-3 overflow-hidden rounded-b-lg rounded-t-none',
        'border border-border/60 backdrop-blur-xl',
        'shadow-[0_8px_28px_-12px_hsl(222_60%_2%/0.85)]',
      )}
    >
      {/* Foto realista de fundo */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bannerBg})` }}
      />
      {/* Overlay quente (âmbar/caqui) para contraste com foto golden hour */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,hsl(28_35%_6%/0.94)_0%,hsl(32_28%_10%/0.72)_55%,hsl(28_35%_6%/0.94)_100%)]"
      />

      {/* Warm gold accents */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent_0%,hsl(42_85%_55%)_30%,hsl(42_85%_55%)_70%,transparent_100%)] opacity-90"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
      />

      <div className="relative flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1 px-3 sm:px-4 lg:px-6 py-2 sm:py-0 sm:h-14 min-h-12">
        {/* Identidade */}
        <div className="relative flex items-center shrink-0">
          <button
            type="button"
            onClick={handleShieldClick}
            aria-label="Comando Operacional"
            className="text-left leading-tight focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60 rounded-sm"
          >
            <span className="block font-tactical text-[13px] sm:text-[14px] font-semibold text-amber-50 whitespace-nowrap tracking-[0.1em]">
              Comando <span className="text-amber-400 drop-shadow-[0_0_8px_hsl(42_85%_55%/0.35)]">Operacional</span>
            </span>
            <span className="hidden md:block font-mono-mil text-[10px] text-muted-foreground/80 tracking-[0.18em] uppercase whitespace-nowrap">
              Gestão inteligente de plantões
            </span>
          </button>
        </div>


        {/* Relógio + radar + status */}
        <div className="flex items-center gap-2 sm:gap-4 ml-auto shrink-0">
          <div className="text-right leading-tight tabular-nums shrink-0">
            <div className="font-mono text-[15px] sm:text-[16px] font-semibold text-amber-50 tracking-tight whitespace-nowrap">
              {time}
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70 font-mono whitespace-nowrap">
              {date}
            </div>
          </div>

          <SignalUplink />

          <div className="hidden sm:flex items-center gap-2 rounded-md bg-card/60 px-2.5 py-1 ring-1 ring-border/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-success/95">
              Ativo
            </span>
            <Radio className="h-3 w-3 text-success/70" />
          </div>

        </div>
      </div>
    </section>
  );
}

