'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { finanzasApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { DollarSign, Plus, Trash2, Search, X, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Transaccion {
  id: string | number;
  tipo: 'INGRESO' | 'GASTO';
  categoria: string;
  monto: number;
  descripcion?: string;
  fecha: string;
  fincaId: string | number;
  finca?: { id: string | number; nombre: string };
}

interface Finca { id: string | number; nombre: string; lotes?: { producciones?: { id: string, name: string }[] }[] }
interface Produccion { id: string | number; name: string; type: string }

function TransaccionModal({ fincas, producciones, onClose, onSave }: { fincas: Finca[]; producciones: Produccion[]; onClose: () => void; onSave: () => void; }) {
  const [form, setForm] = useState({
    tipo: 'INGRESO',
    categoria: '',
    monto: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    fincaId: '',
    produccionId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categorias = {
    INGRESO: [
      'Venta de producción',
      'Venta de animales',
      'Venta de productos',
      'Servicios',
      'Otros',
    ],
    GASTO: [
      'Insumos',
      'Fertilizantes',
      'Alimentación',
      'Mano de obra',
      'Transporte',
      'Combustible',
      'Mantenimiento',
      'Maquinaria',
      'Servicios',
      'Otros',
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await finanzasApi.create({
        ...form,
        monto: parseFloat(form.monto),
        fincaId: form.fincaId || undefined,
        produccionId: form.produccionId || undefined,
      });
      onSave();
      onClose();
    } catch {
      setError('Error al guardar la transacción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>Nueva Transacción</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={20} /></button>
        </div>
        {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tipo toggle */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {(['INGRESO', 'GASTO'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, tipo: t, categoria: '' }))}
                style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                  background: form.tipo === t ? (t === 'INGRESO' ? 'rgba(22,163,74,0.2)' : 'rgba(239,68,68,0.2)') : 'transparent',
                  color: form.tipo === t ? (t === 'INGRESO' ? '#4ade80' : '#f87171') : 'var(--color-text-muted)',
                }}>
                {t === 'INGRESO' ? '↑ Ingreso' : '↓ Gasto'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Categoría *</label>
              <select className="input-field" value={form.categoria} onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))} required>
                <option value="">Seleccionar...</option>
                {categorias[form.tipo as keyof typeof categorias].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Monto (COP) *</label>
              <input className="input-field" type="number" min="0" step="1000" value={form.monto} onChange={(e) => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="0" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Fecha *</label>
              <input className="input-field" type="date" value={form.fecha} onChange={(e) => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Finca (Opcional)</label>
              <select className="input-field" value={form.fincaId} onChange={(e) => setForm(f => ({ ...f, fincaId: e.target.value }))}>
                <option value="">Ninguna</option>
                {fincas.map(fi => <option key={fi.id} value={fi.id}>{fi.nombre}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Producción (Opcional)</label>
              <select className="input-field" value={form.produccionId} onChange={(e) => setForm(f => ({ ...f, produccionId: e.target.value }))}>
                <option value="">Ninguna</option>
                {producciones.map(p => <option key={p.id} value={p.id}>{p.name} - {p.type}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Descripción</label>
              <input className="input-field" value={form.descripcion} onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinanzasPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFinca, setFiltroFinca] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: number | string | null;
    name: string;
    loading: boolean;
  }>({
    isOpen: false,
    id: null,
    name: '',
    loading: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Usamos importación dinámica manual temporalmente si las APIs de produccion no estuvieran en api.ts exportadas igual
      const { produccionesApi } = await import('@/lib/api');
      const [transRes, fincasRes, prodsRes] = await Promise.allSettled([
        finanzasApi.getAll(),
        fincasApi.getAll(),
        produccionesApi.getAll(),
      ]);
      const trans = transRes.status === 'fulfilled' ? transRes.value.data : [];
      setTransacciones(trans);
      if (fincasRes.status === 'fulfilled') setFincas(fincasRes.value.data);
      if (prodsRes.status === 'fulfilled') setProducciones(prodsRes.value.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const confirmDeleteTransaccion = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await finanzasApi.delete(deleteModal.id);
      setTransacciones((t) => t.filter((x) => x.id !== deleteModal.id));
      useToastStore.getState().success('Transacción eliminada.');
      setDeleteModal({ isOpen: false, id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al eliminar la transacción.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = (t: Transaccion) => {
    setDeleteModal({
      isOpen: true,
      id: t.id,
      name: `${t.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'} - ${t.categoria}`,
      loading: false,
    });
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const filtered = useMemo(() => {
    return transacciones.filter(t => {
      const matchSearch = !search ||
        t.categoria.toLowerCase().includes(search.toLowerCase()) ||
        (t.descripcion || '').toLowerCase().includes(search.toLowerCase());
      const matchTipo = filtroTipo ? t.tipo === filtroTipo : true;
      const matchFinca = filtroFinca ? String(t.fincaId) === filtroFinca : true;
      let matchFecha = true;
      if (filtroFechaDesde) matchFecha = matchFecha && new Date(t.fecha) >= new Date(filtroFechaDesde);
      if (filtroFechaHasta) matchFecha = matchFecha && new Date(t.fecha) <= new Date(filtroFechaHasta + 'T23:59:59');
      return matchSearch && matchTipo && matchFinca && matchFecha;
    });
  }, [transacciones, search, filtroTipo, filtroFinca, filtroFechaDesde, filtroFechaHasta]);

  // Calculate dynamic balance
  const resumen = useMemo(() => {
    return filtered.reduce((acc, t) => {
      if (t.tipo === 'INGRESO') {
        acc.totalIngresos += t.monto;
        acc.balance += t.monto;
      } else {
        acc.totalGastos += t.monto;
        acc.balance -= t.monto;
      }
      return acc;
    }, { totalIngresos: 0, totalGastos: 0, balance: 0 });
  }, [filtered]);

  // Derive chart data directly without useEffect / setState loop
  const chartData = useMemo(() => {
    const catMap: Record<string, { ingresos: number; gastos: number }> = {};
    filtered.forEach(t => {
      if (!catMap[t.categoria]) catMap[t.categoria] = { ingresos: 0, gastos: 0 };
      if (t.tipo === 'INGRESO') catMap[t.categoria].ingresos += t.monto;
      else catMap[t.categoria].gastos += t.monto;
    });
    return Object.entries(catMap).slice(0, 10).map(([cat, v]) => ({ cat, ...v }));
  }, [filtered]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Finanzas</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Control de ingresos y gastos</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} id="btn-nueva-transaccion">
          <Plus size={18} /> Nueva Transacción
        </button>
      </div>

      {/* Summary cards (Dynamic) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card stat-card-green" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="stat-icon-green" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Ingresos</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{formatCOP(resumen.totalIngresos)}</div>
        </div>
        <div className="card stat-card-red" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="stat-icon-red" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={18} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Gastos</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f87171' }}>{formatCOP(resumen.totalGastos)}</div>
        </div>
        <div className={`card stat-card-${resumen.balance >= 0 ? 'green' : 'red'}`} style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className={`stat-icon-${resumen.balance >= 0 ? 'blue' : 'amber'}`} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Balance Neto</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: resumen.balance >= 0 ? '#4ade80' : '#f87171' }}>{formatCOP(resumen.balance)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Buscar</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
            <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar por categoría o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Tipo</label>
          <select className="input-field" style={{ width: 'auto', minWidth: 120 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="INGRESO">Ingresos</option>
            <option value="GASTO">Gastos</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Finca</label>
          <select className="input-field" style={{ width: 'auto', minWidth: 140 }} value={filtroFinca} onChange={(e) => setFiltroFinca(e.target.value)}>
            <option value="">Todas</option>
            {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Desde</label>
          <input type="date" className="input-field" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Hasta</label>
          <input type="date" className="input-field" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} />
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <BarChart3 size={18} color="#4ade80" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Por Categoría</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData as Array<{ cat: string; ingresos: number; gastos: number }>}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,61,42,0.5)" />
              <XAxis dataKey="cat" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', fontSize: 12 }} formatter={(v) => formatCOP(Number(v || 0))} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-subtle)' }}>
              <DollarSign size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p>No hay transacciones registradas</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Finca</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className={`badge ${t.tipo === 'INGRESO' ? 'badge-success' : 'badge-danger'}`}>
                        {t.tipo === 'INGRESO' ? '↑' : '↓'} {t.tipo}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.categoria}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.descripcion || '-'}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.finca?.nombre || (t.fincaId ? `Finca #${t.fincaId}` : '-')}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{format(new Date(t.fecha), 'd MMM yyyy', { locale: es })}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.tipo === 'INGRESO' ? '#4ade80' : '#f87171' }}>
                      {formatCOP(t.monto)}
                    </td>
                    <td>
                      <button onClick={() => handleDelete(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalOpen && <TransaccionModal fincas={fincas} producciones={producciones} onClose={() => setModalOpen(false)} onSave={loadData} />}

      {/* Modal Confirmación Eliminación Transacción */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar transacción contable?"
        itemName={deleteModal.name}
        description="Esta acción eliminará permanentemente este movimiento de los libros financieros de la organización."
        loading={deleteModal.loading}
        onConfirm={confirmDeleteTransaccion}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
