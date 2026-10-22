'use client';

import { useEffect, useState, useCallback } from 'react';
import { inventarioApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  Package, Plus, Edit3, Trash2, Search, X, AlertTriangle,
  ShieldAlert, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  TrendingDown, TrendingUp, Boxes,
} from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';

interface Item {
  id: string | number;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  stockMinimo?: number;
  costo?: number;
  proveedor?: string;
  fincaId: string | number;
  finca?: { id: string | number; nombre: string };
}

interface Finca {
  id: string | number;
  nombre: string;
}

const CATEGORIAS: Record<string, string> = {
  FERTILIZANTE: 'Fertilizantes y Abonos',
  SEMILLA: 'Semillas y Material Vegetal',
  PESTICIDA: 'Pesticidas y Fitosanitarios',
  HERRAMIENTA: 'Herramientas y Equipos',
  COMBUSTIBLE: 'Combustibles y Lubricantes',
  MEDICAMENTO: 'Medicamentos y Biológicos',
  ALIMENTO: 'Alimentos y Concentrados',
  OTRO: 'Otros Insumos',
};

const UNIDADES = [
  'Bultos (50 kg)', 'Bolsas (25 kg)', 'Kilogramos (kg)', 'Litros (L)',
  'Galones (3.78 L)', 'Canastillas', 'Arrobas (@)', 'Dosis / Frascos',
  'Toneladas (t)', 'Unidades',
];

const CAT_COLORS: Record<string, string> = {
  FERTILIZANTE: '#10b981', SEMILLA: '#0ea5e9', PESTICIDA: '#f59e0b',
  HERRAMIENTA: '#8b5cf6', COMBUSTIBLE: '#f97316', MEDICAMENTO: '#ec4899',
  ALIMENTO: '#84cc16', OTRO: '#94a3b8',
};

// ─── Modal Ajuste de Stock (Entrada / Salida) ──────────────────────────────────

