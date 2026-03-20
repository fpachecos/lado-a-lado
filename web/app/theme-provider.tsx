'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  colorblind: ColorblindMode;
  setColorblind: (c: ColorblindMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  colorblind: 'none',
  setColorblind: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [colorblind, setColorblindState] = useState<ColorblindMode>('none');

  useEffect(() => {
    const t = localStorage.getItem('theme') as Theme;
    const c = localStorage.getItem('colorblind') as ColorblindMode;
    if (t === 'light' || t === 'dark') setThemeState(t);
    if (c === 'none' || c === 'protanopia' || c === 'deuteranopia' || c === 'tritanopia') {
      setColorblindState(c);
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const setColorblind = (c: ColorblindMode) => {
    setColorblindState(c);
    localStorage.setItem('colorblind', c);
    document.documentElement.setAttribute('data-colorblind', c);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colorblind, setColorblind }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
