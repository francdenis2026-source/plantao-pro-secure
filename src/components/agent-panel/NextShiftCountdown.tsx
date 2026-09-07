import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInCalendarDays, differenceInHours, differenceInMinutes, isToday, isSameDay, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Zap, AlertTriangle, Palmtree, Wallet, TrendingUp, ChevronLeft, ChevronRight, Megaphone, Bell, AlertCircle, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextShiftCountdownProps {
  agentId: string;
  agentName?: string;
  agentUnitId?: string | null;
  agentTeam?: string | null;
  className?: string;
}

interface NextShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string | null;
  shift_type: string | null;
}


interface AgentLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
}

interface AdminAnnouncement {
  id: string;
  title: string;
  content: string | null;
  priority: string;
}

interface InfoCard {
  id: string;
  type: 'shift' | 'leave' | 'bh' | 'bh_value' | 'announcement';
  priority: number;
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  animate?: boolean;
}

export function NextShiftCountdown({ agentId, agentName, agentUnitId, agentTeam, className }: NextShiftCountdownProps) {
  const [nextShift, setNextShift] = useState<NextShift | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<NextShift[]>([]);
  const [previousShift, setPreviousShift] = useState<NextShift | null>(null);
  const [todayLeave, setTodayLeave] = useState<AgentLeave | null>(null);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [bhBalance, setBhBalance] = useState<number>(0);
  const [bhValue, setBhValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Get first name for display
  const firstName = agentName?.split(' ')[0] || '';

  useEffect(() => {
    const fetchData = async () => {
      if (!agentId) return;
      
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Fetch next shift, previous shift, leaves, BH, and announcements in parallel
        const [shiftResult, prevShiftResult, leaveResult, bhResult, agentResult, announcementsResult] = await Promise.all([
          supabase
            .from('agent_shifts')
            .select('id, shift_date, start_time, end_time, shift_type')
            .eq('agent_id', agentId)
            .gte('shift_date', today)
            .eq('status', 'scheduled')
            .eq('is_vacation', false)
            .order('shift_date', { ascending: true })
            .limit(6),
          supabase
            .from('agent_shifts')
            .select('id, shift_date, start_time, end_time, shift_type')
            .eq('agent_id', agentId)
            .lt('shift_date', today)
            .eq('is_vacation', false)
            .order('shift_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('agent_leaves')
            .select('id, leave_type, start_date, end_date')
            .eq('agent_id', agentId)
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today)
            .limit(1)
            .maybeSingle(),
          supabase.rpc('calculate_bh_balance', { p_agent_id: agentId }),
          supabase
            .from('agents')
            .select('bh_hourly_rate')
            .eq('id', agentId)
            .single(),
          supabase
            .from('admin_announcements')
            .select('id, title, content, priority')
            .eq('is_active', true)
            .lte('starts_at', new Date().toISOString())
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(5)
        ]);

        const shiftsArr = (shiftResult.data as NextShift[] | null) || [];
        if (shiftsArr.length > 0) {
          setNextShift(shiftsArr[0]);
          setUpcomingShifts(shiftsArr);
        }

        if (prevShiftResult.data) {
          setPreviousShift(prevShiftResult.data as NextShift);
        }

        if (leaveResult.data) {
          setTodayLeave(leaveResult.data as AgentLeave);
        }

        // Filter announcements by target
        if (announcementsResult.data) {
          setAnnouncements(announcementsResult.data as AdminAnnouncement[]);
        }

        const balance = bhResult.data || 0;
        setBhBalance(balance);

        const hourlyRate = agentResult.data?.bh_hourly_rate || 15.75;
        setBhValue(balance * hourlyRate);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agentId, agentUnitId, agentTeam]);

  const infoCards = useMemo(() => {
    const cards: InfoCard[] = [];

    // ---------- Helpers ----------
    const classifyPeriod = (startH: number, durationH: number) => {
      // Diurno: 07:00→19:00. Noturno: 19:00→07:00 (cruza a madrugada).
      // 24h: 07:00 de um dia até 07:00 do dia seguinte (classificado como Diurno pelo horário de entrada).
      const isNight = startH >= 19 || startH < 7;
      return {
        isNight,
        periodLabel: isNight ? 'Noturno' : 'Diurno',
        PeriodIcon: isNight ? Moon : Sun,
        shiftLabel: `${durationH}h ${isNight ? 'Noturno' : 'Diurno'}`,
      };
    };

    // Detecta padrão de escala com base em duração + intervalo entre plantões
    // Retorna algo como "12x12", "12x36", "24x48", "24x72", "Plantão" (fallback)
    const detectScale = (shifts: NextShift[], durationH: number): string => {
      if (!shifts || shifts.length < 2) {
        // Sem histórico suficiente: usa apenas duração
        if (durationH === 12) return '12h';
        if (durationH === 24) return '24h';
        return `${durationH}h`;
      }
      // Média de intervalos em dias entre plantões consecutivos
      const gaps: number[] = [];
      for (let i = 1; i < shifts.length; i++) {
        const prev = parseISO(shifts[i - 1].shift_date);
        const curr = parseISO(shifts[i].shift_date);
        gaps.push(differenceInCalendarDays(curr, prev));
      }
      // Usa a moda (gap mais frequente) para robustez
      const freq: Record<number, number> = {};
      gaps.forEach((g) => { freq[g] = (freq[g] || 0) + 1; });
      const modeGap = Number(
        Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
      );
      // Descanso em horas ≈ (gap em dias) * 24 - duração do plantão
      const restH = Math.max(0, modeGap * 24 - durationH);
      // Arredonda para múltiplos comuns (12, 24, 36, 48, 72)
      const commons = [12, 24, 36, 48, 72];
      const rest = commons.reduce((best, v) =>
        Math.abs(v - restH) < Math.abs(best - restH) ? v : best
      , commons[0]);
      return `${durationH}x${rest}`;
    };


    // Pré-computa dados do próximo plantão
    let shiftMeta: null | {
      shiftDate: Date;
      shiftStart: Date;
      shiftEnd: Date;
      durationHours: number;
      isNight: boolean;
      periodLabel: string;
      PeriodIcon: typeof Sun;
      shiftLabel: string;
      scaleLabel: string;
      startStr: string;
      endStr: string;
      dateStr: string;
      isTodayShift: boolean;
    } = null;

    if (nextShift) {
      const shiftDate = parseISO(nextShift.shift_date);
      const [hh, mm] = (nextShift.start_time || '07:00').split(':').map(Number);
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(hh || 7, mm || 0, 0, 0);
      const [eh, em] = (nextShift.end_time || '19:00').split(':').map(Number);
      const shiftEnd = new Date(shiftStart);
      shiftEnd.setHours(eh || 19, em || 0, 0, 0);
      if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);
      const durationHours = Math.round((shiftEnd.getTime() - shiftStart.getTime()) / 3_600_000);
      const p = classifyPeriod(hh || 7, durationHours);
      const scaleLabel = detectScale(upcomingShifts, durationHours);
      shiftMeta = {
        shiftDate,
        shiftStart,
        shiftEnd,
        durationHours,
        ...p,
        scaleLabel,
        startStr: (nextShift.start_time || '07:00').slice(0, 5),
        endStr: (nextShift.end_time || '19:00').slice(0, 5),
        dateStr: format(shiftDate, "EEE, dd/MM", { locale: ptBR }),
        isTodayShift: isToday(shiftDate),
      };
    }

    // ---------- JORNADA DE HOJE (descanso diurno + plantão noturno no mesmo dia, ex.: 12x12) ----------
    // Ex.: acabou plantão 07:00 hoje (que começou 19:00 ontem) e volta 19:00 hoje.
    let todayTimeline: null | {
      restStartStr: string;
      restEndStr: string;
      restHours: number;
      nextIsNight: boolean;
    } = null;

    // Regra de precisão: só monta a JORNADA DE HOJE quando o próximo plantão
    // é NOTURNO e começa hoje. Isso evita misturar "folga" com plantões
    // diurnos ou de 24h (nesses casos a folga não é 07:00–19:00).
    if (!todayLeave && shiftMeta && shiftMeta.isTodayShift && shiftMeta.isNight) {
      const now = new Date();
      const dayStart = startOfDay(now);

      // Início do descanso = fim do plantão anterior (se foi hoje) OU 07:00 de hoje
      // (padrão operacional: folga diurna 07:00–19:00 antes do plantão noturno).
      let restStart = new Date(dayStart);
      restStart.setHours(7, 0, 0, 0);

      if (previousShift) {
        const prevDate = parseISO(previousShift.shift_date);
        const [phh, pmm] = (previousShift.start_time || '19:00').split(':').map(Number);
        const [peh, pem] = (previousShift.end_time || '07:00').split(':').map(Number);
        const prevStart = new Date(prevDate);
        prevStart.setHours(phh || 19, pmm || 0, 0, 0);
        const prevEnd = new Date(prevStart);
        prevEnd.setHours(peh || 7, pem || 0, 0, 0);
        if (prevEnd <= prevStart) prevEnd.setDate(prevEnd.getDate() + 1);
        // Se o plantão anterior terminou dentro do dia de hoje, usa esse término.
        if (prevEnd > dayStart && isSameDay(prevEnd, now)) {
          restStart = prevEnd;
        }
      }

      const restEnd = shiftMeta.shiftStart;

      if (restEnd > restStart && isSameDay(restEnd, now)) {
        const restHours = Math.max(0, Math.round((restEnd.getTime() - restStart.getTime()) / 3_600_000));
        todayTimeline = {
          restStartStr: format(restStart, 'HH:mm'),
          restEndStr: format(restEnd, 'HH:mm'),
          restHours,
          nextIsNight: shiftMeta.isNight,
        };

        const nowMs = now.getTime();
        const inRest = nowMs >= restStart.getTime() && nowMs < restEnd.getTime();
        const minsToShift = Math.max(0, Math.round((restEnd.getTime() - nowMs) / 60_000));
        const shiftInLabel = minsToShift < 60
          ? `em ${minsToShift}min`
          : `em ${Math.round(minsToShift / 60)}h`;

        cards.push({
          id: 'today-timeline',
          type: 'shift',
          priority: 0, // acima de tudo
          icon: <Sun className="h-5 w-5 text-white" />,
          title: `JORNADA DE HOJE • ${todayTimeline.restHours}h DESCANSO → ${shiftMeta.shiftLabel.toUpperCase()}`,
          value: inRest ? `Descanso • plantão ${shiftInLabel}` : `Plantão iniciando`,
          subtitle: `☀ Folga ${todayTimeline.restStartStr}–${todayTimeline.restEndStr} • ${shiftMeta.isNight ? '🌙' : '☀'} Plantão ${shiftMeta.startStr}–${shiftMeta.endStr} • Escala ${shiftMeta.scaleLabel}`,
          colorClass: 'text-amber-300',
          bgClass: shiftMeta.isNight
            ? 'bg-gradient-to-br from-amber-500 via-orange-600 to-indigo-700'
            : 'bg-gradient-to-br from-amber-400 via-orange-500 to-sky-600',
          borderClass: 'border-amber-500/60 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-indigo-500/20 shadow-lg shadow-amber-500/25',
          animate: true,
        });
      }
    }

    // ---------- SEM DADOS DE PLANTÃO (fallback profissional) ----------
    // Se não existe próximo plantão nem licença aprovada, sugere revisar cadastro.
    if (!shiftMeta && !todayLeave) {
      cards.push({
        id: 'no-data',
        type: 'shift',
        priority: 4,
        icon: <AlertCircle className="h-5 w-5 text-white" />,
        title: 'JORNADA DE HOJE • SEM DADOS DE PLANTÃO',
        value: 'Escala não cadastrada',
        subtitle: 'Nenhum plantão futuro encontrado. Revise o cadastro do agente (data do primeiro plantão e escala) na aba Configurações.',
        colorClass: 'text-slate-300',
        bgClass: 'bg-gradient-to-br from-slate-600 to-slate-800',
        borderClass: 'border-slate-500/50 bg-gradient-to-r from-slate-600/25 via-slate-700/20 to-slate-800/25 shadow-lg shadow-slate-900/30',
      });
    }




    // ---------- FOLGA (licença aprovada) ----------
    if (todayLeave) {
      const leaveLabels: Record<string, string> = {
        vacation: 'Férias',
        medical: 'Licença Médica',
        special: 'Folga Especial',
        training: 'Treinamento',
      };
      const nextInfo = shiftMeta
        ? ` • retorna ${shiftMeta.dateStr} ${shiftMeta.startStr} (${shiftMeta.shiftLabel})`
        : '';
      cards.push({
        id: 'leave',
        type: 'leave',
        priority: 1,
        icon: <Palmtree className="h-5 w-5 text-white" />,
        title: 'VOCÊ ESTÁ DE FOLGA',
        value: leaveLabels[todayLeave.leave_type] || todayLeave.leave_type,
        subtitle: `até ${format(parseISO(todayLeave.end_date), 'dd/MM', { locale: ptBR })}${nextInfo}`,
        colorClass: 'text-green-400',
        bgClass: 'bg-gradient-to-br from-green-500 to-emerald-600',
        borderClass: 'border-green-500/60 bg-gradient-to-r from-green-500/20 via-emerald-500/15 to-green-500/20 shadow-lg shadow-green-500/20',
        animate: true,
      });
    }

    // ---------- DESCANSO entre plantões (12x12, 24x72, etc.) ----------
    // Se não há licença hoje e o próximo plantão NÃO é hoje → agente está de folga/descanso
    if (!todayLeave && shiftMeta && !shiftMeta.isTodayShift) {
      const now = new Date();
      const hoursOff = Math.max(0, Math.round((shiftMeta.shiftStart.getTime() - now.getTime()) / 3_600_000));
      const daysOff = differenceInCalendarDays(shiftMeta.shiftDate, startOfDay(now));
      const restLabel =
        daysOff === 1 ? 'até amanhã' : daysOff > 1 ? `por ${daysOff} dias` : `por ${hoursOff}h`;

      cards.push({
        id: 'rest',
        type: 'leave',
        priority: 5,
        icon: <Palmtree className="h-5 w-5 text-white" />,
        title: 'DESCANSO • FOLGA OPERACIONAL',
        value: restLabel,
        subtitle: `Próximo: ${shiftMeta.shiftLabel} (Escala ${shiftMeta.scaleLabel}) • ${shiftMeta.dateStr} ${shiftMeta.startStr}–${shiftMeta.endStr}`,
        colorClass: 'text-teal-400',
        bgClass: 'bg-gradient-to-br from-teal-500 to-cyan-600',
        borderClass: 'border-teal-500/50 bg-gradient-to-r from-teal-500/15 via-cyan-500/10 to-teal-500/15 shadow-lg shadow-teal-500/15',
      });
    }

    // ---------- PRÓXIMO PLANTÃO ----------
    if (shiftMeta) {
      const { shiftStart, shiftDate, durationHours, isNight, periodLabel, PeriodIcon, shiftLabel, scaleLabel, startStr, endStr, dateStr, isTodayShift } = shiftMeta;
      const now = new Date();
      const daysUntil = differenceInCalendarDays(shiftDate, startOfDay(now));
      const hoursUntil = differenceInHours(shiftStart, now);
      const minutesUntil = differenceInMinutes(shiftStart, now);
      const isUrgent = isTodayShift || (hoursUntil >= 0 && hoursUntil <= 12);
      const isSoon = daysUntil <= 1;

      let displayValue: string;
      if (isTodayShift) {
        if (minutesUntil > 0 && minutesUntil < 60) displayValue = `em ${minutesUntil}min`;
        else if (hoursUntil > 0 && hoursUntil < 24) displayValue = `em ${hoursUntil}h`;
        else displayValue = `às ${startStr}`;
      } else if (daysUntil === 1) {
        displayValue = hoursUntil > 0 ? `amanhã em ${hoursUntil}h` : 'amanhã';
      } else {
        displayValue = `em ${daysUntil} dias`;
      }

      cards.push({
        id: 'shift',
        type: 'shift',
        priority: isTodayShift ? 2 : 10,
        icon: isUrgent ? <Zap className="h-5 w-5 text-white" /> : isSoon ? <AlertTriangle className="h-5 w-5 text-white" /> : <PeriodIcon className="h-5 w-5 text-white" />,
        title: isTodayShift
          ? `PLANTÃO HOJE • ${shiftLabel} • Escala ${scaleLabel}`
          : `PRÓXIMO PLANTÃO • ${shiftLabel} • Escala ${scaleLabel}`,
        value: displayValue,
        subtitle: `${dateStr} • ${startStr}–${endStr} (${durationHours}h ${periodLabel.toLowerCase()})`,
        colorClass: isUrgent ? 'text-emerald-400' : isSoon ? 'text-amber-400' : isNight ? 'text-indigo-400' : 'text-sky-400',
        bgClass: isUrgent
          ? 'bg-gradient-to-br from-emerald-500 to-green-600'
          : isSoon
            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
            : isNight
              ? 'bg-gradient-to-br from-indigo-600 to-slate-800'
              : 'bg-gradient-to-br from-sky-500 to-blue-600',
        borderClass: isUrgent
          ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-500/20 shadow-lg shadow-emerald-500/20'
          : isSoon
            ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 shadow-lg shadow-amber-500/15'
            : isNight
              ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 via-slate-800/40 to-indigo-500/15 shadow-lg shadow-indigo-500/10'
              : 'border-sky-500/40 bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-sky-500/15 shadow-lg shadow-sky-500/10',
        animate: isUrgent,
      });
    }


    // BH Balance card (if has hours)
    if (bhBalance !== 0) {
      const isPositive = bhBalance > 0;
      cards.push({
        id: 'bh',
        type: 'bh',
        priority: 20,
        icon: <TrendingUp className="h-5 w-5 text-white" />,
        title: 'BANCO DE HORAS',
        value: `${isPositive ? '+' : ''}${bhBalance.toFixed(1)}h`,
        subtitle: isPositive ? 'horas acumuladas' : 'horas devidas',
        colorClass: isPositive ? 'text-blue-400' : 'text-red-400',
        bgClass: isPositive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-red-500 to-rose-600',
        borderClass: isPositive 
          ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15'
          : 'border-red-500/50 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-red-500/15',
      });
    }

    // BH Value card (if has value)
    if (bhValue !== 0 && bhBalance !== 0) {
      const isPositive = bhValue > 0;
      cards.push({
        id: 'bh_value',
        type: 'bh_value',
        priority: 21,
        icon: <Wallet className="h-5 w-5 text-white" />,
        title: 'VALOR BH',
        value: `R$ ${Math.abs(bhValue).toFixed(2)}`,
        subtitle: isPositive ? 'a receber' : 'a compensar',
        colorClass: isPositive ? 'text-emerald-400' : 'text-orange-400',
        bgClass: isPositive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-500 to-amber-600',
        borderClass: isPositive 
          ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15'
          : 'border-orange-500/50 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15',
      });
    }

    // Admin Announcements
    announcements.forEach((announcement, index) => {
      const priorityConfig: Record<string, { priority: number; icon: React.ReactNode; colorClass: string; bgClass: string; borderClass: string; animate: boolean }> = {
        urgent: {
          priority: 0, // Highest priority
          icon: <AlertCircle className="h-5 w-5 text-white" />,
          colorClass: 'text-red-400',
          bgClass: 'bg-gradient-to-br from-red-500 to-rose-600',
          borderClass: 'border-red-500/60 bg-gradient-to-r from-red-500/20 via-rose-500/15 to-red-500/20 shadow-lg shadow-red-500/20',
          animate: true,
        },
        high: {
          priority: 3,
          icon: <Bell className="h-5 w-5 text-white" />,
          colorClass: 'text-amber-400',
          bgClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
          borderClass: 'border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 shadow-lg shadow-amber-500/15',
          animate: true,
        },
        normal: {
          priority: 15,
          icon: <Megaphone className="h-5 w-5 text-white" />,
          colorClass: 'text-blue-400',
          bgClass: 'bg-gradient-to-br from-blue-500 to-indigo-600',
          borderClass: 'border-blue-500/50 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-blue-500/15',
          animate: false,
        },
        low: {
          priority: 25,
          icon: <Megaphone className="h-5 w-5 text-white" />,
          colorClass: 'text-slate-400',
          bgClass: 'bg-gradient-to-br from-slate-500 to-slate-600',
          borderClass: 'border-slate-500/50 bg-gradient-to-r from-slate-500/15 via-slate-600/10 to-slate-500/15',
          animate: false,
        },
      };

      const config = priorityConfig[announcement.priority] || priorityConfig.normal;

      cards.push({
        id: `announcement-${announcement.id}`,
        type: 'announcement',
        priority: config.priority + (index * 0.1), // Slight offset for multiple announcements
        icon: config.icon,
        title: announcement.priority === 'urgent' ? '🚨 AVISO URGENTE' : announcement.priority === 'high' ? '⚠️ AVISO IMPORTANTE' : 'AVISO',
        value: announcement.title,
        subtitle: announcement.content || '',
        colorClass: config.colorClass,
        bgClass: config.bgClass,
        borderClass: config.borderClass,
        animate: config.animate,
      });
    });

    // Sort by priority
    return cards.sort((a, b) => a.priority - b.priority);
  }, [nextShift, upcomingShifts, previousShift, todayLeave, bhBalance, bhValue, announcements]);

  // Auto-rotate cards
  useEffect(() => {
    if (infoCards.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % infoCards.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [infoCards.length]);

  if (isLoading || infoCards.length === 0) {
    return null;
  }

  const activeCard = infoCards[activeIndex];
  const showNavigation = infoCards.length > 1;

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + infoCards.length) % infoCards.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % infoCards.length);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 p-2.5 transition-all duration-500",
        activeCard.borderClass,
        className
      )}
    >
      {/* Animated background */}
      {activeCard.animate && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 animate-pulse" />
      )}
      
      {/* Floating name badge - Professional style */}
      {firstName && (
        <div className="absolute top-1 right-2 z-10">
          <span className="text-[9px] font-bold tracking-widest text-amber-400/80 uppercase bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-2 py-0.5 rounded-full border border-amber-500/20">
            {firstName}
          </span>
        </div>
      )}

      <div className="relative flex items-center gap-2.5">
        {/* Navigation Left */}
        {showNavigation && (
          <button
            onClick={goToPrev}
            className="flex-shrink-0 p-1 rounded-md bg-gradient-to-br from-slate-700/80 to-slate-800/80 hover:from-slate-600/80 hover:to-slate-700/80 border border-slate-600/50 shadow-md transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-amber-400" />
          </button>
        )}

        {/* Icon with animation */}
        <div
          className={cn(
            "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center shadow-lg transition-all duration-500 border border-white/20",
            activeCard.bgClass
          )}
        >
          {activeCard.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider transition-colors duration-500 leading-tight truncate",
                activeCard.colorClass
              )}
            >
              {activeCard.title}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <span
              className={cn(
                "text-lg font-black tabular-nums transition-colors duration-500 leading-none",
                activeCard.colorClass.replace('-400', '-300')
              )}
            >
              {activeCard.value}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 mt-0.5 truncate capitalize leading-tight">
            {activeCard.subtitle}
          </p>
        </div>

        {/* Dots indicator - Professional style */}
        {showNavigation && (
          <div className="flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-md bg-slate-800/50 border border-slate-700/50">
            {infoCards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm",
                  idx === activeIndex 
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 scale-125 shadow-amber-500/50" 
                    : "bg-slate-600 hover:bg-slate-500"
                )}
              />
            ))}
          </div>
        )}

        {/* Navigation Right */}
        {showNavigation && (
          <button
            onClick={goToNext}
            className="flex-shrink-0 p-1 rounded-md bg-gradient-to-br from-slate-700/80 to-slate-800/80 hover:from-slate-600/80 hover:to-slate-700/80 border border-slate-600/50 shadow-md transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-3.5 w-3.5 text-amber-400" />
          </button>
        )}
      </div>
    </div>
  );
}
