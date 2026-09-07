-- =============================================================================
-- PLANTÃO PRO - MIGRAÇÃO COMPLETA PARA SUPABASE EXTERNO
-- Sistema de Gestão de Plantões para Segurança Pública
-- Versão: 2.0 | Data: 2026-01-14
-- =============================================================================

-- =============================================================================
-- PARTE 1: EXTENSÕES NECESSÁRIAS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PARTE 2: TIPOS ENUM
-- =============================================================================

-- Roles do sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'master');

-- =============================================================================
-- PARTE 3: TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: units (Unidades Socioeducativas)
-- -----------------------------------------------------------------------------
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  municipality TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  director_name TEXT,
  coordinator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: agents (Agentes)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  matricula TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  birth_date DATE,
  age INTEGER,
  blood_type TEXT,
  avatar_url TEXT,
  team TEXT,
  role TEXT DEFAULT 'agent',
  position TEXT,
  department TEXT,
  unit_id UUID REFERENCES public.units(id),
  first_shift_date DATE,
  bh_hourly_rate NUMERIC DEFAULT 15.75,
  bh_limit NUMERIC DEFAULT 70,
  license_status TEXT DEFAULT 'active',
  license_expires_at TIMESTAMP WITH TIME ZONE,
  license_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  is_frozen BOOLEAN DEFAULT false,
  frozen_at TIMESTAMP WITH TIME ZONE,
  frozen_by UUID,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cpf),
  UNIQUE(matricula)
);

-- -----------------------------------------------------------------------------
-- TABELA: profiles (Perfis de Usuário Auth)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: user_roles (Roles de Usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- -----------------------------------------------------------------------------
-- TABELA: master_admin (Administrador Master)
-- -----------------------------------------------------------------------------
CREATE TABLE public.master_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: master_session_tokens (Tokens de Sessão Master)
-- -----------------------------------------------------------------------------
CREATE TABLE public.master_session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: agent_shifts (Plantões dos Agentes)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agent_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '07:00',
  end_time TIME NOT NULL DEFAULT '07:00',
  shift_type VARCHAR NOT NULL DEFAULT 'regular',
  status VARCHAR NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  is_vacation BOOLEAN NOT NULL DEFAULT false,
  compensation_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, shift_date)
);

-- -----------------------------------------------------------------------------
-- TABELA: shifts (Escala Global - Legado)
-- -----------------------------------------------------------------------------
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'regular',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: overtime_bank (Banco de Horas)
-- -----------------------------------------------------------------------------
CREATE TABLE public.overtime_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  hours NUMERIC NOT NULL DEFAULT 0,
  operation_type TEXT NOT NULL DEFAULT 'credit',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: agent_events (Eventos/Agenda do Agente)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  event_type VARCHAR NOT NULL DEFAULT 'note',
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT true,
  color VARCHAR DEFAULT 'amber',
  reminder_before INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: agent_leaves (Folgas/Licenças)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agent_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: shift_alerts (Alertas de Plantão)
-- -----------------------------------------------------------------------------
CREATE TABLE public.shift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  shift_id UUID,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: shift_planner_configs (Configurações do Planejador)
-- -----------------------------------------------------------------------------
CREATE TABLE public.shift_planner_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  config_name TEXT NOT NULL,
  config_type TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  agent_count INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: transfer_requests (Solicitações de Transferência)
-- -----------------------------------------------------------------------------
CREATE TABLE public.transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  from_unit_id UUID NOT NULL REFERENCES public.units(id),
  to_unit_id UUID NOT NULL REFERENCES public.units(id),
  from_team TEXT NOT NULL,
  to_team TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: payments (Pagamentos/Licenças)
-- -----------------------------------------------------------------------------
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 20.00,
  months_paid INTEGER NOT NULL DEFAULT 1,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'manual',
  notes TEXT,
  registered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: access_logs (Logs de Acesso)
-- -----------------------------------------------------------------------------
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'login',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: login_attempts (Tentativas de Login)
-- -----------------------------------------------------------------------------
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  ip_address TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: chat_rooms (Salas de Chat)
-- -----------------------------------------------------------------------------
CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'team',
  unit_id UUID REFERENCES public.units(id),
  team TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: chat_room_members (Membros das Salas)
-- -----------------------------------------------------------------------------
CREATE TABLE public.chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, agent_id)
);

