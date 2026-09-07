import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { areNativeNotificationsAllowed } from '@/lib/reminderSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Timer, Play, Loader2, AlertCircle, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { format, differenceInHours, differenceInMinutes, differenceInSeconds, addHours, isWithinInterval, parseISO, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Switch } from '@/components/ui/switch';
import { getShiftBounds, isShiftActive } from '@/lib/shiftTime';

// Countdown component for next shift
function CountdownToShift({ shift }: { shift: CurrentShift }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const shiftDate = parseISO(shift.shift_date);
      const [startHour, startMin] = shift.start_time.split(':').map(Number);
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(startHour, startMin, 0);

      if (now >= shiftStart) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = differenceInDays(shiftStart, now);
      const hours = differenceInHours(shiftStart, now) % 24;
      const minutes = differenceInMinutes(shiftStart, now) % 60;
      const seconds = differenceInSeconds(shiftStart, now) % 60;

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [shift]);

  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  // Compact inline countdown for the card
  return (
    <div className="grid grid-cols-4 gap-1">
      <div className="bg-slate-800/80 rounded px-2 py-1 text-center border border-slate-700">
        <span className="font-mono text-lg font-bold text-primary block">{formatUnit(countdown.days)}</span>
        <span className="text-[8px] text-slate-500 uppercase">Dias</span>
      </div>
      <div className="bg-slate-800/80 rounded px-2 py-1 text-center border border-slate-700">
        <span className="font-mono text-lg font-bold text-primary block">{formatUnit(countdown.hours)}</span>
        <span className="text-[8px] text-slate-500 uppercase">Hrs</span>
      </div>
      <div className="bg-slate-800/80 rounded px-2 py-1 text-center border border-slate-700">
        <span className="font-mono text-lg font-bold text-primary block">{formatUnit(countdown.minutes)}</span>
        <span className="text-[8px] text-slate-500 uppercase">Min</span>
      </div>
      <div className="bg-slate-800/80 rounded px-2 py-1 text-center border border-slate-700">
        <span className="font-mono text-lg font-bold text-primary block animate-pulse">{formatUnit(countdown.seconds)}</span>
        <span className="text-[8px] text-slate-500 uppercase">Seg</span>
      </div>
    </div>
  );
}

interface ShiftTrackerProps {
  agentId: string;
  compact?: boolean;
}

interface CurrentShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface CompletedShift {
  id: string;
  shift_date: string;
  status: string;
}

