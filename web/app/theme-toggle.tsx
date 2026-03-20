'use client';
import { useState } from 'react';
import { useTheme, type ColorblindMode } from './theme-provider';

const COLORBLIND_OPTIONS: { value: ColorblindMode; label: string; description: string }[] = [
  { value: 'none', label: 'Nenhum', description: 'Cores originais' },
  { value: 'protanopia', label: 'Protanopia', description: 'Dificuldade com vermelho' },
  { value: 'deuteranopia', label: 'Deuteranopia', description: 'Dificuldade com verde' },
  { value: 'tritanopia', label: 'Tritanopia', description: 'Dificuldade com azul' },
];

export function ThemeToggle() {
  const { theme, setTheme, colorblind, setColorblind } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 200 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Configurações de acessibilidade"
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid var(--card-border)',
          background: 'var(--card-bg)',
          backdropFilter: 'blur(20px)',
          cursor: 'pointer',
          fontSize: 17,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          transition: 'transform 0.15s ease',
          fontFamily: 'inherit',
        }}
      >
        {open ? '✕' : '⚙'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            width: 256,
            borderRadius: 16,
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
            backdropFilter: 'blur(20px)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          {/* Tema: Claro / Escuro */}
          <div>
            <p style={{
              margin: '0 0 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Tema
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'light', icon: '☀', label: 'Claro' },
                { value: 'dark', icon: '☾', label: 'Escuro' },
              ] as const).map(({ value, icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 10,
                    border: `1.5px solid ${theme === value ? 'var(--primary)' : 'var(--card-border)'}`,
                    background: theme === value ? 'var(--primary)' : 'transparent',
                    color: theme === value ? '#fff' : 'var(--text)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Daltonismo */}
          <div>
            <p style={{
              margin: '0 0 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Daltonismo
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {COLORBLIND_OPTIONS.map(({ value, label, description }) => (
                <button
                  key={value}
                  onClick={() => setColorblind(value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    textAlign: 'left',
                    border: `1.5px solid ${colorblind === value ? 'var(--primary)' : 'var(--card-border)'}`,
                    background: colorblind === value ? 'var(--primary)' : 'transparent',
                    color: colorblind === value ? '#fff' : 'var(--text)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ display: 'block' }}>{label}</span>
                  <span style={{
                    fontSize: 11,
                    opacity: colorblind === value ? 0.85 : 0.55,
                  }}>
                    {description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
