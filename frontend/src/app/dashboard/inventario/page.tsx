'use client';

import { useEffect, useState, useCallback } from 'react';
import { inventarioApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { Package, Plus, Edit3, Trash2, Search, X, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  'Bultos (50 kg)',
  'Bolsas (25 kg)',
  'Kilogramos (kg)',
  'Litros (L)',
  'Galones (3.78 L)',
  'Canastillas',
  'Arrobas (@)',
  'Dosis / Frascos',
  'Toneladas (t)',
  'Unidades',
];

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
    unidad: item?.unidad || 'Bultos (50 kg)',
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
        useToastStore.getState().success('Item actualizado correctamente.');
      } else {
        await inventarioApi.create(payload);
        useToastStore.getState().success('Insumo registrado en el inventario.');
      }
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar el insumo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
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
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Nombre del insumo / producto *
              </label>
              <input
                className="input-field"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Urea 46%, Alimento Lechero 16%, Glifosato 480"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Categoría *
              </label>
              <select
                className="input-field"
                value={form.categoria}
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              >
                {Object.keys(CATEGORIAS).map((c) => (
                  <option key={c} value={c}>{CATEGORIAS[c]}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Finca / Bodega *
              </label>
              <select
                className="input-field"
                value={form.fincaId}
                onChange={(e) => setForm((f) => ({ ...f, fincaId: e.target.value }))}
                required
              >
                {fincas.map((fi) => (
                  <option key={fi.id} value={fi.id}>{fi.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Cantidad en existencia *
              </label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0"
                value={form.cantidad}
                onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Unidad de empaque / medida
              </label>
              <select
                className="input-field"
                value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Alerta de stock mínimo
              </label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={form.stockMinimo}
                onChange={(e) => setForm((f) => ({ ...f, stockMinimo: e.target.value }))}
                placeholder="Ej: 5"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Costo unitario (COP)
              </label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="100"
                value={form.costo}
                onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Proveedor o distribuidor
              </label>
              <input
                className="input-field"
                value={form.proveedor}
                onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))}
                placeholder="Ej: Agroservicios del Cesar, Monómeros, Almacén Agropecuario"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : item ? 'Actualizar Insumo' : 'Registrar Insumo'}
            </button>
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
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | number | null;
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await inventarioApi.delete(deleteModal.id);
      setItems((i) => i.filter((x) => x.id !== deleteModal.id));
      useToastStore.getState().success('Insumo eliminado del inventario.');
      setDeleteModal({ isOpen: false, id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al eliminar el insumo.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = (item: Item) => {
    setDeleteModal({
      isOpen: true,
      id: item.id,
      name: item.nombre,
      loading: false,
    });
  };

  const filtered = items.filter((i) => {
    const matchSearch =
      (i.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.proveedor || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filtroCategoria ? i.categoria === filtroCategoria : true;
    return matchSearch && matchCat;
  });

  const isBajoStock = (item: Item) => item.stockMinimo && item.cantidad <= item.stockMinimo;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Inventario de Insumos y Bodega
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {items.length} productos registrados · {alertas.length} alertas de abastecimiento
          </p>
        </div>
        <button
          onClick={() => { setEditItem(undefined); setModalOpen(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          id="btn-nuevo-item"
        >
          <Plus size={18} /> Registrar Insumo
        </button>
      </div>

      {alertas.length > 0 && (
        <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldAlert size={20} color="#f87171" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#f87171', fontSize: 14 }}>
              {alertas.length} insumo(s) con existencia crítica por debajo del stock mínimo
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
              Reabastecimiento sugerido: {(alertas as Item[]).map((a) => a.nombre).slice(0, 5).join(', ')}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar por producto o proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field"
          style={{ width: 'auto', minWidth: 200 }}
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {Object.keys(CATEGORIAS).map((c) => (
            <option key={c} value={c}>{CATEGORIAS[c]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 68, borderRadius: 12 }} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-subtle)' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
              <p>No hay insumos registrados en esta categoría</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto / Insumo</th>
                    <th>Categoría</th>
                    <th>Finca / Ubicación</th>
                    <th>Existencias</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                    <th>Proveedor</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.nombre}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {CATEGORIAS[item.categoria] || item.categoria}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {item.finca?.nombre || `Finca #${item.fincaId}`}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {item.cantidad} <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>{item.unidad}</span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {item.stockMinimo ?? '-'}
                      </td>
                      <td>
                        {isBajoStock(item) ? (
                          <span className="badge badge-danger">
                            <AlertTriangle size={11} /> Stock bajo
                          </span>
                        ) : (
                          <span className="badge badge-success">Abastecido</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {item.proveedor || '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setEditItem(item); setModalOpen(true); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
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

      {modalOpen && (
        <ItemModal
          item={editItem}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}

      {/* Modal Confirmación Eliminación Insumo */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar insumo del inventario?"
        itemName={deleteModal.name}
        description="Esta acción eliminará permanentemente el registro de este insumo de la bodega. Esta acción no se puede deshacer."
        loading={deleteModal.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
