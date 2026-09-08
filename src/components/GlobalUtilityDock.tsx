import { useAuth } from '@/contexts/AuthContext';
import { ColorModeToggle } from './ColorModeToggle';
import { RadioPlayerWidget } from './RadioPlayerWidget';
import { AgentQuickServicesMenu } from './AgentQuickServicesMenu';

/**
 * Dock flutuante global — presente em toda a aplicação (renderizado uma
 * única vez fora do <Routes>, ao lado do PWAInstallPrompt). Reúne:
 * alternador de modo claro/escuro, player de rádio (Jovem Pan) e, para
 * agentes autenticados, o menu de serviços úteis.
 */
export function GlobalUtilityDock() {
  const { user, masterSession } = useAuth();
  const isAuthed = !!user || !!masterSession;

  return (
    <div
      className="fixed right-4 z-[65] flex flex-col items-center gap-2.5 sm:right-6"
      style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}
    >
      {isAuthed && <AgentQuickServicesMenu />}
      <RadioPlayerWidget />
      <ColorModeToggle />
    </div>
  );
}
