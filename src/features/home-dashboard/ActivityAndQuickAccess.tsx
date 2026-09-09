import { useNavigate } from 'react-router-dom';
import { History, LayoutGrid, CalendarDays, ArrowLeftRight, Users, MessageCircle, ShieldCheck, HelpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActivityRow } from './useHomeDashboardData';

function fmtRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

const ACTION_LABEL: Record<string, string> = {
  create: 'criou',
  update: 'atualizou',
  delete: 'removeu',
  login: 'entrou no sistema',
  logout: 'saiu do sistema',
};

export function ActivityAndQuickAccess({ activity, isLoading }: { activity: ActivityRow[]; isLoading?: boolean }) {
  const navigate = useNavigate();
  const quickLinks = [
    { label: 'Minha escala', icon: CalendarDays, href: '/agenda' },
    { label: 'Trocas', icon: ArrowLeftRight, href: '/agent-panel?tab=permutas' },
    { label: 'Equipe', icon: Users, href: '/agent-panel?tab=equipe' },
    { label: 'Chat', icon: MessageCircle, href: '/agent-panel?tab=chat' },
    { label: 'Rondas', icon: ShieldCheck, href: '/rondas' },
    { label: 'Ajuda', icon: HelpCircle, href: '/about' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-primary" /> Atividade recente
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Sem atividade recente.</p>
        ) : (
          <div className="space-y-2.5">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-sm">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <p className="min-w-0 flex-1 text-foreground">
                  <span className="font-medium">{a.agent_name ?? 'Alguém'}</span>{' '}
                  <span className="text-muted-foreground">{ACTION_LABEL[a.action] ?? a.action}</span>
                  <span className="block text-xs text-muted-foreground">{fmtRelative(a.created_at)}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <LayoutGrid className="h-4 w-4 text-primary" /> Acesso rápido
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((l) => (
            <button
              key={l.label}
              onClick={() => navigate(l.href)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border py-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <l.icon className="h-4 w-4 text-primary" strokeWidth={2.2} />
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
