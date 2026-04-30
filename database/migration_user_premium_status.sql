-- Migration: Cache de status premium por usuário.
-- O próprio usuário escreve seu status ao abrir o app (resultado do check RevenueCat/whitelist).
-- Usuários convidados leem o status do anfitrião via RLS + is_inviter_premium().

CREATE TABLE IF NOT EXISTS ladoalado.user_premium_status (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ladoalado.user_premium_status ENABLE ROW LEVEL SECURITY;

-- Usuário gerencia o próprio status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'user_premium_status'
      AND policyname = 'Users can manage own premium status'
  ) THEN
    CREATE POLICY "Users can manage own premium status"
      ON ladoalado.user_premium_status FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

GRANT ALL ON TABLE ladoalado.user_premium_status TO authenticated;

-- Atualiza is_inviter_premium() para checar também user_premium_status
CREATE OR REPLACE FUNCTION ladoalado.is_inviter_premium()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ladoalado, auth
AS $$
DECLARE
  v_inviter_id    UUID;
  v_inviter_email TEXT;
BEGIN
  SELECT ui.inviter_id, au.email
  INTO   v_inviter_id, v_inviter_email
  FROM   ladoalado.user_invites ui
  JOIN   auth.users au ON au.id = ui.inviter_id
  WHERE  ui.invitee_id = auth.uid()
    AND  ui.status     = 'accepted'
  LIMIT  1;

  IF v_inviter_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Whitelist (usuários legados)
  IF EXISTS (
    SELECT 1 FROM ladoalado.premium_whitelist
    WHERE lower(email) = lower(v_inviter_email)
  ) THEN
    RETURN TRUE;
  END IF;

  -- Cache sincronizado pelo cliente do anfitrião (RevenueCat)
  RETURN EXISTS (
    SELECT 1 FROM ladoalado.user_premium_status
    WHERE user_id = v_inviter_id AND is_premium = TRUE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ladoalado.is_inviter_premium() TO authenticated;
