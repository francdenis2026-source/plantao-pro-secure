import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Radio, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_STATION } from '@/lib/radioStations';
import { radioPlayer } from '@/lib/radioPlayerStore';

/** Barras de equalizador animadas — só aparecem enquanto toca. */
function Equalizer({ className }: { className?: string }) {
  return (
    <span className={cn('flex h-4 items-end gap-[2px]', className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-current"
          style={{
            animation: `radioEq 900ms ease-in-out ${i * 130}ms infinite`,
            height: '35%',
          }}
        />
      ))}
    </span>
  );
}

/**
 * Player de rádio institucional — ação direta (um clique toca, outro para).
 * Sem painel suspenso: o próprio botão é o player. Ao passar o mouse,
 * exibe discretamente o que está tocando (metadados ao vivo via SSE).
 */
export function RadioPlayerWidget({
  className,
  variant = 'floating',
}: {
  className?: string;
  variant?: 'floating' | 'header';
}) {
  // Estado compartilhado — vive fora do React (src/lib/radioPlayerStore.ts)
  // pra sobreviver a qualquer desmontagem deste widget (ex.: trocar de
  // rota some com a instância do header e monta a do dock global, ou
  // vice-versa — antes disso derrubava o áudio em reprodução).
  const { state, nowPlaying } = useSyncExternalStore(radioPlayer.subscribe, radioPlayer.getSnapshot);
  const [visible, setVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; right: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  // No mobile não existe "hover" — o toque dispara um mouseenter fantasma
  // sem o mouseleave correspondente, então a mensagem ficava presa na tela
  // pra sempre. Em vez de depender só de hover, todo caminho que mostra a
  // mensagem agenda o próprio sumiço — funciona igual em mouse e toque.
  const showTemporarily = useCallback((ms: number) => {
    setVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setVisible(false), ms);
  }, []);

  const hideNow = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => () => { if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current); }, []);

  // O header fica em barra fixa com overflow-hidden (pro fundo tático não
  // vazar) — isso cortava o tooltip que aparecia logo abaixo do botão.
  // Solução: calcula a posição na tela e renderiza via portal direto no
  // body, fora do container que corta o overflow.
  const updateTooltipPos = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }, []);

  const toggle = radioPlayer.toggle;

  const isPlaying = state === 'playing';
  const isLoading = state === 'loading';
  const action = isPlaying ? 'Parar rádio' : isLoading ? 'Conectando…' : 'Tocar rádio';
  const tooltip = isPlaying ? (nowPlaying ?? 'Transmissão ao vivo') : action;

  // Mostra a mensagem sozinha (sem precisar de hover/toque) quando a
  // música muda — some de novo em alguns segundos.
  const prevNowPlayingRef = useRef(nowPlaying);
  useEffect(() => {
    if (nowPlaying !== prevNowPlayingRef.current) {
      prevNowPlayingRef.current = nowPlaying;
      if (isPlaying) {
        updateTooltipPos();
        showTemporarily(5000);
      }
    }
  }, [nowPlaying, isPlaying, updateTooltipPos, showTemporarily]);

  const tooltipNode = (
    <div
      role="status"
      className={cn(
        'pointer-events-none max-w-[240px] truncate rounded-md border border-border/70 bg-popover/95 px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg backdrop-blur-sm',
        'transition-all duration-300',
        variant === 'header'
          ? cn('fixed z-[200]', visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0')
          : cn('absolute right-full top-1/2 z-[70] mr-2 -translate-y-1/2', visible ? 'translate-x-0 opacity-100' : 'translate-x-1 opacity-0'),
      )}
      style={variant === 'header' && tooltipPos ? { top: tooltipPos.top, right: tooltipPos.right } : undefined}
    >
      {isPlaying && (
        <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-red-500 align-middle shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
      )}
      {tooltip}
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className={cn('relative', variant === 'header' && 'inline-flex')}
      onMouseEnter={() => { updateTooltipPos(); showTemporarily(5000); }}
      onMouseLeave={hideNow}
    >
      <button
        type="button"
        onClick={() => { updateTooltipPos(); showTemporarily(3000); toggle(); }}
        aria-label={`${DEFAULT_STATION.name} — ${action}`}
        aria-pressed={isPlaying}
        className={cn(
          variant === 'header'
            ? 'group flex h-9 items-center gap-2 rounded-full border border-border bg-card/60 pl-2.5 pr-3 text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted'
            : 'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted',
          isPlaying && 'border-primary/60 text-primary',
          className,
        )}
      >
        <span className="relative flex h-4 w-4 items-center justify-center shrink-0">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Radio className="h-4 w-4" />
          )}
        </span>

        {variant === 'header' && (
          isPlaying ? (
            <Equalizer className="text-primary" />
          ) : (
            <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] sm:inline">
              Rádio
            </span>
          )
        )}
      </button>

      {/* Nome do programa/música — discreto, some ao tirar o mouse. No
          header vai via portal (barra é overflow-hidden e cortava a
          mensagem); no botão flutuante fica posicionado normalmente. */}
      {variant === 'header'
        ? (typeof document !== 'undefined' ? createPortal(tooltipNode, document.body) : null)
        : tooltipNode}

      <style>{`
        @keyframes radioEq {
          0%, 100% { height: 25%; }
          50%      { height: 100%; }
        }
      `}</style>
    </div>
  );
}
