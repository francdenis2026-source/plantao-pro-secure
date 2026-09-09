import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const KEY = 'registrations_enabled';

/** Liga/desliga o autocadastro de novos agentes — controlado pelo
 * administrador. Sem registro na tabela ainda, considera aberto (não
 * bloqueia por padrão). Leitura pública (inclusive visitante não logado,
 * que é justamente quem precisa saber se pode se cadastrar). */
export function useRegistrationsEnabled() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle();
    const value = data?.value as { enabled?: boolean } | null;
    setEnabled(value?.enabled !== false);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('registrations_enabled_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: `key=eq.${KEY}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const setRegistrationsEnabled = async (next: boolean) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key: KEY, value: { enabled: next }, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );
    if (error) throw error;
    setEnabled(next);
  };

  return { enabled, loading, setRegistrationsEnabled };
}
