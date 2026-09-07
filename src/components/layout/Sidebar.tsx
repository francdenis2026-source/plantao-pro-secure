import React, { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { RestrictedAccessDialog } from '@/components/auth/RestrictedAccessDialog';
import plantaoproLogo_ptr from '@/assets/brand/plantaopro-logo.png.asset.json';
const plantaoproLogo = (plantaoproLogo_ptr as {url:string}).url;

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

export const Sidebar = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  (props, ref) => {
    const { masterSession, user, isAdmin } = useAuth();
    const [restricted, setRestricted] = useState<string | null>(null);
    const isAuthed = !!user || !!masterSession;

    const guard = (label: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isAuthed) {
        e.preventDefault();
        setRestricted(label);
      }
    };

    return (
      <aside
        ref={ref}
        {...props}
        className={cn(
          'w-64 border-r border-sidebar-border bg-sidebar hidden lg:flex flex-col',
          props.className
        )}
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-4 border-b border-sidebar-border/60">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
              <img src={plantaoproLogo} alt="PlantãoPro" className="w-full h-full object-contain" />
            </div>

            <div className="min-w-0">
              <h1 className="font-display text-base leading-none tracking-wide text-gradient">
                PlantaoPro
              </h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
                Comando Operacional
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <SidebarSectionLabel>Navegação</SidebarSectionLabel>
          {navItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} onClick={guard(item.label)} />
          ))}

          {isAdmin && !masterSession && (
            <>
              <SidebarDivider />
              <SidebarSectionLabel accent>Administração</SidebarSectionLabel>
              {adminItems.map((item) => (
                <SidebarNavItem key={`admin-${item.href}`} item={item} />
              ))}
            </>
          )}

          {masterSession && (
            <>
              <SidebarDivider />
              <SidebarSectionLabel accent>Master</SidebarSectionLabel>
              {masterItems.map((item) => (
                <SidebarNavItem key={item.href} item={item} />
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sidebar-border/60 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            v1.0
          </span>
          <span className="text-[10px] text-muted-foreground/60">CS FEIJÓ</span>
        </div>

        <RestrictedAccessDialog
          open={!!restricted}
          onOpenChange={(o) => !o && setRestricted(null)}
          targetLabel={restricted ?? undefined}
        />
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';

