SET search_path TO ladoalado;

CREATE TABLE baby_diapers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id     UUID        NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type        TEXT        NOT NULL CHECK (type IN ('pee', 'poop', 'both')),
  poop_color  TEXT        CHECK (poop_color IN ('c1', 'c2', 'c3', 'blood', 'black', 'c4', 'c5', 'c6', 'c7')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_baby_diapers_baby_recorded
  ON baby_diapers(baby_id, recorded_at DESC);

ALTER TABLE baby_diapers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all"
  ON baby_diapers
  FOR ALL
  TO authenticated
  USING (
    baby_id IN (SELECT id FROM babies WHERE user_id = auth.uid())
  )
  WITH CHECK (
    baby_id IN (SELECT id FROM babies WHERE user_id = auth.uid())
  );
