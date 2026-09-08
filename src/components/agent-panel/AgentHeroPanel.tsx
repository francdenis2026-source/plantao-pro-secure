import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays, differenceInHours, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Shield, Zap, Clock, Calendar, TrendingUp, Activity, 
  ChevronRight, Star, Sun, Moon, Target, Flame, Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useServerTime } from '@/hooks/useServerTime';


interface AgentHeroPanelProps {
  agentId: string;
  agentName: string;
  agentTeam?: string | null;
}

interface NextShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
}

interface QuickStats {
  totalShifts: number;
  completedShifts: number;
  bhBalance: number;
  pendingLeaves: number;
}

export function AgentHeroPanel({ agentId, agentName, agentTeam }: AgentHeroPanelProps) {
  const [nextShift, setNextShift] = useState<NextShift | null>(null);
  const [stats, setStats] = useState<QuickStats>({ totalShifts: 0, completedShifts: 0, bhBalance: 0, pendingLeaves: 0 });
  const currentTime = useServerTime(1000);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch next shift
        const today = format(new Date(), 'yyyy-MM-dd');
        const { data: shiftData } = await supabase
          .from('agent_shifts')
          .select('id, shift_date, start_time, end_time')
          .eq('agent_id', agentId)
          .gte('shift_date', today)
          .eq('status', 'scheduled')
          .order('shift_date', { ascending: true })
          .limit(1);

        if (shiftData && shiftData.length > 0) {
          setNextShift(shiftData[0]);
        }

        // Fetch quick stats
        const [shiftsRes, bhRes, leavesRes] = await Promise.all([
          supabase
            .from('agent_shifts')
            .select('id, status')
            .eq('agent_id', agentId),
          supabase.rpc('calculate_bh_balance', { p_agent_id: agentId }),
          supabase
            .from('agent_leaves')
            .select('id')
            .eq('agent_id', agentId)
            .eq('status', 'pending')
        ]);

        const totalShifts = shiftsRes.data?.length || 0;
        const completedShifts = shiftsRes.data?.filter(s => s.status === 'completed').length || 0;

        setStats({
          totalShifts,
          completedShifts,
          bhBalance: bhRes.data || 0,
          pendingLeaves: leavesRes.data?.length || 0
        });
      } catch (error) {
        console.error('Error fetching hero data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agentId]);

  const getTimeUntilShift = () => {
    if (!nextShift) return null;
    
    const shiftDate = parseISO(nextShift.shift_date);
    const [hours, minutes] = (nextShift.start_time || '07:00').split(':').map(Number);
    shiftDate.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const diffMs = shiftDate.getTime() - now.getTime();
    
    if (diffMs < 0) return null;
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const getShiftContext = () => {
    if (!nextShift) return { label: 'Sem plantões', color: 'text-slate-400', urgent: false };
    
    const shiftDate = parseISO(nextShift.shift_date);
    
    if (isToday(shiftDate)) {
      return { label: 'HOJE', color: 'text-emerald-400', urgent: true };
    }
    if (isTomorrow(shiftDate)) {
      return { label: 'AMANHÃ', color: 'text-amber-400', urgent: true };
    }
    
    const days = differenceInDays(shiftDate, startOfDay(new Date()));
    return { label: `Em ${days} dias`, color: 'text-cyan-400', urgent: false };
  };

  const firstName = agentName.split(' ')[0];
  const shiftContext = getShiftContext();
  const timeUntil = getTimeUntilShift();
  const completionRate = stats.totalShifts > 0 
    ? Math.round((stats.completedShifts / stats.totalShifts) * 100) 
    : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800/95 to-zinc-900 border border-zinc-700/60 shadow-2xl">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Scan Line Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-full animate-scan" 
          style={{ animation: 'scan 4s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10 p-2 md:p-4">
        {/* Top Bar - Status & Time */}
        <div className="flex items-center justify-between mb-1.5 md:mb-3">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Shield className="h-3.5 w-3.5 md:h-5 md:w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900 flex items-center justify-center">
                <Zap className="h-2 w-2 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] md:text-[10px] text-zinc-400 uppercase tracking-wider font-medium leading-tight">Agente</p>
              <h2 className="text-xs md:text-base font-bold text-white leading-tight truncate">{firstName}</h2>
            </div>
          </div>

          {/* Live Clock */}
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1 md:gap-1.5 text-zinc-400">
              <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider truncate max-w-[70px] md:max-w-none">{format(currentTime, "EEEE", { locale: ptBR })}</span>
            </div>
            <p className="text-sm md:text-lg font-mono font-bold text-white tabular-nums leading-tight">
              {format(currentTime, 'HH:mm:ss')}
            </p>
          </div>
        </div>


        {/* Main Hero Content - Next Shift Countdown */}
        <div className="bg-zinc-800/60 backdrop-blur-sm rounded-lg border border-zinc-700/50 p-1.5 md:p-3 mb-1.5 md:mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Timer className={cn("h-3.5 w-3.5", shiftContext.urgent ? "animate-pulse" : "", shiftContext.color)} />
                <span className={cn("text-[10px] md:text-xs font-bold uppercase tracking-wider", shiftContext.color)}>
                  {shiftContext.label}
                </span>
              </div>
              
              {nextShift ? (
                <div className="space-y-0.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl md:text-2xl font-black text-white tabular-nums leading-none">
                      {timeUntil || '--:--'}
                    </span>
                    <span className="text-[9px] md:text-[10px] text-zinc-500 uppercase">até o plantão</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-zinc-400">
                    <Calendar className="h-3 w-3" />
                    <span>{format(parseISO(nextShift.shift_date), "dd 'de' MMMM", { locale: ptBR })}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono">{nextShift.start_time?.slice(0, 5) || '07:00'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Nenhum plantão agendado</p>
              )}
            </div>
            
            {/* Visual Indicator */}
            <div className="hidden sm:flex relative shrink-0">
              <div className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center",
                shiftContext.urgent 
                  ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50"
                  : "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
              )}>
                {shiftContext.urgent ? (
                  <Flame className="h-6 w-6 md:h-7 md:w-7 text-amber-400 animate-pulse" />
                ) : (
                  <Target className="h-6 w-6 md:h-7 md:w-7 text-cyan-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid - Compact with truncation */}
        <div className="grid grid-cols-4 gap-1 md:gap-1.5">
          {[
            { 
              label: 'Total', 
              value: stats.totalShifts.toString(), 
              icon: Calendar, 
              color: 'from-cyan-500/20 to-cyan-600/10',
              iconColor: 'text-cyan-400',
              borderColor: 'border-cyan-500/30'
            },
            { 
              label: 'Taxa', 
              value: `${completionRate}%`, 
              icon: TrendingUp, 
              color: 'from-emerald-500/20 to-emerald-600/10',
              iconColor: 'text-emerald-400',
              borderColor: 'border-emerald-500/30'
            },
            { 
              label: 'BH', 
              value: `${stats.bhBalance >= 0 ? '+' : ''}${stats.bhBalance}`, 
              icon: Activity, 
              color: stats.bhBalance >= 0 ? 'from-blue-500/20 to-blue-600/10' : 'from-rose-500/20 to-rose-600/10',
              iconColor: stats.bhBalance >= 0 ? 'text-blue-400' : 'text-rose-400',
              borderColor: stats.bhBalance >= 0 ? 'border-blue-500/30' : 'border-rose-500/30'
            },
            { 
              label: 'Folgas', 
              value: stats.pendingLeaves.toString(), 
              icon: Star, 
              color: 'from-purple-500/20 to-purple-600/10',
              iconColor: 'text-purple-400',
              borderColor: 'border-purple-500/30'
            },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "relative p-1 md:p-2 rounded-md border backdrop-blur-sm transition-all hover:scale-[1.02] overflow-hidden",
                `bg-gradient-to-br ${stat.color}`,
                stat.borderColor
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <stat.icon className={cn("h-2.5 w-2.5 md:h-3.5 md:w-3.5 mb-0.5", stat.iconColor)} />
              <p className="text-xs md:text-base font-bold text-white tabular-nums leading-none truncate">
                {stat.value}
              </p>
              <p className="text-[8px] md:text-[9px] text-zinc-500 uppercase tracking-wide mt-0.5 truncate">
                {stat.label}
              </p>
            </div>

          ))}
        </div>
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
