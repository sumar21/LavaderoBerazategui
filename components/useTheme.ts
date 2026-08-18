import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Shared with the inline boot script in index.html — keep both in sync. */
export const THEME_KEY = 'theme';

const stored = (): Theme | null => {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'dark' || v === 'light' ? v : null;
};

const apply = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

/**
 * Light/dark theme (DESIGN.md §392, option "a").
 *
 * Light is the default and the OS is deliberately not consulted: dark is opt-in
 * through the toggle, and only an explicit localStorage choice turns it on.
 *
 * The class is applied by an inline script in index.html before first paint, so
 * this hook only has to keep it in sync afterwards.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? 'light');

  useEffect(() => { apply(theme); }, [theme]);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
};
