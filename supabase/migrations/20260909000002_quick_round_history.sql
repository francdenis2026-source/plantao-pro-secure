-- "Modo rápido" do Gestor de Rondas: usuário digita nomes na hora (sem
-- precisar de agente cadastrado), o sistema divide o tempo do turno
-- proporcionalmente e roda um cronômetro automático. Histórico só é
-- gravado para usuários autenticados; visitante reseta ao concluir.
CREATE TABLE IF NOT EXISTS public.quick_round_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id),
  team TEXT,
  agent_names TEXT[] NOT NULL,
  duration_minutes INTEGER NOT NULL,
  per_agent_minutes NUMERIC NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.quick_round_history TO authenticated;
GRANT ALL ON public.quick_round_history TO service_role;
ALTER TABLE public.quick_round_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view quick round history" ON public.quick_round_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert quick round history" ON public.quick_round_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete quick round history" ON public.quick_round_history FOR DELETE TO authenticated USING (true);