-- -----------------------------------------------------------------------------
-- TABELA: chat_messages (Mensagens do Chat)
-- -----------------------------------------------------------------------------
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABELA: deleted_messages (Mensagens Excluídas por Usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE public.deleted_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, agent_id)
);

-- =============================================================================
-- PARTE 4: ÍNDICES
-- =============================================================================

CREATE INDEX idx_agents_cpf ON public.agents(cpf);
CREATE INDEX idx_agents_unit_id ON public.agents(unit_id);
CREATE INDEX idx_agents_team ON public.agents(team);
CREATE INDEX idx_agent_shifts_agent_id ON public.agent_shifts(agent_id);
CREATE INDEX idx_agent_shifts_date ON public.agent_shifts(shift_date);
CREATE INDEX idx_overtime_bank_agent_id ON public.overtime_bank(agent_id);
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX idx_shift_alerts_agent_id ON public.shift_alerts(agent_id);
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts(identifier);

-- =============================================================================
-- PARTE 5: FUNÇÕES AUXILIARES
-- =============================================================================

-- Função: Verificar se usuário tem role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função: Verificar se é admin ou master
CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'master')
  )
$$;

-- Função: Atualizar coluna updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Função: Calcular saldo do banco de horas
CREATE OR REPLACE FUNCTION public.calculate_bh_balance(p_agent_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_balance NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN operation_type = 'credit' THEN hours
      WHEN operation_type = 'debit' THEN -hours
      ELSE 0
    END
  ), 0) INTO total_balance
  FROM public.overtime_bank
  WHERE agent_id = p_agent_id;
  
  RETURN total_balance;
END;
$$;

