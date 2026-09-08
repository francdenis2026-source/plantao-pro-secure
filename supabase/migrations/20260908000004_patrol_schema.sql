-- =============================================================================
-- GESTOR DE RONDAS — schema operacional completo
-- Substitui o controle client-side (round_sessions/team_round_log, cujo timer
-- vivia em localStorage) por uma fonte de verdade no servidor: cada slot
-- guarda scheduled_start/scheduled_end/started_at/paused_at/paused_seconds
-- como timestamps reais, então o timer sobrevive a reload, fechamento do PWA
-- e funciona corretamente em múltiplas sessões simultâneas.
--
-- Não há tabela "teams" no schema (equipe é agents.team TEXT) — os campos de
-- equipe aqui seguem essa mesma convenção em vez de uma FK inexistente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: patrol_sectors (setores de ronda por unidade — configurável)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patrol_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrol_sectors TO authenticated;
GRANT ALL ON public.patrol_sectors TO service_role;
ALTER TABLE public.patrol_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sectors" ON public.patrol_sectors FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage sectors" ON public.patrol_sectors FOR ALL USING (is_admin_or_master(auth.uid()));

-- -----------------------------------------------------------------------------
-- TABELA: patrol_shifts (turno de ronda — o "plantão de rondas" de uma equipe/unidade)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patrol_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  team TEXT NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrol_shifts TO authenticated;
GRANT ALL ON public.patrol_shifts TO service_role;
ALTER TABLE public.patrol_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view shifts" ON public.patrol_shifts FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can create shifts" ON public.patrol_shifts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update shifts" ON public.patrol_shifts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE TRIGGER set_updated_at_patrol_shifts BEFORE UPDATE ON public.patrol_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- TABELA: patrol_agents (agentes escalados para o turno de ronda)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patrol_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.patrol_shifts(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_round', 'standby', 'unavailable')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (shift_id, agent_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrol_agents TO authenticated;
GRANT ALL ON public.patrol_agents TO service_role;
ALTER TABLE public.patrol_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view patrol agents" ON public.patrol_agents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can manage patrol agents" ON public.patrol_agents FOR ALL USING (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- TABELA: patrol_slots (cada "quarto de hora" — a unidade atômica de ronda)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patrol_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.patrol_shifts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES public.patrol_sectors(id) ON DELETE SET NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  paused_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'late', 'incident', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (scheduled_end > scheduled_start)
);
CREATE INDEX idx_patrol_slots_shift ON public.patrol_slots(shift_id);
CREATE INDEX idx_patrol_slots_agent ON public.patrol_slots(agent_id);
CREATE INDEX idx_patrol_slots_status ON public.patrol_slots(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrol_slots TO authenticated;
GRANT ALL ON public.patrol_slots TO service_role;
ALTER TABLE public.patrol_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view patrol slots" ON public.patrol_slots FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can create patrol slots" ON public.patrol_slots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update patrol slots" ON public.patrol_slots FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE TRIGGER set_updated_at_patrol_slots BEFORE UPDATE ON public.patrol_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- TABELA: patrol_events (log imutável de eventos por slot — auditoria)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patrol_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.patrol_slots(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'paused', 'resumed', 'completed', 'late', 'incident', 'reassigned', 'extended', 'cancelled')),
  agent_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_patrol_events_slot ON public.patrol_events(slot_id);
GRANT SELECT, INSERT ON public.patrol_events TO authenticated;
GRANT ALL ON public.patrol_events TO service_role;
ALTER TABLE public.patrol_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view patrol events" ON public.patrol_events FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert patrol events" ON public.patrol_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- Sem policy de UPDATE/DELETE: eventos são imutáveis por design.

-- -----------------------------------------------------------------------------
-- TABELA: patrol_incidents (ocorrências registradas durante a ronda)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patrol_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES public.patrol_slots(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baixa', 'media', 'alta', 'critica')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_acompanhamento', 'resolvida')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_patrol_incidents_unit ON public.patrol_incidents(unit_id);
GRANT SELECT, INSERT, UPDATE ON public.patrol_incidents TO authenticated;
GRANT ALL ON public.patrol_incidents TO service_role;
ALTER TABLE public.patrol_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view incidents" ON public.patrol_incidents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can create incidents" ON public.patrol_incidents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update incidents" ON public.patrol_incidents FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- FUNÇÕES RPC — controlam o ciclo de vida do slot no servidor (fonte de
-- verdade dos timestamps; o frontend nunca calcula started_at/paused_at).
-- =============================================================================

-- start_patrol_slot: inicia a ronda. Idempotente (repetir não reinicia).
CREATE OR REPLACE FUNCTION public.start_patrol_slot(p_slot_id UUID)
RETURNS public.patrol_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.patrol_slots;
  v_agent_id UUID;
BEGIN
  UPDATE public.patrol_slots
  SET started_at = COALESCE(started_at, now()), status = 'active'
  WHERE id = p_slot_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Slot % não encontrado', p_slot_id;
  END IF;

  INSERT INTO public.patrol_events (slot_id, event_type, agent_id)
  VALUES (p_slot_id, 'started', v_row.agent_id);

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.start_patrol_slot(UUID) TO authenticated;

