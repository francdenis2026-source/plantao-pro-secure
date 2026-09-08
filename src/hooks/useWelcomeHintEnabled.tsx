import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'welcome_hint_enabled';

export function useWelcomeHintEnabled() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle();
    setEnabled(Boolean((data?.value as any)?.enabled));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('welcome_hint_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.${KEY}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const setWelcomeHintEnabled = async (next: boolean) => {
    const { data: userRes } = await supabase.auth.getUser();
    await supabase
      .from('system_settings')
      .upsert(
        { key: KEY, value: { enabled: next }, updated_by: userRes.user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    setEnabled(next);
  };

  return { enabled, loading, setWelcomeHintEnabled };
}
