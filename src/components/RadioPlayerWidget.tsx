import { useState, useRef, useEffect, useCallback } from 'react';
import { Radio, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_STATION } from '@/lib/radioStations';

type PlayState = 'idle' | 'loading' | 'playing' | 'error';

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
  const [state, setState] = useState<PlayState>('idle');
  const [usingFallback, setUsingFallback] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handleErrorRef = useRef(() => {});

  useEffect(() => {
    handleErrorRef.current = () => {
      setUsingFallback((prev) => {
        if (!prev) return true; // primeira falha: tenta o espelho
        setState('error');
        return prev;
      });
    };
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;
    const onPlaying = () => setState('playing');
    const onWaiting = () => setState('loading');
    const onError = () => handleErrorRef.current();
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, []);

  // "Tocando agora" via SSE — reconecta a cada 30s se a conexão cair.
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      try {
        es = new EventSource(DEFAULT_STATION.metadataUrl);
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            const title = data?.streamTitle || data?.title;
            const clean = typeof title === 'string' ? title.trim() : '';
            // A Zeno manda "-" (ou vazio) quando não há metadado de faixa;
            // nesse caso mantemos o rótulo genérico em vez de exibir lixo.
            setNowPlaying(clean && clean !== '-' ? clean : null);
          } catch {
            /* payload não-JSON: ignora */
          }
        };
        es.onerror = () => {
          es?.close();
          es = null;
          if (!disposed) retry = setTimeout(connect, 30_000);
        };
      } catch {
        retry = setTimeout(connect, 30_000);
      }
    };
    connect();

    return () => {
      disposed = true;
      es?.close();
      if (retry) clearTimeout(retry);
    };
  }, []);

  const play = useCallback((fallback: boolean) => {
    const audio = audioRef.current;
    if (!audio) return;
    setState('loading');
    audio.src = fallback ? DEFAULT_STATION.fallbackUrl : DEFAULT_STATION.streamUrl;
    audio.play().catch(() => handleErrorRef.current());
  }, []);

  useEffect(() => {
    if (usingFallback) play(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingFallback]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setUsingFallback(false);
    setState('idle');
  }, []);

  const toggle = () => {
    if (state === 'playing' || state === 'loading') stop();
    else play(false);
  };

  const isPlaying = state === 'playing';
  const isLoading = state === 'loading';
  const action = isPlaying ? 'Parar rádio' : isLoading ? 'Conectando…' : 'Tocar rádio';
  const tooltip = isPlaying ? (nowPlaying ?? 'Transmissão ao vivo') : action;

  return (
    <div
      className={cn('relative', variant === 'header' && 'inline-flex')}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={toggle}
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

      {/* Nome do programa/música — discreto, some ao tirar o mouse */}
      <div
        role="status"
        className={cn(
          'pointer-events-none absolute right-0 top-[calc(100%+8px)] z-[70] max-w-[240px] truncate rounded-md border border-border/70 bg-popover/95 px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-lg backdrop-blur-sm',
          'transition-all duration-300',
          hovering ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
          variant === 'floating' && 'right-full top-1/2 mr-2 -translate-y-1/2 mt-0',
        )}
      >
        {isPlaying && (
          <span className="mr-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-red-500 align-middle shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
        )}
        {tooltip}
      </div>

      <style>{`
        @keyframes radioEq {
          0%, 100% { height: 25%; }
          50%      { height: 100%; }
        }
      `}</style>
    </div>
  );
}
