import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { inviteeEmail } = await req.json()
    if (!inviteeEmail) {
      return new Response(JSON.stringify({ error: 'E-mail do convidado é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const adminLadoALadoClient = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: 'ladoalado' },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 1. Verifica o status atual do convite na tabela user_invites ──────────
    // O status em user_invites é a fonte de verdade — não auth.users.email_confirmed_at.
    const { data: existingInvite } = await adminLadoALadoClient
      .from('user_invites')
      .select('id, status, invitee_id')
      .eq('inviter_id', user.id)
      .eq('invitee_email', inviteeEmail)
      .maybeSingle()

    console.log('[send-invite] inviteeEmail:', inviteeEmail, '| invite status:', existingInvite?.status ?? 'none')

    // Se o convite está ativo (accepted), não reenviar — usuário já tem acesso.
    if (existingInvite?.status === 'accepted') {
      console.log('[send-invite] convite accepted, pulando e-mail')
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Envia (ou reenvia) o e-mail de convite ─────────────────────────────
    // Para status pending, revoked ou sem convite: sempre envia o e-mail.
    let inviteUserId: string | null = null

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      inviteeEmail,
      { redirectTo: 'https://lado-a-lado.vercel.app/convite' }
    )

    console.log('[send-invite] inviteUserByEmail error:', inviteError?.message ?? 'none')

    if (!inviteError) {
      // Usuário novo — e-mail enviado com sucesso.
      console.log('[send-invite] novo usuário, convite enviado:', inviteData?.user?.id)
      inviteUserId = inviteData?.user?.id ?? null
    } else if (inviteError.message.includes('already been registered')) {
      // Usuário já existe em auth.users.
      // Independente de estar confirmado ou não, o convite está pending/revoked,
      // então deve passar pelo processo completo de novo.
      // Estratégia: deletar e recriar → Supabase envia novo e-mail de convite.
      const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existingAuthUser = listData?.users?.find((u: any) => u.email === inviteeEmail) ?? null
      console.log('[send-invite] existingAuthUser:', existingAuthUser?.id ?? 'not found')

      if (existingAuthUser) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(existingAuthUser.id)
        console.log('[send-invite] deleteUser error:', deleteError?.message ?? 'none')

        if (deleteError) {
          return new Response(JSON.stringify({ error: 'Erro ao redefinir convite. Tente novamente.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { data: newInvite, error: newInviteError } = await adminClient.auth.admin.inviteUserByEmail(
          inviteeEmail,
          { redirectTo: 'https://lado-a-lado.vercel.app/convite' }
        )
        console.log('[send-invite] reinvite error:', newInviteError?.message ?? 'none', '| new id:', newInvite?.user?.id ?? 'null')

        if (newInviteError) {
          return new Response(JSON.stringify({ error: newInviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        inviteUserId = newInvite?.user?.id ?? null
      }
    } else {
      console.error('[send-invite] erro inesperado:', inviteError)
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Registra / atualiza o convite no DB com status pending ─────────────
    const { error: dbError } = await adminLadoALadoClient
      .from('user_invites')
      .upsert(
        {
          inviter_id: user.id,
          invitee_email: inviteeEmail,
          invitee_id: inviteUserId,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'inviter_id,invitee_email' }
      )

    if (dbError) {
      console.error('[send-invite] erro ao salvar convite:', dbError)
      return new Response(JSON.stringify({ error: 'Erro ao registrar convite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[send-invite] sucesso, inviteUserId:', inviteUserId)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-invite] erro interno:', err)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
