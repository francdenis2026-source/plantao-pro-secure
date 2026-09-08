-- =============================================================================
-- FIX: pgcrypto functions (crypt/gen_salt) live in the "extensions" schema on
-- Supabase, not "public". verify_master_admin had SET search_path = public,
-- so crypt() could not be resolved and every master-admin login would fail.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.verify_master_admin(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  RETURN stored_hash = extensions.crypt(p_password, stored_hash);
END;
$$;
