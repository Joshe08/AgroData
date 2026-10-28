'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  Eye,
  Sprout,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  Lightbulb,
} from 'lucide-react';
import MapPicker from '@/components/maps/MapPicker';
import FincaParcelasMap from '@/components/maps/FincaParcelasMap';
import FincaPerimeterDrawer from '@/components/maps/FincaPerimeterDrawer';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import SearchableSelect from '@/components/common/SearchableSelect';
import { COLOMBIA_GEO, findDepartamentoGeo, findMunicipioGeo } from '@/lib/geoColombia';

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

const ESTADOS_LOTE = [
  { value: 'ACTIVO', label: 'En Producción / Cultivo Activo', color: '#22c55e' },
  { value: 'PASTOREO', label: 'Pastoreo Rotacional / Ganadería', color: '#f97316' },
  { value: 'PREPARACION', label: 'En Preparación de Suelo / Siembra', color: '#eab308' },
  { value: 'DESCANSO', label: 'En Descanso / Barbecho', color: '#a8a29e' },
  { value: 'RIEGO', label: 'Riego Intensivo / Acuícola', color: '#0ea5e9' },
  { value: 'RESERVA', label: 'Reserva Forestal / Ronda Hídrica', color: '#166534' },
];

const TIPOS_SUELO_DETALLE = [
  { value: 'Franco', label: 'Franco (Equilibrado: 40% Arena, 40% Limo, 20% Arcilla)' },
  { value: 'Arcilloso', label: 'Arcilloso (Alta retención de agua, riesgo de encharcamiento)' },
  { value: 'Arenoso', label: 'Arenoso (Drenaje rápido, requiere fertirriego frecuente)' },
  { value: 'Franco-Arcilloso', label: 'Franco-Arcilloso (Ideal para pasturas y cereales)' },
  { value: 'Franco-Arenoso', label: 'Franco-Arenoso (Muy común en valles del Cesar)' },
  { value: 'Limoso', label: 'Limoso (Suelo fértil aluvial)' },
];

