'use client';

import { useEffect, useState, useCallback } from 'react';
import { finanzasApi, fincasApi } from '@/lib/api';
import { DollarSign, Plus, Trash2, Search, X, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Transaccion {
  id: number;
  tipo: 'INGRESO' | 'GASTO';
  categoria: string;
  monto: number;
  descripcion?: string;
  fecha: string;
  fincaId: number;
  finca?: { nombre: string };
}

interface Finca { id: number; nombre: string; }

function TransaccionModal({ fincas, onClose, onSave }: { fincas: Finca[]; onClose: () => void; onSave: () => void; }) {
  const [form, setForm] = useState({
    tipo: 'INGRESO',
    categoria: '',
    monto: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    fincaId: fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categorias = {
    INGRESO: ['Venta de cosecha', 'Subsidio', 'Venta de animales', 'Arriendo', 'Otro ingreso'],
    GASTO: ['Fertilizantes', 'Semillas', 'Mano de obra', 'Combustible', 'Mantenimiento', 'Transporte', 'Servicios', 'Otro gasto'],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await finanzasApi.create({
        ...form,
        monto: parseFloat(form.monto),
        fincaId: parseInt(form.fincaId),
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
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>Finca *</label>
              <select className="input-field" value={form.fincaId} onChange={(e) => setForm(f => ({ ...f, fincaId: e.target.value }))} required>
                {fincas.map(fi => <option key={fi.id} value={fi.id}>{fi.nombre}</option>)}
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
  const [resumen, setResumen] = useState({ totalIngresos: 0, totalGastos: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [chartData, setChartData] = useState<unknown[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [transRes, fincasRes, resumenRes] = await Promise.allSettled([
        finanzasApi.getAll(),
        fincasApi.getAll(),
        finanzasApi.resumen(),
      ]);
      const trans = transRes.status === 'fulfilled' ? transRes.value.data : [];
      setTransacciones(trans);
      if (fincasRes.status === 'fulfilled') setFincas(fincasRes.value.data);
      if (resumenRes.status === 'fulfilled') setResumen(resumenRes.value.data);

      // Build category chart
      const catMap: Record<string, { ingresos: number; gastos: number }> = {};
      (trans as Transaccion[]).forEach(t => {
        if (!catMap[t.categoria]) catMap[t.categoria] = { ingresos: 0, gastos: 0 };
        if (t.tipo === 'INGRESO') catMap[t.categoria].ingresos += t.monto;
        else catMap[t.categoria].gastos += t.monto;
      });
      setChartData(Object.entries(catMap).slice(0, 8).map(([cat, v]) => ({ cat, ...v })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    try {
      await finanzasApi.delete(id);
      setTransacciones(t => t.filter(x => x.id !== id));
    } catch { alert('Error al eliminar'); }
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const filtered = transacciones.filter(t => {
    const matchSearch = t.categoria.toLowerCase().includes(search.toLowerCase()) ||
      (t.descripcion || '').toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo ? t.tipo === filtroTipo : true;
    return matchSearch && matchTipo;
  });

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

      {/* Summary cards */}
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

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <BarChart3 size={18} color="#4ade80" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Por Categoría</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
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

      {/* Filters & table */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: 140 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="INGRESO">Ingresos</option>
          <option value="GASTO">Gastos</option>
        </select>
      </div>

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
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{t.finca?.nombre || `Finca #${t.fincaId}`}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{format(new Date(t.fecha), 'd MMM yyyy', { locale: es })}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.tipo === 'INGRESO' ? '#4ade80' : '#f87171' }}>
                      {formatCOP(t.monto)}
                    </td>
                    <td>
                      <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}>
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

      {modalOpen && <TransaccionModal fincas={fincas} onClose={() => setModalOpen(false)} onSave={loadData} />}
    </div>
  );
}
