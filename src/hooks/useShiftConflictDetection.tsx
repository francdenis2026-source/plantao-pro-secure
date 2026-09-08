import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Users } from 'lucide-react';

export interface ShiftConflict {
  id: string;
  shift_date: string;
  team: string;
  agents: {
    id: string;
    name: string;
    avatar_url: string | null;
  }[];
  detected_at: Date;
}

interface UseShiftConflictDetectionOptions {
  enabled?: boolean;
  isAdmin?: boolean;
  unitId?: string | null;
}

export function useShiftConflictDetection({
  enabled = true,
  isAdmin = false,
  unitId = null,
}: UseShiftConflictDetectionOptions) {
  const { isEnabled, showNotification } = usePushNotifications();
  const notifiedConflictsRef = useRef<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(0);
  const [conflicts, setConflicts] = useState<ShiftConflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Load already notified conflicts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('shift_conflicts_notified');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        notifiedConflictsRef.current = new Set(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save notified conflicts to localStorage
  const saveNotified = useCallback(() => {
    const arr = Array.from(notifiedConflictsRef.current).slice(-100); // Keep last 100
    localStorage.setItem('shift_conflicts_notified', JSON.stringify(arr));
  }, []);

  const checkForConflicts = useCallback(async () => {
    if (!enabled || !isAdmin) return;

    // Throttle checks to every 10 minutes
    const now = Date.now();
    if (now - lastCheckRef.current < 10 * 60 * 1000) return;
    lastCheckRef.current = now;

    setIsChecking(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const thirtyDaysLater = format(addDays(new Date(), 30), 'yyyy-MM-dd');

      // Query to find shifts on the same date with the same team
      const { data: shifts, error } = await supabase
        .from('agent_shifts')
        .select(`
          id,
          shift_date,
          agent_id,
          start_time,
          end_time,
          status,
          agents!inner (
            id,
            name,
            team,
            unit_id,
            avatar_url
          )
        `)
        .gte('shift_date', today)
        .lte('shift_date', thirtyDaysLater)
        .eq('status', 'scheduled');

      if (error) throw error;

      // Group shifts by date and team to find conflicts
      const shiftsByDateTeam: Record<string, Array<{
        id: string;
        agent: { id: string; name: string; team: string; unit_id: string; avatar_url: string | null };
        shift_date: string;
      }>> = {};

      for (const shift of (shifts || [])) {
        const agent = (shift as any).agents;
        if (!agent?.team) continue;
        
        // Filter by unit if specified
        if (unitId && agent.unit_id !== unitId) continue;

        const key = `${shift.shift_date}-${agent.team}`;
        if (!shiftsByDateTeam[key]) {
          shiftsByDateTeam[key] = [];
        }
        shiftsByDateTeam[key].push({
          id: shift.id,
          agent: {
            id: agent.id,
            name: agent.name,
            team: agent.team,
            unit_id: agent.unit_id,
            avatar_url: agent.avatar_url,
          },
          shift_date: shift.shift_date,
        });
      }

      // Find conflicts (more than one agent from same team on same day)
      const detectedConflicts: ShiftConflict[] = [];

      for (const [key, shiftsInGroup] of Object.entries(shiftsByDateTeam)) {
        if (shiftsInGroup.length > 1) {
          const [date, team] = key.split('-').slice(0, 2);
          const teamName = key.substring(date.length + 1); // Handle team names with dashes
          
          const conflictId = `${shiftsInGroup[0].shift_date}-${teamName}-${shiftsInGroup.length}`;
          
          detectedConflicts.push({
            id: conflictId,
            shift_date: shiftsInGroup[0].shift_date,
            team: teamName,
            agents: shiftsInGroup.map(s => ({
              id: s.agent.id,
              name: s.agent.name,
              avatar_url: s.agent.avatar_url,
            })),
            detected_at: new Date(),
          });

          // Notify if not already notified
          if (!notifiedConflictsRef.current.has(conflictId)) {
            notifiedConflictsRef.current.add(conflictId);
            saveNotified();

            const agentNames = shiftsInGroup.map(s => s.agent.name.split(' ')[0]).join(', ');
            const dateFormatted = format(new Date(shiftsInGroup[0].shift_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR });

            // Show toast notification
            toast.warning(
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-500/20 mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">⚠️ Conflito de Escalas Detectado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Equipe <span className="font-semibold text-foreground">{teamName}</span> tem {shiftsInGroup.length} agentes escalados para o mesmo dia ({dateFormatted})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agentes: {agentNames}
                  </p>
                </div>
              </div>,
              { 
                duration: 15000,
                closeButton: true,
              }
            );

            // Show push notification
            if (isEnabled) {
              await showNotification({
                title: '⚠️ Conflito de Escalas',
                body: `Equipe ${teamName}: ${shiftsInGroup.length} agentes no mesmo dia (${dateFormatted}). Agentes: ${agentNames}`,
                tag: `conflict-${conflictId}`,
                requireInteraction: true,
              });
            }
          }
        }
      }

      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Error checking shift conflicts:', error);
    } finally {
      setIsChecking(false);
    }
  }, [enabled, isAdmin, unitId, isEnabled, showNotification, saveNotified]);

  // Force check conflicts (bypasses throttle)
  const forceCheckConflicts = useCallback(async () => {
    lastCheckRef.current = 0; // Reset throttle
    await checkForConflicts();
  }, [checkForConflicts]);

  // Check on mount and periodically
  useEffect(() => {
    if (!enabled || !isAdmin) return;

    // Initial check after a short delay
    const initialTimer = setTimeout(checkForConflicts, 3000);

    // Check every 10 minutes
    const interval = setInterval(checkForConflicts, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [enabled, isAdmin, checkForConflicts]);

  // Clear a specific conflict (after it's resolved)
  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
  }, []);

  // Clear all conflicts from notification history
  const clearNotificationHistory = useCallback(() => {
    notifiedConflictsRef.current.clear();
    localStorage.removeItem('shift_conflicts_notified');
  }, []);

  return {
    conflicts,
    isChecking,
    checkForConflicts: forceCheckConflicts,
    dismissConflict,
    clearNotificationHistory,
    hasConflicts: conflicts.length > 0,
  };
}
