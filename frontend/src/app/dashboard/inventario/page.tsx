'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { inventarioApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  Package, Plus, Edit3, Trash2, Search, X, AlertTriangle,
  ShieldAlert, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  TrendingDown, TrendingUp, Boxes, MapPin, Building2,
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
  finca?: { id: string | number; nombre?: string; name?: string; ubicacion?: string; location?: string };
}

interface Finca {
  id: string | number;
  nombre: string;
  ubicacion?: string;
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
  initialFincaId,
  onClose,
  onSave,
}: {
  item?: Item;
  fincas: Finca[];
  initialFincaId?: string;
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
    fincaId: item?.fincaId?.toString() || initialFincaId || fincas[0]?.id?.toString() || '',
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
    if (!form.fincaId) {
      useToastStore.getState().warning('Debes seleccionar la Finca o Bodega donde se almacena el insumo.');
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
              <label style={labelStyle}>Finca / Bodega asignada *</label>
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

// ─── Página Principal con Filtro por Finca ───────────────────────────────────

export default function InventarioPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [alertas, setAlertas] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroFinca, setFiltroFinca] = useState<string>(''); // '' = Todas las fincas
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | undefined>();
  const [ajusteItem, setAjusteItem] = useState<Item | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean; id: string | number | null; name: string; loading: boolean;
  }>({ isOpen: false, id: null, name: '', loading: false });

  // Cargar datos (soporta filtro por finca tanto en request como en memoria)
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

  // Obtener nombre seguro de la finca para cada item
  const getFincaNombre = useCallback((item: Item) => {
    if (item.finca?.nombre) return item.finca.nombre;
    if (item.finca?.name) return item.finca.name;
    const match = fincas.find(f => String(f.id) === String(item.fincaId));
    if (match) return match.nombre;
    if (item.fincaId) return `Finca #${item.fincaId}`;
    return 'Bodega Central';
  }, [fincas]);

  // Filtrado reactivo en tiempo real (por Finca, Búsqueda y Categoría)
  const filtered = useMemo(() => {
    return items.filter(i => {
      // Filtro de Finca
      const matchFinca = filtroFinca
        ? String(i.fincaId) === String(filtroFinca) || String(i.finca?.id) === String(filtroFinca)
        : true;

      // Filtro de Búsqueda
      const nombreFinca = getFincaNombre(i).toLowerCase();
      const matchSearch =
        (i.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.proveedor || '').toLowerCase().includes(search.toLowerCase()) ||
        nombreFinca.includes(search.toLowerCase());

      // Filtro de Categoría
      const matchCat = filtroCategoria ? i.categoria === filtroCategoria : true;

      return matchFinca && matchSearch && matchCat;
    });
  }, [items, filtroFinca, search, filtroCategoria, getFincaNombre]);

  // Alertas específicas para la finca seleccionada (o globales si es "")
  const alertasFiltradas = useMemo(() => {
    if (!filtroFinca) return alertas;
    return alertas.filter(a => String(a.fincaId) === String(filtroFinca) || String(a.finca?.id) === String(filtroFinca));
  }, [alertas, filtroFinca]);

  const isBajoStock = (item: Item) => item.stockMinimo != null && item.cantidad <= item.stockMinimo;

  // Resumen KPI recalculado según la Finca seleccionada
  const totalItems = filtered.length;
  const totalBajoStock = filtered.filter(isBajoStock).length;
  const totalValor = filtered.reduce((s, i) => s + (i.cantidad * (i.costo || 0)), 0);
  const formatCOP = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const fincaSeleccionadaObj = fincas.find(f => String(f.id) === String(filtroFinca));

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Inventario de Insumos
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {filtroFinca
              ? `Bodega: ${fincaSeleccionadaObj?.nombre || 'Finca seleccionada'} · ${totalItems} insumos registrados`
              : `Consolidado general · ${totalItems} productos en todas las fincas`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={loadData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            onClick={() => { setEditItem(undefined); setModalOpen(true); }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={18} /> Registrar Insumo
          </button>
        </div>
      </div>

      {/* Selector Rápido de Fincas (Pestañas / Pills superiores) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 16,
          scrollbarWidth: 'thin',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4, flexShrink: 0 }}>
          <Building2 size={15} color="var(--color-primary)" /> Bodegas:
        </span>

        {/* Botón Todas las Fincas */}
        <button
          type="button"
          onClick={() => setFiltroFinca('')}
          style={{
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            background: filtroFinca === '' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: filtroFinca === '' ? '#ffffff' : 'var(--color-text)',
            borderColor: filtroFinca === '' ? 'var(--color-primary)' : 'var(--color-border)',
            boxShadow: filtroFinca === '' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
          }}
        >
          🏢 Todas las Fincas ({items.length})
        </button>

        {/* Botones por cada finca */}
        {fincas.map(f => {
          const isActiva = String(filtroFinca) === String(f.id);
          const cantidadFinca = items.filter(it => String(it.fincaId) === String(f.id) || String(it.finca?.id) === String(f.id)).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroFinca(String(f.id))}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: isActiva ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isActiva ? '#ffffff' : 'var(--color-text)',
                borderColor: isActiva ? 'var(--color-primary)' : 'var(--color-border)',
                boxShadow: isActiva ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
              }}
            >
              <MapPin size={13} color={isActiva ? '#ffffff' : 'var(--color-primary)'} />
              <span>{f.nombre}</span>
              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: isActiva ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-2)',
                  color: isActiva ? '#ffffff' : 'var(--color-text-muted)',
                  fontWeight: 700,
                }}
              >
                {cantidadFinca}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards (Adaptadas a la finca seleccionada) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Boxes size={18} color="#0ea5e9" />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>
              {filtroFinca ? 'Insumos en bodega' : 'Total productos'}
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text)' }}>{totalItems}</div>
          {filtroFinca && (
            <div style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 4, fontWeight: 600 }}>
              ✓ Bodega: {fincaSeleccionadaObj?.nombre}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '16px 18px', borderColor: totalBajoStock > 0 ? 'rgba(239,68,68,0.4)' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TrendingDown size={18} color={totalBajoStock > 0 ? '#ef4444' : '#10b981'} />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Stock bajo / Crítico</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: totalBajoStock > 0 ? '#ef4444' : '#10b981' }}>{totalBajoStock}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {totalBajoStock > 0 ? 'Requieren compra urgente' : 'Abastecimiento en orden'}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <TrendingUp size={18} color="#10b981" />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 500 }}>Valor estimado bodega</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{formatCOP(totalValor)}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Inversión en insumos activos
          </div>
        </div>
      </div>

      {/* Alerta crítica (filtrada por finca) */}
      {alertasFiltradas.length > 0 && (
        <div className="alert-inline alert-inline-danger" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldAlert size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {alertasFiltradas.length} insumo(s) con existencia crítica por debajo del stock mínimo {filtroFinca ? `en ${fincaSeleccionadaObj?.nombre}` : ''}
            </div>
            <div style={{ fontSize: 12, marginTop: 2, opacity: 0.95 }}>
              {(alertasFiltradas as Item[]).map(a => a.nombre).slice(0, 6).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar por producto, proveedor o finca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro de Finca / Bodega en Dropdown */}
        <div style={{ minWidth: 200 }}>
          <select
            className="input-field"
            value={filtroFinca}
            onChange={e => setFiltroFinca(e.target.value)}
          >
            <option value="">🏢 Todas las fincas (Consolidado)</option>
            {fincas.map(fi => (
              <option key={fi.id} value={fi.id}>📍 {fi.nombre}</option>
            ))}
          </select>
        </div>

        {/* Filtro de Categoría */}
        <div style={{ minWidth: 190 }}>
          <select
            className="input-field"
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {Object.keys(CATEGORIAS).map(c => (
              <option key={c} value={c}>{CATEGORIAS[c]}</option>
            ))}
          </select>
        </div>

        {/* Limpiar filtros si hay alguno activo */}
        {(filtroFinca || filtroCategoria || search) && (
          <button
            type="button"
            onClick={() => { setFiltroFinca(''); setFiltroCategoria(''); setSearch(''); }}
            className="btn-secondary"
            style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
            title="Restablecer filtros"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla de Insumos */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (<div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-subtle)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: 15 }}>
                No hay insumos registrados {filtroFinca ? `en ${fincaSeleccionadaObj?.nombre}` : 'con los filtros actuales'}
              </p>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                {filtroFinca
                  ? `Haz clic en "Registrar Insumo" para almacenar productos en la bodega de ${fincaSeleccionadaObj?.nombre}.`
                  : 'Haz clic en "Registrar Insumo" para agregar el primero.'}
              </p>
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
                  {filtered.map(item => {
                    const fincaNombre = getFincaNombre(item);
                    const bajoStock = isBajoStock(item);

                    return (
                      <tr key={item.id} style={{ background: bajoStock ? 'rgba(239,68,68,0.03)' : undefined }}>
                        {/* Nombre del insumo */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: CAT_COLORS[item.categoria] || '#94a3b8', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.nombre}</div>
                              {item.costo ? (
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                  {formatCOP(item.costo)} / {item.unidad}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          {CATEGORIAS[item.categoria] || item.categoria}
                        </td>

                        {/* Finca / Bodega asignada */}
                        <td>
                          <div
                            onClick={() => {
                              if (item.fincaId) setFiltroFinca(String(item.fincaId));
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 8px',
                              borderRadius: 8,
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                            }}
                            title="Filtrar por esta finca"
                          >
                            <MapPin size={12} />
                            <span>{fincaNombre}</span>
                          </div>
                        </td>

                        {/* Existencias */}
                        <td>
                          <span style={{ fontWeight: 700, color: bajoStock ? '#ef4444' : 'var(--color-text)', fontSize: 15 }}>
                            {item.cantidad}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 4 }}>{item.unidad}</span>
                        </td>

                        {/* Stock Mínimo */}
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          {item.stockMinimo != null ? `${item.stockMinimo} ${item.unidad}` : '—'}
                        </td>

                        {/* Estado de Abastecimiento */}
                        <td>
                          {bajoStock ? (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={11} /> Stock bajo
                            </span>
                          ) : (
                            <span className="badge badge-success">Abastecido</span>
                          )}
                        </td>

                        {/* Proveedor */}
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                          {item.proveedor || '—'}
                        </td>

                        {/* Acciones */}
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {/* Ajuste de Stock (Entrada / Salida) */}
                            <button
                              onClick={() => setAjusteItem(item)}
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Registrar entrada o salida física de bodega"
                            >
                              <Boxes size={13} /> Ajustar
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => { setEditItem(item); setModalOpen(true); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 6 }}
                              title="Editar producto"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, id: item.id, name: item.nombre, loading: false })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 6 }}
                              title="Eliminar insumo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Ajuste Entrada / Salida */}
      {ajusteItem && (
        <AjusteModal
          item={ajusteItem}
          onClose={() => setAjusteItem(null)}
          onSave={loadData}
        />
      )}

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <ItemModal
          item={editItem}
          fincas={fincas}
          initialFincaId={filtroFinca || undefined}
          onClose={() => { setModalOpen(false); setEditItem(undefined); }}
          onSave={loadData}
        />
      )}

      {/* Modal Eliminar */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar insumo del inventario?"
        itemName={deleteModal.name}
        description="Esta acción eliminará el producto y su historial de existencia de la bodega seleccionada."
        loading={deleteModal.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
