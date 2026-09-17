'use client';

import React from 'react';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemName?: string;
  message?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose?: () => void;
  onCancel?: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  message,
  description,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  isLoading = false,
  loading = false,
  onConfirm,
  onClose,
  onCancel,
}: DeleteConfirmModalProps) {
  const isBusy = isLoading || loading;
  const handleClose = onClose || onCancel || (() => {});
  const displayMessage = message || description;

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!isBusy) handleClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--color-surface)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header bar with alert style */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              className="font-display"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-muted)',
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              Acción irreversible
            </p>
          </div>
          <button
            onClick={() => {
              if (!isBusy) handleClose();
            }}
            disabled={isBusy}
            style={{
              background: 'none',
              border: 'none',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              color: 'var(--color-text-subtle)',
              padding: 4,
              borderRadius: 8,
            }}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content */}
        <div style={{ padding: '20px 24px' }}>
          {itemName ? (
            <p
              style={{
                fontSize: 14,
                color: 'var(--color-text)',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              ¿Estás seguro de que deseas eliminar{' '}
              <strong style={{ color: '#f87171', fontWeight: 600 }}>
                &ldquo;{itemName}&rdquo;
              </strong>
              ?
            </p>
          ) : null}

          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
              marginTop: itemName ? 10 : 0,
              marginBottom: 0,
            }}
          >
            {displayMessage ||
              'Esta acción puede afectar registros y datos asociados. No será posible recuperar esta información después de eliminarla.'}
          </p>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '16px 24px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'rgba(0,0,0,0.1)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="btn-secondary"
            style={{
              fontSize: 13,
              padding: '9px 18px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              padding: '9px 20px',
              borderRadius: 10,
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              opacity: isBusy ? 0.75 : 1,
              transition: 'background 0.2s',
            }}
          >
            {isBusy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
