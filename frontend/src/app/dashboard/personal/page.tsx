'use client';

import { useEffect, useState, useCallback } from 'react';
import { personalApi, fincasApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { Users, Plus, Edit3, Trash2, Search, X, Phone, Briefcase, MapPin, Eye, Calendar, DollarSign, FileText } from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';

interface Personal {
  id: string | number;
  nombre: string;
  cargo: string;
  salario?: number;
  telefono?: string;
  tipoContrato?: string;
  fechaIngreso?: string;
  fincaId: string | number;
  finca?: { id: string | number; nombre: string };
}

interface Finca {
  id: string | number;
  nombre: string;
}

const CARGOS_SUGERIDOS = [
  'Mayordomo general',
  'Administrador de finca',
  'Operario de campo / Jornalero',
  'Tractorista / Maquinista',
  'Ordeñador / Vaquero',
  'Encargado de lote / Capataz',
  'Técnico agrónomo',
  'Veterinario de planta',
];

const CONTRATO_LABELS: Record<string, string> = {
  TERMINO_FIJO: 'Término Fijo',
  INDEFINIDO: 'Término Indefinido',
  OBRA_LABOR: 'Por Obra o Labor',
  TEMPORAL: 'Jornal Diario / Temporal',
};

// ─── Modal Detalle / Ficha del Colaborador ────────────────────────────────────

function DetallModal({
  persona,
  canSeeSalary,
  onClose,
  onEdit,
}: {
  persona: Personal;
  canSeeSalary: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const formatDate = (d?: string) => {
    if (!d) return 'No registrada';
    try { return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return d; }
  };

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>Ficha del Colaborador</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Avatar + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '16px', background: 'rgba(16,185,129,0.06)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {persona.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{persona.nombre}</div>
            <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>{persona.cargo}</div>
            <span className={`badge ${persona.tipoContrato === 'INDEFINIDO' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 11, marginTop: 4 }}>
              {CONTRATO_LABELS[persona.tipoContrato || ''] || persona.tipoContrato}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Row icon={<MapPin size={15} />} label="Finca / Predio asignado" value={persona.finca?.nombre || `Finca #${persona.fincaId}`} />
          <Row icon={<Phone size={15} />} label="Teléfono de contacto" value={persona.telefono || 'No registrado'} />
          <Row icon={<Calendar size={15} />} label="Fecha de ingreso" value={formatDate(persona.fechaIngreso)} />
          <Row icon={<FileText size={15} />} label="Modalidad de contrato" value={CONTRATO_LABELS[persona.tipoContrato || ''] || persona.tipoContrato || 'No especificado'} />
          {canSeeSalary && (
            <Row icon={<DollarSign size={15} />} label="Salario mensual (COP)" value={persona.salario ? formatCOP(persona.salario) : 'No especificado'} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
          <button onClick={onEdit} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit3 size={14} /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Formulario ─────────────────────────────────────────────────────────

function PersonalModal({
  persona,
  fincas,
  canSeeSalary,
  onClose,
  onSave,
}: {
  persona?: Personal;
  fincas: Finca[];
  canSeeSalary: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    nombre: persona?.nombre || '',
    cargo: persona?.cargo || 'Operario de campo / Jornalero',
    salario: persona?.salario?.toString() || '',
    telefono: persona?.telefono || '',
    tipoContrato: persona?.tipoContrato || 'TERMINO_FIJO',
    fechaIngreso: persona?.fechaIngreso?.split('T')[0] || new Date().toISOString().split('T')[0],
    fincaId: persona?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      useToastStore.getState().warning('El nombre del colaborador es obligatorio.');
      return;
    }
    if (!form.fincaId) {
      useToastStore.getState().warning('Debe asignar una finca o predio.');
      return;
    }

    setLoading(true);
    try {
      const p = {
        ...form,
        fincaId: form.fincaId,
        salario: form.salario ? parseFloat(form.salario) : undefined,
      };
      if (persona) {
        await personalApi.update(persona.id, p);
        useToastStore.getState().success('Empleado actualizado correctamente.');
      } else {
        await personalApi.create(p);
        useToastStore.getState().success('Empleado registrado exitosamente.');
      }
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar los datos del empleado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {persona ? 'Editar Colaborador' : 'Nuevo Colaborador de Campo'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Nombre completo *
              </label>
              <input
                className="input-field"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre y apellidos"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Cargo o Función *
              </label>
              <input
                className="input-field"
                list="cargos-list"
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                placeholder="Seleccionar o escribir..."
                required
              />
              <datalist id="cargos-list">
                {CARGOS_SUGERIDOS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Finca / Predio de labor *
              </label>
              <select
                className="input-field"
                value={form.fincaId}
                onChange={(e) => setForm((f) => ({ ...f, fincaId: e.target.value }))}
                required
              >
                <option value="">— Seleccionar predio —</option>
                {fincas.map((fi) => (
                  <option key={fi.id} value={fi.id}>{fi.nombre}</option>
                ))}
              </select>
            </div>

            {canSeeSalary && (
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Salario mensual (COP)
                </label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  step="10000"
                  value={form.salario}
                  onChange={(e) => setForm((f) => ({ ...f, salario: e.target.value }))}
                  placeholder="0"
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Teléfono de contacto
              </label>
              <input
                className="input-field"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="Ej: 3101234567"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Modalidad de contrato
              </label>
              <select
                className="input-field"
                value={form.tipoContrato}
                onChange={(e) => setForm((f) => ({ ...f, tipoContrato: e.target.value }))}
              >
                <option value="TERMINO_FIJO">Término Fijo</option>
                <option value="INDEFINIDO">Término Indefinido</option>
                <option value="OBRA_LABOR">Por Obra o Labor (Cosecha/Lote)</option>
                <option value="TEMPORAL">Jornal Diario / Temporal</option>
              </select>
            </div>

            <div style={{ gridColumn: canSeeSalary ? 'span 1' : 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Fecha de ingreso
              </label>
              <input
                className="input-field"
                type="date"
                value={form.fechaIngreso}
                onChange={(e) => setForm((f) => ({ ...f, fechaIngreso: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : persona ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function PersonalPage() {
  const { user } = useAuthStore();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFinca, setFilterFinca] = useState('ALL');
  const [filterCargo, setFilterCargo] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editPersona, setEditPersona] = useState<Personal | undefined>();
  const [detallePersona, setDetallePersona] = useState<Personal | undefined>();
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

  // RBAC: solo PROPIETARIO, ADMIN, SUPERADMIN, CONTADOR pueden ver salario
  const canSeeSalary = ['PROPIETARIO', 'ADMIN', 'SUPERADMIN', 'CONTADOR'].includes(user?.rol ?? '');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, fRes] = await Promise.all([personalApi.getAll(), fincasApi.getAll()]);
      setPersonal(pRes.data || []);
      setFincas(fRes.data || []);
    } catch {
      useToastStore.getState().error('Error al cargar la lista de personal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDeletePersonal = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await personalApi.delete(deleteModal.id);
      setPersonal((p) => p.filter((x) => x.id !== deleteModal.id));
      useToastStore.getState().success('Colaborador eliminado.');
      setDeleteModal({ isOpen: false, id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al eliminar colaborador.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = (p: Personal) => {
    setDeleteModal({
      isOpen: true,
      id: p.id,
      name: `${p.nombre} (${p.cargo})`,
      loading: false,
    });
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  // Cargos únicos para el filtro
  const cargosUnicos = Array.from(new Set(personal.map((p) => p.cargo).filter(Boolean)));

  const filtered = personal.filter((p) => {
    const matchSearch =
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.cargo.toLowerCase().includes(search.toLowerCase());
    const matchFinca = filterFinca === 'ALL' || String(p.fincaId) === filterFinca || String(p.finca?.id) === filterFinca;
    const matchCargo = filterCargo === 'ALL' || p.cargo === filterCargo;
    return matchSearch && matchFinca && matchCargo;
  });

  const totalNomina = personal.reduce((sum, p) => sum + (p.salario || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Personal y Mano de Obra
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {personal.length} colaboradores
            {canSeeSalary && ` · Nómina mensual estimada: ${formatCOP(totalNomina)}`}
          </p>
        </div>
        <button
          onClick={() => { setEditPersona(undefined); setModalOpen(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> Agregar Colaborador
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Búsqueda */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nombre o cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro Finca */}
        <select
          className="input-field"
          style={{ flex: '1 1 160px', maxWidth: 220 }}
          value={filterFinca}
          onChange={(e) => setFilterFinca(e.target.value)}
        >
          <option value="ALL">Todas las fincas</option>
          {fincas.map((f) => (
            <option key={f.id} value={String(f.id)}>{f.nombre}</option>
          ))}
        </select>

        {/* Filtro Cargo */}
        <select
          className="input-field"
          style={{ flex: '1 1 160px', maxWidth: 220 }}
          value={filterCargo}
          onChange={(e) => setFilterCargo(e.target.value)}
        >
          <option value="ALL">Todos los cargos</option>
          {cargosUnicos.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Reset filtros */}
        {(filterFinca !== 'ALL' || filterCargo !== 'ALL' || search) && (
          <button
            onClick={() => { setFilterFinca('ALL'); setFilterCargo('ALL'); setSearch(''); }}
            style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <X size={13} /> Limpiar
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap' }}>
          {filtered.length} / {personal.length} colaboradores
        </div>
      </div>

      {/* Grid de Tarjetas */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-subtle)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {personal.length === 0 ? 'No hay colaboradores registrados' : 'Sin resultados para los filtros aplicados'}
          </p>
          {personal.length > 0 && (
            <button
              onClick={() => { setFilterFinca('ALL'); setFilterCargo('ALL'); setSearch(''); }}
              style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((p) => (
            <div key={p.id} className="card glass-hover" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setDetallePersona(p)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetallePersona(p); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                    title="Ver ficha"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditPersona(p); setModalOpen(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                    title="Editar"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: 'var(--color-text)' }}>
                {p.nombre}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Briefcase size={13} color="var(--color-text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.cargo}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <MapPin size={13} color="var(--color-text-muted)" />
                <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                  {p.finca?.nombre || 'Predio asignado'}
                </span>
              </div>

              {p.telefono && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Phone size={13} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{p.telefono}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <span className={`badge ${p.tipoContrato === 'INDEFINIDO' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 11 }}>
                  {CONTRATO_LABELS[p.tipoContrato || ''] || p.tipoContrato?.replace('_', ' ')}
                </span>
                {canSeeSalary && p.salario ? (
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                    {formatCOP(p.salario)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulario */}
      {modalOpen && (
        <PersonalModal
          persona={editPersona}
          fincas={fincas}
          canSeeSalary={canSeeSalary}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}

      {/* Modal Detalle Ficha */}
      {detallePersona && (
        <DetallModal
          persona={detallePersona}
          canSeeSalary={canSeeSalary}
          onClose={() => setDetallePersona(undefined)}
          onEdit={() => {
            setEditPersona(detallePersona);
            setDetallePersona(undefined);
            setModalOpen(true);
          }}
        />
      )}

      {/* Modal Confirmación Eliminación */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar colaborador del equipo?"
        itemName={deleteModal.name}
        description="Esta acción desvinculará y eliminará permanentemente la ficha de este trabajador de la organización."
        loading={deleteModal.loading}
        onConfirm={confirmDeletePersonal}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