function AjusteModal({
  item,
  onClose,
  onSave,
}: {
  item: Item;
  onClose: () => void;
  onSave: () => void;
}) {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const motivosEntrada = ['Compra a proveedor', 'Devolución', 'Transferencia entre fincas', 'Ajuste de inventario', 'Donación / Regalo'];
  const motivosSalida = ['Aplicación en campo', 'Vencimiento / Pérdida', 'Uso en producción', 'Transferencia entre fincas', 'Ajuste de inventario'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) {
      useToastStore.getState().warning('Ingresa una cantidad válida mayor a 0.');
      return;
    }
    if (tipo === 'SALIDA' && cant > item.cantidad) {
      useToastStore.getState().warning(`No puedes retirar más de ${item.cantidad} ${item.unidad} disponibles.`);
      return;
    }
    setLoading(true);
    try {
      const nuevaCantidad = tipo === 'ENTRADA' ? item.cantidad + cant : item.cantidad - cant;
      await inventarioApi.patchQuantity(item.id, nuevaCantidad);
      useToastStore.getState().success(
        tipo === 'ENTRADA'
          ? `Entrada registrada: +${cant} ${item.unidad}. Stock actual: ${nuevaCantidad} ${item.unidad}.`
          : `Salida registrada: -${cant} ${item.unidad}. Stock actual: ${nuevaCantidad} ${item.unidad}.`
      );
      onSave();
      onClose();
    } catch (err: any) {
      useToastStore.getState().error(err.response?.data?.message || 'Error al registrar el movimiento.');
    } finally {
      setLoading(false);
    }
  };

  const nuevaCantidad = cantidad
    ? tipo === 'ENTRADA'
      ? item.cantidad + parseFloat(cantidad || '0')
      : item.cantidad - parseFloat(cantidad || '0')
    : null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
              Ajustar Stock
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.nombre}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Stock actual */}
        <div style={{ padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Stock actual</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
            {item.cantidad} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>{item.unidad}</span>
          </span>
        </div>

        {/* Selector Entrada / Salida */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setTipo('ENTRADA')}
            style={{
              padding: '10px', borderRadius: 10, border: `2px solid ${tipo === 'ENTRADA' ? '#10b981' : 'var(--color-border)'}`,
              background: tipo === 'ENTRADA' ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: tipo === 'ENTRADA' ? '#10b981' : 'var(--color-text-muted)',
              cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ArrowUpCircle size={16} /> Entrada
          </button>
          <button
            type="button"
            onClick={() => setTipo('SALIDA')}
            style={{
              padding: '10px', borderRadius: 10, border: `2px solid ${tipo === 'SALIDA' ? '#f87171' : 'var(--color-border)'}`,
              background: tipo === 'SALIDA' ? 'rgba(239,68,68,0.1)' : 'transparent',
              color: tipo === 'SALIDA' ? '#f87171' : 'var(--color-text-muted)',
              cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <ArrowDownCircle size={16} /> Salida
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Cantidad a {tipo === 'ENTRADA' ? 'ingresar' : 'retirar'} ({item.unidad}) *
            </label>
            <input
              className="input-field"
              type="number"
              min="0.01"
              step="0.01"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder={`Ej: 10`}
              required
              autoFocus
            />
            {/* Preview de resultado */}
            {nuevaCantidad !== null && (
              <div style={{ marginTop: 6, fontSize: 12, color: nuevaCantidad < 0 ? '#f87171' : nuevaCantidad <= (item.stockMinimo || 0) ? '#fbbf24' : '#10b981', fontWeight: 600 }}>
                {nuevaCantidad < 0
                  ? `⚠ Cantidad insuficiente (quedaría ${nuevaCantidad.toFixed(2)})`
                  : `Nuevo stock: ${nuevaCantidad.toFixed(2)} ${item.unidad}`}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Motivo del movimiento
            </label>
            <select
              className="input-field"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            >
              <option value="">— Seleccionar motivo —</option>
              {(tipo === 'ENTRADA' ? motivosEntrada : motivosSalida).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (nuevaCantidad !== null && nuevaCantidad < 0)}
              style={{ background: tipo === 'ENTRADA' ? '#10b981' : '#ef4444', borderColor: tipo === 'ENTRADA' ? '#10b981' : '#ef4444' }}
            >
              {loading ? 'Guardando...' : tipo === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Salida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Crear / Editar Insumo ──────────────────────────────────────────────

function ItemModal({
  item,
  fincas,
  onClose,
  onSave,
}: {
  item?: Item;
  fincas: Finca[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    nombre: item?.nombre || '',
    categoria: item?.categoria || 'FERTILIZANTE',
    cantidad: item?.cantidad?.toString() || '',
    unidad: item?.unidad || 'Kilogramos (kg)',
    stockMinimo: item?.stockMinimo?.toString() || '5',
    costo: item?.costo?.toString() || '',
    proveedor: item?.proveedor || '',
    fincaId: item?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      useToastStore.getState().warning('El nombre del producto es obligatorio.');
      return;
    }
    if (!form.cantidad || parseFloat(form.cantidad) < 0) {
      useToastStore.getState().warning('Ingresa una cantidad válida.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        cantidad: parseFloat(form.cantidad),
        fincaId: form.fincaId,
        stockMinimo: form.stockMinimo ? parseFloat(form.stockMinimo) : undefined,
        costo: form.costo ? parseFloat(form.costo) : undefined,
      };
      if (item) {
        await inventarioApi.update(item.id, payload);
        useToastStore.getState().success('Insumo actualizado correctamente.');
      } else {
        await inventarioApi.create(payload);
        useToastStore.getState().success('Insumo registrado en el inventario.');
      }
      onSave();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar el insumo en el inventario.';
      useToastStore.getState().error(msg);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 } as const;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {item ? 'Editar Insumo' : 'Nuevo Insumo en Bodega'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nombre del insumo / producto *</label>
              <input className="input-field" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Urea 46%, Alimento Lechero 16%, Glifosato 480" required />
            </div>

            <div>
              <label style={labelStyle}>Categoría *</label>
              <select className="input-field" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {Object.keys(CATEGORIAS).map(c => (<option key={c} value={c}>{CATEGORIAS[c]}</option>))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Finca / Bodega *</label>
              <select className="input-field" value={form.fincaId} onChange={e => setForm(f => ({ ...f, fincaId: e.target.value }))} required>
                {fincas.map(fi => (<option key={fi.id} value={fi.id}>{fi.nombre}</option>))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Cantidad en existencia *</label>
              <input className="input-field" type="number" step="0.01" min="0" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} placeholder="0.00" required />
            </div>

            <div>
              <label style={labelStyle}>Unidad de medida</label>
              <select className="input-field" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                {UNIDADES.map(u => (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Alerta de stock mínimo</label>
              <input className="input-field" type="number" min="0" value={form.stockMinimo} onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))} placeholder="Ej: 5" />
            </div>

            <div>
              <label style={labelStyle}>Costo unitario (COP)</label>
              <input className="input-field" type="number" min="0" step="100" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="0" />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Proveedor o distribuidor</label>
              <input className="input-field" value={form.proveedor} onChange={e => setForm(f => ({ ...f, proveedor: e.target.value }))} placeholder="Ej: Agroservicios del Cesar, Monómeros, Almacén Agropecuario" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : item ? 'Actualizar Insumo' : 'Registrar Insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function InventarioPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [alertas, setAlertas] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | undefined>();
  const [ajusteItem, setAjusteItem] = useState<Item | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean; id: string | number | null; name: string; loading: boolean;
  }>({ isOpen: false, id: null, name: '', loading: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, fincasRes, alertasRes] = await Promise.allSettled([
        inventarioApi.getAll(),
        fincasApi.getAll(),
        inventarioApi.alertas(),
      ]);
      if (itemsRes.status === 'fulfilled') setItems(itemsRes.value.data || []);
      if (fincasRes.status === 'fulfilled') setFincas(fincasRes.value.data || []);
      if (alertasRes.status === 'fulfilled') setAlertas(alertasRes.value.data || []);
    } catch {
      useToastStore.getState().error('Error al cargar inventario.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await inventarioApi.delete(deleteModal.id);
      setItems(i => i.filter(x => x.id !== deleteModal.id));
      useToastStore.getState().success('Insumo eliminado del inventario.');
      setDeleteModal({ isOpen: false, id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al eliminar el insumo.');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const filtered = items.filter(i => {
    const matchSearch =
      (i.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.proveedor || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filtroCategoria ? i.categoria === filtroCategoria : true;
    return matchSearch && matchCat;
  });

  const isBajoStock = (item: Item) => item.stockMinimo != null && item.cantidad <= item.stockMinimo;

  // Resumen KPI
  const totalItems = items.length;
  const totalBajoStock = alertas.length;
  const totalValor = items.reduce((s, i) => s + (i.cantidad * (i.costo || 0)), 0);
  const formatCOP = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Inventario de Insumos</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {totalItems} productos registrados · {alertas.length} alertas de abastecimiento
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => { setEditItem(undefined); setModalOpen(true); }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Registrar Insumo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Boxes size={18} color="#0ea5e9" />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Total productos</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)' }}>{totalItems}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px', borderColor: totalBajoStock > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TrendingDown size={18} color={totalBajoStock > 0 ? '#f87171' : '#10b981'} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Stock bajo</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: totalBajoStock > 0 ? '#f87171' : '#10b981' }}>{totalBajoStock}</div>
        </div>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TrendingUp size={18} color="#10b981" />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Valor estimado</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{formatCOP(totalValor)}</div>
        </div>
      </div>

      {/* Alerta crítica */}
      {alertas.length > 0 && (
        <div className="alert-inline alert-inline-danger" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldAlert size={20} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {alertas.length} insumo(s) con existencia crítica por debajo del stock mínimo
            </div>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
              {(alertas as Item[]).map(a => a.nombre).slice(0, 5).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Buscar por producto o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ width: 'auto', minWidth: 200 }} value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {Object.keys(CATEGORIAS).map(c => (<option key={c} value={c}>{CATEGORIAS[c]}</option>))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (<div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-subtle)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>No hay insumos registrados en esta categoría</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Haz clic en "Registrar Insumo" para agregar el primero.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto / Insumo</th>
                    <th>Categoría</th>
                    <th>Finca / Bodega</th>
                    <th>Existencias</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                    <th>Proveedor</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} style={{ background: isBajoStock(item) ? 'rgba(239,68,68,0.03)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[item.categoria] || '#94a3b8', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.nombre}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {CATEGORIAS[item.categoria] || item.categoria}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {item.finca?.nombre || `Finca #${item.fincaId}`}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: isBajoStock(item) ? '#f87171' : 'var(--color-text)', fontSize: 15 }}>
                          {item.cantidad}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{item.unidad}</span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {item.stockMinimo != null ? `${item.stockMinimo} ${item.unidad}` : '—'}
                      </td>
                      <td>
                        {isBajoStock(item) ? (
                          <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={11} /> Stock bajo
                          </span>
                        ) : (
                          <span className="badge badge-success">Abastecido</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {item.proveedor || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          {/* Entrada */}
                          <button
                            onClick={() => setAjusteItem(item)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 6, borderRadius: 8 }}
                            title="Registrar entrada / salida de stock"
                          >
                            <ArrowUpCircle size={15} />
                          </button>
                          <button
                            onClick={() => { setEditItem(item); setModalOpen(true); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, id: item.id, name: item.nombre, loading: false })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}
                            title="Eliminar"
                          >
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
        </div>
      )}

      {/* Modales */}
      {modalOpen && (
        <ItemModal
          item={editItem}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}

      {ajusteItem && (
        <AjusteModal
          item={ajusteItem}
          onClose={() => setAjusteItem(null)}
          onSave={loadData}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar insumo del inventario?"
        itemName={deleteModal.name}
        description="Esta acción eliminará permanentemente el registro de este insumo de la bodega. No se puede deshacer."
        loading={deleteModal.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
