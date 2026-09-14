'use client';

import { useEffect, useState, useCallback } from 'react';
import { inventarioApi, fincasApi } from '@/lib/api';
import { Package, Plus, Edit3, Trash2, Search, X, AlertTriangle } from 'lucide-react';

interface Item {
  id: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  stockMinimo?: number;
  costo?: number;
  proveedor?: string;
  fincaId: number;
  finca?: { nombre: string };
}

interface Finca { id: number; nombre: string; }

const CAT_EMOJIS: Record<string, string> = {
  FERTILIZANTE: '🧪', SEMILLA: '🌱', PESTICIDA: '☠️', HERRAMIENTA: '🔧',
  COMBUSTIBLE: '⛽', MEDICAMENTO: '💊', ALIMENTO: '🌽', OTRO: '📦',
};

function ItemModal({ item, fincas, onClose, onSave }: { item?: Item; fincas: Finca[]; onClose: () => void; onSave: () => void; }) {
  const [form, setForm] = useState({
    nombre: item?.nombre || '',
    categoria: item?.categoria || 'OTRO',
    cantidad: item?.cantidad?.toString() || '',
    unidad: item?.unidad || 'unidades',
    stockMinimo: item?.stockMinimo?.toString() || '',
    costo: item?.costo?.toString() || '',
    proveedor: item?.proveedor || '',
    fincaId: item?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, cantidad: parseFloat(form.cantidad), fincaId: parseInt(form.fincaId), stockMinimo: form.stockMinimo ? parseFloat(form.stockMinimo) : undefined, costo: form.costo ? parseFloat(form.costo) : undefined };
      if (item) { await inventarioApi.update(item.id, payload); }
      else { await inventarioApi.create(payload); }
      onSave(); onClose();
    } catch { setError('Error al guardar el item'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>{item ? 'Editar Item' : 'Nuevo Item'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Nombre *</label>
              <input className="input-field" value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Urea 46%" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Categoría</label>
              <select className="input-field" value={form.categoria} onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {Object.keys(CAT_EMOJIS).map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Finca *</label>
              <select className="input-field" value={form.fincaId} onChange={(e) => setForm(f => ({ ...f, fincaId: e.target.value }))} required>
                {fincas.map(fi => <option key={fi.id} value={fi.id}>{fi.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Cantidad *</label>
              <input className="input-field" type="number" step="0.01" value={form.cantidad} onChange={(e) => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Unidad</label>
              <select className="input-field" value={form.unidad} onChange={(e) => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {['unidades', 'kg', 'litros', 'bultos', 'toneladas', 'cajas'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Stock mínimo</label>
              <input className="input-field" type="number" value={form.stockMinimo} onChange={(e) => setForm(f => ({ ...f, stockMinimo: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Costo unitario (COP)</label>
              <input className="input-field" type="number" value={form.costo} onChange={(e) => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="0" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Proveedor</label>
              <input className="input-field" value={form.proveedor} onChange={(e) => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="Nombre del proveedor" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : item ? 'Actualizar' : 'Agregar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [alertas, setAlertas] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, fincasRes, alertasRes] = await Promise.allSettled([
        inventarioApi.getAll(), fincasApi.getAll(), inventarioApi.alertas(),
      ]);
      if (itemsRes.status === 'fulfilled') setItems(itemsRes.value.data);
      if (fincasRes.status === 'fulfilled') setFincas(fincasRes.value.data);
      if (alertasRes.status === 'fulfilled') setAlertas(alertasRes.value.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este item?')) return;
    try {
      await inventarioApi.delete(id);
      setItems(i => i.filter(x => x.id !== id));
    } catch { alert('Error al eliminar'); }
  };

  const filtered = items.filter(i => {
    const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase()) || (i.proveedor || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filtroCategoria ? i.categoria === filtroCategoria : true;
    return matchSearch && matchCat;
  });

  const isBajoStock = (item: Item) => item.stockMinimo && item.cantidad <= item.stockMinimo;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Inventario</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{items.length} items · {alertas.length} alertas</p>
        </div>
        <button onClick={() => { setEditItem(undefined); setModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} id="btn-nuevo-item">
          <Plus size={18} /> Agregar Item
        </button>
      </div>

      {alertas.length > 0 && (
        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 600, color: '#f87171', fontSize: 14 }}>{alertas.length} item(s) con stock bajo o agotado</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13, marginLeft: 8 }}>
              {(alertas as Item[]).map(a => a.nombre).join(', ')}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: 160 }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {Object.keys(CAT_EMOJIS).map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />)}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-subtle)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p>No hay items en el inventario</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Finca</th>
                  <th>Cantidad</th>
                  <th>Stock Mín.</th>
                  <th>Estado</th>
                  <th>Proveedor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                    <td><span style={{ fontSize: 16 }}>{CAT_EMOJIS[item.categoria] || '📦'}</span> <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.categoria}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{item.finca?.nombre || `#${item.fincaId}`}</td>
                    <td style={{ fontWeight: 600 }}>{item.cantidad} <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.unidad}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{item.stockMinimo ?? '-'}</td>
                    <td>
                      {isBajoStock(item) ? (
                        <span className="badge badge-danger"><AlertTriangle size={11} /> Bajo stock</span>
                      ) : (
                        <span className="badge badge-success">OK</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{item.proveedor || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditItem(item); setModalOpen(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalOpen && <ItemModal item={editItem} fincas={fincas} onClose={() => setModalOpen(false)} onSave={loadData} />}
    </div>
  );
}
