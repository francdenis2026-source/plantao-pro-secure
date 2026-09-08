import { useState, useRef, useEffect, useCallback } from 'react';
import { Radio, X, ExternalLink, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_STATION } from '@/lib/radioStations';

type PlayState = 'idle' | 'loading' | 'playing' | 'error';

/**
 * Player de rádio institucional — áudio ao vivo real (Zeno.FM), estilizado
 * no padrão tático/segurança pública do sistema. Usável tanto no header
 * (variant="header", trigger compacto inline) quanto flutuante
 * (variant="floating", dock inferior).
 */
export function RadioPlayerWidget({
  className,
  variant = 'floating',
}: {
  className?: string;
  variant?: 'floating' | 'header';
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PlayState>('idle');
  const [usingFallback, setUsingFallback] = useState(false);
  const [muted, setMuted] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fecha ao clicar fora / Esc
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Metadados "tocando agora" via SSE, com reconexão a cada 30s em caso de falha.
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const parsePayload = (raw: string) => {
      try {
        const data = JSON.parse(raw);
        const title = data?.streamTitle || data?.title;
        if (title && typeof title === 'string') setNowPlaying(title);
      } catch {
        /* ignore payloads não-JSON */
      }
    };

    const connect = () => {
      if (disposed) return;
      try {
        es = new EventSource(DEFAULT_STATION.metadataUrl);
        es.onmessage = (ev) => parsePayload(ev.data);
        es.onerror = () => {
          es?.close();
          es = null;
          if (!disposed) retryTimer = setTimeout(connect, 30_000);
        };
      } catch {
        retryTimer = setTimeout(connect, 30_000);
      }
    };

    connect();

    return () => {
      disposed = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setState('loading');
    audio.src = usingFallback ? DEFAULT_STATION.fallbackUrl : DEFAULT_STATION.streamUrl;
    audio.play().catch(() => setState('error'));
  }, [usingFallback]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setState('idle');
  }, []);

  const togglePlay = () => {
    if (state === 'playing' || state === 'loading') stop();
    else play();
  };

  const handleError = () => {
    if (!usingFallback) {
      // Primeira falha: tenta o espelho automático.
      setUsingFallback(true);
      return;
    }
    setState('error');
  };

  useEffect(() => {
    if (usingFallback && state !== 'idle') play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingFallback]);

  // Para o áudio ao desmontar (fecha a aba / navega para fora do app).
  useEffect(() => () => audioRef.current?.pause(), []);

  const isPlaying = state === 'playing';
  const isLoading = state === 'loading';

  return (
    <div ref={containerRef} className={cn('relative', variant === 'header' && 'inline-flex')}>
      <audio
        ref={audioRef}
        preload="none"
        muted={muted}
        onPlaying={() => setState('playing')}
        onWaiting={() => setState('loading')}
        onError={handleError}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Rádio PlantãoPro ao vivo"
        title="Rádio PlantãoPro ao vivo"
        className={cn(
          variant === 'header'
            ? 'group flex h-9 items-center gap-2 rounded-full border border-border bg-card/60 pl-2.5 pr-3 text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted'
            : 'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted',
          open && 'border-primary text-primary',
          className,
        )}
      >
        <span className="relative flex h-4 w-4 items-center justify-center shrink-0">
          <Radio className="h-4 w-4" />
          {isPlaying && (
            <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
          )}
        </span>
        {variant === 'header' && (
          <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] sm:inline">
            Rádio
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={DEFAULT_STATION.name}
          className={cn(
            'z-[75] w-[300px] overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-black/40',
            variant === 'header'
              ? 'absolute right-0 top-[calc(100%+10px)]'
              : 'fixed bottom-20 right-4 sm:right-6',
          )}
        >
          {/* Faixa tática superior */}
          <div className="flex items-center justify-between border-b border-primary/20 bg-gradient-to-r from-primary/15 via-transparent to-transparent px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                <Radio className="h-4 w-4" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                  {DEFAULT_STATION.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={cn(
                      'flex h-1.5 w-1.5 rounded-full',
                      isPlaying ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-muted-foreground/40',
                    )}
                  />
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-red-400">
                    {isPlaying ? 'Ao vivo' : 'Pausado'}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar player"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Controles de reprodução */}
          <div className="flex flex-col items-center gap-3 px-4 py-5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pausar rádio' : 'Tocar rádio'}
              disabled={state === 'error' && usingFallback}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 translate-x-0.5" />
              )}
            </button>

            {state === 'error' ? (
              <p className="text-center text-xs text-destructive">
                Não foi possível conectar ao stream agora.
              </p>
            ) : (
              <p className="min-h-[1rem] max-w-full truncate px-2 text-center text-xs text-muted-foreground">
                {nowPlaying ?? (isPlaying ? 'Transmissão ao vivo' : 'Toque para ouvir')}
              </p>
            )}

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Ativar som' : 'Silenciar'}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted"
            >
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {muted ? 'Mudo' : 'Som ativo'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 border-t border-border bg-muted/30 px-3 py-2">
            <p className="min-w-0 flex-1 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              Stream via Zeno.FM
            </p>
            <a
              href={DEFAULT_STATION.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary hover:underline"
            >
              Abrir <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
