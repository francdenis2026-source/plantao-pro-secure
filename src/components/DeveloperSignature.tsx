import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface DeveloperSignatureProps {
  className?: string;
  compact?: boolean;
}

/**
 * Assinatura do desenvolvedor — inline, sem aumentar altura do container.
 * Franc Denis · Agente Socioeducativo · Feijó, Acre · 2026
 */
export function DeveloperSignature({ className, compact = false }: DeveloperSignatureProps) {
  return (
    <div
      className={cn(
        'group inline-flex items-center gap-2 leading-none select-none whitespace-nowrap',
        'text-muted-foreground/80 transition-colors duration-500',
        className,
      )}
      title="Franc Denis · criado por Agente Socioeducativo · Feijó, Acre · 2026"
      aria-label="Franc Denis, criado por Agente Socioeducativo, Feijó, Acre, 2026"
    >
      {/* Developer name */}
      <span
        className={cn(
          'font-serif italic font-semibold text-primary tracking-wide',
          compact ? 'text-[11px]' : 'text-[12px]',
        )}
      >
        Franc Denis
      </span>

      {/* Profession */}
      <span
        className={cn(
          'font-mono uppercase tracking-[0.18em] text-foreground/75',
          compact ? 'text-[8px]' : 'text-[9px]',
        )}
      >
        <span className="hidden sm:inline">Agente Socioeducativo</span>
        <span className="sm:hidden">Ag. Socioed.</span>
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
