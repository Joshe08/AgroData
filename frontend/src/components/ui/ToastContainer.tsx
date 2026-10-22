'use client';

import { useEffect, useRef } from 'react';
import { useToastStore, Toast, ToastType } from '@/store/toastStore';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Colores sólidos y legibles tanto en modo oscuro como claro
const COLORS: Record<ToastType, { bg: string; border: string; color: string; icon: string; darkBg: string }> = {
  success: {
    bg: '#052e16',         // fondo oscuro sólido verde muy oscuro
    darkBg: '#052e16',
    border: 'rgba(16, 185, 129, 0.5)',
    color: '#6ee7b7',      // texto verde claro legible en oscuro
    icon: '#34d399',
  },
  error: {
    bg: '#2d0a0a',
    darkBg: '#2d0a0a',
    border: 'rgba(239, 68, 68, 0.5)',
    color: '#fca5a5',
    icon: '#f87171',
  },
  warning: {
    bg: '#2d1a00',
    darkBg: '#2d1a00',
    border: 'rgba(245, 158, 11, 0.5)',
    color: '#fcd34d',
    icon: '#fbbf24',
  },
  info: {
    bg: '#0d0f2a',
    darkBg: '#0d0f2a',
    border: 'rgba(99, 102, 241, 0.5)',
    color: '#a5b4fc',
    icon: '#818cf8',
  },
};

// Colores para modo claro
const COLORS_LIGHT: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: '#ecfdf5',
    border: '#6ee7b7',
    color: '#064e3b',
    icon: '#059669',
  },
  error: {
    bg: '#fef2f2',
    border: '#fca5a5',
    color: '#7f1d1d',
    icon: '#dc2626',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fcd34d',
    color: '#78350f',
    icon: '#d97706',
  },
  info: {
    bg: '#eef2ff',
    border: '#a5b4fc',
    color: '#1e1b4b',
    icon: '#4f46e5',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detectar tema actual
  const isLight =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light';

  const c = isLight ? COLORS_LIGHT[toast.type] : COLORS[toast.type];

  const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        backdropFilter: 'blur(8px)',
        boxShadow: isLight
          ? '0 4px 20px rgba(0,0,0,0.12)'
          : '0 8px 32px rgba(0,0,0,0.6)',
        maxWidth: 380,
        width: '100%',
        animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'all',
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>
        {ICONS[toast.type]}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: c.color,
          lineHeight: 1.5,
          wordBreak: 'break-word',
          fontWeight: 500,
        }}
      >
        {toast.message}
      </span>
      <button
        aria-label="Cerrar notificación"
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: c.color,
          opacity: 0.6,
          padding: 0,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          marginTop: 1,
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 640px) {
          .toast-container {
            bottom: auto !important;
            top: 16px !important;
            right: 50% !important;
            transform: translateX(50%) !important;
            align-items: center !important;
          }
          @keyframes toastSlideIn {
            from { opacity: 0; transform: translateY(-16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </>
  );
}
