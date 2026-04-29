CREATE TABLE IF NOT EXISTS ladoalado.baby_naps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  baby_id UUID NOT NULL REFERENCES ladoalado.babies(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_baby_naps_baby_started
  ON ladoalado.baby_naps (baby_id, started_at DESC);

ALTER TABLE ladoalado.baby_naps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_naps' AND policyname = 'Users can view their baby naps'
  ) THEN
    CREATE POLICY "Users can view their baby naps"
      ON ladoalado.baby_naps FOR SELECT
      USING (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_naps' AND policyname = 'Users can insert their baby naps'
  ) THEN
    CREATE POLICY "Users can insert their baby naps"
      ON ladoalado.baby_naps FOR INSERT
      WITH CHECK (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_naps' AND policyname = 'Users can update their baby naps'
  ) THEN
    CREATE POLICY "Users can update their baby naps"
      ON ladoalado.baby_naps FOR UPDATE
      USING (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_naps' AND policyname = 'Users can delete their baby naps'
  ) THEN
    CREATE POLICY "Users can delete their baby naps"
      ON ladoalado.baby_naps FOR DELETE
      USING (baby_id IN (SELECT id FROM ladoalado.babies WHERE user_id = auth.uid()));
  END IF;
END;
$$;
