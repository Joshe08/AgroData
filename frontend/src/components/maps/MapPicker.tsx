'use client';

import dynamic from 'next/dynamic';
import type { MapPickerProps } from './LeafletMapInner';
import { MapPin } from 'lucide-react';

const LeafletMapInner = dynamic(() => import('./LeafletMapInner'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '340px',
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
      <MapPin size={32} color="#16a34a" style={{ animation: 'bounce 1s infinite' }} />
      <span style={{ fontSize: 13, fontWeight: 500 }}>Cargando mapa geográfico interactivo...</span>
    </div>
  ),
});

export default function MapPicker(props: MapPickerProps) {
  return <LeafletMapInner {...props} />;
}
