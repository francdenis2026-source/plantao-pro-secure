// Utilitário compartilhado para buscar e formatar unidades socioeducativas.
// Usa a RPC pública `list_units_basic` (SECURITY DEFINER) para funcionar
// sem sessão autenticada — evitando divergências entre master, cadastro
// de agentes e tela do agente ao inserir o CPF.
import { supabase } from '@/integrations/supabase/client';
import { formatUnitName, formatUnitLabel } from '@/lib/unitNames';

export type BasicUnit = {
  id: string;
  name: string;
  municipality?: string | null;
  address?: string | null;
  phone?: string | null;
  [key: string]: any;
};

export interface FetchUnitsOptions {
  /** Se true (default), aplica formatUnitName ao campo `name`. */
  normalize?: boolean;
  /** Rótulo para logs. */
  scope?: string;
}

/**
 * Busca a lista completa de unidades (9 unidades socioeducativas do Acre).
 * Prioriza a RPC pública; faz fallback direto na tabela se necessário.
 */
export async function fetchUnits(options: FetchUnitsOptions = {}): Promise<BasicUnit[]> {
  const { normalize = true, scope = 'units' } = options;
  let rows: BasicUnit[] = [];

  try {
    const rpc = await (supabase as any).rpc('list_units_basic');
    if (rpc.error) {
      console.error(`[${scope}] list_units_basic falhou, tentando fallback:`, rpc.error);
      const fb = await supabase
        .from('units')
        .select('*')
        .order('municipality')
        .order('name');
      if (fb.error) throw fb.error;
      rows = (fb.data as BasicUnit[]) || [];
    } else {
      rows = (rpc.data as BasicUnit[]) || [];
    }
  } catch (err) {
    console.error(`[${scope}] erro ao buscar unidades:`, err);
    return [];
  }

  if (!normalize) return rows;
  return rows.map((u) => ({ ...u, name: formatUnitName(u.name) }));
}

export { formatUnitName, formatUnitLabel };
