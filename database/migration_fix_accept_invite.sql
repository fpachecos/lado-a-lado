-- Migration: corrige accept_invite para aceitar convites onde invitee_id já está preenchido
-- Criada em: 2026-04-08
--
-- O send-invite já preenche invitee_id no upsert ao criar o convite.
-- A versão anterior da função exigia invitee_id IS NULL, fazendo o UPDATE
-- não encontrar nenhuma linha — o status nunca virava 'accepted' e as
-- políticas RLS bloqueavam o acesso aos dados do convidante.

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
    AND (invitee_id IS NULL OR invitee_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION ladoalado.accept_invite() TO authenticated;
