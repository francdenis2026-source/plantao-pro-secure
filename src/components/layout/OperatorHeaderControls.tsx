import { AgentQuickServicesMenu } from '@/components/AgentQuickServicesMenu';
import { RadioPlayerWidget } from '@/components/RadioPlayerWidget';
import { ColorModeToggle } from '@/components/ColorModeToggle';
import { cn } from '@/lib/utils';

/**
 * Trio de controles do header — menu hambúrguer (ferramentas do operador),
 * rádio institucional (Jovem Pan ao vivo) e alternador de tema claro/escuro.
 * Único ponto de montagem para não divergir estilo entre páginas.
 */
export function OperatorHeaderControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AgentQuickServicesMenu variant="header" />
      <RadioPlayerWidget variant="header" />
      <ColorModeToggle variant="header" />
    </div>
  );
}
