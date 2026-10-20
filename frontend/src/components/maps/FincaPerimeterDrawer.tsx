'use client';

import dynamic from 'next/dynamic';
import type { FincaPerimeterDrawerProps } from './LeafletFincaPerimeterDrawerInner';
import { Compass } from 'lucide-react';

const LeafletFincaPerimeterDrawerInner = dynamic(() => import('./LeafletFincaPerimeterDrawerInner'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '420px',
        borderRadius: 14,
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--color-text-muted)',
      }}
    >
      <Compass size={32} color="#10b981" style={{ animation: 'spin 2s linear infinite' }} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Cargando trazador satelital de linderos...</span>
    </div>
  ),
});

export default function FincaPerimeterDrawer(props: FincaPerimeterDrawerProps) {
  return <LeafletFincaPerimeterDrawerInner {...props} />;
}
