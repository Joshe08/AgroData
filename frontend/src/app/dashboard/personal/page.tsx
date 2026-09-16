'use client';

import { useEffect, useState, useCallback } from 'react';
import { personalApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { Users, Plus, Edit3, Trash2, Search, X, Phone, Briefcase, MapPin } from 'lucide-react';

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

function PersonalModal({
  persona,
  fincas,
  onClose,
  onSave,
}: {
  persona?: Personal;
  fincas: Finca[];
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
                {fincas.map((fi) => (
                  <option key={fi.id} value={fi.id}>{fi.nombre}</option>
                ))}
              </select>
            </div>

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

            <div>
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

  const handleDelete = async (id: string | number) => {
    if (!confirm('¿Seguro que deseas eliminar este colaborador?')) return;
    try {
      await personalApi.delete(id);
      setPersonal((p) => p.filter((x) => x.id !== id));
      useToastStore.getState().success('Colaborador eliminado.');
    } catch {
      useToastStore.getState().error('Error al eliminar colaborador.');
    }
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const filtered = personal.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.cargo.toLowerCase().includes(search.toLowerCase())
  );

  const totalNomina = personal.reduce((sum, p) => sum + (p.salario || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Personal y Mano de Obra
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {personal.length} colaboradores · Total nómina mensual estimada: {formatCOP(totalNomina)}
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

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
        <input
          className="input-field"
          style={{ paddingLeft: 38 }}
          placeholder="Buscar por nombre o cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 170, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-subtle)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            No hay colaboradores registrados
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((p) => (
            <div key={p.id} className="card glass-hover" style={{ padding: '20px' }}>
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
                  }}
                >
                  {p.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => { setEditPersona(p); setModalOpen(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                    title="Editar"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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
                  {p.tipoContrato?.replace('_', ' ')}
                </span>
                {p.salario && (
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                    {formatCOP(p.salario)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <PersonalModal
          persona={editPersona}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}
