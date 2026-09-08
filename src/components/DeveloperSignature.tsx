import { cn } from '@/lib/utils';
import { MapPin, Code2 } from 'lucide-react';

interface DeveloperSignatureProps {
  className?: string;
  compact?: boolean;
}

/**
 * Assinatura do desenvolvedor — crédito institucional discreto, presente
 * ao final das telas principais (rodapé público e painel do agente).
 * Franc Denis · Desenvolvedor · Feijó, Acre · 2026
 */
export function DeveloperSignature({ className, compact = false }: DeveloperSignatureProps) {
  return (
    <div
      className={cn(
        'group inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 leading-none select-none whitespace-nowrap backdrop-blur-sm',
        'text-muted-foreground/80 transition-colors duration-500 hover:border-primary/40 hover:bg-card/70',
        compact ? 'px-2.5 py-1.5' : 'px-3 py-1.5',
        className,
      )}
      title="Franc Denis · Desenvolvedor · Feijó, Acre · 2026"
      aria-label="Desenvolvido por Franc Denis, Feijó, Acre, 2026"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Code2 className="h-2.5 w-2.5" strokeWidth={2.5} />
      </span>

      {/* Developer name */}
      <span
        className={cn(
          'font-serif italic font-semibold text-primary tracking-wide',
          compact ? 'text-[11px]' : 'text-[12px]',
        )}
      >
        Franc Denis
      </span>

      {/* Role */}
      <span
        className={cn(
          'font-mono uppercase tracking-[0.18em] text-foreground/75',
          compact ? 'text-[8px]' : 'text-[9px]',
        )}
      >
        <span className="hidden sm:inline">Desenvolvedor</span>
        <span className="sm:hidden">Dev</span>
      </span>

      {/* Location with pin */}
      <span
        className={cn(
          'inline-flex items-center gap-1 pl-2 border-l border-border/50 font-mono tracking-[0.18em] text-primary/85',
          compact ? 'text-[8px]' : 'text-[9px]',
        )}
      >
        <MapPin className="h-2.5 w-2.5" strokeWidth={2.5} />
        FEIJÓ/AC · 2026
      </span>
    </div>
  );
}
