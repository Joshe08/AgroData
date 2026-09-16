'use client';

import { useEffect, useState, useCallback } from 'react';
import { maquinariaApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  Wrench,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle,
} from 'lucide-react';

interface Maquina {
  id: string | number;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  estado: string;
  horasUso?: number;
  proximoMantenimiento?: string;
  fincaId: string | number;
  finca?: { id: string | number; nombre: string };
}

interface Finca {
  id: string | number;
  nombre: string;
}

const ESTADO_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  OPERATIVO: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: 'Operativo' },
  MANTENIMIENTO: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: 'En mantenimiento' },
  DAÑADO: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', label: 'Averiado / Fuera de servicio' },
  INACTIVO: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', label: 'Inactivo / En reserva' },
};

const TIPOS_MAQUINARIA = [
  'Tractor agrícola',
  'Fumigadora estacionaria / aguilón',
  'Motobomba / Equipo de bombeo',
  'Guadañadora / Cortamalezas',
  'Picapasto / Ensiladora',
  'Cosechadora / Trilladora',
  'Remolque agrícola',
  'Vehículo de campo / Camioneta',
  'Motosierra / Podadora',
  'Otro equipo o apero',
];

function MaquinaModal({
  maquina,
  fincas,
  onClose,
  onSave,
}: {
  maquina?: Maquina;
  fincas: Finca[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    nombre: maquina?.nombre || '',
    tipo: maquina?.tipo || 'Tractor agrícola',
    marca: maquina?.marca || '',
    modelo: maquina?.modelo || '',
    estado: maquina?.estado || 'OPERATIVO',
    horasUso: maquina?.horasUso?.toString() || '',
    proximoMantenimiento: maquina?.proximoMantenimiento?.split('T')[0] || '',
    fincaId: maquina?.fincaId?.toString() || fincas[0]?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      useToastStore.getState().warning('El nombre del equipo es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const p = {
        ...form,
        fincaId: form.fincaId,
        horasUso: form.horasUso ? parseFloat(form.horasUso) : undefined,
        proximoMantenimiento: form.proximoMantenimiento || undefined,
      };
      if (maquina) {
        await maquinariaApi.update(maquina.id, p);
        useToastStore.getState().success('Equipo actualizado exitosamente.');
      } else {
        await maquinariaApi.create(p);
        useToastStore.getState().success('Equipo registrado en maquinaria.');
      }
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar la maquinaria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {maquina ? 'Editar Equipo' : 'Nuevo Equipo o Maquinaria'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Nombre identificador del equipo *
              </label>
              <input
                className="input-field"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Tractor John Deere 5065E, Bomba Diesel 4 Pulgadas"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Tipo de maquinaria *
              </label>
              <select
                className="input-field"
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                {TIPOS_MAQUINARIA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Estado operativo *
              </label>
              <select
                className="input-field"
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
              >
                <option value="OPERATIVO">Operativo</option>
                <option value="MANTENIMIENTO">En mantenimiento</option>
                <option value="DAÑADO">Averiado / Fuera de servicio</option>
                <option value="INACTIVO">Inactivo / En reserva</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Marca
              </label>
              <input
                className="input-field"
                value={form.marca}
                onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                placeholder="Ej: John Deere, New Holland, Stihl"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Modelo / Año
              </label>
              <input
                className="input-field"
                value={form.modelo}
                onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                placeholder="Ej: 5065E, FS 280, 2021"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Horas de uso / Horómetro
              </label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.1"
                value={form.horasUso}
                onChange={(e) => setForm((f) => ({ ...f, horasUso: e.target.value }))}
                placeholder="Ej: 1450"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Próximo mantenimiento
              </label>
              <input
                className="input-field"
                type="date"
                value={form.proximoMantenimiento}
                onChange={(e) => setForm((f) => ({ ...f, proximoMantenimiento: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Finca / Predio donde se encuentra *
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
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : maquina ? 'Actualizar' : 'Registrar Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaquinariaPage() {
  const [maquinaria, setMaquinaria] = useState<Maquina[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | undefined>();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, fRes] = await Promise.all([maquinariaApi.getAll(), fincasApi.getAll()]);
      setMaquinaria(mRes.data || []);
      setFincas(fRes.data || []);
    } catch {
      useToastStore.getState().error('Error al cargar la maquinaria.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string | number) => {
    if (!confirm('¿Seguro que deseas eliminar este equipo?')) return;
    try {
      await maquinariaApi.delete(id);
      setMaquinaria((m) => m.filter((x) => x.id !== id));
      useToastStore.getState().success('Equipo eliminado.');
    } catch {
      useToastStore.getState().error('Error al eliminar equipo.');
    }
  };

  const filtered = maquinaria.filter(
    (m) =>
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (m.marca || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.tipo || '').toLowerCase().includes(search.toLowerCase())
  );

  const proximoMant = maquinaria.filter((m) => {
    if (!m.proximoMantenimiento) return false;
    const days = (new Date(m.proximoMantenimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= -5 && days <= 30;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Maquinaria y Equipos
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {maquinaria.length} equipos registrados en parque automotor e infraestructura
          </p>
        </div>
        <button
          onClick={() => { setEditMaquina(undefined); setModalOpen(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> Registrar Equipo
        </button>
      </div>

      {proximoMant.length > 0 && (
        <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: 14 }}>
              {proximoMant.length} equipo(s) con mantenimiento preventivo próximo o vencido:
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
              {proximoMant.map((m) => m.nombre).join(', ')}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
        <input
          className="input-field"
          style={{ paddingLeft: 38 }}
          placeholder="Buscar equipo por nombre o marca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-subtle)' }}>
          <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            No hay maquinaria registrada
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((m) => {
            const badge = ESTADO_BADGE[m.estado] || ESTADO_BADGE['OPERATIVO'];
            return (
              <div key={m.id} className="card glass-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                    }}
                  >
                    <Wrench size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => { setEditMaquina(m); setModalOpen(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, color: 'var(--color-text)' }}>
                    {m.nombre}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {m.tipo} {m.marca ? `· ${m.marca}` : ''} {m.modelo ? `(${m.modelo})` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-subtle)' }}>
                  <MapPin size={12} />
                  <span>{m.finca?.nombre || 'Predio asignado'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: badge.bg,
                      color: badge.text,
                    }}
                  >
                    {badge.label}
                  </span>
                  {m.horasUso ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {m.horasUso} hrs de uso
                    </span>
                  ) : null}
                </div>

                {m.proximoMantenimiento && (
                  <div style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.06)', borderRadius: 8, fontSize: 11, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={12} />
                    Mantenimiento: {new Date(m.proximoMantenimiento).toLocaleDateString('es-CO')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <MaquinaModal
          maquina={editMaquina}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}
    </div>
  );
}
