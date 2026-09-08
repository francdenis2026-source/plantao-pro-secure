-- =============================================================================
-- O login de "Admin" no app (Index.tsx handleAdminLogin) usa a MESMA edge
-- function master-login, que valida contra public.master_admin — não usa
-- Supabase Auth / user_roles. Por isso o admin precisa existir nesta tabela.
-- =============================================================================

INSERT INTO public.master_admin (username, password_hash)
VALUES ('francdenisbr@gmail.com', extensions.crypt('125758', extensions.gen_salt('bf')))
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash;
