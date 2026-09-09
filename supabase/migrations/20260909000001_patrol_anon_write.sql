-- Libera de verdade o Gestor de Rondas para visitantes sem login. A
-- migration anterior (20260909000000) só destravou LEITURA para anon —
-- toda ESCRITA (criar turno, gerar quartos de hora, atribuir agentes,
-- registrar ocorrência) ainda exigia auth.uid() IS NOT NULL, mesmo em
-- políticas listadas como role "public". Sem isso, um visitante via a
-- tela normalmente mas qualquer ação de criar/dividir falhava calada.
CREATE POLICY "Anon can create shifts" ON public.patrol_shifts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update shifts" ON public.patrol_shifts FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon can create patrol slots" ON public.patrol_slots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update patrol slots" ON public.patrol_slots FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon can manage patrol agents" ON public.patrol_agents FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert patrol events" ON public.patrol_events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can create incidents" ON public.patrol_incidents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update incidents" ON public.patrol_incidents FOR UPDATE TO anon USING (true);
