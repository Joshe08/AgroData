'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme, applyTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyTheme();
  }, [applyTheme]);

  if (!mounted) {
    return (
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--color-surface-2)' }} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: isDark ? '#fbbf24' : '#6366f1',
        transition: 'all 0.2s ease',
      }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
