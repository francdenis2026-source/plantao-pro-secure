import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, X, Maximize2, Clock, Play, Timer, 
  AlertTriangle, Calendar 
} from 'lucide-react';
import { 
  format, differenceInHours, differenceInMinutes, differenceInSeconds, 
  addHours, isWithinInterval, parseISO, subDays 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLowMotion } from '@/hooks/useLowMotion';
import { getShiftBounds, isShiftActive } from '@/lib/shiftTime';
import { toast } from 'sonner';

interface OnDutyOverlayProps {
  agentId: string;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export function OnDutyOverlay({ agentId }: OnDutyOverlayProps) {
  const { lowMotion } = useLowMotion();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timeElapsed, setTimeElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [nextCountdown, setNextCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [nextSecondsLeft, setNextSecondsLeft] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load minimized state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`onduty_minimized_${agentId}`);
    if (saved === 'true') setIsMinimized(true);
  }, [agentId]);

  const toggleMinimized = useCallback(() => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem(`onduty_minimized_${agentId}`, String(newState));
  }, [isMinimized, agentId]);

  useEffect(() => {
    fetchShiftData();
  }, [agentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentShift && isOnDuty) {
        // Detecta término em tempo real
        if (!isShiftActive(currentShift)) {
          setIsOnDuty(false);
          toast.success('Plantão encerrado', {
            description: 'Sua jornada foi finalizada. Bom descanso!',
            duration: 8000,
          });
          try {
            window.dispatchEvent(new CustomEvent('shift:ended', { detail: { agentId, shiftId: currentShift.id } }));
          } catch { /* ignore */ }
          // Recarrega para pegar próximo plantão
          fetchShiftData();
          return;
        }
        updateTimeRemaining(currentShift);
      }
      if (nextShift && !isOnDuty) {
        updateNextCountdown(nextShift);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentShift, isOnDuty, nextShift, agentId]);

  const fetchShiftData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      const { data: shifts, error } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('shift_date', yesterday)
        .neq('status', 'vacation')
        .order('shift_date', { ascending: true })
        .limit(10);

      if (error) throw error;

      const shiftList = (shifts || []) as Shift[];

      if (shiftList.length > 0) {
        const yesterdayShift = shiftList.find(s => s.shift_date === yesterday);
        const todayShift = shiftList.find(s => s.shift_date === today);
        
        if (yesterdayShift && checkIfStillOnDuty(yesterdayShift)) {
          setCurrentShift(yesterdayShift);
          setIsOnDuty(true);
          updateTimeRemaining(yesterdayShift);
          const futureShifts = shiftList.filter(s => s.shift_date > yesterday);
          if (futureShifts.length > 0) setNextShift(futureShifts[0]);
          return;
        }
        
        if (todayShift) {
          setCurrentShift(todayShift);
          const onDuty = checkIfStillOnDuty(todayShift);
          setIsOnDuty(onDuty);
          if (onDuty) updateTimeRemaining(todayShift);
          const futureShifts = shiftList.filter(s => s.shift_date > today);
          if (futureShifts.length > 0) setNextShift(futureShifts[0]);
        } else {
          const futureShifts = shiftList.filter(s => s.shift_date >= today);
          if (futureShifts.length > 0) setNextShift(futureShifts[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfStillOnDuty = (shift: Shift): boolean => {
    return isShiftActive(shift);
  };

  const updateTimeRemaining = (shift: Shift) => {
    const now = new Date();
    const { start: shiftStart, end: shiftEnd } = getShiftBounds(shift);

    const hoursRemaining = Math.max(0, differenceInHours(shiftEnd, now));
    const minutesRemaining = Math.max(0, differenceInMinutes(shiftEnd, now) % 60);
    const secondsRemaining = Math.max(0, differenceInSeconds(shiftEnd, now) % 60);

    const hoursElapsed = Math.max(0, differenceInHours(now, shiftStart));
    const minutesElapsed = Math.max(0, differenceInMinutes(now, shiftStart) % 60);
    const secondsElapsed = Math.max(0, differenceInSeconds(now, shiftStart) % 60);

    const totalMinutes = Math.max(1, differenceInMinutes(shiftEnd, shiftStart));
    const elapsedMinutes = differenceInMinutes(now, shiftStart);
    const progressPercent = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));

    setProgress(progressPercent);
    setTimeRemaining({ hours: hoursRemaining, minutes: minutesRemaining, seconds: secondsRemaining });
    setTimeElapsed({ hours: hoursElapsed, minutes: minutesElapsed, seconds: secondsElapsed });
  };

  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  const updateNextCountdown = (shift: Shift) => {
    const now = new Date();
    const shiftDate = parseISO(shift.shift_date);
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startHour, startMin, 0);

    const secondsLeft = differenceInSeconds(shiftStart, now);
    setNextSecondsLeft(secondsLeft);

    // Only show countdown when within 24h and not negative
    if (secondsLeft <= 24 * 60 * 60 && secondsLeft >= 0) {
      const h = Math.floor(secondsLeft / 3600);
      const m = Math.floor((secondsLeft % 3600) / 60);
      const s = Math.floor(secondsLeft % 60);
      setNextCountdown({ hours: h, minutes: m, seconds: s });
      return;
    }

    setNextCountdown(null);
  };

  if (isLoading) return null;

  // MINIMIZED CHIP - shown at the top when minimized
  if (isMinimized && isOnDuty) {
    return (
      <div 
        onClick={toggleMinimized}
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 cursor-pointer animate-fade-in"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 border-2 border-emerald-400/60 shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all duration-200">
          <div className="relative">
            <Shield className="h-4 w-4 text-white" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-white rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-black text-white tracking-wider">EM SERVIÇO</span>
          <span className="text-xs font-mono font-bold text-emerald-100 bg-black/20 px-2 py-0.5 rounded-full">
            {formatUnit(timeElapsed.hours)}:{formatUnit(timeElapsed.minutes)}
          </span>
          <Maximize2 className="h-3.5 w-3.5 text-white/80" />
        </div>
      </div>
    );
  }

  // MINIMIZED CHIP - when NOT on duty, show next shift info
  if (isMinimized && !isOnDuty && nextShift) {
    return (
      <div 
        onClick={toggleMinimized}
        className="fixed top-2 left-1/2 -translate-x-1/2 z-50 cursor-pointer animate-fade-in"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 border-2 border-amber-400/60 shadow-2xl shadow-amber-500/40 hover:scale-105 transition-all duration-200">
          <Calendar className="h-4 w-4 text-white" />
          <span className="text-xs font-bold text-white tracking-wide">PRÓXIMO</span>
          <span className="text-xs font-mono font-bold text-amber-100 bg-black/20 px-2 py-0.5 rounded-full">
            {format(parseISO(nextShift.shift_date), "dd/MM", { locale: ptBR })}
          </span>
          <Maximize2 className="h-3.5 w-3.5 text-white/80" />
        </div>
      </div>
    );
  }

  // FULL OVERLAY - On Duty
  if (isOnDuty && currentShift) {
    const isCritical = timeRemaining.hours < 2;
    
    return (
      <div className="relative mb-4 animate-fade-in">
        <div className={cn(
          "relative overflow-hidden rounded-2xl border-3 p-4 md:p-5 backdrop-blur-md transition-all duration-500",
          isCritical
            ? cn("bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-red-900/40 border-amber-500/60", !lowMotion && "animate-duty-critical")
            : cn("bg-gradient-to-r from-emerald-900/40 via-green-900/30 to-teal-900/40 border-emerald-500/60", !lowMotion && "animate-duty-glow")
        )}>
          {/* Scanline sweep */}
          {!lowMotion && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div className={cn(
                "absolute top-0 h-full w-1/3 animate-duty-scanline",
                isCritical
                  ? "bg-gradient-to-r from-transparent via-amber-400/15 to-transparent"
                  : "bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent"
              )} />
            </div>
          )}

          {/* Header */}
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative p-2.5 rounded-xl shadow-lg",
                isCritical ? "bg-amber-500/30" : "bg-emerald-500/30"
              )}>
                <Shield className={cn(
                  "h-6 w-6 animate-duty-shield",
                  isCritical ? "text-amber-400" : "text-emerald-400"
                )} />
                <span className={cn(
                  "absolute -top-1 -right-1 h-3 w-3 rounded-full animate-ping",
                  isCritical ? "bg-amber-400" : "bg-emerald-400"
                )} />
                <span className={cn(
                  "absolute -top-1 -right-1 h-3 w-3 rounded-full",
                  isCritical ? "bg-amber-400" : "bg-emerald-400"
                )} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm md:text-base font-black uppercase tracking-wider",
                    isCritical ? "text-amber-400" : "text-emerald-400"
                  )}>
                    EM SERVIÇO
                  </span>
                  <Badge className={cn(
                    "text-[10px] px-2 py-0.5",
                    isCritical 
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  )}>
                    24H
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  {format(parseISO(currentShift.shift_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMinimized}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Timer Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Time Elapsed */}
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Tempo em Serviço</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className={cn(
                  "px-3 py-2 rounded-lg border-2",
                  isCritical ? "bg-amber-500/20 border-amber-500/40" : "bg-emerald-500/20 border-emerald-500/40"
                )}>
                  <span className={cn(
                    "font-mono text-2xl md:text-3xl font-black",
                    isCritical ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {formatUnit(timeElapsed.hours)}
                  </span>
                </div>
                <span className={cn("text-xl font-black", isCritical ? "text-amber-400" : "text-emerald-400")}>:</span>
                <div className={cn(
                  "px-3 py-2 rounded-lg border-2",
                  isCritical ? "bg-amber-500/20 border-amber-500/40" : "bg-emerald-500/20 border-emerald-500/40"
                )}>
                  <span className={cn(
                    "font-mono text-2xl md:text-3xl font-black",
                    isCritical ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {formatUnit(timeElapsed.minutes)}
                  </span>
                </div>
                <span className={cn("text-xl font-black", isCritical ? "text-amber-400" : "text-emerald-400")}>:</span>
                <div className={cn(
                  "px-2 py-2 rounded-lg border-2",
                  isCritical ? "bg-amber-500/20 border-amber-500/40" : "bg-emerald-500/20 border-emerald-500/40"
                )}>
                  <span className={cn(
                    "font-mono text-lg md:text-xl font-bold",
                    isCritical ? "text-amber-300" : "text-emerald-300"
                  )}>
                    {formatUnit(timeElapsed.seconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Remaining */}
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Tempo Restante</p>
              <div className="flex items-center justify-center gap-1.5">
                <div className="px-3 py-2 rounded-lg bg-slate-700/50 border-2 border-slate-600/50">
                  <span className="font-mono text-2xl md:text-3xl font-black text-white">
                    {formatUnit(timeRemaining.hours)}
                  </span>
                </div>
                <span className="text-xl font-black text-slate-400">:</span>
                <div className="px-3 py-2 rounded-lg bg-slate-700/50 border-2 border-slate-600/50">
                  <span className="font-mono text-2xl md:text-3xl font-black text-white">
                    {formatUnit(timeRemaining.minutes)}
                  </span>
                </div>
                <span className="text-xl font-black text-slate-400">:</span>
                <div className="px-2 py-2 rounded-lg bg-slate-700/50 border-2 border-slate-600/50">
                  <span className="font-mono text-lg md:text-xl font-bold text-slate-300">
                    {formatUnit(timeRemaining.seconds)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative mt-4">
            <div className="relative h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000 rounded-full",
                  isCritical
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-green-500"
                )}
                style={{ width: `${progress}%` }}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-duty-bar-shimmer" />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
              <span>{currentShift.start_time}</span>
              <span className={cn("font-bold", isCritical ? "text-amber-400" : "text-emerald-400")}>
                {progress.toFixed(0)}%
              </span>
              <span>+24h</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FULL OVERLAY - Next Shift (not on duty)
  if (!isOnDuty && nextShift) {
    const isSoon = nextSecondsLeft !== null && nextSecondsLeft <= 24 * 60 * 60 && nextSecondsLeft >= 0;

    return (
      <div className="relative mb-4 animate-fade-in">
        <div className={cn(
          "rounded-2xl border-2 p-4 backdrop-blur-md shadow-xl",
          isSoon
            ? "border-amber-500/60 bg-gradient-to-r from-slate-900/90 via-amber-900/25 to-slate-900/90"
            : "border-amber-500/40 bg-gradient-to-r from-slate-900/90 via-amber-900/20 to-slate-900/90"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl shadow-lg", isSoon ? "bg-amber-500/25" : "bg-amber-500/20")}>
                <Calendar className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Próximo Plantão</p>
                <p className="text-base md:text-lg font-bold text-amber-400">
                  {format(parseISO(nextShift.shift_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-xs text-slate-300">
                  Início às <span className="font-bold text-white">{nextShift.start_time}</span>
                </p>

                {nextCountdown && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300 tracking-wider">
                      FALTAM {formatUnit(nextCountdown.hours)}:{formatUnit(nextCountdown.minutes)}:{formatUnit(nextCountdown.seconds)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMinimized}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
