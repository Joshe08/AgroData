import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  applyTheme: () => void;
}

const getSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (newTheme: ThemeMode) => {
        const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', resolved);
          if (resolved === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          }
        }
        set({ theme: newTheme, resolvedTheme: resolved });
      },

      toggleTheme: () => {
        const current = get().resolvedTheme;
        const next = current === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },

      applyTheme: () => {
        const currentTheme = get().theme;
        const resolved = currentTheme === 'system' ? getSystemTheme() : currentTheme;
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', resolved);
          if (resolved === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          }
        }
        set({ resolvedTheme: resolved });
      },
    }),
    {
      name: 'agrodata_theme',
    }
  )
);
