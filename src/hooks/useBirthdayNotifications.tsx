import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Cake } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  birth_date: string | null;
  team: string | null;
  avatar_url: string | null;
}

interface UseBirthdayNotificationsOptions {
  agentId: string;
  team: string | null;
  unitId: string | null;
  enabled?: boolean;
}

export function useBirthdayNotifications({
  agentId,
  team,
  unitId,
  enabled = true,
}: UseBirthdayNotificationsOptions) {
  const { isEnabled, showNotification } = usePushNotifications();
  const lastCheckRef = useRef<string | null>(null);
  const notifiedTodayRef = useRef<Set<string>>(new Set());

  // Get birthday from birth_date (adjusting year to current year)
  const getBirthdayThisYear = useCallback((birthDate: string): Date | null => {
    try {
      const date = parseISO(birthDate);
      const today = new Date();
      const birthdayThisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      return birthdayThisYear;
    } catch {
      return null;
    }
  }, []);

  const checkBirthdays = useCallback(async () => {
    if (!enabled || !team || !unitId) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Only check once per day
    if (lastCheckRef.current === today) return;
    lastCheckRef.current = today;

    try {
      // Fetch team members with birth dates
      const { data: members, error } = await supabase
        .from('agents')
        .select('id, name, birth_date, team, avatar_url')
        .eq('unit_id', unitId)
        .eq('team', team)
        .eq('is_active', true)
        .not('birth_date', 'is', null);

      if (error) throw error;

      const teamMembers = (members || []) as TeamMember[];
      
      for (const member of teamMembers) {
        // Skip self
        if (member.id === agentId) continue;
        if (!member.birth_date) continue;

        const birthdayThisYear = getBirthdayThisYear(member.birth_date);
        if (!birthdayThisYear) continue;

        const notificationKey = `${member.id}-${today}`;
        
        // Check if today is their birthday
        if (isToday(birthdayThisYear) && !notifiedTodayRef.current.has(notificationKey)) {
          notifiedTodayRef.current.add(notificationKey);
          
          // Show toast notification
          toast.info(
            <div className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              <div>
                <p className="font-bold">🎂 Aniversário Hoje!</p>
                <p className="text-sm">{member.name} está fazendo aniversário!</p>
              </div>
            </div>,
            { duration: 10000 }
          );

          // Show push notification if enabled
          if (isEnabled) {
            await showNotification({
              title: '🎂 Aniversário na Equipe!',
              body: `${member.name} está fazendo aniversário hoje! Não esqueça de parabenizar!`,
              tag: `birthday-${member.id}`,
              requireInteraction: true,
            });
          }
        }
        
        // Check if tomorrow is their birthday (advance notice)
        if (isTomorrow(birthdayThisYear)) {
          const tomorrowKey = `${member.id}-tomorrow-${today}`;
          if (!notifiedTodayRef.current.has(tomorrowKey)) {
            notifiedTodayRef.current.add(tomorrowKey);
            
            toast.info(
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-bold">🎈 Aniversário Amanhã</p>
                  <p className="text-sm">{member.name} faz aniversário amanhã!</p>
                </div>
              </div>,
              { duration: 8000 }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking birthdays:', error);
    }
  }, [enabled, team, unitId, agentId, getBirthdayThisYear, isEnabled, showNotification]);

  // Check on mount and periodically
  useEffect(() => {
    if (!enabled) return;

    // Initial check after a short delay
    const initialTimer = setTimeout(checkBirthdays, 3000);

    // Check every hour
    const interval = setInterval(checkBirthdays, 60 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [enabled, checkBirthdays]);

  // Get upcoming birthdays for display
  const getUpcomingBirthdays = useCallback(async (): Promise<TeamMember[]> => {
    if (!team || !unitId) return [];

    try {
      const { data: members, error } = await supabase
        .from('agents')
        .select('id, name, birth_date, team, avatar_url')
        .eq('unit_id', unitId)
        .eq('team', team)
        .eq('is_active', true)
        .not('birth_date', 'is', null);

      if (error) throw error;

      const today = new Date();
      const upcoming = (members || [])
        .filter((m: TeamMember) => m.id !== agentId && m.birth_date)
        .map((m: TeamMember) => {
          const birthday = getBirthdayThisYear(m.birth_date!);
          const daysUntil = birthday ? differenceInDays(birthday, today) : 999;
          return { ...m, daysUntil };
        })
        .filter((m) => m.daysUntil >= 0 && m.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      return upcoming;
    } catch (error) {
      console.error('Error getting upcoming birthdays:', error);
      return [];
    }
  }, [team, unitId, agentId, getBirthdayThisYear]);

  return {
    checkBirthdays,
    getUpcomingBirthdays,
  };
}
