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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Nunito:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <ThemeToggle />
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              justifyContent: 'center',
              padding: '36px 16px 80px',
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: 620,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: 0,
              }}
            >
              {children}
            </div>
          </div>
          <footer className="footer-bar">
            <div className="footer-content">
              <a href="/privacy">Política de Privacidade</a>
              <span aria-hidden="true">·</span>
              <a href="mailto:fpachecosouza@icloud.com">Suporte</a>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
