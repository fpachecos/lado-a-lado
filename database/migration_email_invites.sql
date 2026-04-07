-- Migration: Sistema de convites por e-mail
-- Criada em: 2026-04-07
--
-- Cria a tabela user_invites, RPCs para aceite e info do convite,
-- e atualiza políticas RLS de todas as tabelas para permitir que
-- usuários convidados acessem (e gerenciem) os dados do convidante.

-- ════════════════════════════════════════════════════
-- Tabela de convites
-- ════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ladoalado.user_invites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS user_invites_inviter_id_idx    ON ladoalado.user_invites(inviter_id);
CREATE INDEX IF NOT EXISTS user_invites_invitee_email_idx ON ladoalado.user_invites(invitee_email);
CREATE INDEX IF NOT EXISTS user_invites_invitee_id_idx    ON ladoalado.user_invites(invitee_id);
CREATE INDEX IF NOT EXISTS user_invites_status_idx        ON ladoalado.user_invites(status);

-- RLS
ALTER TABLE ladoalado.user_invites ENABLE ROW LEVEL SECURITY;

-- Convidante pode ver e gerenciar seus convites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'user_invites'
      AND policyname = 'Inviters can manage their invites'
  ) THEN
    CREATE POLICY "Inviters can manage their invites"
      ON ladoalado.user_invites FOR ALL
      USING (inviter_id = auth.uid());
  END IF;
END;
$$;

-- Convidado pode ver convites direcionados a ele
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'user_invites'
      AND policyname = 'Invitees can view their invites'
  ) THEN
    CREATE POLICY "Invitees can view their invites"
      ON ladoalado.user_invites FOR SELECT
      USING (invitee_id = auth.uid());
  END IF;
END;
$$;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_user_invites_updated_at ON ladoalado.user_invites;
CREATE TRIGGER update_user_invites_updated_at
  BEFORE UPDATE ON ladoalado.user_invites
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();

-- Permissão para usuários autenticados
GRANT ALL ON TABLE ladoalado.user_invites TO authenticated;

-- ════════════════════════════════════════════════════
-- RPC: accept_invite
-- Chamada pelo convidado após configurar a senha.
-- Liga o convite pendente ao uid atual pelo e-mail.
-- ════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION ladoalado.accept_invite()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ladoalado
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  UPDATE ladoalado.user_invites
  SET  invitee_id = auth.uid(),
       status     = 'accepted',
       updated_at = NOW()
  WHERE invitee_email = v_user_email
    AND status        = 'pending'
    AND invitee_id    IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION ladoalado.accept_invite() TO authenticated;

-- ════════════════════════════════════════════════════
-- RPC: get_invite_info
-- Retorna dados do convidante para exibir na tela de aceite.
-- ════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION ladoalado.get_invite_info()
RETURNS TABLE(inviter_email TEXT, inviter_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ladoalado
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN QUERY
  SELECT
    au.email::TEXT,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      au.email
    )::TEXT
  FROM ladoalado.user_invites ui
  JOIN auth.users au ON au.id = ui.inviter_id
  WHERE ui.invitee_email = v_user_email
    AND ui.status        = 'pending'
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION ladoalado.get_invite_info() TO authenticated;

-- ════════════════════════════════════════════════════
-- Políticas RLS: convidados têm acesso total aos dados
--               do convidante (mesmas permissões do dono)
-- ════════════════════════════════════════════════════

-- ── babies ──────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'babies'
      AND policyname = 'Invited users can select inviter babies'
  ) THEN
    CREATE POLICY "Invited users can select inviter babies"
      ON ladoalado.babies FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.user_invites
          WHERE invitee_id = auth.uid()
            AND inviter_id = babies.user_id
            AND status     = 'accepted'
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'babies'
      AND policyname = 'Invited users can insert for inviter'
  ) THEN
    CREATE POLICY "Invited users can insert for inviter"
      ON ladoalado.babies FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM ladoalado.user_invites
          WHERE invitee_id = auth.uid()
            AND inviter_id = babies.user_id
            AND status     = 'accepted'
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'babies'
      AND policyname = 'Invited users can update inviter babies'
  ) THEN
    CREATE POLICY "Invited users can update inviter babies"
      ON ladoalado.babies FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.user_invites
          WHERE invitee_id = auth.uid()
            AND inviter_id = babies.user_id
            AND status     = 'accepted'
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'babies'
      AND policyname = 'Invited users can delete inviter babies'
  ) THEN
    CREATE POLICY "Invited users can delete inviter babies"
      ON ladoalado.babies FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.user_invites
          WHERE invitee_id = auth.uid()
            AND inviter_id = babies.user_id
            AND status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── companions ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'companions'
      AND policyname = 'Invited users can manage inviter companions'
  ) THEN
    CREATE POLICY "Invited users can manage inviter companions"
      ON ladoalado.companions FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.user_invites
          WHERE invitee_id = auth.uid()
            AND inviter_id = companions.user_id
            AND status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── companion_activities ─────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'companion_activities'
      AND policyname = 'Invited users can manage inviter companion activities'
  ) THEN
    CREATE POLICY "Invited users can manage inviter companion activities"
      ON ladoalado.companion_activities FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.companions c
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = c.user_id
          WHERE  c.id          = companion_activities.companion_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── visit_schedules ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'visit_schedules'
      AND policyname = 'Invited users can manage inviter schedules'
  ) THEN
    CREATE POLICY "Invited users can manage inviter schedules"
      ON ladoalado.visit_schedules FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.user_invites
          WHERE invitee_id = auth.uid()
            AND inviter_id = visit_schedules.user_id
            AND status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── visit_slots ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'visit_slots'
      AND policyname = 'Invited users can manage inviter slots'
  ) THEN
    CREATE POLICY "Invited users can manage inviter slots"
      ON ladoalado.visit_slots FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.visit_schedules vs
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = vs.user_id
          WHERE  vs.id         = visit_slots.schedule_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── baby_weights ─────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ladoalado' AND table_name = 'baby_weights'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_weights'
      AND policyname = 'Invited users can manage inviter baby weights'
  ) THEN
    CREATE POLICY "Invited users can manage inviter baby weights"
      ON ladoalado.baby_weights FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_weights.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── baby_heights ─────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ladoalado' AND table_name = 'baby_heights'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_heights'
      AND policyname = 'Invited users can manage inviter baby heights'
  ) THEN
    CREATE POLICY "Invited users can manage inviter baby heights"
      ON ladoalado.baby_heights FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_heights.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;

-- ── baby_feedings ─────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ladoalado' AND table_name = 'baby_feedings'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado' AND tablename = 'baby_feedings'
      AND policyname = 'Invited users can manage inviter baby feedings'
  ) THEN
    CREATE POLICY "Invited users can manage inviter baby feedings"
      ON ladoalado.baby_feedings FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.babies b
          JOIN   ladoalado.user_invites ui ON ui.inviter_id = b.user_id
          WHERE  b.id          = baby_feedings.baby_id
            AND  ui.invitee_id = auth.uid()
            AND  ui.status     = 'accepted'
        )
      );
  END IF;
END;
$$;
