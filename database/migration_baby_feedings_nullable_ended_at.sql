-- Migration: Torna ended_at nullable em baby_feedings
-- Permite registrar mamadas informando apenas o início, sem o horário de fim.

ALTER TABLE ladoalado.baby_feedings
  ALTER COLUMN ended_at DROP NOT NULL;
