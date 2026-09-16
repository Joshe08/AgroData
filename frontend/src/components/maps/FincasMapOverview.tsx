'use client';

import dynamic from 'next/dynamic';
import type { FincasMapOverviewProps } from './LeafletFincasMapInner';
import { MapPin } from 'lucide-react';

const LeafletFincasMapInner = dynamic(() => import('./LeafletFincasMapInner'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '480px',
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
      <MapPin size={36} color="#16a34a" style={{ animation: 'bounce 1s infinite' }} />
      <span style={{ fontSize: 14, fontWeight: 500 }}>Cargando mapa satelital de fincas...</span>
    </div>
  ),
});

export default function FincasMapOverview(props: FincasMapOverviewProps) {
  return <LeafletFincasMapInner {...props} />;
}
