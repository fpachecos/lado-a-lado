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

    // Cliente com o JWT do usuário para obter o inviter_id
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

    // Cliente admin para convidar o usuário (schema público para auth.admin)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Cliente admin apontando para o schema ladoalado
    const adminLadoALadoClient = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: 'ladoalado' },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Busca o usuário existente (se houver) para saber se é confirmado ou não
    const { data: existingAuthUser } = await adminClient
      .from('auth.users')
      .select('id, email_confirmed_at')
      .eq('email', inviteeEmail)
      .maybeSingle()

    let inviteUserId: string | null = null

    if (existingAuthUser) {
      if (!existingAuthUser.email_confirmed_at) {
        // Usuário existe mas nunca ativou o convite (sem senha definida).
        // Deletar e recriar para que o Supabase reenvie o e-mail de convite.
        await adminClient.auth.admin.deleteUser(existingAuthUser.id)

        const { data: newInvite, error: newInviteError } = await adminClient.auth.admin.inviteUserByEmail(
          inviteeEmail,
          { redirectTo: 'ladoalado://convite' }
        )

        if (newInviteError) {
          console.error('Erro ao recriar convite:', newInviteError)
          return new Response(JSON.stringify({ error: newInviteError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        inviteUserId = newInvite?.user?.id ?? null
      } else {
        // Usuário já confirmado — já tem acesso, apenas registra o convite no DB.
        inviteUserId = existingAuthUser.id
      }
    } else {
      // Usuário novo — convida normalmente.
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        inviteeEmail,
        { redirectTo: 'ladoalado://convite' }
      )

      if (inviteError) {
        console.error('Erro ao convidar usuário:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      inviteUserId = inviteData?.user?.id ?? null
    }

    // Registra o convite na tabela user_invites (schema ladoalado)
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
      console.error('Erro ao salvar convite:', dbError)
      return new Response(JSON.stringify({ error: 'Erro ao registrar convite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
