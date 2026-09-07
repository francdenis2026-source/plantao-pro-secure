import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgentProfile } from '@/hooks/useAgentProfile';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useBannerCache } from '@/hooks/useBannerCache';
import { 
  Clock, 
  Calendar, 
  AlertCircle, 
  Bell, 
  TrendingUp, 
  Users, 
  ChevronRight,
  Sparkles,
  Timer,
  CalendarCheck,
  Shield,
  Sword,
  Target,
  Zap,
  Crown,
  Building2,
  Play
} from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isToday, isTomorrow, parseISO, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentInfoItem {
  id: string;
  type: 'shift' | 'bh' | 'announcement' | 'leave' | 'event' | 'countdown';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
  priority: number;
  shiftDateTime?: Date; // For countdown calculation
}

interface CachedBannerData {
  items: Omit<AgentInfoItem, 'icon'>[];
  nextShiftDateTime?: number; // timestamp
}

export function HomeAgentInfoBanner() {
  const { user } = useAuth();
  const { agent } = useAgentProfile();
  const { themeConfig } = useTheme();
  const [infoItems, setInfoItems] = useState<AgentInfoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [nextShiftDate, setNextShiftDate] = useState<Date | null>(null);
  
  // Cache for 30 seconds to reduce repeated queries
  const cacheKey = `banner-${agent?.id || 'none'}`;
  const { getCachedData, setCachedData, isCacheValid, getCacheAge } = useBannerCache<CachedBannerData>(cacheKey);
  const lastFetchRef = useRef<number>(0);

  // Countdown timer effect
  useEffect(() => {
    if (!nextShiftDate) return;

    const updateCountdown = () => {
      const now = new Date();
      if (nextShiftDate <= now) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const totalSeconds = Math.floor((nextShiftDate.getTime() - now.getTime()) / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextShiftDate]);

  // Helper to add icon to cached item
  const addIconToItem = useCallback((item: Omit<AgentInfoItem, 'icon'>): AgentInfoItem => {
    const iconMap: Record<string, React.ReactNode> = {
      'countdown': <Play className="h-4 w-4" />,
      'shift': <CalendarCheck className="h-4 w-4" />,
      'bh': <TrendingUp className="h-4 w-4" />,
      'event': <Bell className="h-4 w-4" />,
      'leave': <Timer className="h-4 w-4" />,
      'announcement': <AlertCircle className="h-4 w-4" />,
    };
    return { ...item, icon: iconMap[item.type] || <Shield className="h-4 w-4" /> };
  }, []);

  const fetchAgentInfo = useCallback(async (forceRefresh = false) => {
    if (!agent?.id) return;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheValid()) {
      const cached = getCachedData();
      if (cached) {
        const itemsWithIcons = cached.items.map(addIconToItem);
        setInfoItems(itemsWithIcons);
        if (cached.nextShiftDateTime) {
          setNextShiftDate(new Date(cached.nextShiftDateTime));
        }
        setIsVisible(true);
        return;
      }
    }

    const items: Omit<AgentInfoItem, 'icon'>[] = [];
    const today = format(new Date(), 'yyyy-MM-dd');
    let nextShiftDateTime: number | undefined;

    try {
      // 1. Next Shift with countdown
      const { data: shifts } = await supabase
        .from('agent_shifts')
        .select('shift_date, start_time, end_time, shift_type')
        .eq('agent_id', agent.id)
        .gte('shift_date', today)
        .order('shift_date', { ascending: true })
        .limit(1);

      if (shifts?.[0]) {
        const shiftDate = parseISO(shifts[0].shift_date);
        const startTime = shifts[0].start_time?.slice(0, 5) || '07:00';
        const [startHour, startMinute] = startTime.split(':').map(Number);
        
        // Create full datetime for countdown
        const shiftDateTime = setMinutes(setHours(shiftDate, startHour), startMinute);
        setNextShiftDate(shiftDateTime);
        nextShiftDateTime = shiftDateTime.getTime();

        const daysUntil = differenceInDays(shiftDate, new Date());
        let dateLabel = format(shiftDate, "EEEE, dd 'de' MMM", { locale: ptBR });
        
        if (isToday(shiftDate)) {
          dateLabel = 'HOJE';
        } else if (isTomorrow(shiftDate)) {
          dateLabel = 'AMANHÃ';
        }

        // Add countdown item as highest priority
        items.push({
          id: 'countdown',
          type: 'countdown',
          title: `⏱️ Contagem Regressiva`,
          subtitle: dateLabel,
          accentColor: isToday(shiftDate) ? 'text-red-400' : isTomorrow(shiftDate) ? 'text-amber-400' : 'text-emerald-400',
          priority: 110,
        });

        items.push({
          id: 'shift',
          type: 'shift',
          title: `Próximo Plantão: ${dateLabel}`,
          subtitle: `${startTime} - ${shifts[0].end_time?.slice(0, 5) || '19:00'}`,
          accentColor: isToday(shiftDate) ? 'text-red-400' : isTomorrow(shiftDate) ? 'text-amber-400' : 'text-primary',
          priority: isToday(shiftDate) ? 100 : isTomorrow(shiftDate) ? 90 : 50,
        });
      }

      // 2. BH Balance
      const { data: bhData } = await supabase
        .from('overtime_bank')
        .select('hours, operation_type')
        .eq('agent_id', agent.id);

      if (bhData) {
        const balance = bhData.reduce((acc, entry) => {
          return entry.operation_type === 'credit' ? acc + (entry.hours || 0) : acc - (entry.hours || 0);
        }, 0);

        items.push({
          id: 'bh',
          type: 'bh',
          title: `Banco de Horas: ${balance >= 0 ? '+' : ''}${balance.toFixed(0)}h`,
          subtitle: balance >= 0 ? 'Saldo positivo' : 'Saldo a compensar',
          accentColor: balance >= 0 ? 'text-emerald-400' : 'text-amber-400',
          priority: 40,
        });
      }

      // 3. Upcoming Events
      const { data: events } = await supabase
        .from('agent_events')
        .select('title, event_date, event_type')
        .eq('agent_id', agent.id)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1);

      if (events?.[0]) {
        const eventDate = parseISO(events[0].event_date);
        const daysUntil = differenceInDays(eventDate, new Date());

        items.push({
          id: 'event',
          type: 'event',
          title: events[0].title,
          subtitle: daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `Em ${daysUntil} dias`,
          accentColor: 'text-violet-400',
          priority: 60,
        });
      }

      // 4. Active Leaves
      const { data: leaves } = await supabase
        .from('agent_leaves')
        .select('leave_type, start_date, end_date, status')
        .eq('agent_id', agent.id)
        .eq('status', 'approved')
        .or(`start_date.lte.${today},end_date.gte.${today}`)
        .limit(1);

      if (leaves?.[0]) {
        const leaveTypes: Record<string, string> = {
          vacation: 'Férias',
          sick: 'Licença Médica',
          personal: 'Licença Pessoal',
          training: 'Treinamento',
        };

        items.push({
          id: 'leave',
          type: 'leave',
          title: leaveTypes[leaves[0].leave_type] || 'Afastamento',
          subtitle: `Até ${format(parseISO(leaves[0].end_date), "dd 'de' MMM", { locale: ptBR })}`,
          accentColor: 'text-cyan-400',
          priority: 80,
        });
      }

      // 5. Admin Announcements
      const { data: announcements } = await supabase
        .from('admin_announcements')
        .select('title, priority')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .limit(1);

      if (announcements?.[0]) {
        items.push({
          id: 'announcement',
          type: 'announcement',
          title: announcements[0].title,
          subtitle: 'Comunicado oficial',
          accentColor: announcements[0].priority === 'urgent' ? 'text-red-400' : 'text-amber-400',
          priority: announcements[0].priority === 'urgent' ? 95 : 70,
        });
      }

      // Sort by priority
      items.sort((a, b) => b.priority - a.priority);
      
      // Cache the data (without icons, they're added on read)
      setCachedData({ items, nextShiftDateTime });
      lastFetchRef.current = Date.now();
      
      // Add icons and set state
      const itemsWithIcons = items.map(addIconToItem);
      setInfoItems(itemsWithIcons);
      setIsVisible(true); // Always visible when agent is logged in
    } catch (error) {
      console.error('Error fetching agent info:', error);
    }
  }, [agent?.id, isCacheValid, getCachedData, setCachedData, addIconToItem]);

  useEffect(() => {
    fetchAgentInfo();
    // Refresh every 5 minutes (cache handles short-term duplicates)
    const interval = setInterval(() => fetchAgentInfo(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAgentInfo]);

  // Auto-rotate items
  useEffect(() => {
    if (infoItems.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % infoItems.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [infoItems.length]);

  // Hide banner entirely for visitors (not logged in) — keeps home compact
  if (!user || !agent) {
    return null;
  }


  // Default welcome item when no data for logged user
  const defaultItem: AgentInfoItem = {
    id: 'welcome',
    type: 'shift',
    icon: <Shield className="h-4 w-4" />,
    title: 'Agente de Segurança Pública',
    subtitle: 'Pronto para o serviço',
    accentColor: 'text-primary',
    priority: 0,
  };

  const displayItems = infoItems.length > 0 ? infoItems : [defaultItem];

  const currentItem = displayItems[currentIndex % displayItems.length];
  const firstName = agent.name?.split(' ')[0] || 'Agente';

  // Get team config (color + icon)
  const getTeamConfig = (team: string | null) => {
    switch (team?.toUpperCase()) {
      case 'ALFA': return { 
        color: 'bg-red-500/20 text-red-400 border-red-500/40',
        icon: <Shield className="h-3 w-3" />
      };
      case 'BRAVO': return { 
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        icon: <Sword className="h-3 w-3" />
      };
      case 'CHARLIE': return { 
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        icon: <Target className="h-3 w-3" />
      };
      case 'DELTA': return { 
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        icon: <Zap className="h-3 w-3" />
      };
      default: return { 
        color: 'bg-primary/20 text-primary border-primary/40',
        icon: <Crown className="h-3 w-3" />
      };
    }
  };

  const teamConfig = getTeamConfig(agent.team);
  const unitName = agent.unit?.name || null;

  return (
    <div className="w-full animate-fade-in">
      <div className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95",
        "border border-primary/30 shadow-lg shadow-primary/10",
        "backdrop-blur-md"
      )}>
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-50" />
        
        {/* Glow effect */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, ${themeConfig.colors.primary} 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Avatar + User greeting + Team badge */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Avatar */}
              <div className="relative">
                {agent.avatar_url ? (
                  <img 
                    src={agent.avatar_url} 
                    alt={agent.name || 'Avatar'}
                    className="h-10 w-10 rounded-full object-cover border-2 border-primary/50 shadow-lg shadow-primary/20"
                  />
                ) : (
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-primary/30 to-primary/10",
                    "border-2 border-primary/50"
                  )}>
                    <span className="text-sm font-bold text-primary">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              
              {/* Name + Team badge + Unit - Always visible */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-primary truncate max-w-[70px] sm:max-w-[100px]">
                    {firstName}
                  </p>
                  {/* Team badge with icon - Always visible */}
                  {agent.team && (
                    <span className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wide",
                      teamConfig.color
                    )}>
                      {teamConfig.icon}
                      {agent.team}
                    </span>
                  )}
                </div>
                {/* Unit name */}
                {unitName ? (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
                    <Building2 className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[100px] sm:max-w-[150px]">{unitName}</span>
                  </div>
                ) : (
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 hidden sm:block">
                    Agente de Segurança
                  </p>
                )}
              </div>
            </div>

            {/* Center: Info Item (rotating) or Countdown */}
            {currentItem.type === 'countdown' && nextShiftDate ? (
              <div 
                key="countdown"
                className="flex-1 flex items-center gap-2 sm:gap-3 animate-fade-in min-w-0"
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  "bg-gradient-to-br from-emerald-500/20 to-primary/20 border border-emerald-500/40",
                  "animate-pulse"
                )}>
                  <Timer className="h-4 w-4 text-emerald-400" />
                </div>
                {/* Countdown Display */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Days */}
                  {countdown.days > 0 && (
                    <div className="flex flex-col items-center">
                      <div className="bg-slate-800/80 border border-primary/40 rounded-lg px-2 py-1 min-w-[36px] text-center">
                        <span className="text-lg sm:text-xl font-semibold text-primary font-mono tracking-tight animate-pulse">
                          {String(countdown.days).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-[9px] text-muted-foreground/70 uppercase mt-0.5">Dias</span>
                    </div>
                  )}
                  {countdown.days > 0 && <span className="text-primary/60 font-medium text-lg">:</span>}
                  {/* Hours */}
                  <div className="flex flex-col items-center">
                    <div className="bg-slate-800/80 border border-primary/40 rounded-lg px-2 py-1 min-w-[36px] text-center">
                      <span className="text-lg sm:text-xl font-semibold text-primary font-mono tracking-tight">
                        {String(countdown.hours).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/70 uppercase mt-0.5">Hrs</span>
                  </div>
                  <span className="text-primary/60 font-medium text-lg animate-pulse">:</span>
                  {/* Minutes */}
                  <div className="flex flex-col items-center">
                    <div className="bg-slate-800/80 border border-amber-500/40 rounded-lg px-2 py-1 min-w-[36px] text-center">
                      <span className="text-lg sm:text-xl font-semibold text-amber-400 font-mono tracking-tight">
                        {String(countdown.minutes).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/70 uppercase mt-0.5">Min</span>
                  </div>
                  <span className="text-primary/60 font-medium text-lg animate-pulse">:</span>
                  {/* Seconds */}
                  <div className="flex flex-col items-center">
                    <div className="bg-slate-800/80 border border-red-500/40 rounded-lg px-2 py-1 min-w-[36px] text-center relative overflow-hidden">
                      <span className="text-lg sm:text-xl font-semibold text-red-400 font-mono tracking-tight relative z-10">
                        {String(countdown.seconds).padStart(2, '0')}
                      </span>
                      {/* Animated pulse effect */}
                      <div className="absolute inset-0 bg-red-500/10 animate-ping" style={{ animationDuration: '1s' }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground/70 uppercase mt-0.5">Seg</span>
                  </div>
                </div>
                {/* Status label */}
                <div className="hidden sm:flex flex-col ml-2">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    currentItem.accentColor
                  )}>
                    {currentItem.subtitle}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">Próximo Plantão</span>
                </div>
              </div>
            ) : (
              <div 
                key={currentItem.id}
                className="flex-1 flex items-center gap-3 animate-fade-in min-w-0"
              >
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  "bg-slate-800/60 border border-slate-700/50",
                  currentItem.accentColor
                )}>
                  {currentItem.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-semibold truncate",
                    currentItem.accentColor
                  )}>
                    {currentItem.title}
                  </p>
                  <p className="text-xs text-muted-foreground/80 truncate">
                    {currentItem.subtitle}
                  </p>
                </div>
              </div>
            )}

            {/* Right: Dots indicator + Action */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Dots */}
              {infoItems.length > 1 && (
                <div className="flex items-center gap-1">
                  {infoItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        idx === currentIndex 
                          ? "bg-primary w-3" 
                          : "bg-slate-600 hover:bg-slate-500"
                      )}
                    />
                  ))}
                </div>
              )}
              
              {/* Sparkle indicator */}
              <Sparkles className="h-4 w-4 text-primary/60 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>
    </div>
  );
}
