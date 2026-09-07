import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInMinutes, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { areNativeNotificationsAllowed } from '@/lib/reminderSettings';

export type AlarmCategory = 
  | 'plantao' 
  | 'bh' 
  | 'folga' 
  | 'permuta' 
  | 'ferias' 
  | 'reuniao' 
  | 'personalizado';

export interface UpcomingAlarm {
  id: string;
  category: AlarmCategory;
  title: string;
  description: string;
  dateTime: Date;
  timeUntil: string;
  isUrgent: boolean;
  color: string;
  icon: string;
}

interface UseSmartAlarmsProps {
  agentId: string;
  enabled?: boolean;
}

// Category configurations with unique sounds
const categoryConfig: Record<AlarmCategory, { 
  color: string; 
  icon: string; 
  label: string;
  soundFrequencies: number[];
  soundPattern: 'military' | 'gentle' | 'alert' | 'celebration' | 'formal' | 'custom';
}> = {
  plantao: { 
    color: 'from-cyan-500 to-blue-600', 
    icon: '🛡️', 
    label: 'Plantão',
    soundFrequencies: [523.25, 659.25, 783.99], // C5, E5, G5 - Military fanfare
    soundPattern: 'military'
  },
  bh: { 
    color: 'from-amber-500 to-orange-600', 
    icon: '⏱️', 
    label: 'Banco de Horas',
    soundFrequencies: [440, 554.37, 659.25], // A4, C#5, E5 - Subtle chime
    soundPattern: 'gentle'
  },
  folga: { 
    color: 'from-green-500 to-emerald-600', 
    icon: '🌴', 
    label: 'Folga',
    soundFrequencies: [392, 493.88, 587.33], // G4, B4, D5 - Relaxing
    soundPattern: 'gentle'
  },
  permuta: { 
    color: 'from-yellow-500 to-amber-600', 
    icon: '🔄', 
    label: 'Permuta',
    soundFrequencies: [587.33, 739.99, 880], // D5, F#5, A5 - Alert
    soundPattern: 'alert'
  },
  ferias: { 
    color: 'from-purple-500 to-violet-600', 
    icon: '✈️', 
    label: 'Férias',
    soundFrequencies: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 - Celebration
    soundPattern: 'celebration'
  },
  reuniao: { 
    color: 'from-slate-500 to-zinc-600', 
    icon: '📋', 
    label: 'Reunião',
    soundFrequencies: [349.23, 440, 523.25], // F4, A4, C5 - Formal
    soundPattern: 'formal'
  },
  personalizado: { 
    color: 'from-rose-500 to-pink-600', 
    icon: '⭐', 
    label: 'Personalizado',
    soundFrequencies: [659.25, 783.99, 987.77], // E5, G5, B5 - Custom melody
    soundPattern: 'custom'
  },
};

