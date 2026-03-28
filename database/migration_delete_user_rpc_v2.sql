-- Migration: melhoria da função delete_user
-- Exclui dinamicamente todos os dados do usuário em qualquer tabela do schema
-- ladoalado que possua a coluna user_id, sem precisar atualizar o script
-- manualmente quando novas tabelas forem adicionadas.

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_table RECORD;
  v_sql TEXT;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Itera sobre todas as tabelas do schema ladoalado que possuem coluna user_id
  FOR v_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'ladoalado'
      AND column_name  = 'user_id'
    ORDER BY table_name
  LOOP
    v_sql := format(
      'DELETE FROM ladoalado.%I WHERE user_id = $1',
      v_table.table_name
    );
    EXECUTE v_sql USING v_uid;
  END LOOP;

  -- Remove o usuário do auth (deve ser por último)
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;