-- pause_patrol_slot: marca o instante da pausa (o tempo pausado é
-- contabilizado quando a ronda for retomada, via resume_patrol_slot).
CREATE OR REPLACE FUNCTION public.pause_patrol_slot(p_slot_id UUID)
RETURNS public.patrol_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.patrol_slots;
BEGIN
  UPDATE public.patrol_slots
  SET paused_at = now()
  WHERE id = p_slot_id AND status = 'active' AND paused_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Slot % não está ativo ou já está pausado', p_slot_id;
  END IF;

  INSERT INTO public.patrol_events (slot_id, event_type, agent_id)
  VALUES (p_slot_id, 'paused', v_row.agent_id);

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.pause_patrol_slot(UUID) TO authenticated;

-- resume_patrol_slot: soma o tempo pausado a paused_seconds e limpa paused_at.
CREATE OR REPLACE FUNCTION public.resume_patrol_slot(p_slot_id UUID)
RETURNS public.patrol_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.patrol_slots;
BEGIN
  UPDATE public.patrol_slots
  SET paused_seconds = paused_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::INTEGER),
      paused_at = NULL
  WHERE id = p_slot_id AND status = 'active' AND paused_at IS NOT NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Slot % não está pausado', p_slot_id;
  END IF;

  INSERT INTO public.patrol_events (slot_id, event_type, agent_id)
  VALUES (p_slot_id, 'resumed', v_row.agent_id);

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resume_patrol_slot(UUID) TO authenticated;

-- complete_patrol_slot: finaliza a ronda (soma pausa em aberto, se houver).
CREATE OR REPLACE FUNCTION public.complete_patrol_slot(p_slot_id UUID)
RETURNS public.patrol_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.patrol_slots;
BEGIN
  UPDATE public.patrol_slots
  SET completed_at = now(),
      status = 'completed',
      paused_seconds = paused_seconds + CASE WHEN paused_at IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - paused_at))::INTEGER) ELSE 0 END,
      paused_at = NULL
  WHERE id = p_slot_id AND status IN ('active', 'late', 'incident')
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Slot % não pode ser finalizado (status atual não permite)', p_slot_id;
  END IF;

  INSERT INTO public.patrol_events (slot_id, event_type, agent_id)
  VALUES (p_slot_id, 'completed', v_row.agent_id);

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_patrol_slot(UUID) TO authenticated;

-- extend_patrol_slot: adiciona minutos ao término previsto (padrão 5min).
CREATE OR REPLACE FUNCTION public.extend_patrol_slot(p_slot_id UUID, p_minutes INTEGER DEFAULT 5)
RETURNS public.patrol_slots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.patrol_slots;
BEGIN
  UPDATE public.patrol_slots
  SET scheduled_end = scheduled_end + (p_minutes || ' minutes')::INTERVAL
  WHERE id = p_slot_id AND status IN ('active', 'late')
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Slot % não pode ser estendido (status atual não permite)', p_slot_id;
  END IF;

  INSERT INTO public.patrol_events (slot_id, event_type, agent_id, metadata)
  VALUES (p_slot_id, 'extended', v_row.agent_id, jsonb_build_object('minutes', p_minutes));

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.extend_patrol_slot(UUID, INTEGER) TO authenticated;

-- mark_late_patrol_slots: varre slots pendentes cujo scheduled_start já
-- passou e marca como 'late'. Chamada periodicamente pelo frontend (não é
-- um cron de banco) para refletir atrasos sem depender só do relógio local.
CREATE OR REPLACE FUNCTION public.mark_late_patrol_slots(p_shift_id UUID)
RETURNS SETOF public.patrol_slots
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.patrol_slots
  SET status = 'late'
  WHERE shift_id = p_shift_id
    AND status = 'pending'
    AND scheduled_start < now()
  RETURNING *;
$$;
GRANT EXECUTE ON FUNCTION public.mark_late_patrol_slots(UUID) TO authenticated;

-- get_patrol_metrics: KPIs calculados a partir dos dados reais do turno.
CREATE OR REPLACE FUNCTION public.get_patrol_metrics(p_shift_id UUID)
RETURNS TABLE (
  total_slots BIGINT, completed_slots BIGINT, pending_slots BIGINT,
  late_slots BIGINT, open_incidents BIGINT, coverage_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'completed'),
    count(*) FILTER (WHERE status IN ('pending', 'active')),
    count(*) FILTER (WHERE status = 'late'),
    (SELECT count(*) FROM public.patrol_incidents i JOIN public.patrol_slots s ON s.id = i.slot_id WHERE s.shift_id = p_shift_id AND i.status != 'resolvida'),
    CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE status = 'completed') / count(*), 1) END
  FROM public.patrol_slots
  WHERE shift_id = p_shift_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_patrol_metrics(UUID) TO authenticated;

-- =============================================================================
-- REALTIME — os supervisores precisam ver atualizações de outros agentes.
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.patrol_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patrol_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patrol_events;
