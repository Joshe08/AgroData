'use client';

import { useEffect, useState, useCallback } from 'react';
import { personalApi, fincasApi } from '@/lib/api';
import { Users, Plus, Edit3, Trash2, Search, X, Phone, Briefcase } from 'lucide-react';

interface Personal {
  id: number;
  nombre: string;
  cargo: string;
  salario?: number;
  telefono?: string;
  tipoContrato?: string;
  fechaIngreso?: string;
  fincaId: number;
  finca?: { nombre: string };
}
interface Finca { id: number; nombre: string; }

function PersonalModal({ persona, fincas, onClose, onSave }: { persona?: Personal; fincas: Finca[]; onClose: () => void; onSave: () => void; }) {
  const [form, setForm] = useState({
    nombre: persona?.nombre || '', cargo: persona?.cargo || '', salario: persona?.salario?.toString() || '',
    telefono: persona?.telefono || '', tipoContrato: persona?.tipoContrato || 'TERMINO_FIJO',
    fechaIngreso: persona?.fechaIngreso?.split('T')[0] || new Date().toISOString().split('T')[0],
    fincaId: persona?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const p = { ...form, fincaId: parseInt(form.fincaId), salario: form.salario ? parseFloat(form.salario) : undefined };
      if (persona) await personalApi.update(persona.id, p); else await personalApi.create(p);
      onSave(); onClose();
    } catch { alert('Error al guardar'); } finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{persona ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Nombre completo *</label><input className="input-field" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del empleado" required /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Cargo *</label><input className="input-field" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ej: Jornalero" required /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Salario (COP)</label><input className="input-field" type="number" value={form.salario} onChange={e => setForm(f => ({ ...f, salario: e.target.value }))} placeholder="0" /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Teléfono</label><input className="input-field" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="3001234567" /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Tipo contrato</label>
              <select className="input-field" value={form.tipoContrato} onChange={e => setForm(f => ({ ...f, tipoContrato: e.target.value }))}>
                <option value="TERMINO_FIJO">Término Fijo</option><option value="INDEFINIDO">Indefinido</option><option value="OBRA_LABOR">Obra/Labor</option><option value="TEMPORAL">Temporal</option>
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Fecha ingreso</label><input className="input-field" type="date" value={form.fechaIngreso} onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} /></div>
            <div><label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Finca *</label>
              <select className="input-field" value={form.fincaId} onChange={e => setForm(f => ({ ...f, fincaId: e.target.value }))} required>
                {fincas.map(fi => <option key={fi.id} value={fi.id}>{fi.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : persona ? 'Actualizar' : 'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editPersona, setEditPersona] = useState<Personal | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, fRes] = await Promise.all([personalApi.getAll(), fincasApi.getAll()]);
      setPersonal(pRes.data); setFincas(fRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar empleado?')) return;
    try { await personalApi.delete(id); setPersonal(p => p.filter(x => x.id !== id)); } catch { alert('Error'); }
  };

  const formatCOP = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  const filtered = personal.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()) || p.cargo.toLowerCase().includes(search.toLowerCase()));
  const totalNomina = personal.reduce((sum, p) => sum + (p.salario || 0), 0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Personal</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{personal.length} empleados · Nómina: {formatCOP(totalNomina)}/mes</p>
        </div>
        <button onClick={() => { setEditPersona(undefined); setModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Agregar Empleado
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
        <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar empleado..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-subtle)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>No hay empleados registrados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <div key={p.id} className="card glass-hover" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white' }}>
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditPersona(p); setModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{p.nombre}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Briefcase size={13} color="var(--color-text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.cargo}</span>
              </div>
              {p.telefono && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Phone size={13} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.telefono}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <span className={`badge ${p.tipoContrato === 'INDEFINIDO' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 11 }}>{p.tipoContrato?.replace('_', ' ')}</span>
                {p.salario && <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>{formatCOP(p.salario)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {modalOpen && <PersonalModal persona={editPersona} fincas={fincas} onClose={() => setModalOpen(false)} onSave={loadData} />}
    </div>
  );
}
