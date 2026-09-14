'use client';

import { useEffect, useRef } from 'react';
import { useToastStore, Toast, ToastType } from '@/store/toastStore';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.3)',
    color: '#f1f5f9',
    icon: '#34d399',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#f1f5f9',
    icon: '#f87171',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#f1f5f9',
    icon: '#fbbf24',
  },
  info: {
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.3)',
    color: '#f1f5f9',
    icon: '#818cf8',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const c = COLORS[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: 380,
        width: '100%',
        animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'all',
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>
        {ICONS[toast.type]}
      </span>
      <span style={{ flex: 1, fontSize: 14, color: c.color, lineHeight: 1.5, wordBreak: 'break-word' }}>
        {toast.message}
      </span>
      <button
        aria-label="Cerrar notificación"
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-subtle)',
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
