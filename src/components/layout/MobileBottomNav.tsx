import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, ShieldCheck, ArrowLeftRight, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavItem {
  icon: typeof Home;
  label: string;
  href: string;
  match: (pathname: string) => boolean;
}

const ITEMS: BottomNavItem[] = [
  { icon: Home, label: 'Início', href: '/', match: (p) => p === '/' },
  { icon: CalendarDays, label: 'Escala', href: '/agenda', match: (p) => p.startsWith('/agenda') },
  { icon: ShieldCheck, label: 'Rondas', href: '/rondas', match: (p) => p.startsWith('/rondas') },
  { icon: ArrowLeftRight, label: 'Trocas', href: '/agent-panel?tab=trocas', match: (p) => p.startsWith('/agent-panel') && p.includes('trocas') },
  { icon: UserCircle, label: 'Perfil', href: '/agent-profile', match: (p) => p.startsWith('/agent-profile') },
];

/**
 * Navegação inferior mobile (Seção 10). Substitui a sidebar em telas
 * pequenas — nada de versão desktop apenas encolhida. Respeita a safe-area
 * do dispositivo e alvos de toque >= 44px.
 */
export function MobileBottomNav() {
  const { pathname, search } = useLocation();
  const fullPath = pathname + search;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegação principal"
    >
      {ITEMS.map((item) => {
        const isActive = item.match(item.href.includes('?') ? fullPath : pathname);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
