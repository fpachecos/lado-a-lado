-- Migration: Corrige acesso de usuários convidados a fraldas e sonecas,
-- e adiciona função para verificar premium do anfitrião.

-- ── baby_diapers: policy para convidados ─────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ladoalado' AND table_name = 'baby_diapers'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_diapers'
      AND policyname = 'Invited users can manage inviter baby diapers'
  ) THEN
    CREATE POLICY "Invited users can manage inviter baby diapers"
      ON ladoalado.baby_diapers FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_diapers.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_diapers.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── baby_naps: policy para convidados ────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ladoalado' AND table_name = 'baby_naps'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_naps'
      AND policyname = 'Invited users can manage inviter baby naps'
  ) THEN
    CREATE POLICY "Invited users can manage inviter baby naps"
      ON ladoalado.baby_naps FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_naps.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_naps.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── is_inviter_premium(): verifica se o anfitrião do usuário atual é premium ─

CREATE OR REPLACE FUNCTION ladoalado.is_inviter_premium()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ladoalado, auth
AS $$
DECLARE
  v_inviter_email TEXT;
BEGIN
  SELECT au.email INTO v_inviter_email
  FROM ladoalado.user_invites ui
  JOIN auth.users au ON au.id = ui.inviter_id
  WHERE ui.invitee_id = auth.uid()
    AND ui.status     = 'accepted'
  LIMIT 1;

  IF v_inviter_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM ladoalado.premium_whitelist
    WHERE lower(email) = lower(v_inviter_email)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ladoalado.is_inviter_premium() TO authenticated;
