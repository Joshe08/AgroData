'use client';

import dynamic from 'next/dynamic';
import type { FincaParcelasMapProps } from './LeafletFincaParcelasMapInner';
import { Layers } from 'lucide-react';

const LeafletFincaParcelasMapInner = dynamic(() => import('./LeafletFincaParcelasMapInner'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '540px',
        borderRadius: 16,
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
      <Layers size={36} color="#22c55e" style={{ animation: 'bounce 1s infinite' }} />
      <span style={{ fontSize: 14, fontWeight: 500 }}>Cargando delimitación satelital de parcelas y lotes...</span>
    </div>
  ),
});

export default function FincaParcelasMap(props: FincaParcelasMapProps) {
  return <LeafletFincaParcelasMapInner {...props} />;
}
