import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight, LucideIcon } from 'lucide-react';

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
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
        'text-sm font-medium tracking-tight',
        isActive
          ? 'bg-sidebar-accent text-sidebar-primary'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full transition-all',
          isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/40'
        )}
      />
      <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
      <span className="flex-1 truncate">{item.label}</span>
      <ChevronRight
        className={cn(
          'h-3.5 w-3.5 transition-opacity',
          isActive ? 'opacity-60 text-primary' : 'opacity-0 group-hover:opacity-40'
        )}
      />
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
        'px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em]',
        accent ? 'text-primary/70' : 'text-muted-foreground/70'
      )}
    >
      {children}
    </p>
  );
}

export function SidebarDivider() {
  return <div className="my-3 h-px bg-sidebar-border/60" />;
}
