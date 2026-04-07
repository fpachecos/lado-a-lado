'use client';

import { createClient } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

type Stage = 'loading' | 'set-password' | 'already-accepted' | 'success' | 'error';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'ladoalado' } },
  );
}

export default function ConvitePage() {
  const [stage, setStage] = useState<Stage>('loading');
  const [inviterName, setInviterName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Holds the session set from the invite link hash
  const supabaseRef = useRef(getSupabase());

  useEffect(() => {
    const supabase = supabaseRef.current;

    async function handleHash() {
      // Parse #access_token=...&refresh_token=...&type=invite from URL
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type'); // 'invite' or 'recovery'

      if (!accessToken || !refreshToken) {
        setStage('error');
        setErrorMsg('Link de convite inválido ou expirado. Peça ao convidante que envie um novo convite.');
        return;
      }

      // Set session from invite link tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setStage('error');
        setErrorMsg('Não foi possível validar o convite. O link pode ter expirado.');
        return;
      }

      // If type=invite the user has no password yet; show setup form
      // If another type, they already have an account — just accept the invite
      if (type === 'invite') {
        // Fetch inviter info
        try {
          const { data } = await supabase.rpc('get_invite_info');
          if (data && data.length > 0) {
            setInviterName(data[0].inviter_name ?? data[0].inviter_email ?? '');
          }
        } catch {
          // Non-critical; continue without inviter name
        }
        setStage('set-password');
      } else {
        // User already has an account; just link the invite
        await acceptInvite(supabase);
      }

      // Clean up hash from URL without reload
      window.history.replaceState(null, '', window.location.pathname);
    }

    handleHash();
  }, []);

  async function acceptInvite(supabase: ReturnType<typeof getSupabase>) {
    try {
      await supabase.rpc('accept_invite');
      setStage('success');
    } catch {
      setStage('already-accepted');
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const supabase = supabaseRef.current;

      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;

      await supabase.rpc('accept_invite');

      setStage('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Não foi possível configurar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (stage === 'loading') {
    return (
      <main className="schedule-page">
        <header className="schedule-header">
          <span className="pill">Lado a Lado</span>
          <h1 className="schedule-title" style={{ fontFamily: 'var(--font-display)' }}>
            Validando convite…
          </h1>
        </header>
        <section className="schedule-section">
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Aguarde um momento.
          </p>
        </section>
      </main>
    );
  }

  if (stage === 'error') {
    return (
      <main className="schedule-page">
        <header className="schedule-header">
          <span className="pill">Lado a Lado</span>
          <h1 className="schedule-title" style={{ fontFamily: 'var(--font-display)' }}>
            Link inválido
          </h1>
        </header>
        <section className="schedule-section">
          <div className="status-error">
            <p>{errorMsg}</p>
          </div>
        </section>
      </main>
    );
  }

  if (stage === 'set-password') {
    return (
      <main className="schedule-page">
        <header className="schedule-header">
          <span className="pill">Lado a Lado</span>
          <h1 className="schedule-title" style={{ fontFamily: 'var(--font-display)' }}>
            Você foi convidado!
          </h1>
          {inviterName && (
            <p className="schedule-subtitle">
              <strong>{inviterName}</strong> está compartilhando o app com você.
              Crie sua senha para começar.
            </p>
          )}
          {!inviterName && (
            <p className="schedule-subtitle">
              Crie sua senha para acessar o Lado a Lado.
            </p>
          )}
        </header>

        <section className="schedule-section">
          <form onSubmit={handleSetPassword} className="form-stack">
            <div className="form-field">
              <label className="form-label" htmlFor="password">Nova senha</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="confirm">Confirmar senha</label>
              <input
                id="confirm"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                required
              />
            </div>

            {errorMsg && (
              <div className="status-error">
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="action-row">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Salvando…' : 'Criar senha e acessar'}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  if (stage === 'already-accepted') {
    return (
      <main className="schedule-page">
        <header className="schedule-header">
          <span className="pill">Lado a Lado</span>
          <h1 className="schedule-title" style={{ fontFamily: 'var(--font-display)' }}>
            Acesso ativo
          </h1>
        </header>
        <section className="schedule-section">
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Você já tem acesso ao Lado a Lado. Abra o aplicativo e faça login com o seu e-mail e senha.
          </p>
        </section>
      </main>
    );
  }

  // stage === 'success'
  return (
    <main className="schedule-page">
      <header className="schedule-header">
        <span className="pill">Lado a Lado</span>
        <h1 className="schedule-title" style={{ fontFamily: 'var(--font-display)' }}>
          Tudo pronto!
        </h1>
        <p className="schedule-subtitle">
          Sua conta foi configurada com sucesso.
        </p>
      </header>

      <section className="schedule-section">
        <div className="status-success">
          <p>
            Abra o aplicativo <strong>Lado a Lado</strong> e faça login com o seu
            e-mail e a senha que você acabou de criar.
          </p>
        </div>
      </section>
    </main>
  );
}
