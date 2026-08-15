import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Shared with the inline boot script in index.html — keep both in sync. */
export const THEME_KEY = 'theme';

const systemTheme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

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
 * localStorage wins; with nothing stored we follow the OS and keep following it
 * while the user has not expressed a preference — once they hit the toggle the
 * choice is theirs and the OS stops overriding it.
 *
 * The class is applied by an inline script in index.html before first paint, so
 * this hook only has to keep it in sync afterwards.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? systemTheme());

  useEffect(() => { apply(theme); }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      if (!stored()) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle, isDark: theme === 'dark' };
};
