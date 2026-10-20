'use client';

import { useEffect, useState } from 'react';
import { climaApi } from '@/lib/api';
import { CloudSun, Droplets, Wind, Thermometer, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ClimaWidgetProps {
  fincaNombre?: string;
  lat?: number;
  lon?: number;
}

interface ClimaData {
  temperatura: number;
  descripcion: string;
  humedad: number;
  viento?: number;
  lluvia?: number;
  ciudad?: string;
  updatedAt?: string;
}

export default function ClimaWidget({ fincaNombre, lat, lon }: ClimaWidgetProps) {
  const [clima, setClima] = useState<ClimaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchClima = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await climaApi.forecast(undefined, lat, lon);
      const d = res.data;
      // Mapear la respuesta — puede venir en distintos formatos según la implementación
      const current = d?.current || d?.list?.[0] || d;
      setClima({
        temperatura: current?.main?.temp ?? current?.temperatura ?? current?.temp ?? null,
        descripcion: current?.weather?.[0]?.description ?? current?.descripcion ?? 'Sin datos',
        humedad: current?.main?.humidity ?? current?.humedad ?? 0,
        viento: current?.wind?.speed ?? current?.viento,
        lluvia: current?.rain?.['1h'] ?? current?.pop != null ? Math.round((current?.pop ?? 0) * 100) : undefined,
        ciudad: d?.city?.name ?? d?.ciudad ?? fincaNombre,
      });
      setLastUpdate(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setError('No se pudo obtener el clima. Verifica la configuración de la API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClima();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  return (
    <div
      className="card"
      style={{
        padding: '20px 22px',
        background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(16,185,129,0.05) 100%)',
        border: '1px solid rgba(14,165,233,0.2)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudSun size={18} color="#0ea5e9" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Clima</span>
          {fincaNombre && (
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', background: 'rgba(14,165,233,0.1)', padding: '1px 6px', borderRadius: 6 }}>
              {fincaNombre}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>Act. {lastUpdate}</span>
          )}
          <button
            onClick={fetchClima}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}
            title="Actualizar clima"
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 40, borderRadius: 8, width: '60%' }} />
          <div className="skeleton" style={{ height: 20, borderRadius: 6, width: '80%' }} />
          <div className="skeleton" style={{ height: 20, borderRadius: 6, width: '50%' }} />
        </div>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px', background: 'rgba(239,68,68,0.06)', borderRadius: 10 }}>
          <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, color: '#f87171', fontWeight: 600, marginBottom: 2 }}>Sin datos de clima</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{error}</div>
          </div>
        </div>
      ) : clima ? (
        <div>
          {/* Temperatura principal */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
              {clima.temperatura != null ? `${Math.round(clima.temperatura)}°` : '—'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'capitalize' }}>
              {clima.descripcion}
            </span>
          </div>

          {/* Métricas secundarias */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {clima.humedad != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Droplets size={13} color="#0ea5e9" />
                <span>{clima.humedad}% humedad</span>
              </div>
            )}
            {clima.viento != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Wind size={13} color="#94a3b8" />
                <span>{Math.round(clima.viento)} km/h</span>
              </div>
            )}
            {clima.lluvia != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Droplets size={13} color="#60a5fa" />
                <span>{clima.lluvia}% prob. lluvia</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--color-text-subtle)', padding: '12px 0' }}>
          Sin información climática disponible.
        </div>
      )}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        <Link
          href="/dashboard/clima"
          style={{ fontSize: 12, color: '#0ea5e9', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          Ver pronóstico completo <ExternalLink size={11} />
        </Link>
      </div>
    </div>
  );
}
