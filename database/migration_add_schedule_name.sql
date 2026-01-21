-- Migração: Adicionar campo name à tabela visit_schedules
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna name se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'ladoalado' 
    AND table_name = 'visit_schedules' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE ladoalado.visit_schedules 
    ADD COLUMN name TEXT;
    
    -- Adicionar comentário na coluna
    COMMENT ON COLUMN ladoalado.visit_schedules.name IS 'Nome/título da agenda de visitas';
  END IF;
END;
$$;

-- Migração concluída!
-- A coluna 'name' foi adicionada à tabela visit_schedules.

