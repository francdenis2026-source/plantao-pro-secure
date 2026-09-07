import { useEffect, useRef, useState } from 'react';
import { getReminderSettings, subscribeReminderSettings, bindReminderUser, type ReminderSettings } from '@/lib/reminderSettings';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook global de lembrete de rondas.
 *
 * Lê as preferências (intervalo/on-off) via `reminderSettings` — reagindo em
 * tempo real quando o usuário altera na tela de Configurações. O timestamp
 * do último aviso é persistido em localStorage.
 *
 * Pode ser pausado (ex.: quando o gestor está aberto ou uma ronda está
 * ativa) via `paused`.
 */
export function useRoundReminder(options?: { paused?: boolean }) {
  const paused = !!options?.paused;
  const STORAGE_KEY = 'plantaopro_last_round_reminder_at';
  const [settings, setSettings] = useState<ReminderSettings>(() => getReminderSettings());
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  const getLastAt = (): number => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) ? n : 0;
    } catch { return 0; }
  };
  const setLastAt = (ms: number) => {
    try { localStorage.setItem(STORAGE_KEY, String(ms)); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (getLastAt() === 0) setLastAt(Date.now());
  }, []);

  // Reage a mudanças nas preferências (mesma aba ou outra aba).
  useEffect(() => subscribeReminderSettings(setSettings), []);

  // Vincula ao usuário autenticado: hidrata do backend e passa a persistir
  // toda mudança futura no perfil correspondente.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      const uid = data.user?.id ?? null;
      const s = await bindReminderUser(uid);
      if (alive) setSettings(s);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void bindReminderUser(session?.user?.id ?? null).then((s) => {
        if (alive) setSettings(s);
      });
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Se desativado, fecha qualquer alerta em cartaz.
  useEffect(() => {
    if (!settings.enabled && open) setOpen(false);
  }, [settings.enabled, open]);

  useEffect(() => {
    if (paused || !settings.enabled) return;
    // Notificações nativas do navegador foram removidas. Todo aviso é
    // exibido dentro do app pelo `RoundReminderDialog` (SVG profissional).
    const check = () => {
      if (openRef.current) return;
      const last = getLastAt();
      const elapsed = Date.now() - last;
      if (elapsed >= settings.intervalMin * 60_000) {
        setOpen(true);
      }
    };
    check();
    const iv = window.setInterval(check, 15_000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [settings.intervalMin, settings.enabled, paused]);

  const dismiss = () => { setLastAt(Date.now()); setOpen(false); };
  const acknowledge = () => dismiss();

  return { open, dismiss, acknowledge, settings };
}
