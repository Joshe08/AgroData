'use client';

import { useState, useEffect, useCallback } from 'react';
import { climaApi, fincasApi } from '@/lib/api';
import {
  CloudSun,
  Search,
  MapPin,
  Droplets,
  Wind,
  Eye,
  Gauge,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Sprout,
  Calendar,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Compass,
  Building,
  Thermometer,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface WeatherAlert {
  id: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  title: string;
  message: string;
  category: 'LLUVIA' | 'TEMPERATURA' | 'VIENTO' | 'UV' | 'HUMEDAD';
}

interface WeatherData {
  ciudad: string;
  coordenadas?: { lat: number; lon: number };
  temperatura: number;
  sensacionTermica: number;
  descripcion: string;
  humedad: number;
  velocidadViento: number;
  direccionViento?: string;
  precipitacion?: number;
  probabilidadLluvia?: number;
  visibilidad?: number;
  presion?: number;
  indiceUv?: number;
  icono?: string;
  alertas?: WeatherAlert[];
  recomendaciones?: string[];
  hourly?: Array<{
    hora: string;
    temperatura: number;
    probLluvia: number;
    humedad: number;
    descripcion: string;
  }>;
}

interface FincaSimple {
  id: string | number;
  nombre: string;
  ubicacion: string;
  latitude?: number;
  longitude?: number;
  municipio?: string;
}

interface ForecastDay {
  fecha: string;
  dia?: string;
  tempMax: number;
  tempMin: number;
  descripcion: string;
  precipitacionTotal?: number;
  probabilidadLluvia?: number;
  indiceUvMax?: number;
  vientoMax?: number;
  lluvia?: number;
}

function WeatherIcon({ description, size = 48 }: { description?: string; size?: number }) {
  const d = (description || '').toLowerCase();
  if (d.includes('lluvia') || d.includes('rain') || d.includes('llovizna') || d.includes('tormenta') || d.includes('chubasco')) {
    return <CloudRain size={size} color="#38bdf8" />;
  }
  if (d.includes('nube') || d.includes('cloud') || d.includes('nublado')) {
    return <Cloud size={size} color="#94a3b8" />;
  }
  if (d.includes('nieve') || d.includes('snow')) {
    return <CloudSnow size={size} color="#e2e8f0" />;
  }
  if (d.includes('sol') || d.includes('despejado') || d.includes('clear')) {
    return <Sun size={size} color="#fbbf24" />;
  }
  return <CloudSun size={size} color="#38bdf8" />;
}

function UvBadge({ uv }: { uv: number }) {
  let label = 'Bajo';
  let color = '#34d399';
  if (uv >= 3 && uv < 6) { label = 'Moderado'; color = '#fbbf24'; }
  if (uv >= 6 && uv < 8) { label = 'Alto'; color = '#fb923c'; }
  if (uv >= 8 && uv < 11) { label = 'Muy Alto'; color = '#f87171'; }
  if (uv >= 11) { label = 'Extremo'; color = '#e879f9'; }
  return (
    <span style={{
      background: `${color}22`,
      border: `1px solid ${color}55`,
      color,
      borderRadius: 8,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 700,
    }}>{label}</span>
  );
}

const CIUDADES_CESAR = [
  'Valledupar', 'Aguachica', 'Bosconia', 'Codazzi', 'La Paz', 'Manaure', 'Pailitas', 'San Alberto',
];

export default function ClimaPage() {
  const [ciudad, setCiudad] = useState('Valledupar');
  const [fincas, setFincas] = useState<FincaSimple[]>([]);
  const [selectedFincaId, setSelectedFincaId] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load user's fincas
  useEffect(() => {
    fincasApi.getAll()
      .then((res) => setFincas(res.data || []))
      .catch(() => {});
  }, []);

  const buscarClima = useCallback(async (targetCiudad?: string, lat?: number, lon?: number) => {
    const city = (targetCiudad || ciudad).trim();
    setLoading(true);
    setError('');
    try {
      const [currRes, foreRes] = await Promise.allSettled([
        climaApi.current(city, lat, lon),
        climaApi.forecast(city, lat, lon),
      ]);

      if (currRes.status === 'fulfilled' && currRes.value?.data) {
        setWeather(currRes.value.data);
      } else {
        setError(`No se pudo obtener información meteorológica para ${city}. Intenta nuevamente.`);
      }

      if (foreRes.status === 'fulfilled' && foreRes.value?.data) {
        const rawForecast = foreRes.value.data?.list || foreRes.value.data || [];
        setForecast(Array.isArray(rawForecast) ? rawForecast : []);
      }
    } catch {
      setError('Error de comunicación con el servicio de clima.');
    } finally {
      setLoading(false);
    }
  }, [ciudad]);

  useEffect(() => {
    buscarClima('Valledupar');
  }, [buscarClima]);

  const handleSelectCity = (c: string) => {
    setCiudad(c);
    setSelectedFincaId('');
    buscarClima(c);
  };

  const handleSelectFinca = (finca: FincaSimple) => {
    setSelectedFincaId(String(finca.id));
    setCiudad(finca.nombre);
    if (finca.latitude && finca.longitude) {
      buscarClima(finca.nombre, finca.latitude, finca.longitude);
    } else {
      const searchTarget = finca.municipio || finca.ubicacion || finca.nombre;
      buscarClima(searchTarget);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Clima Agrícola
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Monitoreo agrometeorológico y pronóstico en tiempo real para el departamento del Cesar
          </p>
        </div>
        <button
          onClick={() => buscarClima(ciudad)}
          className="btn-secondary"
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar estación
        </button>
      </div>

      {/* Fincas Selector Panel */}
      {fincas.length > 0 && (
        <div className="card" style={{ padding: '18px 20px', marginBottom: 16, borderColor: 'rgba(22,163,74,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Building size={16} color="#4ade80" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>Clima de mis fincas</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginLeft: 4 }}>
              — Selecciona un predio para ver su clima exacto según coordenadas GPS
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {fincas.map((finca) => {
              const isSelected = selectedFincaId === String(finca.id);
              return (
                <button
                  key={finca.id}
                  type="button"
                  onClick={() => handleSelectFinca(finca)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(22, 163, 74, 0.22)' : 'var(--color-surface-2)',
                    border: `1.5px solid ${isSelected ? 'rgba(22, 163, 74, 0.6)' : 'var(--color-border)'}`,
                    color: isSelected ? '#4ade80' : 'var(--color-text-muted)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <MapPin size={13} style={{ opacity: isSelected ? 1 : 0.6 }} />
                  {finca.nombre}
                  {finca.latitude && finca.longitude && (
                    <span style={{
                      fontSize: 10,
                      background: 'rgba(14,165,233,0.18)',
                      color: '#38bdf8',
                      borderRadius: 4,
                      padding: '1px 5px',
                      marginLeft: 2,
                    }}>GPS</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar & Quick City Chips */}
      <div className="card" style={{ padding: '20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-subtle)',
              }}
            />
            <input
              className="input-field"
              style={{ paddingLeft: 40 }}
              placeholder="Escribe el nombre de la ciudad o municipio..."
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setSelectedFincaId('');
                  buscarClima(ciudad);
                }
              }}
            />
          </div>
          <button
            onClick={() => { setSelectedFincaId(''); buscarClima(ciudad); }}
            className="btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <CloudSun size={16} />
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {/* Quick cities chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginRight: 4, fontWeight: 500 }}>
            Municipios frecuentes:
          </span>
          {CIUDADES_CESAR.map((c) => {
            const isSelected = !selectedFincaId && ciudad.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleSelectCity(c)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(14, 165, 233, 0.18)' : 'var(--color-surface-2)',
                  border: `1px solid ${isSelected ? 'rgba(14, 165, 233, 0.5)' : 'var(--color-border)'}`,
                  color: isSelected ? '#38bdf8' : 'var(--color-text-muted)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <MapPin size={12} style={{ opacity: isSelected ? 1 : 0.6 }} />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 12,
            color: '#f87171',
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 260, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
        </div>
      )}

      {weather && !loading && (
        <>
          {/* Weather Alerts */}
          {weather.alertas && weather.alertas.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {weather.alertas.map((alerta) => {
                const isCritical = alerta.type === 'CRITICAL';
                const isWarning = alerta.type === 'WARNING';
                const bg = isCritical ? 'rgba(239,68,68,0.1)' : isWarning ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.08)';
                const border = isCritical ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.3)' : 'rgba(14,165,233,0.25)';
                const textColor = isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#38bdf8';
                return (
                  <div
                    key={alerta.id}
                    style={{
                      padding: '14px 18px',
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <ShieldAlert size={18} color={textColor} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: textColor, marginBottom: 2 }}>
                        {alerta.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{alerta.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main Weather Card */}
          <div
            className="card"
            style={{
              padding: '32px',
              marginBottom: 20,
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%)',
              borderColor: 'rgba(14, 165, 233, 0.3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    color: 'var(--color-text-muted)',
                    marginBottom: 6,
                    fontWeight: 500,
                  }}
                >
                  <MapPin size={16} color="#38bdf8" />
                  {weather.ciudad}
                  {weather.coordenadas && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginLeft: 6 }}>
                      ({weather.coordenadas.lat.toFixed(4)}, {weather.coordenadas.lon.toFixed(4)})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em' }}>
                  {Math.round(weather.temperatura)}°C
                </div>
                <div style={{ fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'capitalize' }}>
                  {weather.descripcion}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>
                  Sensación térmica: {Math.round(weather.sensacionTermica)}°C
                </div>
              </div>
              <div style={{ padding: 16, background: 'rgba(0,0,0,0.15)', borderRadius: 20 }}>
                <WeatherIcon description={weather.descripcion} size={64} />
              </div>
            </div>

            {/* Weather Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                gap: 14,
                marginTop: 28,
              }}
            >
              {[
                { icon: <Droplets size={18} />, label: 'Humedad relativa', value: `${weather.humedad}%`, color: '#38bdf8' },
                { icon: <Wind size={18} />, label: 'Velocidad del viento', value: `${weather.velocidadViento} km/h`, color: '#a78bfa' },
                {
                  icon: <Compass size={18} />,
                  label: 'Dirección del viento',
                  value: weather.direccionViento || 'N/D',
                  color: '#c084fc',
                },
                {
                  icon: <Eye size={18} />,
                  label: 'Visibilidad',
                  value: weather.visibilidad ? `${weather.visibilidad} km` : 'Óptima',
                  color: '#34d399',
                },
                {
                  icon: <Gauge size={18} />,
                  label: 'Presión barométrica',
                  value: weather.presion ? `${weather.presion} hPa` : '1013 hPa',
                  color: '#fbbf24',
                },
                {
                  icon: <CloudRain size={18} />,
                  label: 'Prob. de lluvia',
                  value: weather.probabilidadLluvia !== undefined ? `${weather.probabilidadLluvia}%` : 'N/D',
                  color: '#38bdf8',
                },
                {
                  icon: <Sun size={18} />,
                  label: 'Índice UV',
                  value: weather.indiceUv !== undefined ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {weather.indiceUv} <UvBadge uv={weather.indiceUv} />
                    </span>
                  ) : 'N/D',
                  color: '#fbbf24',
                },
                {
                  icon: <Thermometer size={18} />,
                  label: 'Precipitación',
                  value: weather.precipitacion !== undefined ? `${weather.precipitacion} mm` : '0 mm',
                  color: '#60a5fa',
                },
              ].map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(0,0,0,0.22)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ color: m.color, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Forecast */}
          {weather.hourly && weather.hourly.length > 0 && (
            <div className="card" style={{ padding: '24px', marginBottom: 20 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Clock size={18} color="#38bdf8" />
                Pronóstico por hora (próximas {weather.hourly.length} horas)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 10, minWidth: 'max-content', paddingBottom: 4 }}>
                  {weather.hourly.slice(0, 12).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: 80,
                        padding: '14px 8px',
                        background: 'var(--color-surface-2)',
                        borderRadius: 12,
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        {h.hora}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        <WeatherIcon description={h.descripcion} size={20} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                        {Math.round(h.temperatura)}°
                      </div>
                      {h.probLluvia > 0 && (
                        <div style={{ fontSize: 11, color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 4 }}>
                          <Droplets size={10} />
                          {h.probLluvia}%
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
                        {h.humedad}% HR
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Agricultural Technical Recommendations */}
          {weather.recomendaciones && weather.recomendaciones.length > 0 && (
            <div
              className="card"
              style={{
                padding: '24px',
                marginBottom: 20,
                borderColor: 'rgba(22, 163, 74, 0.3)',
                background: 'rgba(22, 163, 74, 0.03)',
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#4ade80',
                }}
              >
                <Sprout size={18} />
                Recomendaciones técnicas de manejo agronómico
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {weather.recomendaciones.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      background: 'rgba(22, 163, 74, 0.06)',
                      borderRadius: 10,
                      border: '1px solid rgba(22, 163, 74, 0.15)',
                      fontSize: 14,
                      color: 'var(--color-text)',
                      lineHeight: 1.5,
                    }}
                  >
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2, color: '#4ade80' }} />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Day Extended Agricultural Forecast */}
          {forecast.length > 0 && (
            <div className="card" style={{ padding: '24px' }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Calendar size={18} color="var(--color-brand)" />
                Pronóstico meteorológico extendido (5 días)
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
                  gap: 12,
                }}
              >
                {forecast.slice(0, 5).map((day, i) => {
                  const hasRain = (day.precipitacionTotal ?? day.lluvia ?? 0) > 0;
                  const rainProb = day.probabilidadLluvia ?? 0;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '18px 12px',
                        background: 'var(--color-surface-2)',
                        borderRadius: 12,
                        border: '1px solid var(--color-border)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>
                        {day.dia || new Date(day.fecha).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                        <WeatherIcon description={day.descripcion} size={30} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 8, textTransform: 'capitalize' }}>
                        {day.descripcion}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: '#f87171', fontSize: 15 }}>{Math.round(day.tempMax)}°</span>
                        <span style={{ color: 'var(--color-text-subtle)', fontSize: 15 }}>{Math.round(day.tempMin)}°</span>
                      </div>
                      {rainProb > 0 && (
                        <div style={{ fontSize: 11, color: '#38bdf8', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                          <Droplets size={11} />
                          {rainProb}% prob.
                        </div>
                      )}
                      {hasRain && (
                        <div style={{ fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                          <CloudRain size={11} />
                          {(day.precipitacionTotal ?? day.lluvia ?? 0).toFixed(1)} mm
                        </div>
                      )}
                      {day.indiceUvMax !== undefined && day.indiceUvMax > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                          <UvBadge uv={day.indiceUvMax} />
                        </div>
                      )}
                      {day.vientoMax !== undefined && (
                        <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                          <Wind size={11} />
                          {day.vientoMax} km/h
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {!weather && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
          <CloudSun size={64} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
          <p style={{ fontSize: 16, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 8 }}>
            Consulta agrometeorológica para tus predios
          </p>
          <p style={{ fontSize: 13 }}>
            Selecciona una finca, un municipio del Cesar o escribe el nombre para consultar el pronóstico
          </p>
        </div>
      )}
    </div>
  );
}
