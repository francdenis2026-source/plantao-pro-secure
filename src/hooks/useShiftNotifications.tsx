import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';
import { format, parseISO, differenceInHours, differenceInMinutes, addDays, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle, Calendar } from 'lucide-react';

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  is_vacation: boolean;
}

interface UseShiftNotificationsOptions {
  agentId: string;
  enabled?: boolean;
  reminderHoursBefore?: number[]; // e.g., [24, 12, 1] for 24h, 12h, and 1h before
}

export function useShiftNotifications({
  agentId,
  enabled = true,
  reminderHoursBefore = [24, 1], // Default: 24h and 1h before
}: UseShiftNotificationsOptions) {
  const { isEnabled, showNotification } = usePushNotifications();
  const notifiedRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(0);

  // Load already notified shifts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`shift_notifications_${agentId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        notifiedRef.current = new Set(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, [agentId]);

  // Save notified shifts to localStorage
  const saveNotified = useCallback(() => {
    const arr = Array.from(notifiedRef.current).slice(-50); // Keep last 50
    localStorage.setItem(`shift_notifications_${agentId}`, JSON.stringify(arr));
  }, [agentId]);

  const checkShiftReminders = useCallback(async () => {
    if (!enabled || !agentId) return;

    // Throttle checks to every 5 minutes
    const now = Date.now();
    if (now - lastCheckRef.current < 5 * 60 * 1000) return;
    lastCheckRef.current = now;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const twoDaysLater = format(addDays(new Date(), 2), 'yyyy-MM-dd');

      const { data: shifts, error } = await supabase
        .from('agent_shifts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .lte('shift_date', twoDaysLater)
        .eq('status', 'scheduled')
        .eq('is_vacation', false)
        .order('shift_date', { ascending: true });

      if (error) throw error;

      const shiftList = (shifts || []) as Shift[];
      const currentTime = new Date();

      for (const shift of shiftList) {
        const shiftDate = parseISO(shift.shift_date);
        const [startHour, startMin] = shift.start_time.split(':').map(Number);
        const shiftStart = new Date(shiftDate);
        shiftStart.setHours(startHour, startMin, 0);

        const hoursUntilShift = differenceInHours(shiftStart, currentTime);
        const minutesUntilShift = differenceInMinutes(shiftStart, currentTime);

        // Check each reminder threshold
        for (const reminderHours of reminderHoursBefore) {
          const notificationKey = `${shift.id}-${reminderHours}h`;
          
          // Skip if already notified
          if (notifiedRef.current.has(notificationKey)) continue;

          // Check if we're within the reminder window
          const isWithinWindow = 
            (reminderHours === 1 && minutesUntilShift > 0 && minutesUntilShift <= 60) ||
            (reminderHours === 24 && hoursUntilShift > 0 && hoursUntilShift <= 24 && hoursUntilShift > 12) ||
            (reminderHours === 12 && hoursUntilShift > 0 && hoursUntilShift <= 12 && hoursUntilShift > 1);

          if (isWithinWindow) {
            notifiedRef.current.add(notificationKey);
            saveNotified();

            const timeDescription = reminderHours === 1 
              ? `${minutesUntilShift} minuto${minutesUntilShift > 1 ? 's' : ''}`
              : `${hoursUntilShift} hora${hoursUntilShift > 1 ? 's' : ''}`;

            const dayDescription = isToday(shiftDate) 
              ? 'hoje' 
              : isTomorrow(shiftDate) 
                ? 'amanhã' 
                : format(shiftDate, "EEEE", { locale: ptBR });

            // Show toast
            toast.info(
              <div className="flex items-center gap-2">
                {reminderHours <= 1 ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                ) : (
                  <Clock className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-bold">
                    {reminderHours <= 1 ? '⏰ Plantão Próximo!' : '📋 Lembrete de Plantão'}
                  </p>
                  <p className="text-sm">
                    Seu plantão começa em {timeDescription} ({dayDescription} às {shift.start_time})
                  </p>
                </div>
              </div>,
              { 
                duration: reminderHours <= 1 ? 15000 : 10000,
              }
            );

            // Show push notification with tactical sound
            if (isEnabled) {
              await showNotification({
                title: reminderHours <= 1 ? '⏰ Plantão em Breve!' : '📋 Lembrete de Plantão',
                body: `Seu plantão começa em ${timeDescription} (${dayDescription} às ${shift.start_time})`,
                tag: `shift-reminder-${shift.id}`,
                requireInteraction: reminderHours <= 1,
                soundType: reminderHours <= 1 ? 'urgent' : 'shift',
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking shift reminders:', error);
    }
  }, [enabled, agentId, reminderHoursBefore, isEnabled, showNotification, saveNotified]);

  // Check on mount and periodically
  useEffect(() => {
    if (!enabled) return;

    // Initial check after a short delay
    const initialTimer = setTimeout(checkShiftReminders, 2000);

    // Check every minute
    const interval = setInterval(checkShiftReminders, 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [enabled, checkShiftReminders]);

  // Notify about shift starting now
  const notifyShiftStarting = useCallback(async (shift: Shift) => {
    const notificationKey = `${shift.id}-starting`;
    if (notifiedRef.current.has(notificationKey)) return;

    notifiedRef.current.add(notificationKey);
    saveNotified();

    toast.success(
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-green-500" />
        <div>
          <p className="font-bold">🚀 Plantão Iniciado!</p>
          <p className="text-sm">Seu plantão começou. Bom trabalho!</p>
        </div>
      </div>,
      { duration: 10000 }
    );

    if (isEnabled) {
      await showNotification({
        title: '🚀 Plantão Iniciado!',
        body: 'Seu plantão começou agora. Bom trabalho!',
        tag: `shift-start-${shift.id}`,
        requireInteraction: false,
        soundType: 'success',
      });
    }
  }, [isEnabled, showNotification, saveNotified]);

  // Notify about shift ending soon
  const notifyShiftEndingSoon = useCallback(async (hoursRemaining: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const notificationKey = `shift-ending-${today}-${hoursRemaining}h`;
    if (notifiedRef.current.has(notificationKey)) return;

    notifiedRef.current.add(notificationKey);
    saveNotified();

    toast.info(
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-green-500" />
        <div>
          <p className="font-bold">⏳ Plantão Terminando</p>
          <p className="text-sm">
            Faltam {hoursRemaining} hora{hoursRemaining > 1 ? 's' : ''} para o fim do seu plantão.
          </p>
        </div>
      </div>,
      { duration: 8000 }
    );
  }, [saveNotified]);

  return {
    checkShiftReminders,
    notifyShiftStarting,
    notifyShiftEndingSoon,
  };
}
