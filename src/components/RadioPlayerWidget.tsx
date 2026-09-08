import { useState } from 'react';
import { Radio, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const JOVEM_PAN_LIVE_URL = 'https://jovempan.com.br/ao-vivo/';

/**
 * Player de rádio institucional — Jovem Pan (São Paulo) ao vivo.
 * A Jovem Pan não publica um endpoint de streaming direto (mp3/m3u8) de
 * forma pública e estável, então o player incorpora a página oficial
 * "Ao Vivo" da emissora (que hospeda o player deles) e sempre oferece um
 * link para abrir em uma nova aba — garante áudio real mesmo se a página
 * bloquear incorporação via iframe (X-Frame-Options).
 */
export function RadioPlayerWidget({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Rádio Jovem Pan ao vivo"
        title="Rádio Jovem Pan ao vivo"
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-colors hover:bg-muted',
          open && 'border-primary text-primary',
          className,
        )}
      >
        <Radio className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Rádio Jovem Pan"
          className="fixed bottom-20 right-4 z-[70] w-[300px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:right-6"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Radio className="h-3.5 w-3.5" />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-foreground">Jovem Pan</p>
                <p className="text-[10px] text-muted-foreground">São Paulo · Ao vivo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar player"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <iframe
            src={JOVEM_PAN_LIVE_URL}
            title="Jovem Pan — Ao vivo"
            className="h-[220px] w-full border-0"
            loading="lazy"
            allow="autoplay; encrypted-media"
          />

          <a
            href={JOVEM_PAN_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-2.5 text-xs font-medium text-primary hover:bg-muted"
          >
            Abrir em nova aba <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </>
  );
}
