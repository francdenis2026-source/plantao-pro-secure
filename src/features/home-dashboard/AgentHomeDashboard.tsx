import { Bell, Search } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { HomeHeroBanner } from './HomeHeroBanner';
import { NextShiftCard } from './NextShiftCard';
import { QuickActionsCard } from './QuickActionsCard';
import { WeekStrip } from './WeekStrip';
import { HomeKpiRow } from './HomeKpiRow';
import { SwapCenterCard } from './SwapCenterCard';
import { ActivityAndQuickAccess } from './ActivityAndQuickAccess';
import { DeveloperSignature } from '@/components/DeveloperSignature';
import { useNextShift, useWeekShifts, useHomeCounts, usePendingSwaps, useRecentActivity } from './useHomeDashboardData';

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
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por colega, data ou unidade..." className="pl-9" />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notificações">
              <Bell className="h-5 w-5" />
              {(countsQ.data?.notices ?? 0) > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {countsQ.data?.notices}
                </span>
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
          <HomeHeroBanner
            firstName={firstName}
            subtitle={(countsQ.data?.today ?? 0) > 0 ? 'Você tem um plantão hoje.' : 'Sua escala está tranquila hoje.'}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <NextShiftCard shift={nextShiftQ.data} unitName={agent?.unit?.name ?? null} team={agent?.team ?? null} />
            </div>
            <QuickActionsCard />
          </div>

          <HomeKpiRow counts={countsQ.data ?? { today: 0, upcoming: 0, swaps: 0, notices: 0 }} />

          <WeekStrip shifts={weekShiftsQ.data ?? []} unitName={agent?.unit?.name} team={agent?.team} />

          <SwapCenterCard swaps={swapsQ.data ?? []} agentId={agent?.id} />

          <ActivityAndQuickAccess activity={activityQ.data ?? []} />

          <div className="flex justify-center pt-2">
            <DeveloperSignature compact />
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
