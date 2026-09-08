import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getShiftBounds, isShiftActive, type ShiftLike } from '@/lib/shiftTime';

export interface ShiftStatus {
  isOnDuty: boolean;
  shiftId: string | null;
  shiftDate: string | null;
  startTime: string | null;
  endTime: string | null;
  shiftStartTs: Date | null;
  shiftEndTs: Date | null;
  secondsRemaining: number;
  loading: boolean;
  source: 'server' | 'local' | 'none';
}

const INITIAL: ShiftStatus = {
  isOnDuty: false,
  shiftId: null,
  shiftDate: null,
  startTime: null,
  endTime: null,
  shiftStartTs: null,
  shiftEndTs: null,
  secondsRemaining: 0,
  loading: true,
  source: 'none',
};

/**
 * Fonte definitiva do status de plantão.
 * - Consulta a RPC `get_agent_shift_status` no backend (autoritativa).
 * - Reconsulta a cada 60s e imediatamente quando o `secondsRemaining` chegar a 0.
 * - Dispara `onShiftEnd` uma única vez quando o plantão termina.
 * - Fallback local (`isShiftActive` com `end_time`) se o backend falhar.
 */
export function useShiftStatus(
  agentId: string | undefined,
  opts?: { onShiftEnd?: () => void; fallbackShift?: ShiftLike | null }
): ShiftStatus {
  const [status, setStatus] = useState<ShiftStatus>(INITIAL);
  const previouslyOnDuty = useRef<boolean>(false);
  const onShiftEndRef = useRef(opts?.onShiftEnd);
  onShiftEndRef.current = opts?.onShiftEnd;

  const fetchStatus = useCallback(async () => {
    if (!agentId) {
      setStatus({ ...INITIAL, loading: false });
      return;
    }
    try {
      const { data, error } = await (supabase as any).rpc('get_agent_shift_status', {
        _agent_id: agentId,
      });
      if (error) throw error;
      const row = Array.isArray(data) && data.length ? data[0] : null;
      const next: ShiftStatus = row
        ? {
            isOnDuty: !!row.is_on_duty,
            shiftId: row.shift_id ?? null,
            shiftDate: row.shift_date ?? null,
            startTime: row.start_time ?? null,
            endTime: row.end_time ?? null,
            shiftStartTs: row.shift_start_ts ? new Date(row.shift_start_ts) : null,
            shiftEndTs: row.shift_end_ts ? new Date(row.shift_end_ts) : null,
            secondsRemaining: Number(row.seconds_remaining ?? 0),
            loading: false,
            source: 'server',
          }
        : { ...INITIAL, loading: false, source: 'server' };
      setStatus(next);
    } catch (err) {
      // Fallback local
      const fb = opts?.fallbackShift;
      if (fb && isShiftActive(fb)) {
        const { start, end } = getShiftBounds(fb);
        setStatus({
          isOnDuty: true,
          shiftId: null,
          shiftDate: fb.shift_date,
          startTime: fb.start_time,
          endTime: fb.end_time ?? null,
          shiftStartTs: start,
          shiftEndTs: end,
          secondsRemaining: Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000)),
          loading: false,
          source: 'local',
        });
      } else {
        setStatus({ ...INITIAL, loading: false, source: 'local' });
      }
    }
  }, [agentId, opts?.fallbackShift]);

  // Fetch inicial + polling + revalidação ao voltar do background
  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 60_000);
    const onVisible = () => { if (!document.hidden) fetchStatus(); };
    const onFocus = () => fetchStatus();
    const onOnline = () => fetchStatus();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [fetchStatus]);

  // Auto-refresh no instante do término
  useEffect(() => {
    if (!status.isOnDuty || !status.shiftEndTs) return;
    const ms = status.shiftEndTs.getTime() - Date.now();
    if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;
    const t = setTimeout(fetchStatus, ms + 500);
    return () => clearTimeout(t);
  }, [status.isOnDuty, status.shiftEndTs, fetchStatus]);

  // Detecta transição on-duty → off-duty
  useEffect(() => {
    if (status.loading) return;
    if (previouslyOnDuty.current && !status.isOnDuty) {
      try { onShiftEndRef.current?.(); } catch { /* ignore */ }
    }
    previouslyOnDuty.current = status.isOnDuty;
  }, [status.isOnDuty, status.loading]);

  return status;
}
