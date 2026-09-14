'use client';

import { useEffect, useState, useCallback } from 'react';
import { fincasApi } from '@/lib/api';
import { useFincasStore, Finca } from '@/store/fincasStore';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Maximize2,
  Layers,
} from 'lucide-react';

function FincaModal({
  finca,
  onClose,
  onSave,
}: {
  finca?: Finca;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    nombre: finca?.nombre || '',
    ubicacion: finca?.ubicacion || '',
    hectareas: finca?.hectareas?.toString() || '',
    tipoSuelo: finca?.tipoSuelo || '',
    descripcion: finca?.descripcion || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        hectareas: parseFloat(form.hectareas),
      };
      if (finca) {
        await fincasApi.update(finca.id, payload);
      } else {
        await fincasApi.create(payload);
      }
      onSave();
      onClose();
    } catch {
      setError('Error al guardar la finca. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {finca ? 'Editar Finca' : 'Nueva Finca'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              color: '#f87171',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Nombre de la finca *
              </label>
              <input
                className="input-field"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Finca Las Palmeras"
                required
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Ubicación *
              </label>
              <input
                className="input-field"
                value={form.ubicacion}
                onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
                placeholder="Ej: Vereda El Paraíso, Valledupar"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Hectáreas *
              </label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0"
                value={form.hectareas}
                onChange={(e) => setForm((f) => ({ ...f, hectareas: e.target.value }))}
                placeholder="Ej: 25.5"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Tipo de suelo
              </label>
              <select
                className="input-field"
                value={form.tipoSuelo}
                onChange={(e) => setForm((f) => ({ ...f, tipoSuelo: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                <option value="Arcilloso">Arcilloso</option>
                <option value="Arenoso">Arenoso</option>
                <option value="Franco">Franco</option>
                <option value="Limoso">Limoso</option>
                <option value="Franco-arcilloso">Franco-arcilloso</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Descripción
              </label>
              <textarea
                className="input-field"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Descripción adicional de la finca..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : finca ? 'Actualizar' : 'Crear Finca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FincasPage() {
  const { fincas, setFincas, removeFinca } = useFincasStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editFinca, setEditFinca] = useState<Finca | undefined>();
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadFincas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fincasApi.getAll();
      setFincas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [setFincas]);

  useEffect(() => {
    loadFincas();
  }, [loadFincas]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar esta finca?')) return;
    setDeleting(id);
    try {
      await fincasApi.delete(id);
      removeFinca(id);
    } catch {
      alert('Error al eliminar la finca');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = fincas.filter(
    (f) =>
      f.nombre.toLowerCase().includes(search.toLowerCase()) ||
      f.ubicacion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Mis Fincas
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {fincas.length} finca{fincas.length !== 1 ? 's' : ''} registrada{fincas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditFinca(undefined); setModalOpen(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          id="btn-nueva-finca"
        >
          <Plus size={18} />
          Nueva Finca
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search
          size={16}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }}
        />
        <input
          className="input-field"
          style={{ paddingLeft: 38 }}
          placeholder="Buscar finca..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--color-text-subtle)',
          }}
        >
          <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)' }}>
            {search ? 'Sin resultados' : 'Aún no tienes fincas'}
          </p>
          <p style={{ fontSize: 13 }}>
            {search ? 'Intenta con otro término' : 'Crea tu primera finca para comenzar'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((finca) => (
            <div
              key={finca.id}
              className="card glass-hover"
              style={{ padding: '22px 24px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: 'rgba(22, 163, 74, 0.12)',
                    border: '1px solid rgba(22, 163, 74, 0.2)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4ade80',
                    fontSize: 20,
                  }}
                >
                  🌿
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => { setEditFinca(finca); setModalOpen(true); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      padding: 6,
                      borderRadius: 8,
                      transition: 'all 0.2s',
                    }}
                    title="Editar"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(finca.id)}
                    disabled={deleting === finca.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: deleting === finca.id ? 'var(--color-text-subtle)' : '#f87171',
                      padding: 6,
                      borderRadius: 8,
                      transition: 'all 0.2s',
                    }}
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
                {finca.nombre}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <MapPin size={13} style={{ flexShrink: 0 }} />
                  {finca.ubicacion}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <Maximize2 size={13} style={{ flexShrink: 0 }} />
                  {finca.hectareas} hectáreas
                </div>
                {finca.tipoSuelo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    <Layers size={13} style={{ flexShrink: 0 }} />
                    Suelo {finca.tipoSuelo}
                  </div>
                )}
              </div>

              {finca.descripcion && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-subtle)',
                    marginTop: 10,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {finca.descripcion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <FincaModal
          finca={editFinca}
          onClose={() => setModalOpen(false)}
          onSave={loadFincas}
        />
      )}
    </div>
  );
}
