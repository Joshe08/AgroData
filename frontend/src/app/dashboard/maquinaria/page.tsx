'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  Eye,
  Calendar,
  DollarSign,
  FileText,
  Tractor,
  Camera,
  Upload,
} from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';

interface Maquina {
  id: string | number;
  nombre: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  placa?: string;
  estado: string;
  horasUso?: number;
  valor?: number;
  fechaAdquisicion?: string;
  observaciones?: string;
  proximoMantenimiento?: string;
  fincaId?: string | number | null;
  finca?: { id: string | number; nombre: string } | null;
  imageUrl?: string | null;
}

interface Finca {
  id: string | number;
  nombre: string;
}

const BACKEND_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001';

const ESTADO_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  OPERATIVO: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: 'Operativo' },
  MANTENIMIENTO: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: 'En mantenimiento' },
  DAÑADO: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', label: 'Averiado / Fuera de servicio' },
  DANADO: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', label: 'Averiado / Fuera de servicio' },
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
  'Sembradora / Abonadora',
  'Arado / Rastra de discos',
  'Otro equipo o apero',
];

// ─── Modal Ficha Técnica Detallada (Botón "Ver") ─────────────────────────────

function FichaTecnicaModal({
  maquina,
  onClose,
  onEdit,
}: {
  maquina: Maquina;
  onClose: () => void;
  onEdit: () => void;
}) {
  const badge = ESTADO_BADGE[maquina.estado] || ESTADO_BADGE['OPERATIVO'];

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const formatDate = (d?: string) => {
    if (!d) return 'No registrada';
    try {
      return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return d;
    }
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
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tractor size={22} color="#fbbf24" />
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Ficha Técnica del Equipo
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Hero Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '16px', background: 'rgba(245,158,11,0.06)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
          {maquina.imageUrl ? (
            <img
              src={`${BACKEND_URL}${maquina.imageUrl}`}
              alt={maquina.nombre}
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, flexShrink: 0, border: '2px solid rgba(245,158,11,0.3)' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fbbf24', flexShrink: 0 }}>
              <Wrench size={28} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{maquina.nombre}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {maquina.tipo} {maquina.marca ? `· ${maquina.marca}` : ''} {maquina.modelo ? `(${maquina.modelo})` : ''}
            </div>
            {maquina.placa && (
              <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                Placa / Serial: <strong>{maquina.placa}</strong>
              </div>
            )}
            <span
              style={{
                display: 'inline-block',
                marginTop: 6,
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
          </div>
        </div>

        {/* Technical Data Grid */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Row
            icon={<MapPin size={15} />}
            label="Predio / Finca asignada"
            value={maquina.finca?.nombre || (maquina.fincaId ? `Finca #${maquina.fincaId}` : 'Sin finca asignada')}
          />
          <Row
            icon={<Clock size={15} />}
            label="Horómetro / Horas de uso"
            value={maquina.horasUso != null ? `${maquina.horasUso} horas de trabajo` : 'No registrado'}
          />
          {maquina.proximoMantenimiento && (
            <Row
              icon={<Calendar size={15} />}
              label="Próximo Mantenimiento Preventivo"
              value={formatDate(maquina.proximoMantenimiento)}
            />
          )}
          {maquina.valor != null && (
            <Row
              icon={<DollarSign size={15} />}
              label="Valor comercial estimado"
              value={formatCOP(maquina.valor)}
            />
          )}
          {maquina.fechaAdquisicion && (
            <Row
              icon={<Calendar size={15} />}
              label="Fecha de Adquisición"
              value={formatDate(maquina.fechaAdquisicion)}
            />
          )}
          {maquina.observaciones && (
            <Row
              icon={<FileText size={15} />}
              label="Observaciones y Mantenimiento"
              value={maquina.observaciones}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
          <button onClick={onEdit} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit3 size={14} /> Editar Maquinaria
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Formulario (Crear / Editar) ────────────────────────────────────────

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
    placa: maquina?.placa || '',
    estado: maquina?.estado || 'OPERATIVO',
    horasUso: maquina?.horasUso != null ? String(maquina.horasUso) : '',
    valor: maquina?.valor != null ? String(maquina.valor) : '',
    fechaAdquisicion: maquina?.fechaAdquisicion ? maquina.fechaAdquisicion.split('T')[0] : '',
    observaciones: maquina?.observaciones || '',
    proximoMantenimiento: maquina?.proximoMantenimiento?.split('T')[0] || '',
    fincaId: maquina?.fincaId != null ? String(maquina.fincaId) : (fincas[0]?.id ? String(fincas[0].id) : ''),
  });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    maquina?.imageUrl ? `${BACKEND_URL}${maquina.imageUrl}` : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (maquina) {
      setForm({
        nombre: maquina.nombre || '',
        tipo: maquina.tipo || 'Tractor agrícola',
        marca: maquina.marca || '',
        modelo: maquina.modelo || '',
        placa: maquina.placa || '',
        estado: maquina.estado || 'OPERATIVO',
        horasUso: maquina.horasUso != null ? String(maquina.horasUso) : '',
        valor: maquina.valor != null ? String(maquina.valor) : '',
        fechaAdquisicion: maquina.fechaAdquisicion ? maquina.fechaAdquisicion.split('T')[0] : '',
        observaciones: maquina.observaciones || '',
        proximoMantenimiento: maquina.proximoMantenimiento ? maquina.proximoMantenimiento.split('T')[0] : '',
        fincaId: maquina.fincaId != null ? String(maquina.fincaId) : '',
      });
      setPhotoPreview(maquina.imageUrl ? `${BACKEND_URL}${maquina.imageUrl}` : null);
    }
  }, [maquina]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      useToastStore.getState().warning('La imagen no puede superar 5 MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      useToastStore.getState().warning('El nombre del equipo es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      const p = {
        name: form.nombre.trim(),
        tipo: form.tipo,
        marca: form.marca.trim() || undefined,
        modelo: form.modelo.trim() || undefined,
        placa: form.placa.trim() || undefined,
        estado: form.estado,
        fincaId: form.fincaId || null,
        horasUso: form.horasUso ? parseFloat(form.horasUso) : undefined,
        valor: form.valor ? parseFloat(form.valor) : undefined,
        fechaAdquisicion: form.fechaAdquisicion || undefined,
        observaciones: form.observaciones.trim() || undefined,
        proximoMantenimiento: form.proximoMantenimiento || undefined,
      };

      let savedId: string | number;
      if (maquina) {
        await maquinariaApi.update(maquina.id, p);
        savedId = maquina.id;
        useToastStore.getState().success('Equipo actualizado exitosamente.');
      } else {
        const res = await maquinariaApi.create(p);
        savedId = res.data?.id;
        useToastStore.getState().success('Equipo registrado en maquinaria.');
      }

      // Upload photo if selected
      if (photoFile && savedId) {
        try {
          await maquinariaApi.uploadFoto(savedId, photoFile);
        } catch {
          useToastStore.getState().warning('Equipo guardado, pero no se pudo subir la foto.');
        }
      }

      onSave();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar la maquinaria.';
      useToastStore.getState().error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
            {maquina ? 'Editar Equipo' : 'Nuevo Equipo o Maquinaria'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Foto del equipo */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500 }}>
              Foto del equipo (opcional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Preview */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  border: '2px dashed var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: 'var(--color-surface)',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Haz clic para seleccionar foto"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={28} color="var(--color-text-subtle)" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                  <Upload size={14} />
                  {photoPreview ? 'Cambiar foto' : 'Seleccionar foto'}
                </button>
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4 }}>
                  JPG, PNG o WEBP · máx. 5 MB
                </div>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>

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
                Placa / N° de serial
              </label>
              <input
                className="input-field"
                value={form.placa}
                onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value }))}
                placeholder="Ej: ABC-123, SN-4567890"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Finca / Predio asignado
              </label>
              <select
                className="input-field"
                value={form.fincaId}
                onChange={(e) => setForm((f) => ({ ...f, fincaId: e.target.value }))}
              >
                <option value="">— Sin finca asignada —</option>
                {fincas.map((fi) => (
                  <option key={fi.id} value={fi.id}>{fi.nombre}</option>
                ))}
              </select>
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
                Valor comercial estimado (COP)
              </label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="100000"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                placeholder="Ej: 85000000"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Fecha de adquisición
              </label>
              <input
                className="input-field"
                type="date"
                value={form.fechaAdquisicion}
                onChange={(e) => setForm((f) => ({ ...f, fechaAdquisicion: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Próximo mantenimiento preventivo
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
                Observaciones y Especificaciones
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={form.observaciones}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                placeholder="Detalles de filtros, cambio de aceite, aperos compatibles o conductor a cargo..."
              />
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

// ─── Página Principal de Maquinaria ──────────────────────────────────────────

export default function MaquinariaPage() {
  const [maquinaria, setMaquinaria] = useState<Maquina[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFinca, setFilterFinca] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | undefined>();
  const [detalleMaquina, setDetalleMaquina] = useState<Maquina | undefined>();

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

  const confirmDeleteMaquina = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await maquinariaApi.delete(deleteModal.id);
      setMaquinaria((m) => m.filter((x) => x.id !== deleteModal.id));
      useToastStore.getState().success('Equipo eliminado.');
      setDeleteModal({ isOpen: false, id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al eliminar equipo.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = (m: Maquina) => {
    setDeleteModal({
      isOpen: true,
      id: m.id,
      name: `${m.nombre} (${m.tipo})`,
      loading: false,
    });
  };

  const filtered = maquinaria.filter((m) => {
    const matchSearch =
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (m.marca || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.tipo || '').toLowerCase().includes(search.toLowerCase());

    let matchFinca = true;
    if (filterFinca === 'NONE') {
      matchFinca = !m.fincaId && !m.finca;
    } else if (filterFinca !== 'ALL') {
      matchFinca = String(m.fincaId) === filterFinca || String(m.finca?.id) === filterFinca;
    }

    return matchSearch && matchFinca;
  });

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

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar equipo por nombre, tipo o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field"
          style={{ flex: '1 1 180px', maxWidth: 220 }}
          value={filterFinca}
          onChange={(e) => setFilterFinca(e.target.value)}
        >
          <option value="ALL">Todas las fincas</option>
          <option value="NONE">Sin finca asignada</option>
          {fincas.map((f) => (
            <option key={f.id} value={String(f.id)}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="responsive-cards-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-subtle)' }}>
          <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            No hay maquinaria registrada que coincida con la búsqueda
          </p>
        </div>
      ) : (
        <div className="responsive-cards-grid">
          {filtered.map((m) => {
            const badge = ESTADO_BADGE[m.estado] || ESTADO_BADGE['OPERATIVO'];
            const displayFinca = m.finca?.nombre || (m.fincaId ? `Finca #${m.fincaId}` : 'Sin finca asignada');

            return (
              <div key={m.id} className="card glass-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Thumbnail o icono */}
                  {m.imageUrl ? (
                    <img
                      src={`${BACKEND_URL}${m.imageUrl}`}
                      alt={m.nombre}
                      style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                      }}
                    />
                  ) : (
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
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setDetalleMaquina(m)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                      title="Ver ficha técnica"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => { setEditMaquina(m); setModalOpen(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
                      title="Editar"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
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
                  {m.placa && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                      Placa: {m.placa}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-subtle)' }}>
                  <MapPin size={12} />
                  <span>{displayFinca}</span>
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

      {/* Modal Formulario */}
      {modalOpen && (
        <MaquinaModal
          maquina={editMaquina}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}

      {/* Modal Detalle Ficha Técnica (Ver) */}
      {detalleMaquina && (
        <FichaTecnicaModal
          maquina={detalleMaquina}
          onClose={() => setDetalleMaquina(undefined)}
          onEdit={() => {
            setEditMaquina(detalleMaquina);
            setDetalleMaquina(undefined);
            setModalOpen(true);
          }}
        />
      )}

      {/* Modal Confirmación Eliminación Maquinaria */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar maquinaria o equipo?"
        itemName={deleteModal.name}
        description="Esta acción eliminará el registro del equipo, su historial de mantenimiento y horas de uso de la base de datos."
        loading={deleteModal.loading}
        onConfirm={confirmDeleteMaquina}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
