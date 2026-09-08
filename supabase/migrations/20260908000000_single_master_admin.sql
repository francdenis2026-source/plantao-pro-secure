-- =============================================================================
-- Manter apenas um único admin master: "franc".
-- Remove o usuário "admin" duplicado inserido pelo seed de exemplo.
-- =============================================================================

DELETE FROM public.master_admin WHERE lower(username) = 'admin';
