-- Migration: Controle de mamadas do bebê
-- Cria tabela baby_feedings com início, fim e seio utilizado

-- 1. Criar tabela baby_feedings
CREATE TABLE IF NOT EXISTS ladoalado.baby_feedings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baby_id UUID NOT NULL REFERENCES ladoalado.babies(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  breast TEXT NOT NULL CHECK (breast IN ('left', 'right', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE ladoalado.baby_feedings ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT: usuário vê só mamadas do próprio bebê
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_feedings'
      AND policyname = 'Users can view their baby feedings'
  ) THEN
    CREATE POLICY "Users can view their baby feedings"
      ON ladoalado.baby_feedings
      FOR SELECT
      USING (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- 4. Policy INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_feedings'
      AND policyname = 'Users can insert their baby feedings'
  ) THEN
    CREATE POLICY "Users can insert their baby feedings"
      ON ladoalado.baby_feedings
      FOR INSERT
      WITH CHECK (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- 5. Policy DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_feedings'
      AND policyname = 'Users can delete their baby feedings'
  ) THEN
    CREATE POLICY "Users can delete their baby feedings"
      ON ladoalado.baby_feedings
      FOR DELETE
      USING (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- 6. Índice para consultas por bebê ordenadas por data de início
CREATE INDEX IF NOT EXISTS idx_baby_feedings_baby_started
  ON ladoalado.baby_feedings (baby_id, started_at DESC);
