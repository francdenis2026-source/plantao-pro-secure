import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface DeveloperSignatureProps {
  className?: string;
  compact?: boolean;
}

/**
 * Assinatura tática do desenvolvedor — inline, sem aumentar altura do container.
 * Franc D'nis (manuscrito) · [Agente Socioeducativo] · Feijó/AC
 */
export function DeveloperSignature({ className, compact = false }: DeveloperSignatureProps) {
  return (
    <div
      className={cn(
        'group inline-flex items-center gap-2 leading-none select-none whitespace-nowrap',
        'text-muted-foreground/80 transition-colors duration-500',
        className,
      )}
      title="Desenvolvido por Franc D'nis · Agente Socioeducativo · Feijó/AC"
      aria-label="Desenvolvido por Franc D'nis, Agente Socioeducativo, Feijó, AC"
    >
      {/* DEV// tag */}
      <span
        className={cn(
          'font-mono uppercase tracking-[0.22em] text-muted-foreground/50',
          compact ? 'text-[8px]' : 'text-[9px]',
        )}
      >
        DEV//
      </span>

      {/* Developer name */}
      <span
        className={cn(
          'font-serif italic font-semibold text-primary tracking-wide',
          '[text-shadow:0_0_6px_hsl(var(--primary)/0.35)]',
          compact ? 'text-[11px]' : 'text-[12px]',
        )}
      >
        Franc D'nis
      </span>

      {/* Profession bracketed */}
      <span
        className={cn(
          'inline-flex items-center gap-1 font-mono uppercase tracking-[0.18em]',
          compact ? 'text-[8px]' : 'text-[9px]',
        )}
      >
        <span className="text-amber-500/80 font-bold">[</span>
        <span className="text-foreground/75">
          <span className="hidden sm:inline">Agente Socioeducativo</span>
          <span className="sm:hidden">Ag. Socioed.</span>
        </span>
        <span className="text-amber-500/80 font-bold">]</span>
      </span>

      {/* Location with pin */}
      <span
        className={cn(
          'inline-flex items-center gap-1 pl-2 border-l border-border/50 font-mono tracking-[0.18em] text-primary/85',
          compact ? 'text-[8px]' : 'text-[9px]',
        )}
      >
        <MapPin className="h-2.5 w-2.5" strokeWidth={2.5} />
        FEIJÓ/AC
      </span>
    </div>
  );
}
