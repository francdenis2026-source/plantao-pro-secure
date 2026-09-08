import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ColorModeToggle } from './ColorModeToggle';
import { RadioPlayerWidget } from './RadioPlayerWidget';
import { AgentQuickServicesMenu } from './AgentQuickServicesMenu';

/**
 * Dock flutuante global — presente em toda a aplicação (renderizado uma
 * única vez fora do <Routes>, ao lado do PWAInstallPrompt). Reúne:
 * alternador de modo claro/escuro, player de rádio (Jovem Pan) e, para
 * agentes autenticados, o menu de serviços úteis.
 *
 * Na rota "/" esses mesmos controles já aparecem no header (banner público
 * ou painel do agente), então o dock fica oculto lá para não duplicar.
 */
export function GlobalUtilityDock() {
  const { user, masterSession } = useAuth();
  const { pathname } = useLocation();
  const isAuthed = !!user || !!masterSession;
  const hasHeaderControls = pathname === '/';

  if (hasHeaderControls) return null;

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
