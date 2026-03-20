import type { ReactNode } from 'react';
import './globals.css';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

export const metadata = {
  title: 'Agendamento de Visitas - Lado a Lado',
  description: 'Página pública para agendamento de visitas em agendas compartilhadas.',
};

// Script inline para evitar flash de tema errado no carregamento
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme') || 'light';
    var c = localStorage.getItem('colorblind') || 'none';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-colorblind', c);
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ThemeToggle />
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              justifyContent: 'center',
              padding: '32px 16px 72px',
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
          <footer className="footer-bar">
            <div className="footer-content">
              <a href="/privacy">Política de Privacidade</a>
              <span aria-hidden="true">•</span>
              <a href="mailto:fpachecosouza@icloud.com">Suporte</a>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
