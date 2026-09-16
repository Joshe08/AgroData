'use client';

import { useEffect, useState, useCallback } from 'react';
import { maquinariaApi, fincasApi } from '@/lib/api';
import { Wrench, Plus, Edit3, Trash2, Search, X, AlertTriangle } from 'lucide-react';

interface Maquina {
  id: number;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  estado: string;
  horasUso?: number;
  proximoMantenimiento?: string;
  fincaId: number;
  finca?: { nombre: string };
}
interface Finca { id: number; nombre: string; }

const ESTADO_COLOR: Record<string, string> = { OPERATIVO: 'success', MANTENIMIENTO: 'warning', DAÑADO: 'danger', INACTIVO: 'info' };

function MaquinaModal({ maquina, fincas, onClose, onSave }: { maquina?: Maquina; fincas: Finca[]; onClose: () => void; onSave: () => void; }) {
  const [form, setForm] = useState({
    nombre: maquina?.nombre || '', tipo: maquina?.tipo || 'TRACTOR', marca: maquina?.marca || '',
    modelo: maquina?.modelo || '', estado: maquina?.estado || 'OPERATIVO',
    horasUso: maquina?.horasUso?.toString() || '',
    proximoMantenimiento: maquina?.proximoMantenimiento?.split('T')[0] || '',
    fincaId: maquina?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const p = { ...form, fincaId: form.fincaId, horasUso: form.horasUso ? parseFloat(form.horasUso) : undefined, proximoMantenimiento: form.proximoMantenimiento || undefined };
      if (maquina) await maquinariaApi.update(maquina.id, p); else await maquinariaApi.create(p);
      onSave(); onClose();
    } catch { alert('Error al guardar'); } finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{maquina ? 'Editar Maquinaria' : 'Nueva Maquinaria'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Nombre *</label><input className="input-field" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Tractor Valpadana" required /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Tipo</label>
              <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {['TRACTOR', 'COSECHADORA', 'FUMIGADORA', 'BOMBA', 'VEHICULO', 'OTRO'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Estado</label>
              <select className="input-field" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                {['OPERATIVO', 'MANTENIMIENTO', 'DAÑADO', 'INACTIVO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Marca</label><input className="input-field" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ej: John Deere" /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Modelo</label><input className="input-field" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ej: 5065E" /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Horas de uso</label><input className="input-field" type="number" value={form.horasUso} onChange={e => setForm(f => ({ ...f, horasUso: e.target.value }))} placeholder="0" /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Próximo mantenimiento</label><input className="input-field" type="date" value={form.proximoMantenimiento} onChange={e => setForm(f => ({ ...f, proximoMantenimiento: e.target.value }))} /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Finca *</label>
              <select className="input-field" value={form.fincaId} onChange={e => setForm(f => ({ ...f, fincaId: e.target.value }))} required>
                {fincas.map(fi => <option key={fi.id} value={fi.id}>{fi.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : maquina ? 'Actualizar' : 'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaquinariaPage() {
  const [maquinaria, setMaquinaria] = useState<Maquina[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, fRes] = await Promise.all([maquinariaApi.getAll(), fincasApi.getAll()]);
      setMaquinaria(mRes.data); setFincas(fRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta maquinaria?')) return;
    try { await maquinariaApi.delete(id); setMaquinaria(m => m.filter(x => x.id !== id)); } catch { alert('Error'); }
  };

  const TIPO_EMOJI: Record<string, string> = { TRACTOR: '🚜', COSECHADORA: '🌾', FUMIGADORA: '💨', BOMBA: '🔩', VEHICULO: '🚛', OTRO: '⚙️' };
  const filtered = maquinaria.filter(m => m.nombre.toLowerCase().includes(search.toLowerCase()) || (m.marca || '').toLowerCase().includes(search.toLowerCase()));
  const proximoMant = maquinaria.filter(m => {
    if (!m.proximoMantenimiento) return false;
    const days = (new Date(m.proximoMantenimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Maquinaria</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{maquinaria.length} equipos registrados</p>
        </div>
        <button onClick={() => { setEditMaquina(undefined); setModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Agregar Equipo
        </button>
      </div>

      {proximoMant.length > 0 && (
        <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span style={{ color: '#fbbf24', fontWeight: 600, fontSize: 14 }}>{proximoMant.length} equipo(s) con mantenimiento próximo: </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{proximoMant.map(m => m.nombre).join(', ')}</span>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
        <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar maquinaria..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-subtle)' }}>
          <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>No hay maquinaria registrada</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {filtered.map(m => (
            <div key={m.id} className="card glass-hover" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{TIPO_EMOJI[m.tipo] || '⚙️'}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditMaquina(m); setModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{m.nombre}</h3>
              {m.marca && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>{m.marca} {m.modelo}</p>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`badge badge-${ESTADO_COLOR[m.estado] || 'info'}`}>{m.estado}</span>
                {m.horasUso && <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>{m.horasUso}h uso</span>}
              </div>
              {m.proximoMantenimiento && (
                <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
                  🔧 Mant: {new Date(m.proximoMantenimiento).toLocaleDateString('es-CO')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {modalOpen && <MaquinaModal maquina={editMaquina} fincas={fincas} onClose={() => setModalOpen(false)} onSave={loadData} />}
    </div>
  );
}
