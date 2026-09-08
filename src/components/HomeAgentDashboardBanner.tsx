import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Clock, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  Shield,
  Sword,
  Target,
  Zap,
  Crown,
  Building2,
  Timer,
  DollarSign,
  FileText,
  AlertCircle,
  ChevronRight,
  Sparkles,
  BarChart3,
  CalendarDays,
  Bell
} from 'lucide-react';
import { format, differenceInDays, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface BHSummary {
  totalHours: number;
  creditHours: number;
  debitHours: number;
  entriesCount: number;
  estimatedValue: number;
}

interface ShiftInfo {
  date: string;
  startTime: string;
  endTime: string;
  daysUntil: number;
  isToday: boolean;
  isTomorrow: boolean;
}

interface AnnouncementInfo {
  title: string;
  priority: string;
}

export function HomeAgentDashboardBanner() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const { themeConfig } = useTheme();
  const navigate = useNavigate();
  
  const [bhSummary, setBhSummary] = useState<BHSummary | null>(null);
  const [nextShift, setNextShift] = useState<ShiftInfo | null>(null);
  const [totalShifts, setTotalShifts] = useState(0);
  const [announcement, setAnnouncement] = useState<AnnouncementInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!agent?.id) return;

    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const currentMonthStr = format(new Date(), 'MM/yyyy');

      // Fetch BH data for current month
      const { data: bhData } = await supabase
        .from('overtime_bank')
        .select('hours, description')
        .eq('agent_id', agent.id);

      if (bhData) {
        // Filter to current month based on description pattern
        const monthEntries = bhData.filter(entry => 
          entry.description?.includes(currentMonthStr)
        );

        const summary: BHSummary = {
          totalHours: 0,
          creditHours: 0,
          debitHours: 0,
          entriesCount: monthEntries.length,
          estimatedValue: 0,
        };

        monthEntries.forEach(entry => {
          const hours = entry.hours || 0;
          summary.totalHours += hours;
          if (hours > 0) {
            summary.creditHours += hours;
          } else {
            summary.debitHours += Math.abs(hours);
          }
        });

        // Get hourly rate
        const hourlyRate = (agent as any).bh_hourly_rate || 50;
        summary.estimatedValue = summary.totalHours * hourlyRate;

        setBhSummary(summary);
      }

      // Fetch next shift
      const { data: shifts } = await supabase
        .from('agent_shifts')
        .select('shift_date, start_time, end_time')
        .eq('agent_id', agent.id)
        .gte('shift_date', today)
        .order('shift_date', { ascending: true })
        .limit(1);

      if (shifts?.[0]) {
        const shiftDate = parseISO(shifts[0].shift_date);
        setNextShift({
          date: shifts[0].shift_date,
          startTime: shifts[0].start_time?.slice(0, 5) || '07:00',
          endTime: shifts[0].end_time?.slice(0, 5) || '19:00',
          daysUntil: differenceInDays(shiftDate, new Date()),
          isToday: isToday(shiftDate),
          isTomorrow: isTomorrow(shiftDate),
        });
      }

      // Count total shifts this month
      const { count: shiftsCount } = await supabase
        .from('agent_shifts')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .gte('shift_date', monthStart)
        .lte('shift_date', monthEnd);

      setTotalShifts(shiftsCount || 0);

      // Fetch active announcement
      const { data: announcements } = await supabase
        .from('admin_announcements')
        .select('title, priority')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .limit(1);

      if (announcements?.[0]) {
        setAnnouncement({
          title: announcements[0].title,
          priority: announcements[0].priority,
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Don't show for visitors
  if (!user || !agent) {
    return null;
  }

  // Get team config
  const getTeamConfig = (team: string | null) => {
    switch (team?.toUpperCase()) {
      case 'ALFA': return { 
        color: 'from-red-500/30 to-rose-600/20 border-red-500/40',
        badge: 'bg-red-500/20 text-red-400 border-red-500/40',
        icon: <Shield className="h-4 w-4" />
      };
      case 'BRAVO': return { 
        color: 'from-blue-500/30 to-indigo-600/20 border-blue-500/40',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        icon: <Sword className="h-4 w-4" />
      };
      case 'CHARLIE': return { 
        color: 'from-emerald-500/30 to-green-600/20 border-emerald-500/40',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        icon: <Target className="h-4 w-4" />
      };
      case 'DELTA': return { 
        color: 'from-amber-500/30 to-orange-600/20 border-amber-500/40',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        icon: <Zap className="h-4 w-4" />
      };
      default: return { 
        color: 'from-primary/30 to-primary/20 border-primary/40',
        badge: 'bg-primary/20 text-primary border-primary/40',
        icon: <Crown className="h-4 w-4" />
      };
    }
  };

  const teamConfig = getTeamConfig(agent.team);
  const firstName = agent.name?.split(' ')[0] || 'Agente';
  const unitName = agent.unit?.name || '';
  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  const handleNavigateToPanel = () => {
    navigate('/agent-panel');
  };

  return (
    <div className="w-full animate-fade-in">
      <div className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br",
        teamConfig.color,
        "border shadow-2xl",
        "backdrop-blur-xl"
      )}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${themeConfig.colors.primary} 0%, transparent 50%),
                             radial-gradient(circle at 80% 50%, ${themeConfig.colors.primary} 0%, transparent 50%)`,
          }} />
        </div>

        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="relative z-10 p-4">
          {/* Header: Agent identity */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                {agent.avatar_url ? (
                  <img 
                    src={agent.avatar_url} 
                    alt={agent.name || 'Avatar'}
                    className="h-12 w-12 rounded-xl object-cover border-2 border-white/20 shadow-lg"
                  />
                ) : (
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-white/10 to-white/5",
                    "border-2 border-white/20"
                  )}>
                    <span className="text-lg font-bold text-white">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Name + Team + Unit */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{firstName}</h3>
                  {agent.team && (
                    <span className={cn(
                      "flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-lg border",
                      teamConfig.badge
                    )}>
                      {teamConfig.icon}
                      {agent.team}
                    </span>
                  )}
                </div>
                {unitName && (
                  <div className="flex items-center gap-1 text-xs text-white/60">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{unitName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick action button */}
            <button
              onClick={handleNavigateToPanel}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl",
                "bg-white/10 hover:bg-white/20 border border-white/20",
                "text-white text-xs font-medium transition-all",
                "hover:scale-105 active:scale-95"
              )}
            >
              <span>Painel</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Announcement banner if exists */}
          {announcement && (
            <div className={cn(
              "mb-4 px-3 py-2 rounded-xl flex items-center gap-2",
              announcement.priority === 'urgent' 
                ? "bg-red-500/20 border border-red-500/40" 
                : "bg-amber-500/20 border border-amber-500/40"
            )}>
              <Bell className={cn(
                "h-4 w-4 shrink-0",
                announcement.priority === 'urgent' ? "text-red-400" : "text-amber-400"
              )} />
              <p className="text-xs text-white/90 truncate flex-1">{announcement.title}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Next Shift Card */}
            <button
              onClick={handleNavigateToPanel}
              className={cn(
                "bg-slate-900/40 hover:bg-slate-900/60 rounded-xl p-3 text-left transition-all",
                "border border-white/10 hover:border-white/20",
                "group"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1">
                <CalendarCheck className="h-3 w-3" />
                <span>Próximo Plantão</span>
              </div>
              {nextShift ? (
                <>
                  <div className={cn(
                    "text-lg font-bold",
                    nextShift.isToday ? "text-red-400" : nextShift.isTomorrow ? "text-amber-400" : "text-white"
                  )}>
                    {nextShift.isToday ? 'HOJE' : nextShift.isTomorrow ? 'AMANHÃ' : `${nextShift.daysUntil}d`}
                  </div>
                  <div className="text-[10px] text-white/60">
                    {nextShift.startTime} - {nextShift.endTime}
                  </div>
                </>
              ) : (
                <div className="text-sm text-white/40">Sem plantão</div>
              )}
            </button>

            {/* Shifts This Month */}
            <button
              onClick={handleNavigateToPanel}
              className={cn(
                "bg-slate-900/40 hover:bg-slate-900/60 rounded-xl p-3 text-left transition-all",
                "border border-white/10 hover:border-white/20",
                "group"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1">
                <CalendarDays className="h-3 w-3" />
                <span>Plantões no Mês</span>
              </div>
              <div className="text-lg font-bold text-white">{totalShifts}</div>
              <div className="text-[10px] text-white/60 capitalize truncate">{currentMonth}</div>
            </button>

            {/* BH Balance */}
            <button
              onClick={handleNavigateToPanel}
              className={cn(
                "bg-slate-900/40 hover:bg-slate-900/60 rounded-xl p-3 text-left transition-all",
                "border border-white/10 hover:border-white/20",
                "group"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1">
                <BarChart3 className="h-3 w-3" />
                <span>BH do Mês</span>
              </div>
              {bhSummary ? (
                <>
                  <div className={cn(
                    "text-lg font-bold flex items-center gap-1",
                    bhSummary.totalHours >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {bhSummary.totalHours >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {bhSummary.totalHours >= 0 ? '+' : ''}{bhSummary.totalHours.toFixed(0)}h
                  </div>
                  <div className="text-[10px] text-white/60">
                    {bhSummary.entriesCount} {bhSummary.entriesCount === 1 ? 'registro' : 'registros'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-white/40">0h</div>
              )}
            </button>

            {/* Estimated Value */}
            <button
              onClick={handleNavigateToPanel}
              className={cn(
                "bg-slate-900/40 hover:bg-slate-900/60 rounded-xl p-3 text-left transition-all",
                "border border-white/10 hover:border-white/20",
                "group"
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1">
                <DollarSign className="h-3 w-3" />
                <span>Valor BH</span>
              </div>
              <div className={cn(
                "text-lg font-bold",
                (bhSummary?.estimatedValue || 0) >= 0 ? "text-amber-400" : "text-rose-400"
              )}>
                R$ {Math.abs(bhSummary?.estimatedValue || 0).toFixed(0)}
              </div>
              <div className="text-[10px] text-white/60">Estimado</div>
            </button>
          </div>

          {/* Quick tip */}
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-white/40">
            <Sparkles className="h-3 w-3" />
            <span>Toque em qualquer card para acessar seu painel</span>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </div>
  );
}
