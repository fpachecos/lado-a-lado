-- Migration: Controle de peso do bebê
-- Adiciona campo birth_date na tabela babies e cria tabela baby_weights

-- 1. Adicionar birth_date à tabela babies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ladoalado'
      AND table_name   = 'babies'
      AND column_name  = 'birth_date'
  ) THEN
    ALTER TABLE ladoalado.babies ADD COLUMN birth_date DATE;
  END IF;
END;
$$;

-- 2. Criar tabela baby_weights
CREATE TABLE IF NOT EXISTS ladoalado.baby_weights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baby_id UUID NOT NULL REFERENCES ladoalado.babies(id) ON DELETE CASCADE,
  weight_grams INTEGER NOT NULL CHECK (weight_grams > 0),
  measured_at DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE ladoalado.baby_weights ENABLE ROW LEVEL SECURITY;

-- 4. Policy SELECT: usuário vê só pesos do próprio bebê
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_weights'
      AND policyname = 'Users can view their baby weights'
  ) THEN
    CREATE POLICY "Users can view their baby weights"
      ON ladoalado.baby_weights
      FOR SELECT
      USING (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- 5. Policy INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_weights'
      AND policyname = 'Users can insert their baby weights'
  ) THEN
    CREATE POLICY "Users can insert their baby weights"
      ON ladoalado.baby_weights
      FOR INSERT
      WITH CHECK (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- 6. Policy DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'baby_weights'
      AND policyname = 'Users can delete their baby weights'
  ) THEN
    CREATE POLICY "Users can delete their baby weights"
      ON ladoalado.baby_weights
      FOR DELETE
      USING (
        baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid())
      );
  END IF;
END;
$$;

-- 7. Índice para consultas por bebê ordenadas por data
CREATE INDEX IF NOT EXISTS idx_baby_weights_baby_date
  ON ladoalado.baby_weights (baby_id, measured_at ASC);
