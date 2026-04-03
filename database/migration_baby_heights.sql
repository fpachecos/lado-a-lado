-- Migration: Controle de altura do bebê
-- Cria tabela baby_heights

CREATE TABLE IF NOT EXISTS ladoalado.baby_heights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baby_id UUID NOT NULL REFERENCES ladoalado.babies(id) ON DELETE CASCADE,
  height_mm INTEGER NOT NULL CHECK (height_mm > 0),
  measured_at DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE ladoalado.baby_heights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_heights'
      AND policyname = 'Users can view their baby heights'
  ) THEN
    CREATE POLICY "Users can view their baby heights"
      ON ladoalado.baby_heights FOR SELECT
      USING (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_heights'
      AND policyname = 'Users can insert their baby heights'
  ) THEN
    CREATE POLICY "Users can insert their baby heights"
      ON ladoalado.baby_heights FOR INSERT
      WITH CHECK (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_heights'
      AND policyname = 'Users can delete their baby heights'
  ) THEN
    CREATE POLICY "Users can delete their baby heights"
      ON ladoalado.baby_heights FOR DELETE
      USING (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_baby_heights_baby_date
  ON ladoalado.baby_heights (baby_id, measured_at ASC);
