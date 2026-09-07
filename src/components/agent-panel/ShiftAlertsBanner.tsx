import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useShiftReminderHours } from '@/hooks/useChatSettings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Bell, X, Clock } from 'lucide-react';
import { format, parseISO, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftAlertsBannerProps {
  agentId: string;
  onDismissedChange?: (dismissed: boolean) => void;
  forceShow?: boolean;
}

interface UpcomingShift {
  id: string;
  shift_date: string;
  start_time: string;
}

export function ShiftAlertsBanner({ agentId, onDismissedChange, forceShow = false }: ShiftAlertsBannerProps) {
  const [upcomingShift, setUpcomingShift] = useState<UpcomingShift | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { isEnabled, showNotification } = usePushNotifications();
  const notificationSentRef = useRef<string | null>(null);
  
  // Get user's preferred reminder hours (12, 24, or 48)
  const reminderHours = useShiftReminderHours(agentId);

  // Reset dismissed state when forceShow changes to true
  useEffect(() => {
    if (forceShow) {
      setDismissed(false);
    }
  }, [forceShow]);

  useEffect(() => {
    checkUpcomingShift();
    
    // Check every 30 minutes
    const interval = setInterval(checkUpcomingShift, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [agentId, reminderHours]);

  // Notify parent when dismissed state changes
  useEffect(() => {
    onDismissedChange?.(dismissed);
  }, [dismissed, onDismissedChange]);

  const checkUpcomingShift = async () => {
    try {
      const now = new Date();
      // Calculate future date based on reminder hours setting
      const futureDate = addHours(now, reminderHours);
      
      // Get shifts within the configured reminder window
      const { data, error } = await supabase
        .from('agent_shifts')
        .select('id, shift_date, start_time')
        .eq('agent_id', agentId)
        .gte('shift_date', format(now, 'yyyy-MM-dd'))
        .lte('shift_date', format(futureDate, 'yyyy-MM-dd'))
        .neq('status', 'vacation')
        .order('shift_date', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const shift = data[0] as UpcomingShift;
        const shiftDateTime = parseISO(`${shift.shift_date}T${shift.start_time}`);
        const hoursUntilShift = (shiftDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // Show alert if shift is within configured hours and hasn't started
        if (hoursUntilShift > 0 && hoursUntilShift <= reminderHours) {
          setUpcomingShift(shift);
          
          // Create alert in database if not exists
          await createShiftAlert(shift, hoursUntilShift);
          
          // Send push notification if enabled and not already sent for this shift
          if (isEnabled && notificationSentRef.current !== shift.id) {
            const shiftDate = parseISO(shift.shift_date);
            showNotification({
              title: '🔔 Lembrete de Plantão',
              body: `Seu plantão é ${format(shiftDate, "EEEE, dd/MM", { locale: ptBR })} às ${shift.start_time}. Faltam ${Math.round(hoursUntilShift)}h!`,
              tag: `shift-${shift.id}`,
              requireInteraction: true,
            });
            notificationSentRef.current = shift.id;
          }
        } else {
          setUpcomingShift(null);
        }
      } else {
        setUpcomingShift(null);
      }
    } catch (error) {
      console.error('Error checking upcoming shift:', error);
    }
  };

  const createShiftAlert = async (shift: UpcomingShift, hoursUntil: number) => {
    try {
      // Check if alert already exists for this shift
      const { data: existingAlert } = await supabase
        .from('shift_alerts')
        .select('id')
        .eq('agent_id', agentId)
        .eq('shift_id', shift.id)
        .eq('alert_type', 'shift_reminder_24h')
        .maybeSingle();

      if (!existingAlert) {
        const shiftDate = parseISO(shift.shift_date);
        await supabase
          .from('shift_alerts')
          .insert({
            agent_id: agentId,
            shift_id: shift.id,
            alert_type: 'shift_reminder_24h',
            title: 'Lembrete de Plantão',
            message: `Seu plantão está programado para ${format(shiftDate, "EEEE, dd/MM", { locale: ptBR })} às ${shift.start_time}.`,
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error creating shift alert:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!upcomingShift || dismissed) {
    return null;
  }

  const shiftDate = parseISO(upcomingShift.shift_date);
  const shiftDateTime = parseISO(`${upcomingShift.shift_date}T${upcomingShift.start_time}`);
  const now = new Date();
  const hoursUntil = Math.round((shiftDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Alert className="bg-amber-500/10 border-amber-500/50 mb-4">
      <Bell className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Plantão em {hoursUntil}h
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-amber-500/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="text-slate-300">
        Seu próximo plantão é <strong className="text-amber-400">{format(shiftDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</strong> às <strong className="text-amber-400">{upcomingShift.start_time}</strong>. 
        Prepare-se!
      </AlertDescription>
    </Alert>
  );
}

// Hook to control the banner from parent
export function useShiftAlertsBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  const reactivateBanner = () => {
    setForceShow(true);
    // Reset forceShow after a tick to allow the effect to trigger
    setTimeout(() => setForceShow(false), 100);
  };

  return {
    isDismissed,
    setIsDismissed,
    forceShow,
    reactivateBanner,
  };
}
