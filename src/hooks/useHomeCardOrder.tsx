import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LS_KEY = 'plantaopro_home_card_order';

export const DEFAULT_HOME_ORDER = ['rounds', 'hero', 'banner', 'quick'] as const;
export type HomeCardId = (typeof DEFAULT_HOME_ORDER)[number];

function sanitize(order: unknown): HomeCardId[] {
  const base = [...DEFAULT_HOME_ORDER] as HomeCardId[];
  if (!Array.isArray(order)) return base;
  const filtered = order.filter((x): x is HomeCardId =>
    typeof x === 'string' && (DEFAULT_HOME_ORDER as readonly string[]).includes(x),
  );
  // append any missing ids to keep set complete
  for (const id of base) if (!filtered.includes(id)) filtered.push(id);
  return filtered.slice(0, base.length);
}

export function useHomeCardOrder() {
  const { user } = useAuth();
  const [order, setOrder] = useState<HomeCardId[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return sanitize(raw ? JSON.parse(raw) : null);
    } catch {
      return [...DEFAULT_HOME_ORDER];
    }
  });
  const hydratedFor = useRef<string | null>(null);

  // Hydrate from DB per user
  useEffect(() => {
    if (!user?.id) return;
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('home_card_order')
          .eq('user_id', user.id)
          .maybeSingle();
        const remote = (data as any)?.home_card_order;
        if (remote) setOrder(sanitize(remote));
      } catch {
        /* ignore */
      }
    })();
  }, [user?.id]);

  const persist = useCallback(
    async (next: HomeCardId[]) => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      if (!user?.id) return;
      try {
        await supabase
          .from('profiles')
          .update({ home_card_order: next as unknown as any })
          .eq('user_id', user.id);
      } catch {
        /* ignore */
      }
    },
    [user?.id],
  );

  const move = useCallback(
    (from: HomeCardId, to: HomeCardId) => {
      if (from === to) return;
      setOrder((curr) => {
        const next = [...curr];
        const fi = next.indexOf(from);
        const ti = next.indexOf(to);
        if (fi < 0 || ti < 0) return curr;
        next.splice(fi, 1);
        next.splice(ti, 0, from);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    const next = [...DEFAULT_HOME_ORDER] as HomeCardId[];
    setOrder(next);
    void persist(next);
  }, [persist]);

  return { order, move, reset };
}
