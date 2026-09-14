'use client';

import { useEffect, useState, useCallback } from 'react';
import { colaboradoresApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import {
  Users, Plus, Edit3, Trash2, Search, X,
  Shield, Mail, Calendar, Crown, Briefcase,
  Tractor, Leaf, Calculator, UserCog,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Colaborador {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROL_LABELS: Record<string, string> = {
  PROPIETARIO: 'Propietario',
  ADMIN: 'Administrador',
  ADMIN_PRODUCCION: 'Admin de Producción',
  TRABAJADOR: 'Trabajador',
  AGRONOMO: 'Agrónomo',
  CONTADOR: 'Contador',
};

const ROL_ICONS: Record<string, React.ReactNode> = {
  PROPIETARIO: <Crown size={12} />,
  ADMIN: <Shield size={12} />,
  ADMIN_PRODUCCION: <Tractor size={12} />,
  TRABAJADOR: <Briefcase size={12} />,
  AGRONOMO: <Leaf size={12} />,
  CONTADOR: <Calculator size={12} />,
};

const ROL_BADGES: Record<string, string> = {
  PROPIETARIO: 'success',
  ADMIN: 'warning',
  ADMIN_PRODUCCION: 'info',
  TRABAJADOR: 'info',
  AGRONOMO: 'success',
  CONTADOR: 'warning',
};

const ROL_DESCRIPCION: Record<string, string> = {
  ADMIN: 'Control total de la organización',
  ADMIN_PRODUCCION: 'Gestión de fincas, cultivos e inventario',
  AGRONOMO: 'Asesoría técnica agronómica',
  CONTADOR: 'Control financiero y contable',
  TRABAJADOR: 'Acceso operativo de campo',
};

function ColaboradorModal({
  colab,
  onClose,
  onSave,
}: {
  colab?: Colaborador;
  onClose: () => void;
  onSave: () => void;
}) {
  const toast = useToastStore();
  const [form, setForm] = useState({
    name: colab?.name || '',
    email: colab?.email || '',
    password: '',
    role: colab?.role || 'TRABAJADOR',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!colab && !form.password) { setError('La contraseña es requerida para un nuevo usuario.'); return; }
    if (!colab && form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    setLoading(true);
    setError('');
    try {
      if (colab) {
        const payload: Record<string, string> = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await colaboradoresApi.update(colab.id, payload);
        toast.success('Colaborador actualizado correctamente.');
      } else {
        await colaboradoresApi.create(form);
        toast.success('Colaborador agregado correctamente.');
      }
      onSave();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Error al guardar el colaborador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <UserCog size={18} />
            </div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
              {colab ? 'Editar Colaborador' : 'Agregar Colaborador'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div role="alert" style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <X size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Nombre Completo <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              className="input-field"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Carlos Alberto Martínez"
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Correo Electrónico <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="colaborador@ejemplo.com"
              required
              disabled={!!colab}
              autoComplete="email"
              style={{ opacity: colab ? 0.6 : 1 }}
            />
            {colab && (
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                El correo electrónico no puede modificarse.
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>
              {colab ? 'Contraseña (dejar en blanco para conservar la actual)' : 'Contraseña de Acceso'} {!colab && <span style={{ color: '#f87171' }}>*</span>}
            </label>
            <input
              className="input-field"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required={!colab}
              minLength={6}
              autoComplete="new-password"
            />
            <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>
              Mínimo 6 caracteres.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Rol en la Plataforma
            </label>
            <select
              className="input-field"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="ADMIN">Administrador — Control total</option>
              <option value="ADMIN_PRODUCCION">Administrador de Producción — Fincas y cultivos</option>
              <option value="AGRONOMO">Agrónomo — Asesoría técnica</option>
              <option value="CONTADOR">Contador — Control financiero</option>
              <option value="TRABAJADOR">Trabajador — Acceso operativo</option>
            </select>
            {ROL_DESCRIPCION[form.role] && (
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                {ROL_DESCRIPCION[form.role]}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ minWidth: 100 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: 140 }}>
              {loading ? 'Guardando...' : colab ? 'Actualizar' : 'Agregar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  colab,
  onClose,
  onConfirm,
}: {
  colab: Colaborador;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#f87171' }}>
            <Trash2 size={24} />
          </div>
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            Eliminar Colaborador
          </h3>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Esta acción eliminará a <strong>{colab.name}</strong> de la organización. El usuario perderá acceso inmediatamente. Esta acción no puede deshacerse.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} className="btn-secondary" style={{ minWidth: 120 }}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{ minWidth: 140, background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ColaboradoresPage() {
  const { user } = useAuthStore();
  const toast = useToastStore();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editColab, setEditColab] = useState<Colaborador | undefined>();
  const [deleteColab, setDeleteColab] = useState<Colaborador | undefined>();

  const isOwnerOrAdmin = user?.rol === 'PROPIETARIO' || user?.rol === 'ADMIN';

  const loadColaboradores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await colaboradoresApi.getAll();
      setColaboradores(res.data);
    } catch {
      toast.error('Error al cargar los colaboradores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadColaboradores();
  }, [loadColaboradores]);

  const handleDelete = async () => {
    if (!deleteColab) return;
    try {
      await colaboradoresApi.delete(deleteColab.id);
      setColaboradores(list => list.filter(c => c.id !== deleteColab.id));
      toast.success(`${deleteColab.name} fue eliminado de la organización.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Error al eliminar el colaborador.');
    } finally {
      setDeleteColab(undefined);
    }
  };

  const filtered = colaboradores.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (ROL_LABELS[c.role] || c.role).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Organización y Colaboradores
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {user?.organizationName || 'Tu organización'} · {colaboradores.length} usuario{colaboradores.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => { setEditColab(undefined); setModalOpen(true); }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}
          >
            <Plus size={18} />
            Agregar Colaborador
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24, borderColor: 'rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
            <Shield size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Acceso Multitenant Seguro</h4>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Cada colaborador accede únicamente a los datos de <strong>{user?.organizationName || 'tu organización'}</strong>.
              Como <strong>{ROL_LABELS[user?.rol || ''] || user?.rol}</strong>, puedes administrar quién tiene acceso y qué permisos tiene.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)', pointerEvents: 'none' }} />
        <input
          className="input-field"
          style={{ paddingLeft: 38 }}
          placeholder="Buscar por nombre, correo o rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar colaboradores"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Limpiar búsqueda"
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)', padding: 2 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
          <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {search ? 'No se encontraron resultados' : 'No hay colaboradores registrados'}
          </p>
          {!search && isOwnerOrAdmin && (
            <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginTop: 8 }}>
              Agrega el primer colaborador usando el botón de arriba.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card colabs-table-wrapper" style={{ overflow: 'hidden', padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo Electrónico</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  {isOwnerOrAdmin && <th style={{ width: 100 }}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((colab) => (
                  <tr key={colab.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {colab.name.charAt(0).toUpperCase()}
                        </div>
                        {colab.name}
                        {colab.id === user?.id && (
                          <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 500 }}>
                            (tú)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={13} />
                        {colab.email}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${ROL_BADGES[colab.role] || 'info'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {ROL_ICONS[colab.role]}
                        {ROL_LABELS[colab.role] || colab.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} />
                        {format(new Date(colab.createdAt), 'd MMM yyyy', { locale: es })}
                      </div>
                    </td>
                    {isOwnerOrAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => { setEditColab(colab); setModalOpen(true); }}
                            disabled={colab.role === 'PROPIETARIO' && user?.rol !== 'PROPIETARIO'}
                            title="Editar colaborador"
                            aria-label="Editar colaborador"
                            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '7px 10px', borderRadius: 8, opacity: colab.role === 'PROPIETARIO' && user?.rol !== 'PROPIETARIO' ? 0.3 : 1, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteColab(colab)}
                            disabled={colab.id === user?.id || colab.role === 'PROPIETARIO'}
                            title="Eliminar colaborador"
                            aria-label="Eliminar colaborador"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#f87171', padding: '7px 10px', borderRadius: 8, opacity: colab.id === user?.id || colab.role === 'PROPIETARIO' ? 0.3 : 1, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="colabs-mobile-cards">
            {filtered.map((colab) => (
              <div key={colab.id} className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {colab.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {colab.name} {colab.id === user?.id && <span style={{ fontSize: 11, color: 'var(--color-primary)' }}>(tú)</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {colab.email}
                    </div>
                  </div>
                  <span className={`badge badge-${ROL_BADGES[colab.role] || 'info'}`} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {ROL_ICONS[colab.role]}
                    {ROL_LABELS[colab.role] || colab.role}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={12} />
                    {format(new Date(colab.createdAt), 'd MMM yyyy', { locale: es })}
                  </span>
                  {isOwnerOrAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => { setEditColab(colab); setModalOpen(true); }}
                        disabled={colab.role === 'PROPIETARIO' && user?.rol !== 'PROPIETARIO'}
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minHeight: 40 }}
                      >
                        <Edit3 size={14} />
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteColab(colab)}
                        disabled={colab.id === user?.id || colab.role === 'PROPIETARIO'}
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#f87171', padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minHeight: 40, opacity: colab.id === user?.id || colab.role === 'PROPIETARIO' ? 0.3 : 1 }}
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalOpen && (
        <ColaboradorModal
          colab={editColab}
          onClose={() => setModalOpen(false)}
          onSave={loadColaboradores}
        />
      )}

      {deleteColab && (
        <ConfirmDeleteModal
          colab={deleteColab}
          onClose={() => setDeleteColab(undefined)}
          onConfirm={handleDelete}
        />
      )}

      <style>{`
        .colabs-table-wrapper { display: block; }
        .colabs-mobile-cards { display: none; }
        @media (max-width: 640px) {
          .colabs-table-wrapper { display: none; }
          .colabs-mobile-cards { display: block; }
        }
      `}</style>
    </div>
  );
}
