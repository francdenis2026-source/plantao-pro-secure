-- =============================================================================
-- SCHEMA FALTANTE: o frontend (src/**) e as edge functions usam ~39 tabelas e
-- diversas RPCs, mas supabase_migration_complete.sql só define 21 tabelas.
-- Esta migration reconstrói o restante, inferido a partir do uso real no
-- código (interfaces TS, payloads de insert/update, parâmetros de RPC).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: system_settings (chave-valor pública, lida antes do login)
-- -----------------------------------------------------------------------------
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.system_settings FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: activity_logs (log genérico de atividades)
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Agents view own activity, admins view all" ON public.activity_logs FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = activity_logs.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);

-- -----------------------------------------------------------------------------
-- TABELA: advertisements (propagandas exibidas no app do agente)
-- -----------------------------------------------------------------------------
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ad_type TEXT NOT NULL DEFAULT 'banner',
  content_type TEXT NOT NULL DEFAULT 'image',
  title TEXT,
  description TEXT,
  media_url TEXT,
  click_url TEXT,
  cta_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  min_view_seconds INTEGER DEFAULT 0,
  frequency_type TEXT,
  frequency_limit INTEGER,
  priority INTEGER NOT NULL DEFAULT 0,
  target_user_types TEXT[],
  target_unit_ids UUID[],
  target_teams TEXT[],
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ads" ON public.advertisements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage ads" ON public.advertisements FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: ad_views (registro de visualização/clique de propaganda)
-- -----------------------------------------------------------------------------
CREATE TABLE public.ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  view_duration_seconds INTEGER DEFAULT 0,
  clicked BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  device_info JSONB,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ad_views TO authenticated;
GRANT ALL ON public.ad_views TO service_role;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents insert own ad views" ON public.ad_views FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Admins view ad analytics" ON public.ad_views FOR SELECT USING (is_admin_or_master(auth.uid()) OR agent_id = auth.uid());

-- -----------------------------------------------------------------------------
-- TABELA: admin_announcements (avisos administrativos)
-- -----------------------------------------------------------------------------
CREATE TABLE public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  target_type TEXT NOT NULL DEFAULT 'all',
  target_unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  target_team TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_announcements TO authenticated;
GRANT ALL ON public.admin_announcements TO service_role;
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view announcements" ON public.admin_announcements FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage announcements" ON public.admin_announcements FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: admin_permissions (permissões granulares por admin)
-- -----------------------------------------------------------------------------
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  can_manage_agents BOOLEAN NOT NULL DEFAULT true,
  can_manage_units BOOLEAN NOT NULL DEFAULT true,
  can_manage_licenses BOOLEAN NOT NULL DEFAULT false,
  can_manage_screens BOOLEAN NOT NULL DEFAULT true,
  can_manage_ads BOOLEAN NOT NULL DEFAULT true,
  can_view_analytics BOOLEAN NOT NULL DEFAULT true,
  can_manage_roles BOOLEAN NOT NULL DEFAULT false,
  can_delete_agents BOOLEAN NOT NULL DEFAULT false,
  can_manage_announcements BOOLEAN NOT NULL DEFAULT true,
  can_approve_transfers BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin views own permissions" ON public.admin_permissions FOR SELECT USING (user_id = auth.uid() OR is_admin_or_master(auth.uid()));
CREATE POLICY "Master manages permissions" ON public.admin_permissions FOR ALL USING (has_role(auth.uid(), 'master'));

-- -----------------------------------------------------------------------------
-- TABELA: dynamic_screens (telas dinâmicas exibidas no app)
-- -----------------------------------------------------------------------------
CREATE TABLE public.dynamic_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  screen_type TEXT NOT NULL DEFAULT 'welcome',
  title TEXT,
  subtitle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  show_on_login BOOLEAN DEFAULT false,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dynamic_screens TO authenticated;
GRANT ALL ON public.dynamic_screens TO service_role;
ALTER TABLE public.dynamic_screens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view dynamic screens" ON public.dynamic_screens FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage dynamic screens" ON public.dynamic_screens FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: external_database_configs (config de bancos externos, admin)
-- -----------------------------------------------------------------------------
CREATE TABLE public.external_database_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  supabase_url TEXT NOT NULL,
  supabase_anon_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_database_configs TO authenticated;
GRANT ALL ON public.external_database_configs TO service_role;
ALTER TABLE public.external_database_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage external db configs" ON public.external_database_configs FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: license_activation_codes (códigos de ativação de licença)
-- -----------------------------------------------------------------------------
CREATE TABLE public.license_activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  used_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_activation_codes TO authenticated;
GRANT ALL ON public.license_activation_codes TO service_role;
ALTER TABLE public.license_activation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage activation codes" ON public.license_activation_codes FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: notifications (notificações pessoais do agente)
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents view own notifications" ON public.notifications FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = notifications.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Agents update own notifications" ON public.notifications FOR UPDATE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = notifications.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);

-- -----------------------------------------------------------------------------
-- TABELA: password_change_requests (pedido de troca de senha)
-- -----------------------------------------------------------------------------
CREATE TABLE public.password_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_change_requests TO authenticated;
GRANT ALL ON public.password_change_requests TO service_role;
ALTER TABLE public.password_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents view own password requests" ON public.password_change_requests FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = password_change_requests.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);
CREATE POLICY "Agents create own password requests" ON public.password_change_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = password_change_requests.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);
CREATE POLICY "Admins update password requests" ON public.password_change_requests FOR UPDATE USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: round_sessions (sessão ativa de ronda por usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE public.round_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'standard',
  start_time TEXT,
  end_time TEXT,
  interval_min INTEGER,
  rows JSONB,
  server_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_indices INTEGER[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, server_started_at)
);
COMMENT ON CONSTRAINT round_sessions_user_id_server_started_at_key ON public.round_sessions IS 'round_sessions_user_started_active_unique';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_sessions TO authenticated;
GRANT ALL ON public.round_sessions TO service_role;
ALTER TABLE public.round_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own round sessions" ON public.round_sessions FOR ALL USING (user_id = auth.uid() OR is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: saved_credentials (credenciais/dispositivos salvos por agente)
-- -----------------------------------------------------------------------------
CREATE TABLE public.saved_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  cpf TEXT,
  name TEXT,
  encrypted_token TEXT,
  device_id TEXT,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_credentials TO authenticated;
GRANT ALL ON public.saved_credentials TO service_role;
ALTER TABLE public.saved_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own saved credentials" ON public.saved_credentials FOR ALL USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = saved_credentials.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);

-- -----------------------------------------------------------------------------
-- TABELA: scheduled_rounds (agendamento recorrente de rondas por unidade)
-- -----------------------------------------------------------------------------
CREATE TABLE public.scheduled_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'standard',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  recur_times TEXT[] DEFAULT '{}',
  recur_weekdays INTEGER[] DEFAULT '{}',
  interval_minutes INTEGER,
  active_from TIMESTAMP WITH TIME ZONE,
  active_until TIMESTAMP WITH TIME ZONE,
  ronda_duration_min INTEGER NOT NULL DEFAULT 60,
  round_mode TEXT NOT NULL DEFAULT 'standard',
  round_start_time TEXT,
  round_end_time TEXT,
  round_interval_min INTEGER NOT NULL DEFAULT 30,
  require_confirmation_to_stop BOOLEAN NOT NULL DEFAULT false,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  next_trigger_at TIMESTAMP WITH TIME ZONE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_rounds TO authenticated;
GRANT ALL ON public.scheduled_rounds TO service_role;
ALTER TABLE public.scheduled_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view scheduled rounds" ON public.scheduled_rounds FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage scheduled rounds" ON public.scheduled_rounds FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: shift_briefings (checklist de passagem de plantão)
-- -----------------------------------------------------------------------------
CREATE TABLE public.shift_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  adolescents_counted INTEGER,
  handcuffs_counted INTEGER,
  handcuff_keys_counted INTEGER,
  tonfas_counted INTEGER,
  tonfas_expected INTEGER,
  radios_charged_count INTEGER,
  radios_total_expected INTEGER,
  book_entry TEXT,
  handover_ok BOOLEAN NOT NULL DEFAULT false,
  handover_notes TEXT,
  observations TEXT,
  signature TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_briefings TO authenticated;
GRANT ALL ON public.shift_briefings TO service_role;
ALTER TABLE public.shift_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view briefings" ON public.shift_briefings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can create briefings" ON public.shift_briefings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update briefings" ON public.shift_briefings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- TABELA: shift_swaps (solicitação de permuta de plantão)
-- -----------------------------------------------------------------------------
CREATE TABLE public.shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  requester_shift_id UUID,
  target_shift_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_swaps TO authenticated;
GRANT ALL ON public.shift_swaps TO service_role;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Involved agents view swap requests" ON public.shift_swaps FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.cpf = split_part(auth.email(), '@', 1) AND (a.id = shift_swaps.requester_id OR a.id = shift_swaps.target_id))
);
CREATE POLICY "Requester creates swap request" ON public.shift_swaps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM agents a WHERE a.id = shift_swaps.requester_id AND a.cpf = split_part(auth.email(), '@', 1))
);
CREATE POLICY "Involved agents or admin update swap" ON public.shift_swaps FOR UPDATE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.cpf = split_part(auth.email(), '@', 1) AND (a.id = shift_swaps.requester_id OR a.id = shift_swaps.target_id))
);

-- -----------------------------------------------------------------------------
-- TABELA: team_lock_state (estado de trava de equipe/agenda por unidade)
-- -----------------------------------------------------------------------------
CREATE TABLE public.team_lock_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE UNIQUE,
  team TEXT,
  team_confirmed BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_lock_state TO authenticated;
GRANT ALL ON public.team_lock_state TO service_role;
ALTER TABLE public.team_lock_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view team lock state" ON public.team_lock_state FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can upsert team lock state" ON public.team_lock_state FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update team lock state" ON public.team_lock_state FOR UPDATE USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- TABELA: team_round_log (histórico de rondas concluídas por unidade)
-- -----------------------------------------------------------------------------
CREATE TABLE public.team_round_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  saved_name TEXT,
  total_seconds INTEGER,
  agents_count INTEGER,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_round_log TO authenticated;
GRANT ALL ON public.team_round_log TO service_role;
ALTER TABLE public.team_round_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view team round log" ON public.team_round_log FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert team round log" ON public.team_round_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete team round log" ON public.team_round_log FOR DELETE USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- TABELA: bh_monthly_cycles (fechamento mensal do banco de horas)
-- -----------------------------------------------------------------------------
CREATE TABLE public.bh_monthly_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  total_entries INTEGER NOT NULL DEFAULT 0,
  credit_hours NUMERIC NOT NULL DEFAULT 0,
  debit_hours NUMERIC NOT NULL DEFAULT 0,
  fortnight_1_hours NUMERIC NOT NULL DEFAULT 0,
  fortnight_2_hours NUMERIC NOT NULL DEFAULT 0,
  hourly_rate NUMERIC,
  estimated_value NUMERIC,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (agent_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bh_monthly_cycles TO authenticated;
GRANT ALL ON public.bh_monthly_cycles TO service_role;
ALTER TABLE public.bh_monthly_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents view own bh cycles" ON public.bh_monthly_cycles FOR SELECT USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = bh_monthly_cycles.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);
CREATE POLICY "Admins manage bh cycles" ON public.bh_monthly_cycles FOR ALL USING (is_admin_or_master(auth.uid()));
CREATE POLICY "Agents delete own bh cycles" ON public.bh_monthly_cycles FOR DELETE USING (
  is_admin_or_master(auth.uid()) OR
  EXISTS (SELECT 1 FROM agents a WHERE a.id = bh_monthly_cycles.agent_id AND a.cpf = split_part(auth.email(), '@', 1))
);

-- =============================================================================
-- FUNÇÕES RPC FALTANTES
-- =============================================================================

-- get_server_now: horário do servidor (usado para sincronizar relógio local)
CREATE OR REPLACE FUNCTION public.get_server_now()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;
GRANT EXECUTE ON FUNCTION public.get_server_now() TO anon, authenticated;

-- list_units_basic: lista pública de unidades (pré-login)
CREATE OR REPLACE FUNCTION public.list_units_basic()
RETURNS TABLE (id UUID, name TEXT, municipality TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.name, u.municipality FROM public.units u ORDER BY u.municipality, u.name;
$$;
GRANT EXECUTE ON FUNCTION public.list_units_basic() TO anon, authenticated;

-- get_public_operational_counts: contadores públicos exibidos na tela inicial
CREATE OR REPLACE FUNCTION public.get_public_operational_counts()
RETURNS TABLE (units_count BIGINT, agents_total BIGINT, agents_active BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.units),
    (SELECT count(*) FROM public.agents),
    (SELECT count(*) FROM public.agents WHERE is_active = true);
$$;
GRANT EXECUTE ON FUNCTION public.get_public_operational_counts() TO anon, authenticated;

-- lookup_agent_for_login: dados básicos do agente por CPF, usados antes do login
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
  WHERE a.cpf = _cpf;
$$;
GRANT EXECUTE ON FUNCTION public.lookup_agent_for_login(TEXT) TO anon, authenticated;

-- check_existing_cpfs: dado um array de CPFs, retorna quais ainda existem como agente
CREATE OR REPLACE FUNCTION public.check_existing_cpfs(_cpfs TEXT[])
RETURNS TABLE (cpf TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.cpf FROM public.agents a WHERE a.cpf = ANY(_cpfs);
$$;
GRANT EXECUTE ON FUNCTION public.check_existing_cpfs(TEXT[]) TO anon, authenticated;

-- check_matricula_exists: valida duplicidade de matrícula no cadastro
CREATE OR REPLACE FUNCTION public.check_matricula_exists(_matricula TEXT)
RETURNS TABLE (id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id FROM public.agents a WHERE a.matricula = _matricula;
$$;
GRANT EXECUTE ON FUNCTION public.check_matricula_exists(TEXT) TO anon, authenticated;

-- get_agent_shift_status: status de plantão (em serviço agora?) do agente
CREATE OR REPLACE FUNCTION public.get_agent_shift_status(_agent_id UUID)
RETURNS TABLE (
  is_on_duty BOOLEAN, shift_id UUID, shift_date DATE, start_time TIME, end_time TIME,
  shift_start_ts TIMESTAMP WITH TIME ZONE, shift_end_ts TIMESTAMP WITH TIME ZONE,
  seconds_remaining NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  start_ts TIMESTAMP WITH TIME ZONE;
  end_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT s.id, s.shift_date, s.start_time, s.end_time INTO r
  FROM public.agent_shifts s
  WHERE s.agent_id = _agent_id
    AND s.shift_date BETWEEN (CURRENT_DATE - 1) AND (CURRENT_DATE + 1)
  ORDER BY s.shift_date DESC
  LIMIT 1;

  IF r.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::DATE, NULL::TIME, NULL::TIME, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 0::NUMERIC;
    RETURN;
  END IF;

  start_ts := (r.shift_date::TIMESTAMP + r.start_time);
  end_ts := (r.shift_date::TIMESTAMP + r.end_time);
  IF r.end_time <= r.start_time THEN
    end_ts := end_ts + INTERVAL '1 day';
  END IF;

  RETURN QUERY SELECT
    (now() >= start_ts AND now() < end_ts),
    r.id, r.shift_date, r.start_time, r.end_time, start_ts, end_ts,
    GREATEST(EXTRACT(EPOCH FROM (end_ts - now())), 0)::NUMERIC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_agent_shift_status(UUID) TO authenticated;

-- check_agent_shift_divergences: placeholder seguro (sem regra de negócio definida
-- no código-fonte disponível); retorna sempre vazio até que a regra real seja
-- especificada. Evita 404 sem inventar falsos positivos.
CREATE OR REPLACE FUNCTION public.check_agent_shift_divergences(p_agent_id UUID, p_months_ahead INTEGER DEFAULT 3)
RETURNS TABLE (divergence_type TEXT, shift_date DATE, expected_date DATE, notes TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULL::TEXT, NULL::DATE, NULL::DATE, NULL::TEXT WHERE false;
$$;
GRANT EXECUTE ON FUNCTION public.check_agent_shift_divergences(UUID, INTEGER) TO authenticated;

-- close_bh_month: fecha/recalcula o ciclo mensal de banco de horas do agente
-- a partir dos lançamentos de overtime_bank daquele mês.
CREATE OR REPLACE FUNCTION public.close_bh_month(p_agent_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS public.bh_monthly_cycles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit NUMERIC;
  v_debit NUMERIC;
  v_entries INTEGER;
  v_rate NUMERIC;
  v_row public.bh_monthly_cycles;
BEGIN
  SELECT
    COALESCE(SUM(hours) FILTER (WHERE operation_type = 'credit'), 0),
    COALESCE(SUM(hours) FILTER (WHERE operation_type = 'debit'), 0),
    COUNT(*)
  INTO v_credit, v_debit, v_entries
  FROM public.overtime_bank ob
  WHERE ob.agent_id = p_agent_id
    AND EXTRACT(YEAR FROM ob.created_at) = p_year
    AND EXTRACT(MONTH FROM ob.created_at) = p_month;

  SELECT bh_hourly_rate INTO v_rate FROM public.agents WHERE id = p_agent_id;

  INSERT INTO public.bh_monthly_cycles (
    agent_id, year, month, total_hours, total_entries, credit_hours, debit_hours, hourly_rate, estimated_value, closed_at
  )
  VALUES (
    p_agent_id, p_year, p_month, v_credit - v_debit, v_entries, v_credit, v_debit,
    v_rate, (v_credit - v_debit) * COALESCE(v_rate, 0), now()
  )
  ON CONFLICT (agent_id, year, month) DO UPDATE SET
    total_hours = EXCLUDED.total_hours,
    total_entries = EXCLUDED.total_entries,
    credit_hours = EXCLUDED.credit_hours,
    debit_hours = EXCLUDED.debit_hours,
    hourly_rate = EXCLUDED.hourly_rate,
    estimated_value = EXCLUDED.estimated_value,
    closed_at = EXCLUDED.closed_at
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.close_bh_month(UUID, INTEGER, INTEGER) TO authenticated;

-- activate_license_with_code: ativa/renova licença de um agente (ou de todos,
-- se p_agent_id for NULL) usando um código de ativação válido.
CREATE OR REPLACE FUNCTION public.activate_license_with_code(p_code TEXT, p_agent_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.license_activation_codes;
  v_affected INTEGER;
BEGIN
  SELECT * INTO v_code FROM public.license_activation_codes
  WHERE code = p_code AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF v_code.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido, expirado ou esgotado.');
  END IF;

  IF p_agent_id IS NOT NULL THEN
    UPDATE public.agents
    SET license_status = 'active',
        license_expires_at = GREATEST(COALESCE(license_expires_at, now()), now()) + (v_code.duration_days || ' days')::INTERVAL
    WHERE id = p_agent_id;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  ELSE
    UPDATE public.agents
    SET license_status = 'active',
        license_expires_at = GREATEST(COALESCE(license_expires_at, now()), now()) + (v_code.duration_days || ' days')::INTERVAL
    WHERE is_active = true;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;

  UPDATE public.license_activation_codes SET used_count = used_count + 1 WHERE id = v_code.id;

  RETURN jsonb_build_object('success', true, 'affected_agents', v_affected, 'duration_days', v_code.duration_days);
END;
$$;
GRANT EXECUTE ON FUNCTION public.activate_license_with_code(TEXT, UUID) TO authenticated;

-- sync_offline_license_cache: retorna o status de licença dos agentes visíveis
-- ao chamador (respeita RLS de agents), para cache offline no dispositivo.
CREATE OR REPLACE FUNCTION public.sync_offline_license_cache()
RETURNS TABLE (agent_id UUID, cpf TEXT, license_status TEXT, license_expires_at TIMESTAMP WITH TIME ZONE, is_active BOOLEAN, is_frozen BOOLEAN)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT a.id, a.cpf, a.license_status, a.license_expires_at, a.is_active, a.is_frozen
  FROM public.agents a;
$$;
GRANT EXECUTE ON FUNCTION public.sync_offline_license_cache() TO authenticated;

-- =============================================================================
-- TRIGGER: manter updated_at em admin_announcements e shift_swaps
-- (update_updated_at_column já existe no schema base)
-- =============================================================================
CREATE TRIGGER set_updated_at_admin_announcements
  BEFORE UPDATE ON public.admin_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_shift_swaps
  BEFORE UPDATE ON public.shift_swaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_saved_credentials
  BEFORE UPDATE ON public.saved_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
