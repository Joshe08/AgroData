'use client';

import { useEffect, useState, useCallback } from 'react';
import { fincasApi } from '@/lib/api';
import { useFincasStore, Finca, Lote } from '@/store/fincasStore';
import { useToastStore } from '@/store/toastStore';
import {
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Layers,
  Compass,
  CheckCircle,
  Activity,
  FileText,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  Map as MapIcon,
  Eye,
} from 'lucide-react';
import MapPicker from '@/components/maps/MapPicker';
import FincasMapOverview from '@/components/maps/FincasMapOverview';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';

const TIPOS_EXPLOTACION = [
  { value: 'MIXTA', label: 'Mixta (Agrícola y Pecuaria)' },
  { value: 'AGRICOLA', label: 'Agrícola' },
  { value: 'PECUARIA', label: 'Pecuaria (Ganadería, Cerdos, Aves)' },
  { value: 'CAFETERA', label: 'Cafetera / Agroforestal' },
  { value: 'ACUICOLA', label: 'Acuícola / Piscícola' },
  { value: 'FORESTAL', label: 'Forestal / Silvopastoril' },
];

const FUENTES_AGUA = [
  'Río o quebrada permanente',
  'Pozo profundo / Aljibe',
  'Nacimiento / Ojo de agua',
  'Acueducto veredal',
  'Jagüey / Represa',
  'Secano (solo lluvias)',
];

const SISTEMAS_RIEGO = [
  'Secano (lluvia natural)',
  'Goteo tecnificado',
  'Aspersión / Cañón',
  'Microaspersión',
  'Gravedad / Inundación controlada',
];

const TIPOS_ACCESO = [
  'Carretera pavimentada',
  'Carretera destapada (afirmado)',
  'Trocha transitable solo 4x4 o tractor',
  'Camino de herradura',
  'Transporte fluvial / lancha',
];

const ACTIVIDADES_OPCIONES = [
  { id: 'AGRICULTURA', label: 'Agricultura' },
  { id: 'CAFICULTURA', label: 'Caficultura' },
  { id: 'GANADERIA', label: 'Ganadería' },
  { id: 'PISCICULTURA', label: 'Piscicultura' },
  { id: 'AVICULTURA', label: 'Avicultura' },
  { id: 'PORCICULTURA', label: 'Porcicultura' },
  { id: 'APICULTURA', label: 'Apicultura' },
];

