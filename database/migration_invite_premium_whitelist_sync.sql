-- Migration: Sincroniza premium_whitelist com user_invites via trigger.
-- Convite enviado/aceito → invitee_email entra na whitelist.
-- Convite revogado → invitee_email sai da whitelist (só se não houver outro convite ativo).

CREATE OR REPLACE FUNCTION ladoalado.sync_invite_premium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ladoalado
AS $$
BEGIN
  IF NEW.status IN ('pending', 'accepted') THEN
    INSERT INTO ladoalado.premium_whitelist (email)
    VALUES (lower(NEW.invitee_email))
    ON CONFLICT (email) DO NOTHING;

  ELSIF NEW.status = 'revoked' THEN
    -- Remove da whitelist somente se não houver outro convite ativo para este email
    DELETE FROM ladoalado.premium_whitelist
    WHERE lower(email) = lower(NEW.invitee_email)
      AND NOT EXISTS (
        SELECT 1 FROM ladoalado.user_invites
        WHERE lower(invitee_email) = lower(NEW.invitee_email)
          AND status IN ('pending', 'accepted')
          AND id != NEW.id
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invite_premium ON ladoalado.user_invites;
CREATE TRIGGER trg_sync_invite_premium
  AFTER INSERT OR UPDATE OF status ON ladoalado.user_invites
  FOR EACH ROW EXECUTE FUNCTION ladoalado.sync_invite_premium();

-- Backfill: convites já ativos que ainda não estão na whitelist
INSERT INTO ladoalado.premium_whitelist (email)
SELECT lower(invitee_email)
FROM   ladoalado.user_invites
WHERE  status IN ('pending', 'accepted')
ON CONFLICT (email) DO NOTHING;