-- Função: Calcular valor monetário do BH
CREATE OR REPLACE FUNCTION public.calculate_bh_value(p_agent_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  balance NUMERIC;
  hourly_rate NUMERIC;
BEGIN
  SELECT calculate_bh_balance(p_agent_id) INTO balance;
  SELECT COALESCE(bh_hourly_rate, 15.75) INTO hourly_rate FROM public.agents WHERE id = p_agent_id;
  
  RETURN balance * hourly_rate;
END;
$$;

-- Função: Verificar se licença expirou
CREATE OR REPLACE FUNCTION public.is_license_expired(p_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_is_frozen BOOLEAN;
BEGIN
  SELECT license_expires_at, COALESCE(is_frozen, false)
  INTO v_expires_at, v_is_frozen
  FROM public.agents
  WHERE id = p_agent_id;
  
  IF v_is_frozen THEN
    RETURN true;
  END IF;
  
  IF v_expires_at IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN v_expires_at + INTERVAL '3 days' < NOW();
END;
$$;

-- Função: Estender licença
CREATE OR REPLACE FUNCTION public.extend_license(p_agent_id UUID, p_months INTEGER, p_admin_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_expires TIMESTAMP WITH TIME ZONE;
  v_new_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT license_expires_at INTO v_current_expires
  FROM public.agents
  WHERE id = p_agent_id;
  
  IF v_current_expires IS NULL OR v_current_expires < NOW() THEN
    v_new_expires := NOW() + (p_months || ' months')::INTERVAL;
  ELSE
    v_new_expires := v_current_expires + (p_months || ' months')::INTERVAL;
  END IF;
  
  UPDATE public.agents
  SET 
    license_expires_at = v_new_expires,
    license_status = 'active',
    is_frozen = false,
    unblocked_by = p_admin_id,
    unblocked_at = NOW(),
    updated_at = NOW()
  WHERE id = p_agent_id;
  
  RETURN v_new_expires;
END;
$$;

-- Função: Congelar/Descongelar agente
CREATE OR REPLACE FUNCTION public.toggle_agent_freeze(p_agent_id UUID, p_freeze BOOLEAN, p_admin_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agents
  SET 
    is_frozen = p_freeze,
    frozen_at = CASE WHEN p_freeze THEN NOW() ELSE NULL END,
    frozen_by = CASE WHEN p_freeze THEN p_admin_id ELSE NULL END,
    unblocked_by = CASE WHEN NOT p_freeze THEN p_admin_id ELSE unblocked_by END,
    unblocked_at = CASE WHEN NOT p_freeze THEN NOW() ELSE unblocked_at END,
    license_status = CASE WHEN p_freeze THEN 'frozen' ELSE 'active' END,
    updated_at = NOW()
  WHERE id = p_agent_id;
  
  RETURN true;
END;
$$;

-- Função: Gerar plantões automaticamente
CREATE OR REPLACE FUNCTION public.generate_agent_shifts(p_agent_id UUID, p_first_shift_date DATE, p_months_ahead INTEGER DEFAULT 6)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_date DATE;
  v_end_date DATE;
  v_count INTEGER := 0;
BEGIN
  DELETE FROM public.agent_shifts 
  WHERE agent_id = p_agent_id 
  AND shift_date >= CURRENT_DATE;
  
  v_end_date := p_first_shift_date + (p_months_ahead * INTERVAL '1 month');
  v_current_date := p_first_shift_date;
  
  WHILE v_current_date <= v_end_date LOOP
    INSERT INTO public.agent_shifts (agent_id, shift_date, start_time, end_time, shift_type, status)
    VALUES (p_agent_id, v_current_date, '07:00', '07:00', 'regular', 'scheduled')
    ON CONFLICT (agent_id, shift_date) DO NOTHING;
    
    v_count := v_count + 1;
    v_current_date := v_current_date + INTERVAL '4 days';
  END LOOP;
  
  UPDATE public.agents SET first_shift_date = p_first_shift_date WHERE id = p_agent_id;
  
  RETURN v_count;
END;
$$;

-- Função: Verificar rate limit de login
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier TEXT, p_max_attempts INTEGER DEFAULT 5, p_window_minutes INTEGER DEFAULT 15)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND success = false
    AND attempt_time > (now() - (p_window_minutes || ' minutes')::INTERVAL);
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- Função: Registrar tentativa de login
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier TEXT, p_success BOOLEAN, p_ip TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier, success, ip_address)
  VALUES (p_identifier, p_success, p_ip);
  
  DELETE FROM public.login_attempts WHERE attempt_time < (now() - INTERVAL '24 hours');
END;
$$;

-- Função: Verificar credenciais master admin
CREATE OR REPLACE FUNCTION public.verify_master_admin(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.master_admin
  WHERE lower(username) = lower(trim(p_username));

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(p_password, stored_hash);
END;
$$;

-- Função: Criar lembrete de plantão
CREATE OR REPLACE FUNCTION public.create_shift_reminder(p_agent_id UUID, p_shift_date DATE, p_shift_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shift_alerts (
    agent_id, 
    shift_id,
    alert_type, 
    title, 
    message, 
    scheduled_for
  ) VALUES (
    p_agent_id,
    p_shift_id,
    'shift_reminder_24h',
    'Lembrete de Plantão',
    'Seu plantão está programado para amanhã (' || to_char(p_shift_date, 'DD/MM/YYYY') || '). Prepare-se!',
    (p_shift_date - INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
  );
END;
$$;

-- Função: Limpar usuário auth órfão
CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_user(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN true;
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.agents WHERE id = v_user_id) THEN
    RETURN false;
  END IF;
  
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
  
  RETURN true;
END;
$$;

-- Função: Handler para novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Função: Deletar auth user quando agent é deletado
CREATE OR REPLACE FUNCTION public.delete_auth_user_on_agent_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- =============================================================================
-- PARTE 6: TRIGGERS
-- =============================================================================

-- Trigger: Atualizar updated_at em agents
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em agent_shifts
CREATE TRIGGER update_agent_shifts_updated_at
  BEFORE UPDATE ON public.agent_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em agent_events
CREATE TRIGGER update_agent_events_updated_at
  BEFORE UPDATE ON public.agent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em agent_leaves
CREATE TRIGGER update_agent_leaves_updated_at
  BEFORE UPDATE ON public.agent_leaves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em shifts
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em transfer_requests
CREATE TRIGGER update_transfer_requests_updated_at
  BEFORE UPDATE ON public.transfer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Atualizar updated_at em shift_planner_configs
CREATE TRIGGER update_shift_planner_configs_updated_at
  BEFORE UPDATE ON public.shift_planner_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Handler para novo usuário auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Deletar auth user quando agent é deletado
CREATE TRIGGER trigger_delete_auth_user_on_agent_delete
  AFTER DELETE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user_on_agent_delete();

-- =============================================================================
-- PARTE 7: STORAGE (Buckets)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Policies para Storage
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- PARTE 8: HABILITAR RLS EM TODAS AS TABELAS
-- =============================================================================

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_planner_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- PARTE 9: ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- ----- UNITS -----
CREATE POLICY "Units are viewable by everyone" ON public.units FOR SELECT USING (true);
CREATE POLICY "Authenticated users can view units" ON public.units FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage units" ON public.units FOR ALL USING (is_admin_or_master(auth.uid()));

-- ----- AGENTS -----
CREATE POLICY "Allow public CPF lookup" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can view all agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Agents can view own record" ON public.agents FOR SELECT USING ((cpf = split_part(auth.email(), '@', 1)) OR is_admin_or_master(auth.uid()));
CREATE POLICY "Allow agent registration" ON public.agents FOR INSERT WITH CHECK ((id = auth.uid()) OR is_admin_or_master(auth.uid()));
CREATE POLICY "Agents can update own record" ON public.agents FOR UPDATE USING ((cpf = split_part(auth.email(), '@', 1)) OR is_admin_or_master(auth.uid()));
CREATE POLICY "Users can update their own agent record" ON public.agents FOR UPDATE USING (cpf = split_part(auth.email(), '@', 1)) WITH CHECK (cpf = split_part(auth.email(), '@', 1));
CREATE POLICY "Admins full access" ON public.agents FOR ALL USING (is_admin_or_master(auth.uid())) WITH CHECK (is_admin_or_master(auth.uid()));
CREATE POLICY "Admins can delete agents" ON public.agents FOR DELETE USING (is_admin_or_master(auth.uid()));
CREATE POLICY "Users can delete their own agent record" ON public.agents FOR DELETE USING (cpf = split_part(auth.email(), '@', 1));

-- ----- PROFILES -----
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ----- USER_ROLES -----
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'master'));

-- ----- MASTER_ADMIN -----
CREATE POLICY "No direct access to master_admin" ON public.master_admin FOR SELECT USING (false);

-- ----- MASTER_SESSION_TOKENS -----
CREATE POLICY "No direct view for session tokens" ON public.master_session_tokens FOR SELECT USING (false);
CREATE POLICY "No direct insert for session tokens" ON public.master_session_tokens FOR INSERT WITH CHECK (false);
CREATE POLICY "Admins can delete session tokens" ON public.master_session_tokens FOR DELETE USING (is_admin_or_master(auth.uid()));

-- ----- AGENT_SHIFTS -----
CREATE POLICY "Users can view all shifts" ON public.agent_shifts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert shifts" ON public.agent_shifts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update shifts" ON public.agent_shifts FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own shifts" ON public.agent_shifts FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete shifts" ON public.agent_shifts FOR DELETE USING (is_admin_or_master(auth.uid()));

-- ----- SHIFTS -----
CREATE POLICY "Authenticated users can view shifts" ON public.shifts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage shifts" ON public.shifts FOR ALL USING (is_admin_or_master(auth.uid()));
CREATE POLICY "Users can delete own shifts" ON public.shifts FOR DELETE USING (auth.uid() IS NOT NULL);

-- ----- OVERTIME_BANK -----
CREATE POLICY "Anyone can view overtime" ON public.overtime_bank FOR SELECT USING (true);
CREATE POLICY "Agents can insert their own overtime" ON public.overtime_bank FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND a.cpf = split_part(auth.email(), '@', 1)));
CREATE POLICY "Agents can update their own overtime" ON public.overtime_bank FOR UPDATE USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND a.cpf = split_part(auth.email(), '@', 1)));
CREATE POLICY "Agents can delete their own overtime" ON public.overtime_bank FOR DELETE USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = overtime_bank.agent_id AND a.cpf = split_part(auth.email(), '@', 1)));
CREATE POLICY "Admins can manage overtime" ON public.overtime_bank FOR ALL USING (is_admin_or_master(auth.uid()));

