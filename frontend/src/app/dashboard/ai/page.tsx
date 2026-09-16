'use client';

import { useState, useCallback, useEffect } from 'react';
import { aiApi, fincasApi, produccionesApi } from '@/lib/api';
import {
  Bot,
  Send,
  Loader2,
  Sprout,
  CloudSun,
  DollarSign,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  Droplets,
  Bug,
  FlaskConical,
  TrendingUp,
  Wheat,
  Layers,
  CloudRain,
  ShieldAlert,
} from 'lucide-react';

interface Recomendacion {
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  categoria: string;
}

interface AIResponse {
  recomendaciones: Recomendacion[];
  resumen?: string;
  fuente?: string;
}

interface Finca { id: number | string; nombre: string; ubicacion: string; hectareas: number; }
interface Produccion { id: number | string; tipo: string; variedad?: string; estado: string; }

const PRIORIDAD_STYLE: Record<string, { color: string; badge: string; dot: string }> = {
  alta:  { color: '#f87171', badge: 'badge-danger',  dot: '#ef4444' },
  media: { color: '#fbbf24', badge: 'badge-warning', dot: '#f59e0b' },
  baja:  { color: '#4ade80', badge: 'badge-success', dot: '#22c55e' },
};

function getCategoryIcon(cat: string) {
  const c = (cat || '').toUpperCase();
  if (c.includes('CLIMA')) return <CloudRain size={16} color="#38bdf8" />;
  if (c.includes('RIEGO')) return <Droplets size={16} color="#38bdf8" />;
  if (c.includes('PLAGA') || c.includes('ENFERMEDAD')) return <Bug size={16} color="#f87171" />;
  if (c.includes('FERTIL')) return <FlaskConical size={16} color="#a78bfa" />;
  if (c.includes('COSECHA')) return <Wheat size={16} color="#fbbf24" />;
  if (c.includes('ECONOM') || c.includes('COSTO')) return <TrendingUp size={16} color="#34d399" />;
  if (c.includes('SUELO')) return <Layers size={16} color="#fb923c" />;
  return <Lightbulb size={16} color="#4ade80" />;
}

const PROMPT_SUGERIDOS = [
  { label: 'Riego óptimo', prompt: '¿Cuál es la frecuencia y volumen de riego óptimo para mis cultivos en el Cesar considerando las condiciones agrometeorológicas actuales?', icon: <Droplets size={14} color="#38bdf8" /> },
  { label: 'Control fitosanitario', prompt: '¿Qué plagas y enfermedades debo monitorear prioritariamente en esta época en el departamento del Cesar y cuáles son las medidas preventivas recomendadas?', icon: <Bug size={14} color="#f87171" /> },
  { label: 'Plan de fertilización', prompt: '¿Qué recomendaciones de fertilización y nutrición vegetal optimizan el rendimiento para los tipos de suelo predominantes en la región?', icon: <FlaskConical size={14} color="#a78bfa" /> },
  { label: 'Optimización de costos', prompt: '¿Cómo optimizar los costos operativos y de insumos en el ciclo productivo sin sacrificar rendimiento ni calidad de cosecha?', icon: <TrendingUp size={14} color="#34d399" /> },
  { label: 'Calendario de siembra', prompt: '¿Cuál es el calendario y ventana de siembra óptima en el Cesar teniendo en cuenta el régimen pluviométrico?', icon: <Sprout size={14} color="#4ade80" /> },
];

