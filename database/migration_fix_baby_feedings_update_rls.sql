-- Migration: Adiciona política de UPDATE para baby_feedings
-- A migration anterior (migration_baby_feedings.sql) omitiu a política UPDATE,
-- fazendo com que edições de mamadas fossem silenciosamente ignoradas pelo RLS
-- (0 linhas atualizadas, sem erro retornado).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_feedings'
      AND policyname = 'Users can update their baby feedings'
  ) THEN
    CREATE POLICY "Users can update their baby feedings"
      ON ladoalado.baby_feedings
      FOR UPDATE
      USING (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      )
      WITH CHECK (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;