-- ----- AGENT_EVENTS -----
CREATE POLICY "Users can view their own events" ON public.agent_events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert their own events" ON public.agent_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own events" ON public.agent_events FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own events" ON public.agent_events FOR DELETE USING (auth.uid() IS NOT NULL);

-- ----- AGENT_LEAVES -----
CREATE POLICY "Agents can view their own leaves" ON public.agent_leaves FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Agents can create their own leaves" ON public.agent_leaves FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Agents can update their own pending leaves" ON public.agent_leaves FOR UPDATE USING ((auth.uid() IS NOT NULL) AND (status = 'pending'));
CREATE POLICY "Agents can delete their own pending leaves" ON public.agent_leaves FOR DELETE USING ((auth.uid() IS NOT NULL) AND (status = 'pending'));

-- ----- SHIFT_ALERTS -----
CREATE POLICY "Agents can view their own alerts" ON public.shift_alerts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can create alerts" ON public.shift_alerts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Agents can update their own alerts" ON public.shift_alerts FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ----- SHIFT_PLANNER_CONFIGS -----
CREATE POLICY "Users can view planner configs" ON public.shift_planner_configs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create planner configs" ON public.shift_planner_configs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update planner configs" ON public.shift_planner_configs FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete planner configs" ON public.shift_planner_configs FOR DELETE USING (auth.uid() IS NOT NULL);

