import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, AlertTriangle } from 'lucide-react';

interface UseBHReminderOptions {
  agentId: string;
  enabled?: boolean;
  reminderHour?: number; // Hour of day to remind (0-23)
}

interface BHEntry {
  id: string;
  hours: number;
  description: string | null;
  created_at: string;
}

export function useBHReminder({
  agentId,
  enabled = true,
  reminderHour = 18, // Default: 6 PM
}: UseBHReminderOptions) {
  const { isEnabled, showNotification } = usePushNotifications();
  const notifiedRef = useRef<Set<string>>(new Set());
  const [hasBHToday, setHasBHToday] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Load already notified days from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`bh_reminders_${agentId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        notifiedRef.current = new Set(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, [agentId]);

  // Save notified days to localStorage
  const saveNotified = useCallback(() => {
    // Keep only last 30 days
    const arr = Array.from(notifiedRef.current).slice(-30);
    localStorage.setItem(`bh_reminders_${agentId}`, JSON.stringify(arr));
  }, [agentId]);

  // Check if BH was registered today
  const checkBHToday = useCallback(async (): Promise<boolean> => {
    if (!agentId) return false;

    try {
      setIsChecking(true);
      const today = new Date();
      const todayStr = format(today, 'dd/MM/yyyy');

      // Fetch today's BH entries
      const { data: entries, error } = await supabase
        .from('overtime_bank')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if any entry has today's date in description
      const hasTodayBH = (entries || []).some((entry: BHEntry) => {
        if (entry.description) {
          return entry.description.includes(`BH - ${todayStr}`);
        }
        return false;
      });

      setHasBHToday(hasTodayBH);
      return hasTodayBH;
    } catch (error) {
      console.error('Error checking BH today:', error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [agentId]);

  // Send reminder notification
  const sendReminder = useCallback(async (daysWithoutBH: number = 1) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const notificationKey = `bh-reminder-${today}`;

    // Check if already notified today
    if (notifiedRef.current.has(notificationKey)) {
      return false;
    }

    // Mark as notified
    notifiedRef.current.add(notificationKey);
    saveNotified();

    const dayText = daysWithoutBH === 1 
      ? 'Você ainda não registrou seu BH hoje'
      : `Você está há ${daysWithoutBH} dias sem registrar BH`;

    const fortnightInfo = getFortnightInfo();

    // Show toast
    toast.warning(
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <div>
          <p className="font-bold">📝 Lembrete de Banco de Horas</p>
          <p className="text-sm">{dayText}</p>
          <p className="text-xs text-slate-400 mt-1">
            {fortnightInfo.label}: {fortnightInfo.daysRemaining} dia(s) para fechar
          </p>
        </div>
      </div>,
      { 
        duration: 15000,
        action: {
          label: 'Registrar',
          onClick: () => {
            // Navigate to BH section if possible
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }
    );

    // Show push notification
    if (isEnabled) {
      await showNotification({
        title: '📝 Registre seu Banco de Horas',
        body: `${dayText}. ${fortnightInfo.label} fecha em ${fortnightInfo.daysRemaining} dia(s).`,
        tag: 'bh-daily-reminder',
        requireInteraction: true,
      });
    }

    return true;
  }, [isEnabled, showNotification, saveNotified]);

  // Get fortnight info helper
  const getFortnightInfo = () => {
    const today = new Date();
    const todayDay = today.getDate();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const isFirstFortnight = todayDay <= 15;

    return {
      label: isFirstFortnight ? '1ª Quinzena' : '2ª Quinzena',
      startDay: isFirstFortnight ? 1 : 16,
      endDay: isFirstFortnight ? 15 : lastDayOfMonth,
      daysRemaining: isFirstFortnight ? 15 - todayDay : lastDayOfMonth - todayDay,
    };
  };

  // Count consecutive days without BH
  const countDaysWithoutBH = useCallback(async (): Promise<number> => {
    if (!agentId) return 0;

    try {
      const { data: entries, error } = await supabase
        .from('overtime_bank')
        .select('description, created_at')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Extract dates from entries
      const bhDates = new Set<string>();
      (entries || []).forEach((entry: { description: string | null }) => {
        if (entry.description) {
          const match = entry.description.match(/BH - (\d{2}\/\d{2}\/\d{4})/);
          if (match) {
            bhDates.add(match[1]);
          }
        }
      });

      // Count consecutive days without BH (backwards from today)
      const today = new Date();
      let count = 0;
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = format(checkDate, 'dd/MM/yyyy');
        
        if (bhDates.has(dateStr)) {
          break;
        }
        count++;
      }

      return count;
    } catch (error) {
      console.error('Error counting days without BH:', error);
      return 0;
    }
  }, [agentId]);

  // Main check function
  const checkAndRemind = useCallback(async () => {
    if (!enabled || !agentId) return;

    const currentHour = new Date().getHours();
    
    // Only remind at or after the specified hour
    if (currentHour < reminderHour) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const checkKey = `bh-check-${today}`;

    // Already checked today after reminder hour?
    if (notifiedRef.current.has(checkKey)) return;

    // Check if BH was registered today
    const hasBH = await checkBHToday();

    if (!hasBH) {
      const daysWithout = await countDaysWithoutBH();
      await sendReminder(daysWithout);
    }

    // Mark as checked
    notifiedRef.current.add(checkKey);
    saveNotified();
  }, [enabled, agentId, reminderHour, checkBHToday, countDaysWithoutBH, sendReminder, saveNotified]);

  // Check periodically
  useEffect(() => {
    if (!enabled) return;

    // Initial check after delay
    const initialTimer = setTimeout(checkAndRemind, 5000);

    // Check every 30 minutes
    const interval = setInterval(checkAndRemind, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [enabled, checkAndRemind]);

  // Manual reminder function for testing
  const forceReminder = useCallback(async () => {
    const daysWithout = await countDaysWithoutBH();
    
    // Temporarily remove today's notification key to force reminder
    const today = format(new Date(), 'yyyy-MM-dd');
    notifiedRef.current.delete(`bh-reminder-${today}`);
    
    await sendReminder(daysWithout > 0 ? daysWithout : 1);
  }, [countDaysWithoutBH, sendReminder]);

  return {
    hasBHToday,
    isChecking,
    checkBHToday,
    checkAndRemind,
    forceReminder,
    getFortnightInfo,
  };
}
