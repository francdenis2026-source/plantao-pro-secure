import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RestrictedAccessDialog } from '@/components/auth/RestrictedAccessDialog';
import { BrasaoSentinela } from '@/components/BrasaoSentinela';

import {
  Users,
  Clock,
  LayoutDashboard,
  Settings,
  Shield,
  MapPin,
  UserCircle,
  ClipboardCheck,
  Home,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  SidebarNavItem,
  SidebarSectionLabel,
  SidebarDivider,
  type NavItemDef,
} from './SidebarNav';

const navItems: NavItemDef[] = [
  { icon: Home, label: 'Início', href: '/?home=1' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: UserCircle, label: 'Meu Painel', href: '/agent-panel' },
  { icon: ShieldCheck, label: 'Rondas', href: '/rondas' },
  { icon: Users, label: 'Agentes', href: '/agents' },
  { icon: Clock, label: 'Banco de Horas', href: '/overtime' },
  { icon: MapPin, label: 'Unidades', href: '/units' },
  { icon: Settings, label: 'Configurações', href: '/settings' },
];

const adminItems: NavItemDef[] = [
  { icon: Building2, label: 'Gerenciar Unidades', href: '/units' },
  { icon: ClipboardCheck, label: 'Auditoria de Unidades', href: '/admin/units-audit' },
];

const masterItems: NavItemDef[] = [
  { icon: Shield, label: 'Painel Master', href: '/master' },
  { icon: ClipboardCheck, label: 'Auditoria de Unidades', href: '/admin/units-audit' },
];

interface MobileSidebarProps {
  onNavigate: () => void;
}

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  const { masterSession, user, isAdmin } = useAuth();
  const [restricted, setRestricted] = useState<string | null>(null);
  const isAuthed = !!user || !!masterSession;


  const handleClick =
    (label: string, isMaster = false) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isAuthed && !isMaster) {
        e.preventDefault();
        setRestricted(label);
        return;
      }
      onNavigate();
    };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand */}
      <div className="relative shrink-0 overflow-hidden px-5 pt-6 pb-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(160deg, hsl(var(--primary) / 0.10) 0%, transparent 65%)' }}
        />
        <Link to="/dashboard" className="relative flex items-center gap-3" onClick={onNavigate}>
          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
            <BrasaoSentinela size="100%" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold leading-none tracking-wide text-sidebar-foreground">
              Plantão<span className="text-primary">Pro</span>
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              Comando Operacional
            </p>
          </div>
        </Link>
        <div
          aria-hidden
          className="absolute inset-x-5 bottom-0 h-px"
          style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.35), transparent 75%)' }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
        <SidebarSectionLabel>Navegação</SidebarSectionLabel>
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            onClick={handleClick(item.label)}
          />
        ))}

        {isAdmin && !masterSession && (
          <>
            <SidebarDivider />
            <SidebarSectionLabel accent>Administração</SidebarSectionLabel>
            {adminItems.map((item) => (
              <SidebarNavItem
                key={`admin-${item.href}`}
                item={item}
                onClick={handleClick(item.label, true)}
              />
            ))}
          </>
        )}

        {masterSession && (
          <>
            <SidebarDivider />
            <SidebarSectionLabel accent>Master</SidebarSectionLabel>
            {masterItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                onClick={handleClick(item.label, true)}
              />
            ))}
          </>
        )}
      </nav>


      {/* Footer */}
      <div className="px-5 py-3 border-t border-sidebar-border/60 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          v1.0
        </span>
        <span className="text-[10px] text-muted-foreground/60">© PlantaoPro</span>
      </div>

      <RestrictedAccessDialog
        open={!!restricted}
        onOpenChange={(o) => !o && setRestricted(null)}
        targetLabel={restricted ?? undefined}
      />
    </div>
  );
}