-- ----- TRANSFER_REQUESTS -----
CREATE POLICY "Anyone can view transfer requests" ON public.transfer_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create transfer requests" ON public.transfer_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update transfer requests" ON public.transfer_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY (ARRAY['admin'::app_role, 'master'::app_role])));

-- ----- PAYMENTS -----
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Admin can manage all payments" ON public.payments FOR ALL USING (is_admin_or_master(auth.uid()));
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING ((EXISTS (SELECT 1 FROM agents a WHERE a.id = payments.agent_id AND a.cpf = split_part(auth.email(), '@', 1))) OR is_admin_or_master(auth.uid()));

-- ----- ACCESS_LOGS -----
CREATE POLICY "Users can view own access logs" ON public.access_logs FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "Admin can view all access logs" ON public.access_logs FOR SELECT USING (is_admin_or_master(auth.uid()));
CREATE POLICY "Users can insert own access logs" ON public.access_logs FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "Users can delete own access logs" ON public.access_logs FOR DELETE USING ((agent_id = auth.uid()) OR is_admin_or_master(auth.uid()));

-- ----- LOGIN_ATTEMPTS -----
CREATE POLICY "No public access to login attempts" ON public.login_attempts FOR SELECT USING (false);

-- ----- CHAT_ROOMS -----
CREATE POLICY "Users can view chat rooms" ON public.chat_rooms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create chat rooms" ON public.chat_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ----- CHAT_ROOM_MEMBERS -----
CREATE POLICY "Users can view chat room members" ON public.chat_room_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can join chat rooms" ON public.chat_room_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can leave chat rooms" ON public.chat_room_members FOR DELETE USING (auth.uid() IS NOT NULL);

-- ----- CHAT_MESSAGES -----
CREATE POLICY "Room members can view messages" ON public.chat_messages FOR SELECT USING ((EXISTS (SELECT 1 FROM chat_room_members crm JOIN agents a ON a.id = crm.agent_id WHERE crm.room_id = chat_messages.room_id AND a.cpf = split_part(auth.email(), '@', 1))) OR is_admin_or_master(auth.uid()));
CREATE POLICY "Room members can insert messages" ON public.chat_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND a.cpf = split_part(auth.email(), '@', 1)));
CREATE POLICY "Users can send chat messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND a.cpf = split_part(auth.email(), '@', 1)));
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (EXISTS (SELECT 1 FROM agents a WHERE a.id = chat_messages.sender_id AND a.cpf = split_part(auth.email(), '@', 1)));

-- ----- DELETED_MESSAGES -----
CREATE POLICY "Agents can view own deleted marks" ON public.deleted_messages FOR SELECT USING (is_admin_or_master(auth.uid()) OR (EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND a.cpf = split_part(auth.email(), '@', 1))));
CREATE POLICY "Agents can insert own deleted marks" ON public.deleted_messages FOR INSERT WITH CHECK (is_admin_or_master(auth.uid()) OR (EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND a.cpf = split_part(auth.email(), '@', 1))));
CREATE POLICY "Agents can delete own deleted marks" ON public.deleted_messages FOR DELETE USING (is_admin_or_master(auth.uid()) OR (EXISTS (SELECT 1 FROM agents a WHERE a.id = deleted_messages.agent_id AND a.cpf = split_part(auth.email(), '@', 1))));

-- =============================================================================
-- PARTE 10: HABILITAR REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- =============================================================================
-- FIM DA MIGRAÇÃO
-- =============================================================================