export default function AIPage() {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [selectedFinca, setSelectedFinca] = useState<string>('');
  const [consulta, setConsulta] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [fRes, pRes] = await Promise.allSettled([fincasApi.getAll(), produccionesApi.getAll()]);
      if (fRes.status === 'fulfilled') {
        setFincas(fRes.value.data);
        if (fRes.value.data.length > 0) setSelectedFinca(fRes.value.data[0].id.toString());
      }
      if (pRes.status === 'fulfilled') setProducciones(pRes.value.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (promptText?: string) => {
    const text = promptText || consulta;
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const finca = fincas.find(f => f.id.toString() === selectedFinca);
      const prods = producciones.filter(p => selectedFinca ? p : true).slice(0, 5);

      const payload = {
        consulta: text,
        contexto: {
          finca: finca ? { nombre: finca.nombre, ubicacion: finca.ubicacion, hectareas: finca.hectareas } : undefined,
          producciones: prods.map(p => ({ tipo: p.tipo, variedad: p.variedad, estado: p.estado })),
          region: 'Cesar, Colombia',
        },
      };

      const res = await aiApi.recomendaciones(payload);
      setResponse(res.data);
      if (!promptText) setConsulta('');
    } catch {
      setError('No se pudo obtener respuesta de la IA. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} color="#a78bfa" />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>AgroIA</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Asistente inteligente para tu finca</p>
          </div>
        </div>
      </div>

      {/* Context selector */}
      <div className="card" style={{ padding: '20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Sprout size={16} color="#4ade80" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Contexto de análisis</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>Finca a analizar</label>
            <select className="input-field" value={selectedFinca} onChange={(e) => setSelectedFinca(e.target.value)}>
              <option value="">Todas las fincas</option>
              {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ padding: '8px 14px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 10, fontSize: 12 }}>
              <CloudSun size={13} style={{ display: 'inline', marginRight: 4 }} color="#4ade80" />
              <span style={{ color: 'var(--color-text-muted)' }}>Región: Cesar</span>
            </div>
            <div style={{ padding: '8px 14px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 10, fontSize: 12 }}>
              <DollarSign size={13} style={{ display: 'inline', marginRight: 4 }} color="#4ade80" />
              <span style={{ color: 'var(--color-text-muted)' }}>{producciones.length} producciones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10, fontWeight: 500 }}>
          <Lightbulb size={14} style={{ display: 'inline', marginRight: 4 }} />
          Consultas frecuentes:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PROMPT_SUGERIDOS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSubmit(p.prompt)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                borderRadius: 20, fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer',
                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif', fontWeight: 500,
              }}
            >
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="card" style={{ padding: '16px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            className="input-field"
            style={{ flex: 1, resize: 'none', minHeight: 72, lineHeight: 1.5 }}
            placeholder="Escribe tu consulta agrícola aquí... (Ej: ¿Cuándo es el mejor momento para cosechar el arroz en la región?)"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            rows={3}
          />
          <button
            onClick={() => handleSubmit()}
            className="btn-primary"
            disabled={loading || !consulta.trim()}
            style={{ height: 44, width: 44, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 8 }}>Presiona Enter para enviar · Shift+Enter para nueva línea</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 14 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa' }} />
            AgroIA está analizando tu consulta...
          </div>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />)}
        </div>
      )}

      {/* Response */}
      {response && !loading && (
        <div className="animate-fade-in-up">
          {/* Resumen */}
          {response.resumen && (
            <div style={{ padding: '16px 20px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, marginBottom: 16, fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Bot size={16} color="#a78bfa" />
                <span style={{ fontWeight: 600, color: '#a78bfa', fontSize: 13 }}>Análisis general</span>
              </div>
              {response.resumen}
            </div>
          )}

          {/* Recomendaciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(response.recomendaciones || []).map((rec, i) => {
              const style = PRIORIDAD_STYLE[rec.prioridad] || PRIORIDAD_STYLE.baja;
              return (
                <div
                  key={i}
                  className="card"
                  style={{ padding: '20px 24px', borderLeft: `3px solid ${style.dot}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: 'var(--color-surface-2)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getCategoryIcon(rec.categoria)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{rec.titulo}</h3>
                        <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          {rec.categoria}
                        </span>
                      </div>
                    </div>
                    <span className={`badge ${style.badge}`} style={{ flexShrink: 0, fontSize: 11 }}>
                      {rec.prioridad?.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                    {rec.descripcion}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Source + reset */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 8 }}>
            {response.fuente && (
              <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronRight size={13} />
                Fuente: {response.fuente}
              </span>
            )}
            <button
              onClick={() => setResponse(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 10px', borderRadius: 8 }}
            >
              <RefreshCw size={14} /> Nueva consulta
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!response && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: 72, height: 72, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Bot size={32} color="#a78bfa" />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Pregúntale a AgroIA
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            Obtén recomendaciones personalizadas sobre cultivos, clima, fertilización, plagas y más,
            basadas en el contexto de tus fincas en el Cesar.
          </p>
        </div>
      )}
    </div>
  );
}
