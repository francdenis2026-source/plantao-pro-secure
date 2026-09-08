import { Bell } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { NextShiftCard } from './NextShiftCard';
import { WeekStrip } from './WeekStrip';
import { HomeKpiRow } from './HomeKpiRow';
import { SwapCenterCard } from './SwapCenterCard';
import { ActivityAndQuickAccess } from './ActivityAndQuickAccess';
import { useNextShift, useWeekShifts, useHomeCounts, usePendingSwaps, useRecentActivity } from './useHomeDashboardData';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Home autenticada — responde em segundos "qual meu próximo plantão / como
 * está minha semana / existe algo que precisa de atenção" (Seção 13).
 * Sem hero gigante: o primeiro conteúdo é o card do próximo plantão.
 */
export function AgentHomeDashboard() {
  const { user } = useAuth();
  const { agent, isLoading: agentLoading } = useAgentProfile();

  const nextShiftQ = useNextShift(agent?.id);
  const weekShiftsQ = useWeekShifts(agent?.id);
  const countsQ = useHomeCounts(agent?.id);
  const swapsQ = usePendingSwaps(agent?.id);
  const activityQ = useRecentActivity(agent?.id);

  const firstName = agent?.name?.split(' ')[0] ?? 'Agente';

  if (agentLoading) {
    return (
      <div className="flex min-h-[100dvh]">
        <Sidebar />
        <div className="flex-1 p-6"><Skeleton className="h-40 w-full rounded-2xl" /></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="hidden sm:block" />
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notificações">
              <Bell className="h-5 w-5" />
              {(countsQ.data?.notices ?? 0) > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={agent?.avatar_url ?? undefined} />
                <AvatarFallback>{firstName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-tight text-foreground">{agent?.name ?? user?.email}</p>
                <p className="text-xs leading-tight text-muted-foreground">Agente Socioeducativo</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 space-y-5 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{greeting()}, {firstName}!</h1>
            <p className="text-sm text-muted-foreground">
              {(countsQ.data?.today ?? 0) > 0 ? 'Você tem um plantão hoje.' : 'Sua escala está tranquila hoje.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NextShiftCard shift={nextShiftQ.data} unitName={agent?.unit?.name ?? null} team={agent?.team ?? null} />
            </div>
            <SwapCenterCard swaps={swapsQ.data ?? []} />
          </div>

          <HomeKpiRow counts={countsQ.data ?? { today: 0, upcoming: 0, swaps: 0, notices: 0 }} />

          <WeekStrip shifts={weekShiftsQ.data ?? []} />

          <ActivityAndQuickAccess activity={activityQ.data ?? []} />
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
