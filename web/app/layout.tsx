import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Agendamento de Visitas - Lado a Lado',
  description: 'Página pública para agendamento de visitas em agendas compartilhadas.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            padding: '32px 16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 640,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}


