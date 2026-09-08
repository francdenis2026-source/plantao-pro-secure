import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

export interface NextShift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
}

export interface SwapShiftInfo {
  shift_date: string;
  start_time: string;
  end_time: string;
}

export interface SwapRequestRow {
  id: string;
  requester_id: string;
  target_id: string;
  requester_shift_id: string | null;
  target_shift_id: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  requester?: { name: string; avatar_url: string | null } | null;
  requesterShift?: SwapShiftInfo | null;
  targetShift?: SwapShiftInfo | null;
}

export interface ActivityRow {
  id: string;
  agent_name: string | null;
  action: string;
  resource_type: string;
  created_at: string;
}

export function useNextShift(agentId: string | undefined) {
  return useQuery({
    queryKey: ['home-next-shift', agentId],
    queryFn: async (): Promise<NextShift | null> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await sb
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time, shift_type')
        .eq('agent_id', agentId)
        .gte('shift_date', today)
        .order('shift_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
    refetchInterval: 60_000,
  });
}

export function useWeekShifts(agentId: string | undefined) {
  return useQuery({
    queryKey: ['home-week-shifts', agentId],
    queryFn: async (): Promise<NextShift[]> => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const startStr = start.toISOString().slice(0, 10);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const endStr = end.toISOString().slice(0, 10);
      const { data, error } = await sb
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time, shift_type')
        .eq('agent_id', agentId)
        .gte('shift_date', startStr)
        .lte('shift_date', endStr)
        .order('shift_date');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agentId,
  });
}

export function useHomeCounts(agentId: string | undefined) {
  return useQuery({
    queryKey: ['home-counts', agentId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [todayRes, upcomingRes, swapsRes, noticesRes] = await Promise.all([
        sb.from('agent_shifts').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('shift_date', today),
        sb.from('agent_shifts').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).gt('shift_date', today),
        sb.from('shift_swaps').select('id', { count: 'exact', head: true }).or(`requester_id.eq.${agentId},target_id.eq.${agentId}`).eq('status', 'pending'),
        sb.from('notifications').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('is_read', false),
      ]);
      return {
        today: todayRes.count ?? 0,
        upcoming: upcomingRes.count ?? 0,
        swaps: swapsRes.count ?? 0,
        notices: noticesRes.count ?? 0,
      };
    },
    enabled: !!agentId,
    refetchInterval: 60_000,
  });
}

export function usePendingSwaps(agentId: string | undefined) {
  return useQuery({
    queryKey: ['home-swaps', agentId],
    queryFn: async (): Promise<SwapRequestRow[]> => {
      const { data, error } = await sb
        .from('shift_swaps')
        .select('*, requester:agents!shift_swaps_requester_id_fkey(name, avatar_url)')
        .or(`requester_id.eq.${agentId},target_id.eq.${agentId}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      const swaps: SwapRequestRow[] = data ?? [];

      const shiftIds = Array.from(new Set(
        swaps.flatMap((s) => [s.requester_shift_id, s.target_shift_id]).filter(Boolean),
      )) as string[];
      if (shiftIds.length === 0) return swaps;

      const { data: shifts } = await sb
        .from('agent_shifts')
        .select('id, shift_date, start_time, end_time')
        .in('id', shiftIds);
      const shiftById = new Map((shifts ?? []).map((s: any) => [s.id, s]));

      return swaps.map((s) => ({
        ...s,
        requesterShift: s.requester_shift_id ? shiftById.get(s.requester_shift_id) ?? null : null,
        targetShift: s.target_shift_id ? shiftById.get(s.target_shift_id) ?? null : null,
      }));
    },
    enabled: !!agentId,
  });
}

export function useRecentActivity(agentId: string | undefined) {
  return useQuery({
    queryKey: ['home-activity', agentId],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await sb
        .from('activity_logs')
        .select('id, agent_name, action, resource_type, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!agentId,
  });
}
