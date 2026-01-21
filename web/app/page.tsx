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
    <main className="flex flex-1 flex-col gap-8">
      <Suspense fallback={null}>
        <CodeRedirect />
      </Suspense>
      <header className="space-y-3">
        <span className="pill">Lado a Lado</span>
        <h1
          className="text-3xl font-semibold leading-tight"
          style={{ color: '#333333' }}
        >
          Agendamento de Visitas
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: '#666666' }}>
          Informe o código da agenda recebido no aplicativo para visualizar os horários
          disponíveis.
        </p>
      </header>

      <section style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
            maxWidth: 420,
          }}
        >
          <label
            className="text-sm font-medium"
            htmlFor="code"
            style={{ color: '#333333' }}
          >
            Código da agenda
          </label>
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex: 8b0a1f9c-..."
            className="input"
          />
          <button
            type="submit"
            className="primary-button"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!code.trim()}
          >
            Ver horários disponíveis
          </button>
        </form>
      </section>

      <section
        className="card"
        style={{ padding: 16, fontSize: 12, color: '#666666', marginTop: 12 }}
      >
        <p>
          Você também pode acessar diretamente uma agenda usando uma URL no formato:{' '}
          <code
            style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '2px 4px',
              borderRadius: 6,
            }}
          >
            https://seu-dominio.vercel.app/schedule/&lt;código&gt;
          </code>
        </p>
      </section>
    </main>
  );
}


