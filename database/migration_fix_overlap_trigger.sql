-- Migration: corrige trigger de sobreposição de slots
-- Bug: a verificação não filtrava por schedule_id, causando falsos positivos
-- entre slots de agendas diferentes no mesmo dia e horário.

CREATE OR REPLACE FUNCTION ladoalado.check_slot_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlapping_slot RECORD;
BEGIN
  IF NEW.is_skipped = TRUE THEN
    RETURN NEW;
  END IF;

  SELECT INTO overlapping_slot
    id, start_time, duration_minutes
  FROM ladoalado.visit_slots
  WHERE schedule_id = NEW.schedule_id
    AND date = NEW.date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_skipped = FALSE
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < (start_time + (duration_minutes || ' minutes')::interval)) OR
      ((NEW.start_time + (NEW.duration_minutes || ' minutes')::interval) > start_time AND (NEW.start_time + (NEW.duration_minutes || ' minutes')::interval) <= (start_time + (duration_minutes || ' minutes')::interval)) OR
      (NEW.start_time <= start_time AND (NEW.start_time + (NEW.duration_minutes || ' minutes')::interval) >= (start_time + (duration_minutes || ' minutes')::interval))
    )
  LIMIT 1;

  IF overlapping_slot IS NOT NULL THEN
    RAISE EXCEPTION 'Slot sobrepõe outro slot existente no mesmo dia e horário';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_slot_overlap ON ladoalado.visit_slots;
CREATE TRIGGER trigger_check_slot_overlap
  BEFORE INSERT OR UPDATE ON ladoalado.visit_slots
  FOR EACH ROW
  EXECUTE FUNCTION ladoalado.check_slot_overlap();
