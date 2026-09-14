'use client';

import { useEffect, useState, useCallback } from 'react';
import { produccionesApi, fincasApi } from '@/lib/api';
import { Sprout, Plus, Edit3, Trash2, Search, X, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Produccion {
  id: number;
  tipo: string;
  variedad?: string;
  estado: string;
  fechaInicio: string;
  fechaEstimadaCosecha?: string;
  cantidadSembrada?: number;
  unidadMedida?: string;
  fincaId: number;
  finca?: { nombre: string };
}

interface Finca {
  id: number;
  nombre: string;
}

const ESTADO_COLORS: Record<string, string> = {
  PLANIFICACION: 'info',
  SIEMBRA: 'blue',
  CRECIMIENTO: 'green',
  COSECHA: 'amber',
  FINALIZADO: 'success',
};

function ProduccionModal({
  prod,
  fincas,
  onClose,
  onSave,
}: {
  prod?: Produccion;
  fincas: Finca[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    tipo: prod?.tipo || 'CULTIVO',
    variedad: prod?.variedad || '',
    estado: prod?.estado || 'PLANIFICACION',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaEstimadaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    cantidadSembrada: prod?.cantidadSembrada?.toString() || '',
    unidadMedida: prod?.unidadMedida || 'hectareas',
    fincaId: prod?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        fincaId: parseInt(form.fincaId),
        cantidadSembrada: form.cantidadSembrada ? parseFloat(form.cantidadSembrada) : undefined,
        fechaEstimadaCosecha: form.fechaEstimadaCosecha || undefined,
      };
      if (prod) {
        await produccionesApi.update(prod.id, payload);
      } else {
        await produccionesApi.create(payload);
      }
      onSave();
      onClose();
    } catch {
      setError('Error al guardar la producción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {prod ? 'Editar Producción' : 'Nueva Producción'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Tipo *</label>
              <select className="input-field" value={form.tipo} onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))} required>
                <option value="CULTIVO">🌾 Cultivo</option>
                <option value="GANADERIA">🐄 Ganadería</option>
                <option value="AVICULTURA">🐔 Avicultura</option>
                <option value="PORCICULTURA">🐷 Porcicultura</option>
                <option value="PISCICULTURA">🐟 Piscicultura</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Estado</label>
              <select className="input-field" value={form.estado} onChange={(e) => setForm(f => ({ ...f, estado: e.target.value }))}>
                <option value="PLANIFICACION">Planificación</option>
                <option value="SIEMBRA">Siembra</option>
                <option value="CRECIMIENTO">Crecimiento</option>
                <option value="COSECHA">Cosecha</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Variedad / Especie</label>
              <input className="input-field" value={form.variedad} onChange={(e) => setForm(f => ({ ...f, variedad: e.target.value }))} placeholder="Ej: Arroz IR-42" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Finca *</label>
              <select className="input-field" value={form.fincaId} onChange={(e) => setForm(f => ({ ...f, fincaId: e.target.value }))} required>
                {fincas.map(fi => (
                  <option key={fi.id} value={fi.id}>{fi.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Fecha inicio *</label>
              <input className="input-field" type="date" value={form.fechaInicio} onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Fecha estimada cosecha</label>
              <input className="input-field" type="date" value={form.fechaEstimadaCosecha} onChange={(e) => setForm(f => ({ ...f, fechaEstimadaCosecha: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Cantidad sembrada</label>
              <input className="input-field" type="number" step="0.01" value={form.cantidadSembrada} onChange={(e) => setForm(f => ({ ...f, cantidadSembrada: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Unidad</label>
              <select className="input-field" value={form.unidadMedida} onChange={(e) => setForm(f => ({ ...f, unidadMedida: e.target.value }))}>
                <option value="hectareas">Hectáreas</option>
                <option value="cabezas">Cabezas</option>
                <option value="aves">Aves</option>
                <option value="peces">Peces</option>
                <option value="toneladas">Toneladas</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : prod ? 'Actualizar' : 'Crear Producción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProduccionesPage() {
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProd, setEditProd] = useState<Produccion | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodsRes, fincasRes] = await Promise.all([
        produccionesApi.getAll(),
        fincasApi.getAll(),
      ]);
      setProducciones(prodsRes.data);
      setFincas(fincasRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta producción?')) return;
    try {
      await produccionesApi.delete(id);
      setProducciones(p => p.filter(x => x.id !== id));
    } catch { alert('Error al eliminar'); }
  };

  const filtered = producciones.filter(p => {
    const matchSearch = p.tipo.toLowerCase().includes(search.toLowerCase()) ||
      (p.variedad || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.finca?.nombre || '').toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo ? p.tipo === filtroTipo : true;
    return matchSearch && matchTipo;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Producciones</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{producciones.length} registros</p>
        </div>
        <button onClick={() => { setEditProd(undefined); setModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} id="btn-nueva-produccion">
          <Plus size={18} /> Nueva Producción
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: 160 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="CULTIVO">Cultivo</option>
          <option value="GANADERIA">Ganadería</option>
          <option value="AVICULTURA">Avicultura</option>
          <option value="PORCICULTURA">Porcicultura</option>
          <option value="PISCICULTURA">Piscicultura</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 76, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
          <Sprout size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {search || filtroTipo ? 'Sin resultados' : 'No hay producciones registradas'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo / Variedad</th>
                <th>Finca</th>
                <th>Estado</th>
                <th>Fecha inicio</th>
                <th>Cosecha estimada</th>
                <th>Cantidad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.tipo}</div>
                    {p.variedad && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.variedad}</div>}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{p.finca?.nombre || `Finca #${p.fincaId}`}</td>
                  <td>
                    <span className={`badge badge-${ESTADO_COLORS[p.estado] || 'info'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={13} />
                      {format(new Date(p.fechaInicio), 'd MMM yyyy', { locale: es })}
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    {p.fechaEstimadaCosecha
                      ? format(new Date(p.fechaEstimadaCosecha), 'd MMM yyyy', { locale: es })
                      : '-'}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                    {p.cantidadSembrada ? `${p.cantidadSembrada} ${p.unidadMedida || ''}` : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setEditProd(p); setModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ProduccionModal
          prod={editProd}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}
