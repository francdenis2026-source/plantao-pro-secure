-- =============================================================================
-- Setores padrão de ronda para cada unidade já cadastrada. É apenas um ponto
-- de partida editável (Seção 34) — o admin pode renomear/adicionar/remover
-- livremente pela tabela patrol_sectors, nada aqui é fixo no frontend.
-- =============================================================================

INSERT INTO public.patrol_sectors (unit_id, name, sort_order)
SELECT u.id, s.name, s.sort_order
FROM public.units u
CROSS JOIN (VALUES
  ('Pavilhão 1', 1),
  ('Pavilhão 2', 2),
  ('Alojamentos', 3),
  ('Perímetro externo', 4),
  ('Área administrativa', 5),
  ('Oficinas', 6)
) AS s(name, sort_order);
