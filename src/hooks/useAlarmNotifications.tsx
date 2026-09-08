import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, differenceInMinutes, isSameDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { areNativeNotificationsAllowed } from '@/lib/reminderSettings';

interface UseAlarmNotificationsProps {
  agentId: string;
  enabled?: boolean;
  alarmBeforeMinutes?: number; // Minutes before shift to trigger alarm
}

interface ScheduledAlarm {
  shiftId: string;
  shiftDate: Date;
  alarmTime: Date;
  triggered: boolean;
}

export function useAlarmNotifications({
  agentId,
  enabled = true,
  alarmBeforeMinutes = 60 // 1 hour before by default
}: UseAlarmNotificationsProps) {
  const alarmsRef = useRef<ScheduledAlarm[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play alarm sound
  const playAlarmSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/__l5e/assets-v1/a0d63cfc-5925-45bb-a906-96932f6f4b16/plantao-pro.mp3');
        audioRef.current.volume = 1.0;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.log);
      
      // Also vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    } catch (error) {
      console.log('Error playing alarm:', error);
    }
  }, []);

  // Show alarm notification
  const showAlarmNotification = useCallback(async (shift: ScheduledAlarm) => {
    const shiftTimeStr = format(shift.shiftDate, "dd/MM 'às' HH:mm", { locale: ptBR });
    
    // Try to show native notification
    if (areNativeNotificationsAllowed() && Notification.permission === 'granted') {
      const notification = new Notification('⏰ ALERTA DE PLANTÃO!', {
        body: `Seu plantão começa em ${alarmBeforeMinutes} minutos! (${shiftTimeStr})`,
        icon: '/icon-192.png',
        badge: '/favicon.ico',
        requireInteraction: true,
        tag: `alarm-${shift.shiftId}`
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Play alarm sound
    playAlarmSound();

    // Try to wake up device (if supported)
    if ('wakeLock' in navigator) {
      try {
        await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.log('Wake lock not available');
      }
    }
  }, [alarmBeforeMinutes, playAlarmSound]);

  // Fetch upcoming shifts and schedule alarms
  const scheduleAlarms = useCallback(async () => {
    if (!agentId || !enabled) return;

    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 2);

      const { data: shifts } = await (supabase as any)
        .from('agent_shifts')
        .select('id, shift_date, start_time')
        .eq('agent_id', agentId)
        .gte('shift_date', today.toISOString().split('T')[0])
        .lte('shift_date', tomorrow.toISOString().split('T')[0])
        .order('shift_date', { ascending: true });

      if (!shifts) return;

      // Clear previous alarms that aren't relevant
      alarmsRef.current = alarmsRef.current.filter(a => !a.triggered);

      // Schedule new alarms
      shifts.forEach((shift: any) => {
        const shiftDateTime = parseISO(`${shift.shift_date}T${shift.start_time || '07:00:00'}`);
        const alarmTime = new Date(shiftDateTime.getTime() - alarmBeforeMinutes * 60 * 1000);

        // Check if alarm already exists
        const exists = alarmsRef.current.some(a => a.shiftId === shift.id);
        if (!exists && alarmTime > new Date()) {
          alarmsRef.current.push({
            shiftId: shift.id,
            shiftDate: shiftDateTime,
            alarmTime,
            triggered: false
          });
        }
      });
    } catch (error) {
      console.error('Error scheduling alarms:', error);
    }
  }, [agentId, enabled, alarmBeforeMinutes]);

  // Check alarms every minute
  const checkAlarms = useCallback(() => {
    const now = new Date();
    
    alarmsRef.current.forEach(alarm => {
      if (!alarm.triggered && now >= alarm.alarmTime) {
        alarm.triggered = true;
        showAlarmNotification(alarm);
      }
    });
  }, [showAlarmNotification]);

  // Initialize
  useEffect(() => {
    if (!enabled || !agentId) return;

    // Request notification permission
    if (areNativeNotificationsAllowed() && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Schedule alarms initially
    scheduleAlarms();

    // Check alarms every 30 seconds
    intervalRef.current = setInterval(() => {
      checkAlarms();
    }, 30000);

    // Refresh alarms every 5 minutes
    const refreshInterval = setInterval(scheduleAlarms, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(refreshInterval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [agentId, enabled, scheduleAlarms, checkAlarms]);

  // Manual alarm trigger for testing
  const triggerTestAlarm = useCallback(() => {
    showAlarmNotification({
      shiftId: 'test',
      shiftDate: new Date(),
      alarmTime: new Date(),
      triggered: false
    });
  }, [showAlarmNotification]);

  return {
    scheduledAlarms: alarmsRef.current,
    triggerTestAlarm,
    refreshAlarms: scheduleAlarms
  };
}