// Función de diagnóstico agronómico edáfico y de manejo
function getAgronomicDiagnostics(lote: Partial<Lote>) {
  const ph = lote.ph != null && !isNaN(Number(lote.ph)) ? Number(lote.ph) : null;
  const soil = lote.tipoSuelo || 'Franco';
  const status = lote.status || 'ACTIVO';

  let phBadge = { text: 'pH Sin Medir', color: '#64748b', desc: 'Se sugiere realizar análisis químico de suelo.' };
  if (ph != null) {
    if (ph < 5.2) {
      phBadge = { text: `pH ${ph.toFixed(1)} (Fuertemente Ácido)`, color: '#ef4444', desc: 'Riesgo de bloqueo de Fósforo y toxicidad de Aluminio. Se recomienda encalado con Cal Dolomítica (1.5 - 2 t/ha).' };
    } else if (ph < 5.8) {
      phBadge = { text: `pH ${ph.toFixed(1)} (Moderadamente Ácido)`, color: '#f59e0b', desc: 'Acidez moderada típica de suelos tropicales. Aplicar materia orgánica y roca fosfórica.' };
    } else if (ph <= 7.3) {
      phBadge = { text: `pH ${ph.toFixed(1)} (Rango Óptimo)`, color: '#22c55e', desc: 'Máxima asimilación de Nitrógeno, Fósforo, Potasio y micronutrientes para los cultivos.' };
    } else {
      phBadge = { text: `pH ${ph.toFixed(1)} (Alcalino / Calcáreo)`, color: '#3b82f6', desc: 'Posible clorosis férrica o déficit de Zinc. Considerar enmiendas con yeso agrícola o azufre.' };
    }
  }

  let soilDesc = 'Suelo equilibrado con buena retención de humedad y capacidad de intercambio catiónico.';
  if (soil.includes('Arenoso')) {
    soilDesc = 'Alta tasa de infiltración y bajo contenido de materia orgánica. Requiere riegos cortos y fertilización fraccionada.';
  } else if (soil.includes('Arcilloso')) {
    soilDesc = 'Alta retención hídrica pero susceptible a compactación por pisoteo de maquinaria o ganado en época húmeda.';
  }

  let pastureTip = null;
  if (status === 'PASTOREO') {
    const ugm = lote.capacidadCarga || 1.5;
    pastureTip = `Capacidad estimada: ${ugm} UGM/ha. Se sugiere rotación con periodo de ocupación de 2 a 3 días y descanso de 25 a 35 días para recuperación de pasturas (Mombaza / Brachiaria).`;
  }

  return { phBadge, soilDesc, pastureTip };
}

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
  const [showPerimeterDrawer, setShowPerimeterDrawer] = useState(false);

  // Puntos perimetrales iniciales si existen
  const initialPerimeter = useMemo(() => {
    if (!finca?.coordenadas) return [];
    if (Array.isArray(finca.coordenadas)) {
      return finca.coordenadas.map((c: any) => ({
        lat: Array.isArray(c) ? c[0] : c.lat,
        lng: Array.isArray(c) ? c[1] : c.lng,
      }));
    }
    if (typeof finca.coordenadas === 'string') {
      try {
        const p = JSON.parse(finca.coordenadas);
        if (Array.isArray(p)) {
          return p.map((c: any) => ({
            lat: Array.isArray(c) ? c[0] : c.lat,
            lng: Array.isArray(c) ? c[1] : c.lng,
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  }, [finca?.coordenadas]);

  const [perimeterPoints, setPerimeterPoints] = useState<{ lat: number; lng: number }[]>(initialPerimeter);

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
    latitude: finca?.latitude != null ? String(finca.latitude) : '',
    longitude: finca?.longitude != null ? String(finca.longitude) : '',
    hectareas: finca?.hectareas != null ? String(finca.hectareas) : '',
    unidadMedida: finca?.unidadMedida || 'Hectáreas',
    tipoSuelo: finca?.tipoSuelo || 'Franco',
    fuenteAgua: finca?.fuenteAgua || 'Río o quebrada permanente',
    sistemaRiego: finca?.sistemaRiego || 'Secano (lluvia natural)',
    tipoAcceso: finca?.tipoAcceso || 'Carretera destapada (afirmado)',
    actividades: finca?.actividades && finca.actividades.length > 0 ? finca.actividades : ['AGRICULTURA'],
  });

  useEffect(() => {
    if (finca) {
      let dep = finca.departamento || 'Cesar';
      let mun = finca.municipio || 'Valledupar';
      let ver = finca.vereda || '';
      if ((!finca.municipio || !finca.vereda) && finca.ubicacion) {
        const parts = finca.ubicacion.split(',').map((p) => p.trim());
        if (parts.length === 3) {
          ver = parts[0];
          mun = parts[1];
          dep = parts[2];
        } else if (parts.length === 2) {
          mun = parts[0];
          dep = parts[1];
        } else if (parts.length === 1 && !finca.departamento) {
          mun = parts[0];
        }
      }

      setForm({
        nombre: finca.nombre || '',
        descripcion: finca.descripcion || '',
        tipoExplotacion: finca.tipoExplotacion || 'MIXTA',
        estado: finca.estado || 'ACTIVA',
        departamento: dep,
        municipio: mun,
        vereda: ver,
        referenciaAcceso: finca.referenciaAcceso || '',
        latitude: finca.latitude != null ? String(finca.latitude) : '',
        longitude: finca.longitude != null ? String(finca.longitude) : '',
        hectareas: finca.hectareas != null ? String(finca.hectareas) : '',
        unidadMedida: finca.unidadMedida || 'Hectáreas',
        tipoSuelo: finca.tipoSuelo || 'Franco',
        fuenteAgua: finca.fuenteAgua || 'Río o quebrada permanente',
        sistemaRiego: finca.sistemaRiego || 'Secano (lluvia natural)',
        tipoAcceso: finca.tipoAcceso || 'Carretera destapada (afirmado)',
        actividades: finca.actividades && finca.actividades.length > 0 ? finca.actividades : ['AGRICULTURA'],
      });
    }
  }, [finca]);

  // Opciones de departamentos disponibles (con Cesar prioritario)
  const departamentosOptions = useMemo(() => {
    return COLOMBIA_GEO.map((d) => ({
      label: d.nombre,
      value: d.nombre,
      subtitle: `${d.municipios.length} municipios`,
    }));
  }, []);

  // Opciones de municipios según el departamento seleccionado
  const municipiosOptions = useMemo(() => {
    const dep = findDepartamentoGeo(form.departamento);
    if (!dep) return [];
    return dep.municipios.map((m) => ({
      label: m.nombre,
      value: m.nombre,
      subtitle: `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`,
    }));
  }, [form.departamento]);

  // Al cambiar departamento: centrar coordenadas y actualizar municipios
  const handleDepartamentoChange = (nuevoDep: string) => {
    const depGeo = findDepartamentoGeo(nuevoDep);
    if (depGeo) {
      const primerMun = depGeo.municipios[0];
      setForm((prev) => ({
        ...prev,
        departamento: depGeo.nombre,
        municipio: primerMun ? primerMun.nombre : '',
        latitude: primerMun ? String(primerMun.lat) : String(depGeo.lat),
        longitude: primerMun ? String(primerMun.lng) : String(depGeo.lng),
      }));
    } else {
      setForm((prev) => ({ ...prev, departamento: nuevoDep }));
    }
  };

  // Al cambiar municipio: actualizar coordenadas automáticamente para centrar el mapa
  const handleMunicipioChange = (nuevoMun: string) => {
    const munGeo = findMunicipioGeo(form.departamento, nuevoMun);
    if (munGeo) {
      setForm((prev) => ({
        ...prev,
        municipio: munGeo.nombre,
        latitude: String(munGeo.lat),
        longitude: String(munGeo.lng),
      }));
      useToastStore.getState().info(`Ubicación: ${munGeo.nombre}, ${form.departamento}. Mapa georreferenciado.`);
    } else {
      setForm((prev) => ({ ...prev, municipio: nuevoMun }));
    }
  };

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
        coordenadas: perimeterPoints.length >= 3 ? perimeterPoints : undefined,
        descripcion: form.descripcion || undefined,
        tipoExplotacion: form.tipoExplotacion,
        estado: form.estado,
        tipoSuelo: form.tipoSuelo,
        fuenteAgua: form.fuenteAgua,
        sistemaRiego: form.sistemaRiego,
        tipoAcceso: form.tipoAcceso,
        departamento: form.departamento,
        municipio: form.municipio,
        vereda: form.vereda,
        referenciaAcceso: form.referenciaAcceso,
        actividades: form.actividades,
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar la finca. Verifica la conexión.';
      useToastStore.getState().error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: 720,
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
              Información de la finca, linderos geográficos y características agronómicas
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
            gap: 20,
          }}
        >
          {/* Identificación */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
              Nombre de la Finca o Hacienda *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Hacienda Nápoles, Finca El Porvenir"
              className="input-field"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
                Área Total (Hectáreas) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="Ej: 50"
                className="input-field"
                value={form.hectareas}
                onChange={(e) => setForm({ ...form, hectareas: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>
                Tipo de Explotación Principal
              </label>
              <select
                className="input-field"
                value={form.tipoExplotacion}
                onChange={(e) => setForm({ ...form, tipoExplotacion: e.target.value })}
              >
                {TIPOS_EXPLOTACION.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ubicación Política con Buscador Filtrable de Departamento y Municipio */}
          <div className="form-grid-3-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
                Departamento *
              </label>
              <SearchableSelect
                options={departamentosOptions}
                value={form.departamento}
                onChange={handleDepartamentoChange}
                placeholder="Seleccionar departamento..."
                searchPlaceholder="Buscar departamento (ej: Cesar)..."
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
                Municipio *
              </label>
              <SearchableSelect
                options={municipiosOptions}
                value={form.municipio}
                onChange={handleMunicipioChange}
                placeholder="Seleccionar municipio..."
                searchPlaceholder="Buscar municipio (ej: Valledupar)..."
                disabled={!form.departamento}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
                Corregimiento / Vereda
              </label>
              <input
                type="text"
                placeholder="Ej: Aguas Blancas, Caracolí"
                className="input-field"
                value={form.vereda}
                onChange={(e) => setForm({ ...form, vereda: e.target.value })}
              />
            </div>
          </div>

          {/* SECCIÓN: DELIMITACIÓN GEOGRÁFICA MANUAL POR PUNTOS */}
          <div style={{ border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: '16px', background: 'rgba(16, 185, 129, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Compass size={16} />
                  <span>Zona Geográfica de la Finca (Trazado Satelital por Puntos)</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Marca los vértices del predio haciendo clic sobre el mapa para delimitar su perímetro real.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPerimeterDrawer(!showPerimeterDrawer)}
                className="btn-secondary"
                style={{ fontSize: 11, padding: '4px 10px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
              >
                {showPerimeterDrawer ? 'Ocultar Trazador' : perimeterPoints.length >= 3 ? `Ver Perímetro (${perimeterPoints.length} vértices)` : 'Abrir Trazador de Puntos'}
              </button>
            </div>

            {showPerimeterDrawer ? (
              <div style={{ marginTop: 10 }}>
                <FincaPerimeterDrawer
                  initialPoints={perimeterPoints}
                  centerLat={form.latitude ? parseFloat(form.latitude) : 10.4631}
                  centerLng={form.longitude ? parseFloat(form.longitude) : -73.2532}
                  targetHectareas={form.hectareas ? parseFloat(form.hectareas) : 10}
                  onPointsChange={(pts, computedArea) => {
                    setPerimeterPoints(pts);
                    if (pts.length >= 3 && computedArea > 0) {
                      setForm((prev) => ({ ...prev, hectareas: String(computedArea) }));
                      const sumLat = pts.reduce((s, p) => s + p.lat, 0);
                      const sumLng = pts.reduce((s, p) => s + p.lng, 0);
                      setForm((prev) => ({
                        ...prev,
                        latitude: (sumLat / pts.length).toFixed(6),
                        longitude: (sumLng / pts.length).toFixed(6),
                      }));
                    } else if (pts.length > 0 && (!form.latitude || !form.longitude)) {
                      setForm((prev) => ({
                        ...prev,
                        latitude: String(pts[0].lat),
                        longitude: String(pts[0].lng),
                      }));
                    }
                  }}
                  height="340px"
                />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {perimeterPoints.length >= 3 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Linderos delimitados con {perimeterPoints.length} puntos ({form.hectareas || '0'} ha).
                  </span>
                ) : (
                  <span>Aún no has trazado los vértices manuales del predio. Pulsa &quot;Abrir Trazador de Puntos&quot; para marcarlos en el mapa satelital.</span>
                )}
              </div>
            )}
          </div>

          {/* Coordenadas GPS Sede */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                Coordenadas GPS de la Sede (Latitud / Longitud)
              </label>
              <button
                type="button"
                onClick={handleCaptureGps}
                disabled={capturingGps}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#38bdf8' }}
              >
                <Compass size={13} />
                <span>{capturingGps ? 'Capturando...' : 'GPS Actual'}</span>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input
                type="number"
                step="0.000001"
                placeholder="Latitud (ej: 10.4631)"
                className="input-field"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
              <input
                type="number"
                step="0.000001"
                placeholder="Longitud (ej: -73.2532)"
                className="input-field"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </div>
          </div>

          {/* Opciones avanzadas */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <SlidersHorizontal size={14} />
              <span>{showAdvanced ? 'Ocultar características edáficas e hídricas' : 'Ver características de suelo, agua y actividades'}</span>
            </button>

            {showAdvanced && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-grid-2-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Suelo Predominante</label>
                    <select
                      className="input-field"
                      value={form.tipoSuelo}
                      onChange={(e) => setForm({ ...form, tipoSuelo: e.target.value })}
                    >
                      <option value="Franco">Franco</option>
                      <option value="Arcilloso">Arcilloso</option>
                      <option value="Arenoso">Arenoso</option>
                      <option value="Franco-Arcilloso">Franco-Arcilloso</option>
                      <option value="Franco-Arenoso">Franco-Arenoso</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Fuente de Agua</label>
                    <select
                      className="input-field"
                      value={form.fuenteAgua}
                      onChange={(e) => setForm({ ...form, fuenteAgua: e.target.value })}
                    >
                      {FUENTES_AGUA.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Sistema de Riego</label>
                    <select
                      className="input-field"
                      value={form.sistemaRiego}
                      onChange={(e) => setForm({ ...form, sistemaRiego: e.target.value })}
                    >
                      {SISTEMAS_RIEGO.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>Tipo de Acceso Vial</label>
                    <select
                      className="input-field"
                      value={form.tipoAcceso}
                      onChange={(e) => setForm({ ...form, tipoAcceso: e.target.value })}
                    >
                      {TIPOS_ACCESO.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>Actividades Productivas</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ACTIVIDADES_OPCIONES.map((act) => {
                      const isSel = form.actividades.includes(act.id);
                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => toggleActividad(act.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: 'pointer',
                            border: isSel ? '1px solid #10b981' : '1px solid var(--color-border)',
                            background: isSel ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                            color: isSel ? '#34d399' : 'var(--color-text-muted)',
                            fontWeight: isSel ? 600 : 400,
                          }}
                        >
                          {act.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Form */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#10b981' }}>
              {loading ? 'Guardando...' : finca ? 'Actualizar Predio' : 'Registrar Finca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Rápido para Delimitar la Zona de la Finca mediante Puntos
function FincaPerimeterModal({
  finca,
  onClose,
  onSave,
}: {
  finca: Finca;
  onClose: () => void;
  onSave: () => void;
}) {
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>(() => {
    if (!finca.coordenadas) return [];
    if (Array.isArray(finca.coordenadas)) {
      return finca.coordenadas.map((c: any) => ({
        lat: Array.isArray(c) ? c[0] : c.lat,
        lng: Array.isArray(c) ? c[1] : c.lng,
      }));
    }
    if (typeof finca.coordenadas === 'string') {
      try {
        const p = JSON.parse(finca.coordenadas);
        if (Array.isArray(p)) return p.map((c: any) => ({ lat: Array.isArray(c) ? c[0] : c.lat, lng: Array.isArray(c) ? c[1] : c.lng }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [computedArea, setComputedArea] = useState<number>(finca.hectareas || 0);
  const [loading, setLoading] = useState(false);

  const handleSavePerimeter = async () => {
    if (points.length < 3) {
      useToastStore.getState().warning('Debes marcar al menos 3 vértices para cerrar el perímetro de la finca.');
      return;
    }
    setLoading(true);
    try {
      const sumLat = points.reduce((acc, p) => acc + p.lat, 0);
      const sumLng = points.reduce((acc, p) => acc + p.lng, 0);
      const centroidLat = parseFloat((sumLat / points.length).toFixed(6));
      const centroidLng = parseFloat((sumLng / points.length).toFixed(6));

      await fincasApi.update(finca.id, {
        coordenadas: points,
        latitude: centroidLat,
        longitude: centroidLng,
        hectareas: computedArea > 0 ? computedArea : finca.hectareas,
      });
      useToastStore.getState().success(`Zona perimetral de "${finca.nombre}" guardada con éxito (${computedArea.toFixed(2)} ha).`);
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar la zona geográfica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: 780, width: '94vw', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Compass size={22} color="#10b981" />
            <div>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Delimitar Zona Perimetral de la Finca
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                Predio: <strong>{finca.nombre}</strong> • Arrastra los puntos sobre el mapa satelital para ajustar los linderos
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <FincaPerimeterDrawer
          initialPoints={points}
          centerLat={finca.latitude || 10.4631}
          centerLng={finca.longitude || -73.2532}
          targetHectareas={finca.hectareas}
          onPointsChange={(pts, area) => {
            setPoints(pts);
            setComputedArea(area);
          }}
          height="460px"
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {points.length >= 3 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Perímetro cerrado: {points.length} puntos delimitados • Superficie: {computedArea.toFixed(2)} ha
              </span>
            ) : (
              <span>Marca al menos 3 puntos en el mapa para cerrar el polígono predial.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              type="button"
              onClick={handleSavePerimeter}
              disabled={loading || points.length < 3}
              className="btn-primary"
              style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={15} />
              <span>{loading ? 'Guardando...' : 'Guardar Zona de la Finca'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal Agronómico para Crear o Editar Parcela / Lote
function LoteAgronomicModal({
  fincaId,
  finca,
  lote,
  initialOpenMap = false,
  onClose,
  onSave,
}: {
  fincaId: string | number;
  finca?: Finca | null;
  lote?: Lote | null;
  initialOpenMap?: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showMapDrawer, setShowMapDrawer] = useState(initialOpenMap);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number }[]>(() => {
    if (!lote?.coordenadas) return [];
    if (Array.isArray(lote.coordenadas)) {
      return lote.coordenadas.map((c: any) => ({
        lat: Array.isArray(c) ? Number(c[0]) : Number(c.lat),
        lng: Array.isArray(c) ? Number(c[1]) : Number(c.lng),
      }));
    }
    if (typeof lote.coordenadas === 'string') {
      try {
        const p = JSON.parse(lote.coordenadas);
        if (Array.isArray(p)) {
          return p.map((c: any) => ({
            lat: Array.isArray(c) ? Number(c[0]) : Number(c.lat),
            lng: Array.isArray(c) ? Number(c[1]) : Number(c.lng),
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  });
  const [measuredHa, setMeasuredHa] = useState<number>(0);

  const fincaPerimeterPoints = useMemo<{ lat: number; lng: number }[]>(() => {
    if (!finca?.coordenadas) return [];
    if (Array.isArray(finca.coordenadas)) {
      return finca.coordenadas.map((c: any) => ({
        lat: Array.isArray(c) ? Number(c[0]) : Number(c.lat),
        lng: Array.isArray(c) ? Number(c[1]) : Number(c.lng),
      }));
    }
    if (typeof finca.coordenadas === 'string') {
      try {
        const p = JSON.parse(finca.coordenadas);
        if (Array.isArray(p)) {
          return p.map((c: any) => ({
            lat: Array.isArray(c) ? Number(c[0]) : Number(c.lat),
            lng: Array.isArray(c) ? Number(c[1]) : Number(c.lng),
          }));
        }
      } catch {
        return [];
      }
    }
    return [];
  }, [finca?.coordenadas]);

  const [form, setForm] = useState({
    name: lote?.nombre || '',
    area: lote?.hectareas ? String(lote.hectareas) : '',
    status: lote?.status || 'ACTIVO',
    soilType: lote?.tipoSuelo || 'Franco',
    cultivoActual: lote?.cultivoActual || '',
    sistemaRiego: lote?.sistemaRiego || 'Secano (lluvia natural)',
    topografia: lote?.topografia || 'PLANO',
    ph: lote?.ph != null ? String(lote.ph) : '',
    capacidadCarga: lote?.capacidadCarga != null ? String(lote.capacidadCarga) : '',
    coberturaVegetal: lote?.coberturaVegetal || '',
    notas: lote?.notas || '',
  });

  const totalFincaHa = finca?.hectareas || 0;
  const existingLotesHa = useMemo(() => {
    if (!finca || !Array.isArray(finca.lotes)) return 0;
    return finca.lotes
      .filter((l) => !lote || String(l.id) !== String(lote.id))
      .reduce((sum, l) => sum + (l.hectareas || 0), 0);
  }, [finca, lote]);

  const remainingHa = Math.max(0, parseFloat((totalFincaHa - existingLotesHa).toFixed(2)));

  const diagnostics = useMemo(() => {
    return getAgronomicDiagnostics({
      tipoSuelo: form.soilType,
      ph: form.ph ? parseFloat(form.ph) : null,
      status: form.status,
      capacidadCarga: form.capacidadCarga ? parseFloat(form.capacidadCarga) : null,
    });
  }, [form.soilType, form.ph, form.status, form.capacidadCarga]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      useToastStore.getState().warning('El nombre del lote o potrero es obligatorio.');
      return;
    }
    if (!form.area || parseFloat(form.area) <= 0) {
      useToastStore.getState().warning('Indica un área válida en hectáreas.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        area: parseFloat(form.area),
        soilType: form.soilType,
        status: form.status,
        cultivoActual: form.cultivoActual || undefined,
        sistemaRiego: form.sistemaRiego,
        topografia: form.topografia,
        ph: form.ph ? parseFloat(form.ph) : null,
        capacidadCarga: form.capacidadCarga ? parseFloat(form.capacidadCarga) : null,
        coberturaVegetal: form.coberturaVegetal || undefined,
        coordenadas: coordenadas && coordenadas.length >= 3 ? coordenadas : undefined,
        notas: form.notas || undefined,
      };

      if (lote) {
        await fincasApi.updateLote(lote.id, payload);
        useToastStore.getState().success(`Parcela "${form.name}" actualizada con éxito.`);
      } else {
        await fincasApi.createLote(fincaId, payload);
        useToastStore.getState().success(`Parcela "${form.name}" registrada con éxito.`);
      }
      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar la parcela. Verifica la conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: showMapDrawer ? 760 : 580,
          width: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          transition: 'max-width 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={22} color="#22c55e" />
            <div>
              <h3 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {lote ? 'Editar Ficha Agronómica de Parcela' : 'Registrar Nueva Parcela / Lote'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
                Parámetros edáficos, estado de cultivo y zonificación en mapa
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Identificación */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Nombre de la Parcela, Lote o Potrero *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Lote 1 - Maíz Híbrido, Potrero La Cabaña, Tablón 4"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-grid-2-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Área (Hectáreas) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                placeholder="Ej: 5.5"
                className="input-field"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
              {totalFincaHa > 0 && (
                <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Info size={12} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <span>
                    Finca: <strong>{totalFincaHa} ha</strong> • Disponible: <strong style={{ color: remainingHa >= (parseFloat(form.area) || 0) ? '#34d399' : '#f87171' }}>{remainingHa} ha</strong>
                  </span>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Estado Operativo del Lote
              </label>
              <select
                className="input-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {ESTADOS_LOTE.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Delimitación Perimetral de la Parcela en el Mapa */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.04)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="#10b981" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    Delimitación de la Parcela en el Mapa
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {coordenadas.length >= 3
                      ? `Parcela delimitada con ${coordenadas.length} vértices exactos.`
                      : 'Ubica la parcela en su posición real trazando su polígono dentro de la finca.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMapDrawer(!showMapDrawer)}
                className="btn-secondary"
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  borderColor: showMapDrawer ? '#10b981' : undefined,
                  background: showMapDrawer ? 'rgba(16,185,129,0.15)' : undefined,
                }}
              >
                <Compass size={13} color="#10b981" />
                <span>{showMapDrawer ? 'Cerrar trazador' : coordenadas.length >= 3 ? 'Editar perímetro en mapa' : 'Delimitar en mapa satelital'}</span>
              </button>
            </div>

            {showMapDrawer && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: 'var(--color-text-subtle)', flexWrap: 'wrap', gap: 6 }}>
                  <span>Haz clic en el mapa satelital para trazar los vértices de esta parcela. El contorno azul discontinuo muestra los linderos de la finca.</span>
                  {coordenadas.length >= 3 && measuredHa > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, area: String(measuredHa) })}
                      style={{
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid #10b981',
                        color: '#10b981',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Copiar las hectáreas medidas directamente al campo Área"
                    >
                      <CheckCircle2 size={12} />
                      Aplicar área medida: {measuredHa} ha
                    </button>
                  )}
                </div>

                <FincaPerimeterDrawer
                  initialPoints={coordenadas}
                  referencePolygon={fincaPerimeterPoints}
                  referenceLabel={finca?.nombre ? `Límite Finca: ${finca.nombre}` : undefined}
                  centerLat={finca?.latitude ? Number(finca.latitude) : 10.4631}
                  centerLng={finca?.longitude ? Number(finca.longitude) : -73.2532}
                  targetHectareas={parseFloat(form.area) || 5}
                  height="340px"
                  onPointsChange={(pts, areaHa) => {
                    setCoordenadas(pts);
                    setMeasuredHa(areaHa);
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Cultivo Actual o Variedad de Pasto
            </label>
            <input
              type="text"
              placeholder="Ej: Maíz ICA V-109, Pasto Guinea Mombasa, Palma de Aceite, Café Castillo"
              className="input-field"
              value={form.cultivoActual}
              onChange={(e) => setForm({ ...form, cultivoActual: e.target.value })}
            />
          </div>

          {/* Edafología */}
          <div className="form-grid-2-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Textura del Suelo
              </label>
              <select
                className="input-field"
                value={form.soilType}
                onChange={(e) => setForm({ ...form, soilType: e.target.value })}
              >
                {TIPOS_SUELO_DETALLE.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                pH del Suelo (Acidez)
              </label>
              <input
                type="number"
                step="0.1"
                min="3.0"
                max="10.0"
                placeholder="Ej: 6.2 (rango 4.0 - 9.0)"
                className="input-field"
                value={form.ph}
                onChange={(e) => setForm({ ...form, ph: e.target.value })}
              />
            </div>
          </div>

          {/* Banner de Diagnóstico Edafológico en Vivo */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--color-border)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11, background: `${diagnostics.phBadge.color}25`, color: diagnostics.phBadge.color, border: `1px solid ${diagnostics.phBadge.color}40` }}>
                {diagnostics.phBadge.text}
              </span>
              <span style={{ color: 'var(--color-text-subtle)' }}>Diagnóstico Agronómico</span>
            </div>
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
              {diagnostics.phBadge.desc}
            </p>
            {diagnostics.pastureTip && (
              <p style={{ margin: '6px 0 0', color: '#f97316', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={13} style={{ flexShrink: 0 }} />
                <span>{diagnostics.pastureTip}</span>
              </p>
            )}
          </div>

          {/* Riego y Topografía */}
          <div className="form-grid-2-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Topografía / Pendiente
              </label>
              <select
                className="input-field"
                value={form.topografia}
                onChange={(e) => setForm({ ...form, topografia: e.target.value })}
              >
                <option value="PLANO">Plano (0-3% pendiente)</option>
                <option value="LIGERA_PENDIENTE">Ligera Pendiente (3-7%)</option>
                <option value="ONDULADO">Ondulado (7-12%)</option>
                <option value="QUEBRADO">Quebrado (más del 12%)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                Sistema de Riego
              </label>
              <select
                className="input-field"
                value={form.sistemaRiego}
                onChange={(e) => setForm({ ...form, sistemaRiego: e.target.value })}
              >
                {SISTEMAS_RIEGO.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
              Recomendaciones y Notas Agronómicas
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Historial de siembra, rotación de cultivos, fertilización aplicada..."
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#22c55e' }}>
              {loading ? 'Guardando...' : lote ? 'Actualizar Parcela' : 'Crear Parcela'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Detalle de Finca con Mapa Satelital de Lotes
function FincaDetailModal({
  finca,
  onClose,
  onEdit,
  onOpenLoteModal,
  onOpenPerimeterModal,
}: {
  finca: Finca;
  onClose: () => void;
  onEdit: () => void;
  onOpenLoteModal: (fincaId: string | number, lote?: Lote, openMap?: boolean) => void;
  onOpenPerimeterModal: (finca: Finca) => void;
}) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);

  useEffect(() => {
    if (finca?.id) {
      fincasApi.getLotes(finca.id)
        .then((res) => {
          setLotes(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedLote(res.data[0]);
          }
        })
        .catch(() => setLotes(finca.lotes || []));
    }
  }, [finca]);

  if (!finca) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9998 }}>
      <div
        className="modal-content"
        style={{ maxWidth: 860, width: '94vw', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Superficie</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
              {finca.hectareas} <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>ha</span>
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Parcelas</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
              {lotes.length} <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>lotes</span>
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Suelo</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 4 }}>
              {finca.tipoSuelo || 'Franco'}
            </div>
          </div>
          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', fontWeight: 600, textTransform: 'uppercase' }}>Riego</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399', marginTop: 4 }}>
              {finca.sistemaRiego || 'Secano'}
            </div>
          </div>
        </div>

        {/* Visor Satelital de Parcelas y Zona Perimetral */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={16} color="#22c55e" />
              <span>Zona Perimetral de la Finca y Parcelas</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onOpenPerimeterModal(finca)}
                className="btn-secondary"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#10b981',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  borderRadius: 10,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Compass size={14} color="#10b981" />
                <span>Delimitar Zona Finca</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenLoteModal(finca.id)}
                className="btn-primary"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '6px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 10,
                  boxShadow: '0 3px 12px rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Plus size={14} />
                <span>Nueva Parcela</span>
              </button>
            </div>
          </div>

          <FincaParcelasMap
            finca={finca}
            lotes={lotes}
            selectedLoteId={selectedLote?.id}
            onSelectLote={(l) => setSelectedLote(l)}
            height="380px"
          />
        </div>

        {/* Ficha de la Parcela Seleccionada */}
        {selectedLote && (
          <div style={{ padding: '14px 16px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                  {selectedLote.nombre}
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  ({selectedLote.hectareas} ha • {((selectedLote.hectareas / (finca.hectareas || 1)) * 100).toFixed(0)}% del predio)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => onOpenLoteModal(finca.id, selectedLote, true)}
                  className="btn-secondary"
                  style={{ padding: '3px 9px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}
                  title="Delimitar el polígono de esta parcela en el mapa satelital"
                >
                  <Compass size={12} color="#10b981" /> Delimitar en Mapa
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLoteModal(finca.id, selectedLote, false)}
                  className="btn-secondary"
                  style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Edit3 size={11} /> Editar Parcela
                </button>
              </div>
            </div>
            {selectedLote.cultivoActual && (
              <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sprout size={13} color="#22c55e" />
                <span>Cultivo / Forraje: {selectedLote.cultivoActual}</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Suelo: <strong>{selectedLote.tipoSuelo || 'Franco'}</strong> • Pendiente: <strong>{selectedLote.topografia || 'Plana'}</strong> • Riego: <strong>{selectedLote.sistemaRiego || 'Secano'}</strong>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Volver</button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Edit3 size={15} /> Editar Predio
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

  // Modos de vista: Cuadrícula, Mapa General de Fincas, o Visor Satelital de Parcelas
  const [viewMode, setViewMode] = useState<'grid' | 'parcelas'>('grid');

  // Estado para el Visor Satelital de Parcelas
  const [selectedFincaIdForMap, setSelectedFincaIdForMap] = useState<string | number | null>(null);
  const [mapViewerLotes, setMapViewerLotes] = useState<Lote[]>([]);
  const [selectedLoteInMap, setSelectedLoteInMap] = useState<Lote | null>(null);

  // Modal para Delimitar Perímetro de Finca
  const [perimeterModalFinca, setPerimeterModalFinca] = useState<Finca | null>(null);

  // Modal Lote Agronómico
  const [loteModalData, setLoteModalData] = useState<{
    isOpen: boolean;
    fincaId: string | number;
    lote?: Lote | null;
    openMap?: boolean;
  } | null>(null);

  // Modal Confirmación Eliminación
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

  // Lotes desplegables en tarjetas
  const [selectedFincaForLotes, setSelectedFincaForLotes] = useState<string | number | null>(null);
  const [fincaLotes, setFincaLotes] = useState<Lote[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  const loadFincas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fincasApi.getAll();
      setFincas(res.data);
      if (res.data && res.data.length > 0 && !selectedFincaIdForMap) {
        setSelectedFincaIdForMap(res.data[0].id);
      }
    } catch (err: any) {
      console.error('Error al cargar fincas:', err);
      const msg = err.response?.data?.message || 'Error al cargar la lista de fincas.';
      useToastStore.getState().error(msg);
    } finally {
      setLoading(false);
    }
  }, [setFincas, selectedFincaIdForMap]);

  useEffect(() => {
    loadFincas();
  }, [loadFincas]);

  // Cargar lotes cuando cambia la finca activa en el Visor Satelital de Parcelas
  useEffect(() => {
    if (selectedFincaIdForMap) {
      fincasApi.getLotes(selectedFincaIdForMap)
        .then((res) => {
          const list = res.data || [];
          setMapViewerLotes(list);
          if (list.length > 0) {
            setSelectedLoteInMap(list[0]);
          } else {
            setSelectedLoteInMap(null);
          }
        })
        .catch(() => setMapViewerLotes([]));
    }
  }, [selectedFincaIdForMap]);

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
        setMapViewerLotes((prev) => prev.filter((l) => l.id !== deleteModal.id));
        if (selectedLoteInMap?.id === deleteModal.id) {
          setSelectedLoteInMap(null);
        }
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

  const currentMapFinca = useMemo(() => {
    return fincas.find((f) => String(f.id) === String(selectedFincaIdForMap)) || fincas[0] || null;
  }, [fincas, selectedFincaIdForMap]);

  const activeDiagnostics = useMemo(() => {
    if (!selectedLoteInMap) return null;
    return getAgronomicDiagnostics(selectedLoteInMap);
  }, [selectedLoteInMap]);

  const filtered = fincas.filter(
    (f) =>
      f.nombre.toLowerCase().includes(search.toLowerCase()) ||
      f.ubicacion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fincas-container" style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 40, width: '100%', minWidth: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Mis Fincas y Parcelas Agronómicas
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Monitoreo satelital, delimitación geográfica de linderos y diagnósticos agronómicos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setEditFinca(undefined); setModalOpen(true); }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#10b981' }}
            id="btn-nueva-finca"
          >
            <Plus size={18} />
            Nueva Finca
          </button>
        </div>
      </div>

      {/* Switcher de Vistas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div className="fincas-search-box" style={{ position: 'relative', flex: 1, maxWidth: 360, minWidth: 200, width: '100%' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }}
          />
          <input
            className="input-field"
            style={{ paddingLeft: 38, width: '100%' }}
            placeholder="Buscar por predio o vereda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="fincas-view-switcher" style={{ display: 'flex', background: 'var(--color-surface-2)', padding: 4, borderRadius: 10, border: '1px solid var(--color-border)', gap: 4 }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
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
            <span>Predios</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('parcelas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: viewMode === 'parcelas' ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              color: viewMode === 'parcelas' ? '#22c55e' : 'var(--color-text-muted)',
              borderBottom: viewMode === 'parcelas' ? '2px solid #22c55e' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <Layers size={15} />
            <span>Visor de Parcelas</span>
          </button>
        </div>
      </div>

      {/* MODO 1: VISOR SATELITAL DE PARCELAS Y ZONA PERIMETRAL */}
      {viewMode === 'parcelas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Barra de Selección y Métricas de la Finca */}
          <div className="card fincas-toolbar-card">
            <div className="fincas-toolbar-finca-selector" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', flexShrink: 0 }}>
                <Layers size={22} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>
                  Finca Activa en Visor:
                </label>
                <select
                  className="input-field"
                  style={{ marginTop: 2, padding: '5px 10px', fontSize: 13, fontWeight: 600, width: '100%', minWidth: 160 }}
                  value={selectedFincaIdForMap || ''}
                  onChange={(e) => setSelectedFincaIdForMap(e.target.value)}
                >
                  {fincas.map((f) => (
                    <option key={f.id} value={f.id}>{f.nombre} ({f.hectareas} ha)</option>
                  ))}
                </select>
              </div>
            </div>

            {currentMapFinca && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1, justifyContent: 'space-between', minWidth: 0, width: '100%' }}>
                <div className="fincas-kpi-strip">
                  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--color-text-subtle)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Superficie</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 13 }}>{currentMapFinca.hectareas} ha</span>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--color-text-subtle)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Parcelado</span>
                    <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: 13 }}>
                      {mapViewerLotes.reduce((sum, l) => sum + (l.hectareas || 0), 0)} ha
                    </span>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--color-text-subtle)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Área Libre</span>
                    <span style={{ fontWeight: 700, color: '#34d399', fontSize: 13 }}>
                      {Math.max(0, parseFloat((currentMapFinca.hectareas - mapViewerLotes.reduce((sum, l) => sum + (l.hectareas || 0), 0)).toFixed(2)))} ha
                    </span>
                  </div>
                </div>

                <div className="fincas-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setPerimeterModalFinca(currentMapFinca)}
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 13,
                      fontWeight: 600,
                      padding: '8px 16px',
                      color: '#10b981',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      borderRadius: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    title="Delimitar zona geográfica del predio mediante puntos manuales"
                  >
                    <Compass size={15} color="#10b981" />
                    <span>Delimitar Finca</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoteModalData({ isOpen: true, fincaId: currentMapFinca.id })}
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 13,
                      fontWeight: 700,
                      padding: '8px 18px',
                      borderRadius: 10,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Plus size={15} />
                    <span>Nueva Parcela</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Grid: Mapa Satelital + Ficha Agronómica Flotante */}
          <div className="fincas-map-viewer-grid">
            {/* Mapa de Parcelas y Zona Perimetral */}
            <div style={{ minWidth: 0, width: '100%' }}>
              {currentMapFinca ? (
                <FincaParcelasMap
                  finca={currentMapFinca}
                  lotes={mapViewerLotes}
                  selectedLoteId={selectedLoteInMap?.id}
                  onSelectLote={(l) => setSelectedLoteInMap(l)}
                  height="clamp(380px, 55vh, 560px)"
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No tienes predios registrados para inspeccionar parcelas.
                </div>
              )}
            </div>

            {/* Panel Agronómico de Parcela */}
            <div style={{ minWidth: 0, width: '100%' }}>
            {selectedLoteInMap ? (
              <div
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ overflow: 'hidden', paddingRight: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>
                      Ficha Agronómica
                    </span>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedLoteInMap.nombre}>
                      {selectedLoteInMap.nombre}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setLoteModalData({
                          isOpen: true,
                          fincaId: selectedLoteInMap.fincaId || currentMapFinca?.id || '',
                          lote: selectedLoteInMap,
                          openMap: true,
                        })
                      }
                      className="btn-secondary"
                      style={{ padding: '5px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}
                      title="Delimitar el polígono de esta parcela en el mapa satelital"
                    >
                      <Compass size={13} color="#10b981" /> Delimitar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLoteModalData({
                          isOpen: true,
                          fincaId: selectedLoteInMap.fincaId || currentMapFinca?.id || '',
                          lote: selectedLoteInMap,
                          openMap: false,
                        })
                      }
                      className="btn-secondary"
                      style={{ padding: '5px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                      title="Editar parámetros del lote"
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                  </div>
                </div>

                {/* Métricas del Lote */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>Área del Lote</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                      {selectedLoteInMap.hectareas} ha
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>% del Predio</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>
                      {(((selectedLoteInMap.hectareas || 0) / (currentMapFinca?.hectareas || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Cultivo / Variedad */}
                {selectedLoteInMap.cultivoActual ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>Cultivo / Forraje</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }} title={selectedLoteInMap.cultivoActual}>
                      <Sprout size={13} color="#22c55e" />
                      <span>{selectedLoteInMap.cultivoActual}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                    Sin cultivo asignado (editar lote para definirlo).
                  </div>
                )}

                {/* Diagnóstico Edafológico */}
                {activeDiagnostics && (
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Suelo: {selectedLoteInMap.tipoSuelo || 'Franco'}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: activeDiagnostics.phBadge.color, flexShrink: 0 }}>
                        {activeDiagnostics.phBadge.text}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {activeDiagnostics.soilDesc}
                    </p>
                    <p style={{ margin: '6px 0 0', color: 'var(--color-text-subtle)', fontSize: 11, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Lightbulb size={12} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <span>{activeDiagnostics.phBadge.desc}</span>
                    </p>
                  </div>
                )}

                {/* Parámetros de Manejo */}
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--color-text-muted)' }}>
                  <div>Sistema Riego: <strong style={{ color: 'var(--color-text)' }}>{selectedLoteInMap.sistemaRiego || 'Secano'}</strong></div>
                  <div>Topografía: <strong style={{ color: 'var(--color-text)' }}>{selectedLoteInMap.topografia || 'Plano'}</strong></div>
                  {selectedLoteInMap.capacidadCarga && (
                    <div>Capacidad Ganadera: <strong style={{ color: '#f97316' }}>{selectedLoteInMap.capacidadCarga} UGM/ha</strong></div>
                  )}
                </div>

                {selectedLoteInMap.notas && (
                  <div style={{ padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 11, color: 'var(--color-text-subtle)', wordBreak: 'break-word', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <FileText size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{selectedLoteInMap.notas}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentMapFinca) {
                        setLoteModalData({
                          isOpen: true,
                          fincaId: currentMapFinca.id,
                          lote: selectedLoteInMap,
                          openMap: true,
                        });
                      }
                    }}
                    className="btn-primary"
                    style={{ flex: 1, fontSize: 12, padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#10b981' }}
                  >
                    <Compass size={13} />
                    Delimitar Parcela
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentMapFinca) {
                        setDeleteModal({
                          isOpen: true,
                          type: 'lote',
                          id: selectedLoteInMap.id,
                          fincaId: currentMapFinca.id,
                          name: selectedLoteInMap.nombre,
                          loading: false,
                        });
                      }
                    }}
                    className="btn-secondary"
                    style={{ color: '#f87171', fontSize: 12, padding: '7px 12px' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="card"
                style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Layers size={32} color="#38bdf8" style={{ opacity: 0.5 }} />
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Inspección de Parcela</div>
                <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  Haz clic sobre cualquier lote en el mapa satelital para ver su ficha técnica, textura de suelo, pH y recomendaciones agronómicas.
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: CUADRÍCULA DE PREDIOS */}
      {viewMode === 'grid' && (
        <>
          {loading ? (
            <div className="responsive-cards-grid">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
              <MapPin size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
                {search ? 'Sin resultados para la búsqueda' : 'Aún no has registrado fincas'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {search ? 'Intenta con otro término' : 'Comienza registrando tu primer predio o hacienda'}
              </p>
            </div>
          ) : (
            <div className="responsive-cards-grid">
              {filtered.map((finca) => {
                const isLotesOpen = selectedFincaForLotes === finca.id;
                return (
                  <div
                    key={finca.id}
                    className="card glass-hover"
                    style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 6, borderRadius: 8 }}
                          title="Ver detalles de la finca"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => { setEditFinca(finca); setModalOpen(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 6, borderRadius: 8 }}
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
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 6, borderRadius: 8 }}
                          title="Eliminar predio"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={finca.nombre}>
                        {finca.nombre}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        <MapPin size={13} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finca.ubicacion}</span>
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
                    </div>

                    {/* Botones rápidos de mapa y linderos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFincaIdForMap(finca.id);
                          setViewMode('parcelas');
                        }}
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' }}
                      >
                        <Layers size={13} />
                        <span>Ver en Mapa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPerimeterModalFinca(finca)}
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                      >
                        <Compass size={13} />
                        <span>Delimitar</span>
                      </button>
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
                                    <div style={{ overflow: 'hidden', paddingRight: 6, minWidth: 0, flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lote.nombre}</span>
                                        <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>({lote.hectareas} ha)</span>
                                      </div>
                                      {lote.cultivoActual && (
                                        <div style={{ color: '#22c55e', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lote.cultivoActual}</div>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => setLoteModalData({ isOpen: true, fincaId: finca.id, lote, openMap: true })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', padding: 2 }}
                                        title="Delimitar parcela en mapa satelital"
                                      >
                                        <Compass size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setLoteModalData({ isOpen: true, fincaId: finca.id, lote, openMap: false })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                                        title="Editar lote"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteModal({
                                            isOpen: true,
                                            type: 'lote',
                                            id: lote.id,
                                            fincaId: finca.id,
                                            name: lote.nombre,
                                            loading: false,
                                          });
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}
                                        title="Eliminar lote"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                              <button
                                type="button"
                                onClick={() => setLoteModalData({ isOpen: true, fincaId: finca.id })}
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

      {/* Modal Finca (Crear/Editar) */}
      {modalOpen && (
        <FincaModal
          finca={editFinca}
          onClose={() => setModalOpen(false)}
          onSave={loadFincas}
        />
      )}

      {/* Modal Delimitar Perímetro de Finca (Manual por Puntos) */}
      {perimeterModalFinca && (
        <FincaPerimeterModal
          finca={perimeterModalFinca}
          onClose={() => setPerimeterModalFinca(null)}
          onSave={loadFincas}
        />
      )}

      {/* Modal Detalle Finca con Mapa Satelital de Lotes */}
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
          onOpenLoteModal={(fincaId, lote, openMap) => {
            setLoteModalData({ isOpen: true, fincaId, lote, openMap });
          }}
          onOpenPerimeterModal={(f) => {
            setPerimeterModalFinca(f);
          }}
        />
      )}

      {/* Modal Agronómico de Parcela / Lote */}
      {loteModalData && loteModalData.isOpen && (
        <LoteAgronomicModal
          fincaId={loteModalData.fincaId}
          finca={fincas.find((f) => String(f.id) === String(loteModalData.fincaId))}
          lote={loteModalData.lote}
          initialOpenMap={loteModalData.openMap}
          onClose={() => setLoteModalData(null)}
          onSave={() => {
            loadFincas();
            if (selectedFincaForLotes === loteModalData.fincaId) {
              handleToggleLotes(loteModalData.fincaId);
            }
            if (selectedFincaIdForMap === loteModalData.fincaId) {
              fincasApi.getLotes(loteModalData.fincaId).then((res) => {
                setMapViewerLotes(res.data || []);
              });
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
