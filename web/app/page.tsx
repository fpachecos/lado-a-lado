'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useEffect, useState } from 'react';

function CodeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) {
      router.replace(`/schedule/${initialCode}`);
    }
  }, [searchParams, router]);

  return null;
}

export default function HomePage() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/schedule/${trimmed}`);
  };

  return (
    <main className="home-page">
      <Suspense fallback={null}>
        <CodeRedirect />
      </Suspense>

      {/* ── Header ── */}
      <header className="home-header">
        <span className="pill">Lado a Lado</span>
        <h1 className="home-title">Agendamento de Visitas</h1>
        <p className="home-subtitle">
          Informe o código da agenda recebido no aplicativo para visualizar os horários disponíveis.
        </p>
      </header>

      {/* ── Formulário ── */}
      <section className="home-section">
        <p className="section-label">Código da agenda</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label className="form-label" htmlFor="code" style={{ display: 'none' }}>
              Código
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: 8b0a1f9c-..."
              className="input"
              autoComplete="off"
              autoCapitalize="none"
            />
          </div>
          <button
            type="submit"
            className="primary-button"
            disabled={!code.trim()}
          >
            Ver horários disponíveis
          </button>
        </form>
      </section>

      {/* ── Dica ── */}
      <section className="home-section">
        <div className="hint-card">
          Você também pode acessar diretamente usando uma URL no formato:{' '}
          <code>seu-dominio.app/schedule/&lt;código&gt;</code>
        </div>
      </section>
    </main>
  );
}
