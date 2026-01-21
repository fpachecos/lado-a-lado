-- Trigger para evitar sobreposição de slots
-- Execute este script após criar a tabela visit_slots

CREATE OR REPLACE FUNCTION ladoalado.check_slot_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlapping_slot RECORD;
BEGIN
  -- Se o slot está marcado como skipped, não precisa verificar sobreposição
  IF NEW.is_skipped = TRUE THEN
    RETURN NEW;
  END IF;

  -- Verificar se há slots sobrepostos no mesmo dia
  SELECT INTO overlapping_slot
    id, start_time, duration_minutes
  FROM ladoalado.visit_slots
  WHERE date = NEW.date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_skipped = FALSE
    AND (
      -- Slot novo começa dentro de um slot existente
      (NEW.start_time >= start_time AND NEW.start_time < (start_time + (duration_minutes || ' minutes')::interval)) OR
      -- Slot novo termina dentro de um slot existente
      ((NEW.start_time + (NEW.duration_minutes || ' minutes')::interval) > start_time AND (NEW.start_time + (NEW.duration_minutes || ' minutes')::interval) <= (start_time + (duration_minutes || ' minutes')::interval)) OR
      -- Slot novo engloba um slot existente
      (NEW.start_time <= start_time AND (NEW.start_time + (NEW.duration_minutes || ' minutes')::interval) >= (start_time + (duration_minutes || ' minutes')::interval))
    )
  LIMIT 1;

  IF overlapping_slot IS NOT NULL THEN
    RAISE EXCEPTION 'Slot sobrepõe outro slot existente no mesmo dia e horário';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_check_slot_overlap ON ladoalado.visit_slots;
CREATE TRIGGER trigger_check_slot_overlap
  BEFORE INSERT OR UPDATE ON ladoalado.visit_slots
  FOR EACH ROW
  EXECUTE FUNCTION ladoalado.check_slot_overlap();

