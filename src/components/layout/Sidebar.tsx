import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { notifyRestrictedAccess } from '@/lib/restrictedAccess';
import { AppLogo } from '@/components/AppLogo';

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

function initials(name?: string | null): string {
  if (!name) return '--';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '--';
}

export const Sidebar = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  (props, ref) => {
    const { masterSession, user, isAdmin } = useAuth();
    const { agent } = useAgentProfile();
    const isAuthed = !!user || !!masterSession;

    const guard = (label: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isAuthed) {
        e.preventDefault();
        notifyRestrictedAccess(label);
      }
    };

    return (
      <aside
        ref={ref}
        {...props}
        className={cn(
          'w-64 border-r border-sidebar-border bg-sidebar hidden lg:flex flex-col',
          props.className,
        )}
      >
        {/* Brand */}
        <div className="relative shrink-0 overflow-hidden px-5 pt-6 pb-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.9]"
            style={{ background: 'linear-gradient(160deg, hsl(var(--primary) / 0.10) 0%, transparent 65%)' }}
          />
          <Link to="/dashboard" className="relative flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
              <AppLogo size={44} title="PlantãoPro" />
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

        {/* Identidade do agente logado — cartão compacto, contexto imediato */}
        {(agent || masterSession) && (
          <div className="mx-4 mb-1 mt-3 flex items-center gap-2.5 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/50 px-3 py-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary ring-1 ring-primary/25">
              {masterSession ? 'MS' : initials(agent?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold leading-tight text-sidebar-foreground">
                {masterSession ? 'Administrador Master' : (agent?.name ?? 'Agente')}
              </p>
              <p className="truncate text-[10.5px] leading-tight text-sidebar-foreground/50">
                {masterSession ? 'Acesso nível 10' : (agent?.unit?.name ?? 'Sem unidade')}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-0.5">
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

        {/* Lema institucional — discreto, sem imagem de fundo (mais limpo e
            sem depender de contraste de foto atrás de texto). */}
        <div className="shrink-0 border-t border-sidebar-border/70 px-5 py-3.5">
          <p className="text-[9.5px] font-semibold uppercase leading-snug tracking-[0.14em] text-sidebar-foreground/55">
            Agentes Socioeducativos do Acre
          </p>
          <p className="mt-1 text-[9.5px] italic leading-snug text-sidebar-foreground/35">
            Disciplina · Respeito · Sociedade · Mais Oportunidades
          </p>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-sidebar-border/70 px-5 py-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
            v1.0
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/35">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Online
          </span>
        </div>
      </aside>
    );
  },
);

Sidebar.displayName = 'Sidebar';
