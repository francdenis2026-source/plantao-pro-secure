-- Agente de apoio (banco de horas / BH) escalado avulso num turno, além do
-- time titular. Mesma tabela patrol_agents, só marca a origem do vínculo.
alter table public.patrol_agents
  add column if not exists is_support boolean not null default false;