function FincaModal({
  finca,
  onClose,
  onSave,
}: {
  finca?: Finca;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [form, setForm] = useState({
    nombre: finca?.nombre || '',
    descripcion: finca?.descripcion || '',
    tipoExplotacion: finca?.tipoExplotacion || 'MIXTA',
    estado: finca?.estado || 'ACTIVA',
    departamento: finca?.departamento || 'Cesar',
    municipio: finca?.municipio || 'Valledupar',
    vereda: finca?.vereda || '',
    referenciaAcceso: finca?.referenciaAcceso || '',
    latitude: finca?.latitude ? String(finca.latitude) : '',
    longitude: finca?.longitude ? String(finca.longitude) : '',
    hectareas: finca?.hectareas ? String(finca.hectareas) : '',
    unidadMedida: finca?.unidadMedida || 'Hectáreas',
    tipoSuelo: finca?.tipoSuelo || 'Franco',
    fuenteAgua: finca?.fuenteAgua || 'Río o quebrada permanente',
    sistemaRiego: finca?.sistemaRiego || 'Secano (lluvia natural)',
    tipoAcceso: finca?.tipoAcceso || 'Carretera destapada (afirmado)',
    actividades: finca?.actividades || ['AGRICULTURA'],
    capacidadCabezas: '',
    alturaMsnm: '',
    numeroEstanques: '',
  });

  const toggleActividad = (id: string) => {
    setForm((prev) => {
      const exists = prev.actividades.includes(id);
      const updated = exists ? prev.actividades.filter((a) => a !== id) : [...prev.actividades, id];
      return { ...prev, actividades: updated };
    });
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      useToastStore.getState().warning('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setCapturingGps(false);
        useToastStore.getState().success('Coordenadas GPS capturadas con éxito.');
      },
      () => {
        setCapturingGps(false);
        useToastStore.getState().error('No se pudo obtener la ubicación. Verifica los permisos de GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      useToastStore.getState().warning('El nombre de la finca es obligatorio.');
      return;
    }
    if (!form.hectareas || parseFloat(form.hectareas) <= 0) {
      useToastStore.getState().warning('Ingresa un área válida para el predio.');
      return;
    }

    setLoading(true);
    try {
      const fullLocation = [form.vereda, form.municipio, form.departamento].filter(Boolean).join(', ') || 'Colombia';

      const payload = {
        name: form.nombre.trim(),
        location: fullLocation,
        area: parseFloat(form.hectareas),
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        descripcion: form.descripcion || undefined,
        tipoSuelo: form.tipoSuelo,
      };

      if (finca) {
        await fincasApi.update(finca.id, payload);
        useToastStore.getState().success('Finca actualizada exitosamente.');
      } else {
        await fincasApi.create(payload);
        useToastStore.getState().success('Finca registrada exitosamente.');
      }
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar la finca. Verifica la conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 680,
          width: '94vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Fijo */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface)',
          }}
        >
          <div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              {finca ? 'Editar Predio / Finca' : 'Registrar Nueva Finca'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4, margin: 0 }}>
              Información de la finca, ubicación geográfica en mapa y características
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* ====================================================== */}
          {/* SECCIÓN 1: INFORMACIÓN DE LA FINCA                     */}
          {/* ====================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <FileText size={16} color="var(--color-primary)" />
              <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
                1. Información de la Finca
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Nombre del predio / finca *
              </label>
              <input
                className="input-field"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Hacienda El Paraíso, Finca San José"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Tipo de explotación
                </label>
                <select
                  className="input-field"
                  value={form.tipoExplotacion}
                  onChange={(e) => setForm((f) => ({ ...f, tipoExplotacion: e.target.value }))}
                >
                  {TIPOS_EXPLOTACION.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Estado operativo
                </label>
                <select
                  className="input-field"
                  value={form.estado}
                  onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                >
                  <option value="ACTIVA">En producción / Activa</option>
                  <option value="TRANSICION">En adecuación / Transición</option>
                  <option value="DESCANSO">En descanso / Barbecho</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Área total del predio *
                </label>
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.hectareas}
                  onChange={(e) => setForm((f) => ({ ...f, hectareas: e.target.value }))}
                  placeholder="Ej: 45.5"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Unidad
                </label>
                <select
                  className="input-field"
                  value={form.unidadMedida}
                  onChange={(e) => setForm((f) => ({ ...f, unidadMedida: e.target.value }))}
                >
                  <option value="Hectáreas">Hectáreas (ha)</option>
                  <option value="Fanegadas">Fanegadas</option>
                  <option value="Metros2">Metros² (m²)</option>
                </select>
              </div>
            </div>

            {/* Ubicación textual */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Departamento
                </label>
                <input
                  className="input-field"
                  value={form.departamento}
                  onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))}
                  placeholder="Ej: Cesar"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Municipio
                </label>
                <input
                  className="input-field"
                  value={form.municipio}
                  onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
                  placeholder="Ej: Valledupar"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Vereda o Corregimiento
                </label>
                <input
                  className="input-field"
                  value={form.vereda}
                  onChange={(e) => setForm((f) => ({ ...f, vereda: e.target.value }))}
                  placeholder="Ej: Vereda El Salguero"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Referencia de acceso
                </label>
                <input
                  className="input-field"
                  value={form.referenciaAcceso}
                  onChange={(e) => setForm((f) => ({ ...f, referenciaAcceso: e.target.value }))}
                  placeholder="Ej: Km 8 vía puente Salguero"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Descripción general o notas
              </label>
              <textarea
                className="input-field"
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                placeholder="Breve reseña de la finca, linderos o vocación productiva..."
                rows={2}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* ====================================================== */}
          {/* SECCIÓN 2: UBICACIÓN GEOGRÁFICA                        */}
          {/* ====================================================== */}
          <div
            style={{
              padding: 16,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--color-border)',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="#38bdf8" />
                <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8' }}>
                  2. Ubicación Geográfica
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                Haz clic en el mapa o busca para ubicar el predio
              </span>
            </div>

            {/* Contenedor estricto del mapa con aislamiento de stacking context */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '270px',
                borderRadius: 12,
                overflow: 'hidden',
                isolation: 'isolate',
                border: '1px solid var(--color-border)',
                zIndex: 1,
              }}
            >
              <MapPicker
                latitude={form.latitude ? parseFloat(form.latitude) : null}
                longitude={form.longitude ? parseFloat(form.longitude) : null}
                height="270px"
                onChange={({ latitude, longitude, address }) => {
                  setForm((prev) => ({
                    ...prev,
                    latitude: String(latitude),
                    longitude: String(longitude),
                    ...(address && !prev.municipio ? { municipio: address } : {}),
                  }));
                }}
              />
            </div>

            {/* Confirmar Ubicación & Coordenadas GPS */}
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', display: 'block' }}>Latitud</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: form.latitude ? '#4ade80' : 'var(--color-text-muted)' }}>
                    {form.latitude ? Number(form.latitude).toFixed(6) : 'Sin fijar'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', display: 'block' }}>Longitud</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: form.longitude ? '#4ade80' : 'var(--color-text-muted)' }}>
                    {form.longitude ? Number(form.longitude).toFixed(6) : 'Sin fijar'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={capturingGps}
                className="btn-secondary"
                style={{
                  fontSize: 12,
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: 'rgba(56, 189, 248, 0.3)',
                }}
              >
                <Compass size={14} color="#38bdf8" />
                {capturingGps ? 'Obteniendo GPS...' : 'Confirmar con GPS en Campo'}
              </button>
            </div>
          </div>

          {/* ====================================================== */}
          {/* SECCIÓN 3: CARACTERÍSTICAS AGROPECUARIAS (Expandible)   */}
          {/* ====================================================== */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                color: 'var(--color-text)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={15} color="var(--color-primary)" />
                <span>3. Características de Terreno y Actividades (Opcional)</span>
              </div>
              <ChevronDown
                size={16}
                style={{
                  transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: 'var(--color-text-muted)',
                }}
              />
            </button>

            {showAdvanced && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Tipo de suelo
                    </label>
                    <select
                      className="input-field"
                      value={form.tipoSuelo}
                      onChange={(e) => setForm((f) => ({ ...f, tipoSuelo: e.target.value }))}
                    >
                      <option value="Franco">Franco (equilibrado)</option>
                      <option value="Franco-arcilloso">Franco-arcilloso</option>
                      <option value="Franco-arenoso">Franco-arenoso</option>
                      <option value="Arcilloso">Arcilloso</option>
                      <option value="Arenoso">Arenoso</option>
                      <option value="Limoso">Limoso</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Fuente de agua
                    </label>
                    <select
                      className="input-field"
                      value={form.fuenteAgua}
                      onChange={(e) => setForm((f) => ({ ...f, fuenteAgua: e.target.value }))}
                    >
                      {FUENTES_AGUA.map((fa) => (
                        <option key={fa} value={fa}>{fa}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                      Sistema de riego
                    </label>
                    <select
                      className="input-field"
                      value={form.sistemaRiego}
                      onChange={(e) => setForm((f) => ({ ...f, sistemaRiego: e.target.value }))}
                    >
                      {SISTEMAS_RIEGO.map((sr) => (
                        <option key={sr} value={sr}>{sr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500 }}>
                    Actividades productivas desarrolladas:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                    {ACTIVIDADES_OPCIONES.map((act) => {
                      const isChecked = form.actividades.includes(act.id);
                      return (
                        <div
                          key={act.id}
                          onClick={() => toggleActividad(act.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                            background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: isChecked ? 'var(--color-text)' : 'var(--color-text-muted)',
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              border: isChecked ? 'none' : '1px solid var(--color-border)',
                              background: isChecked ? 'var(--color-primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isChecked && <CheckCircle size={10} color="#000" />}
                          </div>
                          {act.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ====================================================== */}
          {/* FOOTER FIJO CON BOTONES DE ACCIÓN                      */}
          {/* ====================================================== */}
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
              paddingBottom: 6,
              marginTop: 4,
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end',
              zIndex: 20,
            }}
          >
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading} id="btn-guardar-finca">
              {loading ? 'Guardando...' : finca ? 'Actualizar Finca' : 'Guardar Finca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para Crear Lote dentro de una Finca
function LoteModal({
  fincaId,
  onClose,
  onSave,
}: {
  fincaId: string | number;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({ name: '', area: '', soilType: 'Franco' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.area) {
      useToastStore.getState().warning('Nombre y área son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      await fincasApi.createLote(fincaId, {
        name: form.name.trim(),
        area: parseFloat(form.area),
        soilType: form.soilType || undefined,
      });
      useToastStore.getState().success('Lote / Parcela creada con éxito.');
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al crear el lote.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>Nueva Parcela / Lote</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Nombre de la parcela / potrero / estanque *
            </label>
            <input
              className="input-field"
              placeholder="Ej: Lote 1 - Arroz, Potrero La Laguna, Estanque 2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Área (hectáreas) *
              </label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 5.5"
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Tipo de suelo
              </label>
              <select
                className="input-field"
                value={form.soilType}
                onChange={(e) => setForm((f) => ({ ...f, soilType: e.target.value }))}
              >
                <option value="Franco">Franco</option>
                <option value="Arcilloso">Arcilloso</option>
                <option value="Arenoso">Arenoso</option>
                <option value="Limoso">Limoso</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Parcela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FincaDetailModal({
  finca,
  onClose,
  onEdit,
}: {
  finca: Finca;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  useEffect(() => {
    if (finca?.id) {
      setLoadingLotes(true);
      fincasApi.getLotes(finca.id)
        .then((res) => setLotes(res.data || []))
        .catch(() => setLotes(finca.lotes || []))
        .finally(() => setLoadingLotes(false));
    }
  }, [finca]);

  if (!finca) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9998 }}>
      <div className="modal-content" style={{ maxWidth: 740, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <MapPin size={22} />
            </div>
            <div>
              <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                {finca.nombre}
              </h2>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {finca.ubicacion || 'Sin ubicación específica'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Resumen KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Área Total</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginTop: 4 }}>
              {finca.hectareas} <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>ha</span>
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Tipo Explotación</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 6 }}>
              {finca.tipoExplotacion || 'Agropecuaria'}
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Parcelas</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
              {lotes.length} <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>lotes</span>
            </div>
          </div>
          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Estado Operativo</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80', marginTop: 6 }}>
              {finca.estado || 'Activa'}
            </div>
          </div>
        </div>

        {/* Descripción del Predio */}
        {finca.descripcion && (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
              Descripción del Predio
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              {finca.descripcion}
            </p>
          </div>
        )}

        {/* Mapa de Ubicación */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapIcon size={15} color="#10b981" />
            Ubicación Geográfica en Mapa
          </div>
          {finca.latitude && finca.longitude ? (
            <MapPicker
              latitude={finca.latitude}
              longitude={finca.longitude}
              readOnly={true}
              height="260px"
            />
          ) : (
            <div style={{ padding: 24, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)', fontSize: 13 }}>
              Este predio aún no cuenta con coordenadas GPS guardadas. Puedes editar la finca para ubicarlas en el mapa interactivo.
            </div>
          )}
        </div>

        {/* Parcelas / Lotes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={15} color="#38bdf8" />
            Parcelas y Lotes Registrados ({lotes.length})
          </div>
          {loadingLotes ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando parcelas...</div>
          ) : lotes.length === 0 ? (
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--color-border)', color: 'var(--color-text-subtle)', fontSize: 13, textAlign: 'center' }}>
              Sin parcelas o lotes registrados en esta finca.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {lotes.map((lote) => (
                <div key={lote.id} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{lote.nombre}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
                    <span>{lote.hectareas} ha</span>
                    {lote.tipoSuelo && <span>Suelo: {lote.tipoSuelo}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Volver
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Edit3 size={15} />
            Editar Predio
          </button>
        </div>
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
  const [viewFinca, setViewFinca] = useState<Finca | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Modal de confirmación de eliminación profesional
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'finca' | 'lote';
    id: string | number | null;
    fincaId?: string | number | null;
    name: string;
    loading: boolean;
  }>({
    isOpen: false,
    type: 'finca',
    id: null,
    name: '',
    loading: false,
  });

  // Lotes management state
  const [selectedFincaForLotes, setSelectedFincaForLotes] = useState<string | number | null>(null);
  const [fincaLotes, setFincaLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [newLoteModalFincaId, setNewLoteModalFincaId] = useState<string | number | null>(null);

  const loadFincas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fincasApi.getAll();
      setFincas(res.data);
    } catch {
      useToastStore.getState().error('Error al cargar la lista de fincas.');
    } finally {
      setLoading(false);
    }
  }, [setFincas]);

  useEffect(() => {
    loadFincas();
  }, [loadFincas]);

  const confirmDeleteAction = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      if (deleteModal.type === 'finca') {
        await fincasApi.delete(deleteModal.id);
        removeFinca(deleteModal.id);
        useToastStore.getState().success(`Finca "${deleteModal.name}" eliminada exitosamente.`);
      } else {
        await fincasApi.deleteLote(deleteModal.id);
        setFincaLotes((prev) => prev.filter((l) => l.id !== deleteModal.id));
        useToastStore.getState().success(`Parcela "${deleteModal.name}" eliminada.`);
        loadFincas();
      }
      setDeleteModal({ isOpen: false, type: 'finca', id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al realizar la eliminación.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleToggleLotes = async (fincaId: string | number) => {
    if (selectedFincaForLotes === fincaId) {
      setSelectedFincaForLotes(null);
      setFincaLotes([]);
      return;
    }
    setSelectedFincaForLotes(fincaId);
    setLoadingLotes(true);
    try {
      const res = await fincasApi.getLotes(fincaId);
      setFincaLotes(res.data || []);
    } catch {
      useToastStore.getState().error('No se pudieron cargar los lotes.');
    } finally {
      setLoadingLotes(false);
    }
  };

  const handleDeleteLote = (loteId: string | number, fincaId: string | number, loteNombre: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'lote',
      id: loteId,
      fincaId,
      name: loteNombre,
      loading: false,
    });
  };

  const filtered = fincas.filter(
    (f) =>
      f.nombre.toLowerCase().includes(search.toLowerCase()) ||
      f.ubicacion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
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
            Mis Fincas y Predios
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {fincas.length} predio{fincas.length !== 1 ? 's' : ''} registrado{fincas.length !== 1 ? 's' : ''} en la organización
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

      {/* Search & View Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 380, minWidth: 220 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }}
          />
          <input
            className="input-field"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar por predio o ubicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 4, borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              background: viewMode === 'grid' ? 'var(--color-surface)' : 'transparent',
              color: viewMode === 'grid' ? '#4ade80' : 'var(--color-text-muted)',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <LayoutGrid size={15} />
            <span>Cuadrícula</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              background: viewMode === 'map' ? 'var(--color-surface)' : 'transparent',
              color: viewMode === 'map' ? '#4ade80' : 'var(--color-text-muted)',
              boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <MapIcon size={15} />
            <span>Mapa Satelital</span>
          </button>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div style={{ marginBottom: 24 }}>
          <FincasMapOverview
            fincas={filtered}
            onSelectFinca={(f) => {
              const fullFinca = fincas.find((item) => String(item.id) === String(f.id));
              if (fullFinca) {
                setEditFinca(fullFinca);
                setModalOpen(true);
              }
            }}
            height="560px"
          />
        </div>
      ) : (
        <>
          {/* Fincas Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
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
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
            {search ? 'Sin resultados para la búsqueda' : 'Aún no has registrado fincas'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {search ? 'Intenta con otro término' : 'Comienza registrando tu primer predio o hacienda'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 18,
          }}
        >
          {filtered.map((finca) => {
            const isLotesOpen = selectedFincaForLotes === finca.id;
            return (
              <div
                key={finca.id}
                className="card glass-hover"
                style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <MapPin size={22} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setViewFinca(finca)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-primary)',
                        padding: 6,
                        borderRadius: 8,
                      }}
                      title="Ver detalles de la finca"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => { setEditFinca(finca); setModalOpen(true); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: 6,
                        borderRadius: 8,
                      }}
                      title="Editar predio"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteModal({
                        isOpen: true,
                        type: 'finca',
                        id: finca.id,
                        name: finca.nombre,
                        loading: false,
                      })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#f87171',
                        padding: 6,
                        borderRadius: 8,
                      }}
                      title="Eliminar predio"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: 'var(--color-text)' }}>
                    {finca.nombre}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                    <MapPin size={13} style={{ flexShrink: 0 }} />
                    <span>{finca.ubicacion}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--color-text-subtle)', display: 'block' }}>Área</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{finca.hectareas} ha</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--color-text-subtle)', display: 'block' }}>Suelo</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{finca.tipoSuelo || 'Franco'}</span>
                  </div>
                  {finca.latitude && finca.longitude && (
                    <div style={{ gridColumn: 'span 2', fontSize: 11, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Compass size={11} color="var(--color-primary)" />
                      <span>GPS: {finca.latitude.toFixed(4)}, {finca.longitude.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Collapsible Lotes Section */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => handleToggleLotes(finca.id)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      color: 'var(--color-primary)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} />
                      Parcelas y Lotes ({finca.lotes?.length || 0})
                    </span>
                    {isLotesOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>

                  {isLotesOpen && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {loadingLotes ? (
                        <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', padding: 8 }}>Cargando parcelas...</div>
                      ) : (
                        <>
                          {fincaLotes.length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', padding: 8 }}>
                              No hay parcelas registradas en esta finca.
                            </div>
                          ) : (
                            fincaLotes.map((lote) => (
                              <div
                                key={lote.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 10px',
                                  background: 'rgba(255,255,255,0.03)',
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 600 }}>{lote.nombre}</span>
                                  <span style={{ color: 'var(--color-text-subtle)', marginLeft: 8 }}>{lote.hectareas} ha</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLote(lote.id, finca.id, lote.nombre)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}
                                  title="Eliminar lote"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => setNewLoteModalFincaId(finca.id)}
                            className="btn-secondary"
                            style={{ fontSize: 12, padding: '6px 10px', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <Plus size={13} /> Agregar Parcela / Lote
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* Modal Finca */}
      {modalOpen && (
        <FincaModal
          finca={editFinca}
          onClose={() => setModalOpen(false)}
          onSave={loadFincas}
        />
      )}

      {/* Modal Detalle Finca (Solo Lectura) */}
      {viewFinca && (
        <FincaDetailModal
          finca={viewFinca}
          onClose={() => setViewFinca(null)}
          onEdit={() => {
            const f = viewFinca;
            setViewFinca(null);
            setEditFinca(f);
            setModalOpen(true);
          }}
        />
      )}

      {/* Modal Lote */}
      {newLoteModalFincaId && (
        <LoteModal
          fincaId={newLoteModalFincaId}
          onClose={() => setNewLoteModalFincaId(null)}
          onSave={() => {
            loadFincas();
            if (selectedFincaForLotes === newLoteModalFincaId) {
              handleToggleLotes(newLoteModalFincaId);
            }
          }}
        />
      )}

      {/* Modal Confirmación de Eliminación */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.type === 'finca' ? '¿Eliminar predio?' : '¿Eliminar parcela?'}
        itemName={deleteModal.name}
        description={
          deleteModal.type === 'finca'
            ? 'Esta acción eliminará la finca y sus parcelas asociadas. Esta acción no se puede deshacer.'
            : 'Esta acción eliminará la parcela seleccionada permanentemente.'
        }
        loading={deleteModal.loading}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ isOpen: false, type: 'finca', id: null, name: '', loading: false })}
      />
    </div>
  );
}
