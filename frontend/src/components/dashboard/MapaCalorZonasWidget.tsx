'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Thermometer, AlertTriangle, ArrowRight, Droplets, Sun, CheckCircle2 } from 'lucide-react';
import { calcularAnalisisTermicoLote, THERMAL_CONFIG, ThermalZoneLevel } from '@/lib/thermalAnalysis';
import { Finca, Lote } from '@/store/fincasStore';

interface MapaCalorZonasWidgetProps {
  fincas: Finca[];
  loading?: boolean;
}

export default function MapaCalorZonasWidget({ fincas, loading }: MapaCalorZonasWidgetProps) {
  // Extraer todos los lotes de todas las fincas
  const { allLotesAnalysis, summary, totalHa } = useMemo(() => {
    const lotesList: Lote[] = [];
    (fincas || []).forEach((f) => {
      if (Array.isArray(f.lotes)) {
        lotesList.push(...f.lotes);
      }
    });

    const analyses = lotesList.map((lote) => calcularAnalisisTermicoLote(lote));

    const counts: Record<ThermalZoneLevel, number> = {
      fresco: 0,
      templado: 0,
      moderado: 0,
      estres: 0,
      critico: 0,
    };

    let sumScore = 0;
    let haCount = 0;

    analyses.forEach((a) => {
      counts[a.level] = (counts[a.level] || 0) + 1;
      sumScore += a.scoreSalud;
      haCount += a.hectareas || 1;
    });

    const totalLotes = analyses.length || 1;
    const avgScore = analyses.length > 0 ? Math.round(sumScore / analyses.length) : 85;

    return {
      allLotesAnalysis: analyses,
      totalHa: haCount,
      summary: {
        totalLotes: analyses.length,
        avgScore,
        counts,
        criticos: analyses.filter((a) => a.level === 'critico' || a.level === 'estres'),
      },
    };
  }, [fincas]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '22px 24px', minHeight: 180 }}>
        <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 40, width: '100%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 60, width: '100%' }} />
      </div>
    );
  }

  const { counts, totalLotes, avgScore, criticos } = summary;

  return (
    <div className="card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(0, 210, 255, 0.12)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Thermometer size={18} color="#00d2ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Termografía y Salud de Zonas
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 10,
                  background: avgScore >= 70 ? 'rgba(6, 214, 160, 0.12)' : 'rgba(255, 84, 0, 0.12)',
                  color: avgScore >= 70 ? '#06d6a0' : '#ff5400',
                  border: `1px solid ${avgScore >= 70 ? 'rgba(6, 214, 160, 0.3)' : 'rgba(255, 84, 0, 0.3)'}`,
                }}
              >
                Salud: {avgScore}/100
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Monitoreo térmico, evapotranspiración y estrés hídrico en {fincas.length} finca(s) ({totalLotes} parcelas)
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/fincas"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#00d2ff',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(0, 210, 255, 0.08)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            transition: 'all 0.15s',
          }}
        >
          <span>Ver mapa térmico</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Proportional Thermal Strip */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>
          <span>Distribución por Rango Térmico</span>
          <span>{totalLotes} lote(s) evaluados</span>
        </div>

        <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.06)', display: 'flex', overflow: 'hidden', gap: 2 }}>
          {(Object.entries(counts) as [ThermalZoneLevel, number][]).map(([key, count]) => {
            const pct = totalLotes > 0 ? (count / totalLotes) * 100 : 0;
            if (pct === 0) return null;
            const cfg = THERMAL_CONFIG[key];
            return (
              <div
                key={key}
                style={{
                  width: `${pct}%`,
                  background: cfg.color,
                  borderRadius: 3,
                  transition: 'width 0.4s ease',
                }}
                title={`${cfg.label}: ${count} lote(s) (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* 5 Thermal Band Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
        {(Object.entries(THERMAL_CONFIG) as [ThermalZoneLevel, typeof THERMAL_CONFIG[ThermalZoneLevel]][]).map(([key, cfg]) => {
          const count = counts[key] || 0;
          return (
            <div
              key={key}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: cfg.text }}>{count}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>
                {cfg.label.split(' ')[1] || cfg.label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{cfg.tempRange}</span>
            </div>
          );
        })}
      </div>

      {/* Alerta de Lotes en Estrés / Recomendación Directa */}
      {criticos.length > 0 ? (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(255, 84, 0, 0.08)',
            border: '1px solid rgba(255, 84, 0, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <AlertTriangle size={16} color="#ff5400" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#ff5400' }}>
              Atención hídrica requerida ({criticos.length} lote{criticos.length > 1 ? 's' : ''}):
            </span>{' '}
            <span style={{ color: 'var(--color-text)' }}>
              {criticos.map((c) => `${c.nombre} (${c.tempEstimada})`).slice(0, 3).join(', ')}
            </span>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 3 }}>
              {criticos[0].recomendacion}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(6, 214, 160, 0.08)',
            border: '1px solid rgba(6, 214, 160, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle2 size={16} color="#06d6a0" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text)' }}>
            Microclima estable: Todas las parcelas monitoreadas se encuentran dentro de rangos térmicos e hídricos tolerables.
          </span>
        </div>
      )}
    </div>
  );
}
