import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface NavItemDef {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface SidebarNavItemProps {
  item: NavItemDef;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function SidebarNavItem({ item, onClick }: SidebarNavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium tracking-tight transition-all',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
          isActive ? 'bg-white/15' : 'bg-sidebar-accent/70 text-sidebar-foreground/60 group-hover:text-primary',
        )}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

interface SidebarSectionLabelProps {
  children: React.ReactNode;
  accent?: boolean;
}

export function SidebarSectionLabel({ children, accent }: SidebarSectionLabelProps) {
  return (
    <p
      className={cn(
        'px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.16em]',
        accent ? 'text-primary/75' : 'text-sidebar-foreground/45',
      )}
    >
      {children}
    </p>
  );
}

export function SidebarDivider() {
  return <div className="my-3 h-px bg-sidebar-border/70" />;
}