export function ShiftTracker({ agentId, compact = false }: ShiftTrackerProps) {
  const [currentShift, setCurrentShift] = useState<CurrentShift | null>(null);
  const [nextShift, setNextShift] = useState<CurrentShift | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timeElapsed, setTimeElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [recentCompletedShifts, setRecentCompletedShifts] = useState<CompletedShift[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderShown, setReminderShown] = useState<string | null>(null);
  
  const { isSupported: pushSupported, isEnabled: pushEnabled, requestPermission } = usePushNotifications();

  // Load reminder settings
  useEffect(() => {
    const savedReminder = localStorage.getItem(`shift_reminder_enabled_${agentId}`);
    setReminderEnabled(savedReminder === 'true');
    const shownReminder = localStorage.getItem(`shift_reminder_shown_${agentId}`);
    setReminderShown(shownReminder);
  }, [agentId]);

  // Check for 1 hour before shift reminder
  const checkShiftReminder = useCallback(async () => {
    if (!reminderEnabled || !nextShift) return;
    
    const now = new Date();
    const shiftDate = parseISO(nextShift.shift_date);
    const [startHour, startMin] = nextShift.start_time.split(':').map(Number);
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startHour, startMin, 0);
    
    const minutesUntilShift = differenceInMinutes(shiftStart, now);
    const shiftKey = `${nextShift.shift_date}_${nextShift.start_time}`;
    
    // Check if we're within 60 minutes and haven't shown this reminder yet
    if (minutesUntilShift > 0 && minutesUntilShift <= 60 && reminderShown !== shiftKey) {
      // Show notification
      const message = `Seu plantão começa em ${minutesUntilShift} minuto${minutesUntilShift > 1 ? 's' : ''}!`;
      
      toast.info(message, {
        duration: 10000,
        icon: <Bell className="h-5 w-5 text-amber-500" />,
      });
      
      // Push notification
      if (pushEnabled && areNativeNotificationsAllowed() && Notification.permission === 'granted') {
        new Notification('🚨 Plantão Próximo!', {
          body: message,
          icon: '/favicon.ico',
          tag: 'shift-reminder',
          requireInteraction: true,
        });
      }
      
      setReminderShown(shiftKey);
      localStorage.setItem(`shift_reminder_shown_${agentId}`, shiftKey);
    }
  }, [reminderEnabled, nextShift, reminderShown, pushEnabled, agentId]);

  useEffect(() => {
    fetchShiftData();
    autoMarkPastShiftsAsCompleted();
  }, [agentId]);

  useEffect(() => {
    // Update timer every second
    const interval = setInterval(() => {
      if (currentShift && isOnDuty) {
        updateTimeRemaining(currentShift);
      }
      checkShiftReminder();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentShift, isOnDuty, checkShiftReminder]);

  const toggleReminder = async () => {
    if (!reminderEnabled && pushSupported && !pushEnabled) {
      await requestPermission();
    }
    const newValue = !reminderEnabled;
    setReminderEnabled(newValue);
    localStorage.setItem(`shift_reminder_enabled_${agentId}`, String(newValue));
    
    if (newValue) {
      toast.success('Lembrete de plantão ativado! Você será avisado 1h antes.');
    } else {
      toast.info('Lembrete de plantão desativado.');
    }
  };

  // Auto-mark past shifts as completed if no status was set
  const autoMarkPastShiftsAsCompleted = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: pastScheduledShifts, error: fetchError } = await supabase
        .from('agent_shifts')
        .select('id, shift_date')
        .eq('agent_id', agentId)
        .eq('status', 'scheduled')
        .lt('shift_date', today);

      if (fetchError) throw fetchError;

      if (pastScheduledShifts && pastScheduledShifts.length > 0) {
        const shiftIds = pastScheduledShifts.map(s => s.id);
        const { error: updateError } = await supabase
          .from('agent_shifts')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', shiftIds);

        if (updateError) throw updateError;
      }

      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data: completed, error: completedError } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, status')
        .eq('agent_id', agentId)
        .eq('status', 'completed')
        .gte('shift_date', thirtyDaysAgo)
        .order('shift_date', { ascending: false })
        .limit(5);

      if (completedError) throw completedError;
      setRecentCompletedShifts((completed || []) as CompletedShift[]);
    } catch (error) {
      console.error('Error auto-marking shifts:', error);
    }
  };

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
        .limit(3);

      if (error) throw error;

      const shiftList = (shifts || []) as CurrentShift[];

      if (shiftList.length > 0) {
        const yesterdayShift = shiftList.find(s => s.shift_date === yesterday);
        const todayShift = shiftList.find(s => s.shift_date === today);
        
        if (yesterdayShift) {
          const stillOnDuty = checkIfStillOnDuty(yesterdayShift);
          if (stillOnDuty) {
            setCurrentShift(yesterdayShift);
            setIsOnDuty(true);
            updateTimeRemaining(yesterdayShift);
            const nextIdx = shiftList.findIndex(s => s.shift_date > yesterday);
            if (nextIdx !== -1) setNextShift(shiftList[nextIdx]);
            return;
          }
        }
        
        if (todayShift) {
          setCurrentShift(todayShift);
          const onDuty = checkIfOnDuty(todayShift);
          setIsOnDuty(onDuty);
          if (onDuty) updateTimeRemaining(todayShift);
          
          const nextIdx = shiftList.findIndex(s => s.shift_date > today);
          if (nextIdx !== -1) setNextShift(shiftList[nextIdx]);
        } else {
          const futureShifts = shiftList.filter(s => s.shift_date >= today);
          if (futureShifts.length > 0) {
            setNextShift(futureShifts[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shift data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfStillOnDuty = (shift: CurrentShift): boolean => {
    return isShiftActive(shift);
  };

  const checkIfOnDuty = (shift: CurrentShift): boolean => {
    return isShiftActive(shift);
  };

  const updateTimeRemaining = (shift?: CurrentShift) => {
    const activeShift = shift || currentShift;
    if (!activeShift) return;

    const now = new Date();
    const { start: shiftStart, end: shiftEnd } = getShiftBounds(activeShift);

    // Time remaining
    const hoursRemaining = differenceInHours(shiftEnd, now);
    const minutesRemaining = differenceInMinutes(shiftEnd, now) % 60;
    const secondsRemaining = differenceInSeconds(shiftEnd, now) % 60;

    // Time elapsed
    const hoursElapsed = differenceInHours(now, shiftStart);
    const minutesElapsed = differenceInMinutes(now, shiftStart) % 60;
    const secondsElapsed = differenceInSeconds(now, shiftStart) % 60;

    const totalMinutes = Math.max(1, differenceInMinutes(shiftEnd, shiftStart));
    const elapsedMinutes = differenceInMinutes(now, shiftStart);
    const progressPercent = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));

    setProgress(progressPercent);
    setTimeRemaining({ hours: hoursRemaining, minutes: minutesRemaining, seconds: secondsRemaining });
    setTimeElapsed({ hours: hoursElapsed, minutes: minutesElapsed, seconds: secondsElapsed });
  };


  // Format time unit with leading zero
  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  if (isLoading) {
    return (
      <Card className={`bg-slate-800/50 border-slate-700 ${compact ? 'col-span-1' : ''}`}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-slate-800 to-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isOnDuty ? 'bg-green-500/20' : 'bg-slate-700'}`}>
              {isOnDuty ? (
                <Play className="h-5 w-5 text-green-400" />
              ) : (
                <Clock className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">Plantão</p>
              {isOnDuty ? (
                <p className="text-lg font-bold text-green-400 truncate font-mono">
                  {formatUnit(timeRemaining.hours)}:{formatUnit(timeRemaining.minutes)}:{formatUnit(timeRemaining.seconds)}
                </p>
              ) : nextShift ? (
                <p className="text-sm font-medium text-slate-300 truncate">
                  {format(parseISO(nextShift.shift_date), "dd/MM", { locale: ptBR })}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Sem escalas</p>
              )}
            </div>
          </div>
          {isOnDuty && (
            <Progress value={progress} className="h-1 mt-2 bg-slate-700" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-amber-500" />
            <span>Controle de Plantão</span>
          </CardTitle>
          {isOnDuty && (
            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 animate-pulse">
              EM SERVIÇO
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {isOnDuty && currentShift ? (
          <div className="space-y-3">
            {/* Compact Timer Display */}
            <div className="bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-slate-800 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Play className="h-4 w-4 text-green-400" />
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-green-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-xs text-green-400 font-medium">Ativo</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/50 font-mono px-1.5 py-0">
                  24h
                </Badge>
              </div>
              
              {/* Compact Digital Timer */}
              <div className="bg-slate-900/80 rounded-lg p-2 mb-2 border border-slate-700/50">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="font-mono text-2xl font-bold text-amber-400">{formatUnit(timeElapsed.hours)}</span>
                  <span className="text-xl font-bold text-amber-400 animate-pulse">:</span>
                  <span className="font-mono text-2xl font-bold text-amber-400">{formatUnit(timeElapsed.minutes)}</span>
                  <span className="text-xl font-bold text-amber-400 animate-pulse">:</span>
                  <span className="font-mono text-2xl font-bold text-amber-400">{formatUnit(timeElapsed.seconds)}</span>
                </div>
                <p className="text-[10px] text-center text-slate-500 uppercase">Decorrido</p>
              </div>

              {/* Compact Remaining */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/60 rounded border border-slate-700/50">
                <span className="text-[10px] text-green-400 uppercase">Restante</span>
                <span className="font-mono text-sm font-bold text-green-400">
                  {formatUnit(timeRemaining.hours)}:{formatUnit(timeRemaining.minutes)}:{formatUnit(timeRemaining.seconds)}
                </span>
              </div>
              
              {/* Compact Progress Bar */}
              <div className="mt-2">
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-green-500 transition-all duration-1000 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>{currentShift.start_time}</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                  <span>{format(getShiftBounds(currentShift).end, 'HH:mm')}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {nextShift ? (
              <div className="space-y-2">
                {/* Compact Countdown */}
                <div className="p-3 bg-gradient-to-br from-primary/10 via-primary/5 to-slate-800 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-primary font-medium uppercase">Próximo Plantão</span>
                  </div>
                  <p className="text-sm font-bold text-white capitalize mb-2">
                    {format(parseISO(nextShift.shift_date), "EEE, dd/MM", { locale: ptBR })} às {nextShift.start_time}
                  </p>
                  <CountdownToShift shift={nextShift} />
                </div>
                
                {/* Compact Reminder Toggle */}
                <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/50">
                  <div className="flex items-center gap-1.5">
                    {reminderEnabled ? (
                      <Bell className="h-3 w-3 text-primary" />
                    ) : (
                      <BellOff className="h-3 w-3 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-300">Lembrete 1h antes</span>
                  </div>
                  <Switch
                    checked={reminderEnabled}
                    onCheckedChange={toggleReminder}
                    className="data-[state=checked]:bg-primary scale-75"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400 py-3">
                <AlertCircle className="h-6 w-6" />
                <p className="text-xs">Nenhum plantão agendado</p>
              </div>
            )}
          </div>
        )}

        {/* Compact Next Shift Info */}
        {nextShift && isOnDuty && (
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Próximo:</span>
              <span className="text-xs text-white font-mono">
                {format(parseISO(nextShift.shift_date), "dd/MM", { locale: ptBR })} {nextShift.start_time}
              </span>
            </div>
          </div>
        )}

        {/* Compact Completed Shifts */}
        {recentCompletedShifts.length > 0 && !isOnDuty && (
          <div className="pt-2 border-t border-slate-700">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <span className="text-[10px] font-medium text-slate-300">Cumpridos</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {recentCompletedShifts.slice(0, 4).map((shift) => (
                <Badge key={shift.id} variant="outline" className="text-[10px] px-1.5 py-0 text-green-400 border-green-500/50">
                  {format(parseISO(shift.shift_date), "dd/MM", { locale: ptBR })}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
