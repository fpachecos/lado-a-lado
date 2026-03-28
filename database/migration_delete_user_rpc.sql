-- Migration: add delete_user RPC function
-- Allows an authenticated user to permanently delete their own account.
-- Uses SECURITY DEFINER so it can delete from auth.users on behalf of the caller.

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Garante que apenas o próprio usuário autenticado pode se excluir
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Revoga acesso público e concede apenas a usuários autenticados
REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
