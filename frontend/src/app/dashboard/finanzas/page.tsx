'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { finanzasApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  DollarSign, Plus, Trash2, Edit3, Search, X, TrendingUp, TrendingDown, BarChart3,
  PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Layers, Calendar
 } from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

function TransaccionModal({
  transaccion,
  fincas,
  producciones,
  onClose,
  onSave,
}: {
  transaccion?: Transaccion | null;
  fincas: Finca[];
  producciones: Produccion[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    tipo: transaccion?.tipo || 'INGRESO',
    categoria: transaccion?.categoria || '',
    monto: transaccion?.monto != null ? String(transaccion.monto) : '',
    descripcion: transaccion?.descripcion || '',
    fecha: transaccion?.fecha ? new Date(transaccion.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    fincaId: transaccion?.fincaId != null ? String(transaccion.fincaId) : '',
    produccionId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaccion) {
      setForm({
        tipo: transaccion.tipo || 'INGRESO',
        categoria: transaccion.categoria || '',
        monto: transaccion.monto != null ? String(transaccion.monto) : '',
        descripcion: transaccion.descripcion || '',
        fecha: transaccion.fecha ? new Date(transaccion.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fincaId: transaccion.fincaId != null ? String(transaccion.fincaId) : '',
        produccionId: '',
      });
    }
  }, [transaccion]);

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
      const payload = {
        ...form,
        monto: parseFloat(form.monto),
        fincaId: form.fincaId || undefined,
        produccionId: form.produccionId || undefined,
      };

      if (transaccion) {
        await finanzasApi.update(transaccion.id, payload);
        useToastStore.getState().success('Transacción actualizada exitosamente.');
      } else {
        await finanzasApi.create(payload);
        useToastStore.getState().success('Transacción registrada exitosamente.');
      }
      onSave();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar la transacción';
      setError(msg);
      useToastStore.getState().error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {transaccion ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : transaccion ? 'Actualizar Transacción' : 'Registrar'}
            </button>
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
  const [editingTransaccion, setEditingTransaccion] = useState<Transaccion | null>(null);
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

  const [graficoVista, setGraficoVista] = useState<'flujo' | 'categorias' | 'fincas'>('flujo');
  const [categoriaSubtipo, setCategoriaSubtipo] = useState<'GASTO' | 'INGRESO'>('GASTO');

  // Calculate dynamic balance and advanced KPIs
  const resumen = useMemo(() => {
    let totalIngresos = 0;
    let totalGastos = 0;
    let countIngresos = 0;
    let countGastos = 0;
    const gastosPorCat: Record<string, number> = {};

    filtered.forEach(t => {
      if (t.tipo === 'INGRESO') {
        totalIngresos += t.monto;
        countIngresos++;
      } else {
        totalGastos += t.monto;
        countGastos++;
        gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + t.monto;
      }
    });

    const balance = totalIngresos - totalGastos;
    const margenRentabilidad = totalIngresos > 0 ? Math.round((balance / totalIngresos) * 100) : 0;

    let mayorGastoCat = 'Sin gastos';
    let mayorGastoMonto = 0;
    Object.entries(gastosPorCat).forEach(([cat, val]) => {
      if (val > mayorGastoMonto) {
        mayorGastoMonto = val;
        mayorGastoCat = cat;
      }
    });

    return {
      totalIngresos,
      totalGastos,
      balance,
      countIngresos,
      countGastos,
      margenRentabilidad,
      mayorGastoCat,
      mayorGastoMonto,
    };
  }, [filtered]);

  // Evolución mensual para AreaChart
  const monthlyData = useMemo(() => {
    const map: Record<string, { ingresos: number; gastos: number }> = {};
    filtered.forEach(t => {
      const d = new Date(t.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) {
        map[key] = { ingresos: 0, gastos: 0 };
      }
      if (t.tipo === 'INGRESO') {
        map[key].ingresos += t.monto;
      } else {
        map[key].gastos += t.monto;
      }
    });

    const keys = Object.keys(map).sort();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return keys.map(k => {
      const [year, month] = k.split('-');
      const mesLabel = `${monthNames[parseInt(month, 10) - 1]} ${year.slice(2)}`;
      const ing = map[k].ingresos;
      const gas = map[k].gastos;
      return {
        mes: mesLabel,
        ingresos: ing,
        gastos: gas,
        balance: ing - gas,
      };
    });
  }, [filtered]);

  // Distribución por categoría para Donut Chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered
      .filter(t => t.tipo === categoriaSubtipo)
      .forEach(t => {
        map[t.categoria] = (map[t.categoria] || 0) + t.monto;
      });

    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Math.round((value / total) * 100) : 0,
      }));
  }, [filtered, categoriaSubtipo]);

  // Rendimiento por Finca
  const fincaData = useMemo(() => {
    const map: Record<string, { nombre: string; ingresos: number; gastos: number }> = {};
    filtered.forEach(t => {
      const fincaName = t.finca?.nombre || (t.fincaId ? `Finca #${t.fincaId}` : 'General');
      if (!map[fincaName]) {
        map[fincaName] = { nombre: fincaName, ingresos: 0, gastos: 0 };
      }
      if (t.tipo === 'INGRESO') {
        map[fincaName].ingresos += t.monto;
      } else {
        map[fincaName].gastos += t.monto;
      }
    });
    return Object.values(map);
  }, [filtered]);

  const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16'];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Finanzas</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Control inteligente de ingresos, gastos y rentabilidad</p>
        </div>
        <button onClick={() => { setEditingTransaccion(null); setModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} id="btn-nueva-transaccion">
          <Plus size={18} /> Nueva Transacción
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        {/* Total Ingresos */}
        <div className="card stat-card-green" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Ingresos</span>
            <div className="stat-icon-green" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="#4ade80" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>{formatCOP(resumen.totalIngresos)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpRight size={14} color="#4ade80" />
            <span>{resumen.countIngresos} registros de ingreso</span>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="card stat-card-red" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Gastos</span>
            <div className="stat-icon-red" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={18} color="#f87171" />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>{formatCOP(resumen.totalGastos)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowDownRight size={14} color="#f87171" />
            <span>{resumen.countGastos} registros de gasto</span>
          </div>
        </div>

        {/* Balance Neto */}
        <div className={`card stat-card-${resumen.balance >= 0 ? 'green' : 'red'}`} style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Balance Neto</span>
            <div className={`stat-icon-${resumen.balance >= 0 ? 'blue' : 'amber'}`} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color={resumen.balance >= 0 ? '#38bdf8' : '#fbbf24'} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: resumen.balance >= 0 ? '#4ade80' : '#f87171', marginBottom: 4 }}>
            {formatCOP(resumen.balance)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
            Margen estimado: <strong style={{ color: resumen.margenRentabilidad >= 0 ? '#4ade80' : '#f87171' }}>{resumen.margenRentabilidad}%</strong>
          </div>
        </div>

        {/* Mayor Centro de Costo */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Mayor Gasto</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} color="#a78bfa" />
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={resumen.mayorGastoCat}>
            {resumen.mayorGastoCat}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
            {resumen.mayorGastoMonto > 0 ? formatCOP(resumen.mayorGastoMonto) : 'Sin registros'}
          </div>
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

      {/* Advanced Charts Section */}
      <div className="card" style={{ padding: '24px', marginBottom: 24 }}>
        {/* Chart Header & Tab Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={20} color="#4ade80" />
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Análisis Gráfico Financiero</h3>
          </div>

          <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 3, borderRadius: 10, border: '1px solid var(--color-border)', gap: 4 }}>
            <button
              onClick={() => setGraficoVista('flujo')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: graficoVista === 'flujo' ? 'var(--color-primary)' : 'transparent',
                color: graficoVista === 'flujo' ? 'white' : 'var(--color-text-muted)',
              }}
            >
              Flujo Temporal
            </button>
            <button
              onClick={() => setGraficoVista('categorias')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: graficoVista === 'categorias' ? 'var(--color-primary)' : 'transparent',
                color: graficoVista === 'categorias' ? 'white' : 'var(--color-text-muted)',
              }}
            >
              Por Categorías
            </button>
            {fincas.length > 0 && (
              <button
                onClick={() => setGraficoVista('fincas')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: graficoVista === 'fincas' ? 'var(--color-primary)' : 'transparent',
                  color: graficoVista === 'fincas' ? 'white' : 'var(--color-text-muted)',
                }}
              >
                Por Finca
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Evolución de Flujo Mensual (AreaChart) */}
        {graficoVista === 'flujo' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Comparativa mensual de ingresos, gastos y margen neto a lo largo del tiempo.
              </p>
            </div>
            {monthlyData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-subtle)', fontSize: 13 }}>
                No hay suficientes datos registrados para trazar la línea de tiempo.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ingresosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gastosGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                    formatter={(v: any, name: any) => [formatCOP(Number(v || 0)), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="Ingresos"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ingresosGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    name="Gastos"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#gastosGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Tab 2: Distribución por Categorías (Donut + Ranking) */}
        {graficoVista === 'categorias' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Distribución porcentual de {categoriaSubtipo === 'GASTO' ? 'los costos operativos' : 'las fuentes de ingreso'}.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setCategoriaSubtipo('GASTO')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: categoriaSubtipo === 'GASTO' ? 'rgba(239,68,68,0.2)' : 'var(--color-surface-2)',
                    color: categoriaSubtipo === 'GASTO' ? '#f87171' : 'var(--color-text-muted)',
                  }}
                >
                  Gastos
                </button>
                <button
                  type="button"
                  onClick={() => setCategoriaSubtipo('INGRESO')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: categoriaSubtipo === 'INGRESO' ? 'rgba(16,185,129,0.2)' : 'var(--color-surface-2)',
                    color: categoriaSubtipo === 'INGRESO' ? '#4ade80' : 'var(--color-text-muted)',
                  }}
                >
                  Ingresos
                </button>
              </div>
            </div>

            {categoryData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-subtle)', fontSize: 13 }}>
                No hay transacciones registradas para este tipo.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#f8fafc',
                        fontSize: 12,
                      }}
                      formatter={(v: any) => formatCOP(Number(v || 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Ranked List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 250, overflowY: 'auto', paddingRight: 8 }}>
                  {categoryData.map((cat, idx) => (
                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: PIE_COLORS[idx % PIE_COLORS.length],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: 'var(--color-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cat.name}>
                          {cat.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{formatCOP(cat.value)}</span>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            background: 'var(--color-surface-2)',
                            color: PIE_COLORS[idx % PIE_COLORS.length],
                          }}
                        >
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Rendimiento por Finca (BarChart) */}
        {graficoVista === 'fincas' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Comparativa de ingresos y gastos distribuidos por predio o unidad productiva.
            </p>
            {fincaData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-subtle)', fontSize: 13 }}>
                No hay movimientos asociados a fincas específicas.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fincaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      color: '#f8fafc',
                      fontSize: 12,
                    }}
                    formatter={(v: any, name: any) => [formatCOP(Number(v || 0)), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>

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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          onClick={() => {
                            setEditingTransaccion(t);
                            setModalOpen(true);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', padding: 6, borderRadius: 8 }}
                          title="Editar Transacción"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }} title="Eliminar Transacción">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalOpen && (
        <TransaccionModal
          transaccion={editingTransaccion}
          fincas={fincas}
          producciones={producciones}
          onClose={() => {
            setModalOpen(false);
            setEditingTransaccion(null);
          }}
          onSave={loadData}
        />
      )}

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
