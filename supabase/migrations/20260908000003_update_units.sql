-- =============================================================================
-- Atualização das unidades socioeducativas:
--   - Remove UIP (unidade desativada, sem agentes vinculados)
--   - Renomeia CS Cruzeiro -> CS Juruá
--   - Renomeia CS Sena -> CS Purus
-- =============================================================================

DELETE FROM public.units WHERE name = 'UIP';

UPDATE public.units SET name = 'CS Juruá' WHERE name = 'CS Cruzeiro';
UPDATE public.units SET name = 'CS Purus' WHERE name = 'CS Sena';
