'use client';

import { useState } from 'react';
import { climaApi } from '@/lib/api';
import { CloudSun, Search, Thermometer, Droplets, Wind, Eye, Gauge, Sun, Cloud, CloudRain, CloudSnow } from 'lucide-react';

interface WeatherData {
  ciudad: string;
  temperatura: number;
  sensacionTermica: number;
  descripcion: string;
  humedad: number;
  velocidadViento: number;
  visibilidad?: number;
  presion?: number;
  icono?: string;
  recomendaciones?: string[];
}

interface ForecastDay {
  fecha: string;
  tempMax: number;
  tempMin: number;
  descripcion: string;
  lluvia?: number;
}

function WeatherIcon({ description }: { description?: string }) {
  const d = (description || '').toLowerCase();
  if (d.includes('lluvia') || d.includes('rain')) return <CloudRain size={48} color="#38bdf8" />;
  if (d.includes('nube') || d.includes('cloud')) return <Cloud size={48} color="#94a3b8" />;
  if (d.includes('nieve') || d.includes('snow')) return <CloudSnow size={48} color="#e2e8f0" />;
  if (d.includes('sol') || d.includes('despejado') || d.includes('clear')) return <Sun size={48} color="#fbbf24" />;
  return <CloudSun size={48} color="#38bdf8" />;
}

const CIUDADES_CESAR = ['Valledupar', 'Aguachica', 'Bosconia', 'Codazzi', 'La Paz', 'Manaure', 'Pailitas', 'San Alberto'];

export default function ClimaPage() {
  const [ciudad, setCiudad] = useState('Valledupar');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buscarClima = async () => {
    if (!ciudad.trim()) return;
    setLoading(true);
    setError('');
    try {
      const [currRes, foreRes] = await Promise.allSettled([
        climaApi.current(ciudad),
        climaApi.forecast(ciudad),
      ]);
      if (currRes.status === 'fulfilled') setWeather(currRes.value.data);
      else setError('No se pudo obtener el clima. Verifica el nombre de la ciudad.');
      if (foreRes.status === 'fulfilled') setForecast(foreRes.value.data?.list || foreRes.value.data || []);
    } catch {
      setError('Error al consultar el clima');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Clima Agrícola</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Monitoreo meteorológico para el Cesar</p>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: 38 }}
              placeholder="Ciudad..."
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarClima()}
            />
          </div>
          <button onClick={buscarClima} className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudSun size={16} />
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {/* Quick cities */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {CIUDADES_CESAR.map((c) => (
            <button
              key={c}
              onClick={() => { setCiudad(c); }}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: ciudad === c ? 'rgba(22,163,74,0.2)' : 'var(--color-surface-2)',
                border: `1px solid ${ciudad === c ? 'rgba(22,163,74,0.4)' : 'var(--color-border)'}`,
                color: ciudad === c ? '#4ade80' : 'var(--color-text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#f87171', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="skeleton" style={{ height: 280, borderRadius: 16, gridColumn: 'span 2' }} />
        </div>
      )}

      {weather && !loading && (
        <>
          {/* Current weather */}
          <div
            className="card"
            style={{
              padding: '32px',
              marginBottom: 20,
              background: 'linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(22,163,74,0.1) 100%)',
              borderColor: 'rgba(14,165,233,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>📍 {weather.ciudad}</div>
                <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>
                  {Math.round(weather.temperatura)}°C
                </div>
                <div style={{ fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {weather.descripcion}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-subtle)' }}>
                  Sensación térmica: {Math.round(weather.sensacionTermica)}°C
                </div>
              </div>
              <WeatherIcon description={weather.descripcion} />
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14, marginTop: 28 }}>
              {[
                { icon: <Droplets size={18} />, label: 'Humedad', value: `${weather.humedad}%`, color: '#38bdf8' },
                { icon: <Wind size={18} />, label: 'Viento', value: `${weather.velocidadViento} km/h`, color: '#a78bfa' },
                { icon: <Eye size={18} />, label: 'Visibilidad', value: weather.visibilidad ? `${weather.visibilidad} km` : 'N/A', color: '#34d399' },
                { icon: <Gauge size={18} />, label: 'Presión', value: weather.presion ? `${weather.presion} hPa` : 'N/A', color: '#fbbf24' },
              ].map((m, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: m.color, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{m.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendaciones */}
          {weather.recomendaciones && weather.recomendaciones.length > 0 && (
            <div className="card" style={{ padding: '24px', marginBottom: 20, borderColor: 'rgba(22,163,74,0.3)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                🌱 Recomendaciones agrícolas
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {weather.recomendaciones.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: 'rgba(22,163,74,0.06)', borderRadius: 10, border: '1px solid rgba(22,163,74,0.12)', fontSize: 14, color: 'var(--color-text-muted)' }}>
                    <span style={{ flexShrink: 0, color: '#4ade80' }}>✓</span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forecast */}
          {forecast.length > 0 && (
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📅 Pronóstico</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                {forecast.slice(0, 7).map((day, i) => (
                  <div key={i} style={{ padding: '14px 12px', background: 'var(--color-surface-2)', borderRadius: 12, border: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                      {new Date(day.fecha).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>
                      {day.descripcion?.toLowerCase().includes('lluvia') ? '🌧️' :
                        day.descripcion?.toLowerCase().includes('nube') ? '☁️' : '☀️'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#f87171', fontSize: 13 }}>{Math.round(day.tempMax)}°</span>
                      <span style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>{Math.round(day.tempMin)}°</span>
                    </div>
                    {day.lluvia && <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4 }}>{day.lluvia}mm</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!weather && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
          <CloudSun size={64} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
          <p style={{ fontSize: 16, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 8 }}>Consulta el clima de tu zona</p>
          <p style={{ fontSize: 13 }}>Selecciona una ciudad o escribe el nombre para consultar el pronóstico</p>
        </div>
      )}
    </div>
  );
}