export function useSmartAlarms({ agentId, enabled = true }: UseSmartAlarmsProps) {
  const [alarms, setAlarms] = useState<UpcomingAlarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const notifiedAlarmsRef = useRef<Set<string>>(new Set());

  // Initialize AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play category-specific sound
  const playCategorySound = useCallback((category: AlarmCategory) => {
    try {
      const ctx = getAudioContext();
      const config = categoryConfig[category];
      const now = ctx.currentTime;

      // Create master gain
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0.3, now);

      config.soundFrequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Different waveforms per pattern
        switch (config.soundPattern) {
          case 'military':
            osc.type = 'sawtooth';
            break;
          case 'celebration':
            osc.type = 'triangle';
            break;
          case 'alert':
            osc.type = 'square';
            break;
          case 'formal':
            osc.type = 'sine';
            break;
          default:
            osc.type = 'sine';
        }
        
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gain);
        gain.connect(masterGain);

        // Different timing patterns
        const delay = index * 0.15;
        const duration = config.soundPattern === 'celebration' ? 0.4 : 0.25;
        
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.4, now + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
        
        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.1);
      });

      // Vibrate if supported
      if ('vibrate' in navigator) {
        const vibratePattern = config.soundPattern === 'military' 
          ? [200, 100, 200, 100, 300]
          : config.soundPattern === 'celebration'
          ? [100, 50, 100, 50, 100, 50, 200]
          : [150, 75, 150];
        navigator.vibrate(vibratePattern);
      }
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }, [getAudioContext]);

  // Format time until alarm
  const formatTimeUntil = useCallback((dateTime: Date): string => {
    const now = new Date();
    const diffMins = differenceInMinutes(dateTime, now);
    
    if (diffMins < 0) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  }, []);

  // Fetch upcoming events from database
  const fetchAlarms = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const upcomingAlarms: UpcomingAlarm[] = [];

      // Fetch shifts (plantões)
      const { data: shifts } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time, status')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .lte('shift_date', nextWeek)
        .eq('status', 'scheduled')
        .order('shift_date', { ascending: true })
        .limit(5);

      shifts?.forEach(shift => {
        const shiftDate = parseISO(shift.shift_date);
        const [hours, minutes] = (shift.start_time || '07:00').split(':').map(Number);
        shiftDate.setHours(hours, minutes, 0, 0);
        
        const config = categoryConfig.plantao;
        upcomingAlarms.push({
          id: `shift-${shift.id}`,
          category: 'plantao',
          title: 'Plantão',
          description: format(shiftDate, "EEEE, dd 'de' MMMM", { locale: ptBR }),
          dateTime: shiftDate,
          timeUntil: formatTimeUntil(shiftDate),
          isUrgent: isToday(shiftDate) || isTomorrow(shiftDate),
          color: config.color,
          icon: config.icon,
        });
      });

      // Fetch leaves (folgas/férias)
      const { data: leaves } = await supabase
        .from('agent_leaves')
        .select('id, start_date, leave_type, status')
        .eq('agent_id', agentId)
        .gte('start_date', today)
        .lte('start_date', nextWeek)
        .in('status', ['approved', 'pending'])
        .order('start_date', { ascending: true })
        .limit(5);

      leaves?.forEach(leave => {
        const leaveDate = parseISO(leave.start_date);
        leaveDate.setHours(8, 0, 0, 0);
        
        const category: AlarmCategory = leave.leave_type === 'vacation' ? 'ferias' : 'folga';
        const config = categoryConfig[category];
        
        upcomingAlarms.push({
          id: `leave-${leave.id}`,
          category,
          title: config.label,
          description: format(leaveDate, "EEEE, dd 'de' MMMM", { locale: ptBR }),
          dateTime: leaveDate,
          timeUntil: formatTimeUntil(leaveDate),
          isUrgent: isToday(leaveDate),
          color: config.color,
          icon: config.icon,
        });
      });

      // Fetch swap requests (permutas)
      const { data: swaps } = await supabase
        .from('shift_swaps')
        .select(`
          id, status, created_at,
          requester_shift:agent_shifts!requester_shift_id(shift_date)
        `)
        .or(`requester_id.eq.${agentId},target_id.eq.${agentId}`)
        .eq('status', 'pending')
        .limit(5);

      swaps?.forEach(swap => {
        const shiftData = swap.requester_shift as any;
        if (shiftData?.shift_date) {
          const swapDate = parseISO(shiftData.shift_date);
          swapDate.setHours(7, 0, 0, 0);
          
          const config = categoryConfig.permuta;
          upcomingAlarms.push({
            id: `swap-${swap.id}`,
            category: 'permuta',
            title: 'Permuta Pendente',
            description: format(swapDate, "dd 'de' MMMM", { locale: ptBR }),
            dateTime: swapDate,
            timeUntil: formatTimeUntil(swapDate),
            isUrgent: differenceInMinutes(swapDate, new Date()) < 1440,
            color: config.color,
            icon: config.icon,
          });
        }
      });

      // Fetch events (reuniões/personalizado)
      const { data: events } = await supabase
        .from('agent_events')
        .select('id, event_date, start_time, title, event_type')
        .eq('agent_id', agentId)
        .gte('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true })
        .limit(5);

      events?.forEach(event => {
        const eventDate = parseISO(event.event_date);
        const [hours, minutes] = (event.start_time || '09:00').split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
        
        const category: AlarmCategory = event.event_type === 'meeting' ? 'reuniao' : 'personalizado';
        const config = categoryConfig[category];
        
        upcomingAlarms.push({
          id: `event-${event.id}`,
          category,
          title: event.title || config.label,
          description: format(eventDate, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR }),
          dateTime: eventDate,
          timeUntil: formatTimeUntil(eventDate),
          isUrgent: isToday(eventDate),
          color: config.color,
          icon: config.icon,
        });
      });

      // Sort by date and update state
      upcomingAlarms.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
      setAlarms(upcomingAlarms);
    } catch (error) {
      console.error('Error fetching alarms:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, formatTimeUntil]);

  // Check for alarms that need to fire
  const checkAlarms = useCallback(() => {
    if (!enabled) return;
    
    const now = new Date();
    
    alarms.forEach(alarm => {
      const minutesUntil = differenceInMinutes(alarm.dateTime, now);
      const alarmKey = `${alarm.id}-${minutesUntil <= 60 ? '60' : minutesUntil <= 30 ? '30' : '0'}`;
      
      // Alert at 60min, 30min, and 0min before
      if ((minutesUntil === 60 || minutesUntil === 30 || minutesUntil === 0) && 
          !notifiedAlarmsRef.current.has(alarmKey)) {
        notifiedAlarmsRef.current.add(alarmKey);
        
        // Play sound
        playCategorySound(alarm.category);
        
        // Show browser notification
        if (areNativeNotificationsAllowed() && Notification.permission === 'granted') {
          const config = categoryConfig[alarm.category];
          new Notification(`${config.icon} ${alarm.title}`, {
            body: minutesUntil === 0 
              ? `AGORA: ${alarm.description}`
              : `Em ${minutesUntil} minutos: ${alarm.description}`,
            icon: '/icon-192.png',
            tag: alarm.id,
            requireInteraction: alarm.isUrgent,
          });
        }
      }
    });
  }, [alarms, enabled, playCategorySound]);

  // Request notification permission
  useEffect(() => {
    if (areNativeNotificationsAllowed() && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch alarms on mount and periodically
  useEffect(() => {
    fetchAlarms();
    const interval = setInterval(fetchAlarms, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchAlarms]);

  // Check alarms every minute
  useEffect(() => {
    const interval = setInterval(checkAlarms, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAlarms]);

  // Cleanup audio context
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    alarms,
    isLoading,
    categoryConfig,
    playCategorySound,
    refreshAlarms: fetchAlarms,
    nextAlarm: alarms[0] || null,
  };
}

export { categoryConfig };
