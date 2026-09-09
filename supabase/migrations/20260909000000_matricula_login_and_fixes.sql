-- =============================================================================
-- 1) Login por matrícula (não mais CPF)
-- =============================================================================
-- lookup_agent_for_login passa a casar pelos 6 primeiros dígitos da
-- matrícula funcional, em vez do CPF. O nome do parâmetro (_cpf) foi
-- mantido de propósito para não quebrar nenhuma chamada já existente no
-- frontend (PostgREST casa RPC por nome de parâmetro).
CREATE OR REPLACE FUNCTION public.lookup_agent_for_login(_cpf TEXT)
RETURNS TABLE (
  id UUID, name TEXT, team TEXT, is_active BOOLEAN, is_frozen BOOLEAN,
  license_status TEXT, license_expires_at TIMESTAMP WITH TIME ZONE,
  unit_name TEXT, unit_municipality TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name, a.team, a.is_active, a.is_frozen,
         a.license_status, a.license_expires_at,
         u.name, u.municipality
  FROM public.agents a
  LEFT JOIN public.units u ON u.id = a.unit_id
  WHERE left(regexp_replace(coalesce(a.matricula, ''), '\D', '', 'g'), 6) = _cpf
    AND length(_cpf) = 6;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_agent_for_login(TEXT) TO anon, authenticated;

-- Preserva o comportamento original (busca por CPF) sob um nome novo,
-- usado só pela checagem em tempo real do formulário de cadastro (que
-- ainda coleta CPF como dado de identidade, separado do login).
CREATE OR REPLACE FUNCTION public.lookup_agent_by_cpf(_cpf TEXT)
RETURNS TABLE (
  id UUID, name TEXT, team TEXT, is_active BOOLEAN, is_frozen BOOLEAN,
  license_status TEXT, license_expires_at TIMESTAMP WITH TIME ZONE,
  unit_name TEXT, unit_municipality TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name, a.team, a.is_active, a.is_frozen,
         a.license_status, a.license_expires_at,
         u.name, u.municipality
  FROM public.agents a
  LEFT JOIN public.units u ON u.id = a.unit_id
  WHERE a.cpf = _cpf;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_agent_by_cpf(TEXT) TO anon, authenticated;

-- =============================================================================
-- 2) agents.approval_status ausente — quebrava o painel admin inteiro
-- =============================================================================
-- A edge function admin-operations (list_dashboard_data, get_pending_agents)
-- e o cadastro público (Index.tsx) já dependiam de approval_status,
-- approved_at e rejection_reason, mas essas colunas nunca existiram —
-- toda consulta que juntava agents + units + created_at falhava de uma vez,
-- por isso o admin não identificava agentes, unidades nem datas de cadastro.
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE public.agents SET approval_status = 'approved' WHERE approval_status IS NULL;

-- =============================================================================
-- 3) Gestor de Rondas — leitura pública quebrada por RLS
-- =============================================================================
-- O acesso de visitante (sem login) ao Gestor de Rondas foi liberado na UI
-- (commit 7ae0d11), mas as políticas de SELECT continuavam restritas a
-- {authenticated} (ou, em units, exigiam auth.uid() IS NOT NULL mesmo
-- listadas como "public") — visitante via tela vazia, sem nenhum erro.
CREATE POLICY "Anon can view shifts" ON public.patrol_shifts FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view patrol slots" ON public.patrol_slots FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view sectors" ON public.patrol_sectors FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view patrol agents" ON public.patrol_agents FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view units" ON public.units FOR SELECT TO anon USING (true);
