-- Migration: Adiciona campo 'completed' em companion_activities
-- Criada em: 2026-03-21

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ladoalado'
      AND table_name   = 'companion_activities'
      AND column_name  = 'completed'
  ) THEN
    ALTER TABLE ladoalado.companion_activities ADD COLUMN completed BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END;
$$;
