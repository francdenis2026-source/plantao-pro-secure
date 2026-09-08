import { useState, useRef, useEffect, useCallback } from 'react';
import { Radio, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_STATION } from '@/lib/radioStations';

type PlayState = 'idle' | 'loading' | 'playing' | 'error';

/**
 * Player de rádio institucional — ação direta (um clique toca, outro para).
 * Sem painel suspenso: o próprio botão do header/dock é o player.
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';
    const audio = audioRef.current;
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

  // Ref para o handler de erro, evita closures presas ao valor antigo de usingFallback.
  const handleErrorRef = useRef(() => {});
  useEffect(() => {
    handleErrorRef.current = () => {
      setUsingFallback((prev) => {
        if (!prev) return true; // tenta o espelho automaticamente
        setState('error');
        return prev;
      });
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

  const label = isPlaying ? 'Parar rádio' : isLoading ? 'Conectando à rádio…' : 'Tocar rádio';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${DEFAULT_STATION.name} — ${label}`}
      title={`${DEFAULT_STATION.name} — ${label}`}
      aria-pressed={isPlaying}
      className={cn(
        variant === 'header'
          ? 'group flex h-9 items-center gap-2 rounded-full border border-border bg-card/60 pl-2.5 pr-3 text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted'
          : 'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted',
        isPlaying && 'border-primary text-primary',
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
        {isPlaying && (
          <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
          </span>
        )}
      </span>
      {variant === 'header' && (
        <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] sm:inline">
          {isPlaying ? 'No ar' : 'Rádio'}
        </span>
      )}
    </button>
  );
}
