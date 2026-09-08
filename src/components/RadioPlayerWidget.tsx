import { useState, useRef, useEffect } from 'react';
import { Radio, X, ExternalLink, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const JOVEM_PAN_LIVE_URL = 'https://jovempan.com.br/ao-vivo/';
// Simulcast oficial ao vivo da Jovem Pan News no YouTube (fonte verificada em
// jovempan.com.br/ao-vivo/, que incorpora este mesmo vídeo). Usar o embed do
// YouTube nos dá áudio + vídeo real, legal e sempre "ao vivo" — a Jovem Pan
// não publica um stream de áudio puro (mp3/m3u8) público e estável.
const YT_VIDEO_ID = 'zr2abZRFNkM';

/**
 * Player de rádio institucional — Jovem Pan News ao vivo, estilizado no
 * padrão tático/segurança pública do sistema. Usável tanto no header
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
  const [live, setLive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const embedSrc = `https://www.youtube.com/embed/${YT_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div ref={containerRef} className={cn('relative', variant === 'header' && 'inline-flex')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Rádio Jovem Pan News ao vivo"
        title="Rádio Jovem Pan News ao vivo"
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
          {live && (
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
          aria-label="Rádio Jovem Pan News"
          className={cn(
            'z-[75] w-[300px] overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-black/40',
            variant === 'header'
              ? 'absolute right-0 top-[calc(100%+10px)]'
              : 'fixed bottom-20 right-4 sm:right-6',
          )}
        >
          {/* Faixa tática superior */}
          <div className="flex items-center justify-between border-b border-primary/20 bg-gradient-to-r from-primary/15 via-transparent to-transparent px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                <Radio className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                    Jovem Pan News
                  </p>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-red-400">
                    Ao vivo · Rede nacional
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

          {/* Player embutido — simulcast oficial via YouTube */}
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={embedSrc}
              title="Jovem Pan News — Ao vivo"
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onError={() => setLive(false)}
            />
          </div>

          <div className="flex items-center gap-1.5 border-t border-border bg-muted/30 px-3 py-2">
            <Volume2 className="h-3 w-3 shrink-0 text-muted-foreground" />
            <p className="min-w-0 flex-1 truncate font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              Simulcast oficial · Jovem Pan
            </p>
            <a
              href={JOVEM_PAN_LIVE_URL}
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
