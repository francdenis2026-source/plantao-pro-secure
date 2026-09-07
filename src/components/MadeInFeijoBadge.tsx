import { cn } from '@/lib/utils';

/**
 * MadeInFeijoBadge — Selo tático de origem do software.
 *
 * Renderizado em HTML/CSS (não SVG) para nitidez perfeita em qualquer
 * densidade de pixel. Combina com a tipografia do rodapé.
 */
export function MadeInFeijoBadge({
  inline = false,
  size = 'md',
  className,
}: {
  inline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const wrapperClass = inline
    ? 'inline-flex items-center select-none'
    : 'pointer-events-none fixed bottom-2 left-2 z-[55] hidden sm:inline-flex select-none';

  const sizeMap = {
    sm: {
      pad: 'px-1.5 py-[3px] gap-1.5',
      tag: 'text-[8px] tracking-[0.20em]',
      title: 'text-[9px] tracking-[0.22em]',
      chev: 'text-[9px]',
      bar: 'h-3',
    },
    md: {
      pad: 'px-2 py-1 gap-2',
      tag: 'text-[9px] tracking-[0.22em]',
      title: 'text-[11px] tracking-[0.24em]',
      chev: 'text-[11px]',
      bar: 'h-4',
    },
    lg: {
      pad: 'px-3 py-1.5 gap-2.5',
      tag: 'text-[10px] tracking-[0.24em]',
      title: 'text-[13px] tracking-[0.26em]',
      chev: 'text-[13px]',
      bar: 'h-5',
    },
  }[size];

  return (
    <div
      role="note"
      title="Software desenvolvido por Franc D'nis"
      aria-label="Software desenvolvido por Franc D'nis"
      className={cn(wrapperClass, className)}
    >
      <div
        className={cn(
          'inline-flex items-center rounded-md border border-amber-500/30 bg-[linear-gradient(180deg,hsl(220_40%_7%/0.95),hsl(222_45%_4%/0.98))] shadow-[0_1px_0_hsl(45_95%_55%/0.15)_inset,0_2px_8px_rgba(0,0,0,0.35)]',
          sizeMap.pad,
        )}
      >
        {/* Acento amarelo lateral */}
        <span
          aria-hidden
          className={cn(
            'w-[3px] rounded-sm bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_0_6px_hsl(45_95%_55%/0.55)]',
            sizeMap.bar,
          )}
        />

        {/* Chevron </> */}
        <span
          aria-hidden
          className={cn(
            'font-mono font-bold text-amber-400 leading-none',
            sizeMap.chev,
          )}
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          {'</>'}
        </span>

        {/* Tag pequena */}
        <span
          className={cn(
            'font-mono font-semibold uppercase text-slate-400 leading-none',
            sizeMap.tag,
          )}
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          Developed by
        </span>

        {/* Separador */}
        <span aria-hidden className="text-amber-500/40 leading-none">·</span>

        {/* Título */}
        <span
          className={cn(
            'font-mono font-extrabold uppercase text-slate-100 leading-none',
            sizeMap.title,
          )}
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          Franc D&apos;nis
        </span>
      </div>
    </div>
  );
}

export default MadeInFeijoBadge;
