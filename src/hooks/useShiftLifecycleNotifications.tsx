import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from './usePushNotifications';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Options {
  agentId?: string | null;
  enabled?: boolean;
}

interface ScheduledPush {
  key: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Agenda notificações Web Push:
 *  - 60 minutos ANTES do início do plantão
 *  - Ao FIM do plantão (baseado em end_time)
 *
 * Reagenda a cada 10 minutos e ao ganhar foco. Segura contra duplicatas via chave.
 */
export function useShiftLifecycleNotifications({ agentId, enabled = true }: Options) {
  const { isEnabled, showNotification } = usePushNotifications();
  const scheduledRef = useRef<Map<string, ScheduledPush>>(new Map());
  const firedRef = useRef<Set<string>>(new Set());
  // Guarda payloads agendados para conseguir disparar "atrasados" quando o app voltar do background.
  const pendingRef = useRef<Map<string, { fireAt: number; payload: Parameters<typeof showNotification>[0] }>>(new Map());

  useEffect(() => {
    if (!enabled || !agentId || !isEnabled) return;

    let cancelled = false;

    const scheduleWindow = async () => {
      if (cancelled) return;
      try {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const untilStr = format(in3Days, 'yyyy-MM-dd');

        const { data } = await supabase
          .from('agent_shifts')
          .select('id, shift_date, start_time, end_time, is_vacation, status')
          .eq('agent_id', agentId)
          .gte('shift_date', todayStr)
          .lte('shift_date', untilStr)
          .order('shift_date', { ascending: true });

        if (!data) return;

        data.forEach((s: any) => {
          if (s.is_vacation || s.status === 'vacation') return;
          const start = parseISO(`${s.shift_date}T${s.start_time || '07:00:00'}`);
          const end = s.end_time
            ? parseISO(`${s.shift_date}T${s.end_time}`)
            : new Date(start.getTime() + 24 * 60 * 60 * 1000);
          // Turno noturno: end < start ⇒ soma 1 dia
          const endAdjusted = end.getTime() <= start.getTime()
            ? new Date(end.getTime() + 24 * 60 * 60 * 1000)
            : end;

          const oneHourBefore = start.getTime() - 60 * 60 * 1000;
          const endTs = endAdjusted.getTime();

          // 1h antes
          const keyBefore = `before-${s.id}`;
          const delayBefore = oneHourBefore - now.getTime();
          if (
            delayBefore > 0 &&
            delayBefore < 3 * 24 * 60 * 60 * 1000 &&
            !scheduledRef.current.has(keyBefore) &&
            !firedRef.current.has(keyBefore)
          ) {
            const beforePayload = {
              title: '⏰ Plantão em 1 hora',
              body: `Prepare-se! Seu plantão inicia às ${s.start_time?.slice(0, 5) || '07:00'} (${format(start, "dd/MM 'às' HH:mm", { locale: ptBR })}).`,
              tag: `shift-before-${s.id}`,
              requireInteraction: true,
              soundType: 'shift' as const,
            };
            pendingRef.current.set(keyBefore, { fireAt: oneHourBefore, payload: beforePayload });
            const to = setTimeout(() => {
              showNotification(beforePayload);
              firedRef.current.add(keyBefore);
              scheduledRef.current.delete(keyBefore);
              pendingRef.current.delete(keyBefore);
            }, delayBefore);
            scheduledRef.current.set(keyBefore, { key: keyBefore, timeoutId: to });
          }

          // Fim do plantão
          const keyEnd = `end-${s.id}`;
          const delayEnd = endTs - now.getTime();
          if (
            delayEnd > 0 &&
            delayEnd < 3 * 24 * 60 * 60 * 1000 &&
            !scheduledRef.current.has(keyEnd) &&
            !firedRef.current.has(keyEnd)
          ) {
            const endPayload = {
              title: '🛡️ Plantão encerrado',
              body: `Seu plantão de ${format(start, 'dd/MM', { locale: ptBR })} foi finalizado. Bom descanso!`,
              tag: `shift-end-${s.id}`,
              requireInteraction: false,
              soundType: 'success' as const,
            };
            pendingRef.current.set(keyEnd, { fireAt: endTs, payload: endPayload });
            const to = setTimeout(() => {
              showNotification(endPayload);
              firedRef.current.add(keyEnd);
              scheduledRef.current.delete(keyEnd);
              pendingRef.current.delete(keyEnd);
              try { window.dispatchEvent(new CustomEvent('shift:ended', { detail: { shiftId: s.id } })); } catch { /* ignore */ }
            }, delayEnd);
            scheduledRef.current.set(keyEnd, { key: keyEnd, timeoutId: to });
          }
        });
      } catch (err) {
        console.warn('[useShiftLifecycleNotifications] falha ao agendar', err);
      }
    };

    // Dispara qualquer notificação cuja hora-alvo já passou (setTimeout é throttled em background).
    const flushOverdue = () => {
      const now = Date.now();
      pendingRef.current.forEach((entry, key) => {
        if (firedRef.current.has(key)) return;
        if (entry.fireAt <= now) {
          showNotification(entry.payload);
          firedRef.current.add(key);
          const s = scheduledRef.current.get(key);
          if (s) { clearTimeout(s.timeoutId); scheduledRef.current.delete(key); }
          pendingRef.current.delete(key);
          if (key.startsWith('end-')) {
            try { window.dispatchEvent(new CustomEvent('shift:ended', { detail: { key } })); } catch { /* ignore */ }
          }
        }
      });
    };

    scheduleWindow();
    const refresh = setInterval(scheduleWindow, 10 * 60 * 1000);
    const onFocus = () => { flushOverdue(); scheduleWindow(); };
    const onVisible = () => { if (!document.hidden) { flushOverdue(); scheduleWindow(); } };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(refresh);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      scheduledRef.current.forEach((s) => clearTimeout(s.timeoutId));
      scheduledRef.current.clear();
      pendingRef.current.clear();
    };
  }, [agentId, enabled, isEnabled, showNotification]);
}
