'use client';

import { useEffect, useState, useCallback } from 'react';
import { produccionesApi, fincasApi } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  Sprout,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Calendar,
  Layers,
  MapPin,
  Tag,
  CheckCircle2,
  Clock,
  BarChart2,
} from 'lucide-react';
import DeleteConfirmModal from '@/components/common/DeleteConfirmModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Produccion {
  id: string | number;
  tipo: string;
  variedad?: string;
  estado: string;
  fechaInicio: string;
  fechaEstimadaCosecha?: string;
  cantidadSembrada?: number;
  unidadMedida?: string;
  fincaId: string | number;
  loteId?: string;
  finca?: { id: string | number; nombre: string };
  lote?: { id: string; nombre: string };
  metadata?: Record<string, any>;
}

interface Finca {
  id: string | number;
  nombre: string;
}

interface Lote {
  id: string;
  name?: string;
  nombre?: string;
  area?: number;
  hectareas?: number;
}

const ESTADO_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  PLANIFICACION: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', label: 'Planificación' },
  SIEMBRA: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: 'Siembra / Ingreso' },
  CRECIMIENTO: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', label: 'En desarrollo / Levante' },
  COSECHA: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', label: 'Cosecha / Producción activa' },
  FINALIZADO: { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', label: 'Finalizado' },
  ACTIVE: { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', label: 'Activo' },
};

function ProduccionModal({
  prod,
  fincas,
  onClose,
  onSave,
}: {
  prod?: Produccion;
  fincas: Finca[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [fincaId, setFincaId] = useState<string | number>(
    prod?.fincaId || prod?.finca?.id || fincas[0]?.id || ''
  );
  const [tipo, setTipo] = useState<string>(prod?.tipo || 'AGRICULTURA');
  const [estado, setEstado] = useState<string>(prod?.estado || 'PLANIFICACION');
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteId, setLoteId] = useState<string>(prod?.loteId || '');
  const [nuevoLoteNombre, setNuevoLoteNombre] = useState('');
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic parameters by domain
  const [agri, setAgri] = useState({
    cultivo: prod?.metadata?.cultivo || prod?.variedad || '',
    variedad: prod?.metadata?.variedad || '',
    areaSembrada: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Hectáreas',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    sistemaCultivo: prod?.metadata?.sistemaCultivo || 'Secano',
    rendimientoEstimado: prod?.metadata?.rendimientoEstimado || '',
  });

  const [cafe, setCafe] = useState({
    variedad: prod?.metadata?.variedadCafe || 'Castillo',
    area: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    numArboles: prod?.metadata?.numArboles || '',
    densidad: prod?.metadata?.densidad || '5000 árboles/ha',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    produccionEstimadaCargas: prod?.metadata?.produccionEstimadaCargas || '',
  });

  const [ganado, setGanado] = useState({
    especie: prod?.metadata?.especie || 'Bovino',
    proposito: prod?.metadata?.proposito || 'Doble Propósito',
    raza: prod?.metadata?.raza || 'Brahman / Gyr',
    cantidadCabezas: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    pesoPromedioInicial: prod?.metadata?.pesoPromedioInicial || '',
    sistemaPastoreo: prod?.metadata?.sistemaPastoreo || 'Pastoreo Rotacional con cerca eléctrica',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
  });

  const [pesca, setPesca] = useState({
    especie: prod?.metadata?.especiePez || 'Tilapia roja',
    cantidadAlevinos: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    pesoInicialGramos: prod?.metadata?.pesoInicialGramos || '',
    pesoObjetivoGramos: prod?.metadata?.pesoObjetivoGramos || '500',
    densidadPecesM2: prod?.metadata?.densidadPecesM2 || '',
    fechaSiembra: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    kilosEstimados: prod?.metadata?.kilosEstimados || '',
  });

  const [aves, setAves] = useState({
    galpon: prod?.metadata?.galpon || '',
    tipoAve: prod?.metadata?.tipoAve || 'Pollo de engorde',
    lineaRaza: prod?.metadata?.lineaRaza || 'Ross 308',
    cantidad: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaSalida: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    produccionEsperada: prod?.metadata?.produccionEsperada || '',
    unidadEsperada: prod?.metadata?.unidadEsperada || 'Kilos de carne',
  });

  const [porcinos, setPorcinos] = useState({
    corral: prod?.metadata?.corral || '',
    tipoExplotacion: prod?.metadata?.tipoExplotacion || 'Ceba / Engorde',
    lineaRaza: prod?.metadata?.lineaRaza || 'Pietrain / Landrace',
    cantidad: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    pesoInicialKg: prod?.metadata?.pesoInicialKg || '25',
    pesoObjetivoKg: prod?.metadata?.pesoObjetivoKg || '105',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaSalida: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
  });

  const [otra, setOtra] = useState({
    nombreActividad: prod?.variedad || '',
    cantidad: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Unidades',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaFin: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    descripcion: prod?.metadata?.descripcion || '',
  });

  const [apic, setApic] = useState({
    tipoAbeja: prod?.metadata?.tipoAbeja || 'Apis mellifera (Africanizada)',
    numColmenas: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    proposito: prod?.metadata?.proposito || 'Miel',
    floraPredominante: prod?.metadata?.floraPredominante || '',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    kilosEstimados: prod?.metadata?.kilosEstimados || '',
  });

  // Load lotes when fincaId changes
  const fetchLotes = useCallback(async (fId: string | number) => {
    if (!fId) return;
    setLoadingLotes(true);
    try {
      const res = await fincasApi.getLotes(fId);
      const fetched: Lote[] = res.data || [];
      setLotes(fetched);
      if (fetched.length > 0) {
        setLoteId(fetched[0].id);
      } else {
        setLoteId('__NUEVO__');
      }
    } catch {
      useToastStore.getState().error('No se pudieron consultar las parcelas de la finca.');
    } finally {
      setLoadingLotes(false);
    }
  }, []);

  useEffect(() => {
    if (fincaId) {
      fetchLotes(fincaId);
    }
  }, [fincaId, fetchLotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fincaId) {
      useToastStore.getState().warning('Debes seleccionar una finca.');
      return;
    }

    setLoading(true);
    try {
      // 1. Resolve or create Lote if necessary
      let finalLoteId = loteId;
      if (finalLoteId === '__NUEVO__' || !finalLoteId) {
        const nombreParcela = nuevoLoteNombre.trim() || `${tipo.charAt(0) + tipo.slice(1).toLowerCase()} - Lote 1`;
        const resLote = await fincasApi.createLote(fincaId, {
          name: nombreParcela,
          area: 1,
        });
        finalLoteId = resLote.data.id;
      }

      // 2. Prepare payload based on Domain
      let name = '';
      let startDate = '';
      let endDate: string | undefined = undefined;
      let expectedYield: number | undefined = undefined;
      let unit = '';
      let metadata: Record<string, any> = {};

      if (tipo === 'AGRICULTURA') {
        name = `${agri.cultivo || 'Cultivo'} - ${agri.variedad || 'Lote'}`;
        startDate = agri.fechaInicio;
        endDate = agri.fechaCosecha || undefined;
        expectedYield = agri.areaSembrada ? parseFloat(agri.areaSembrada) : undefined;
        unit = agri.unidad;
        metadata = { ...agri, tipoProduccion: 'AGRICULTURA' };
      } else if (tipo === 'CAFICULTURA') {
        name = `Café ${cafe.variedad}`;
        startDate = cafe.fechaInicio;
        endDate = cafe.fechaCosecha || undefined;
        expectedYield = cafe.area ? parseFloat(cafe.area) : undefined;
        unit = 'Hectáreas';
        metadata = { ...cafe, tipoProduccion: 'CAFICULTURA' };
      } else if (tipo === 'GANADERIA') {
        name = `${ganado.especie} - ${ganado.proposito}`;
        startDate = ganado.fechaInicio;
        expectedYield = ganado.cantidadCabezas ? parseFloat(ganado.cantidadCabezas) : undefined;
        unit = 'Cabezas';
        metadata = { ...ganado, tipoProduccion: 'GANADERIA' };
      } else if (tipo === 'PISCICULTURA') {
        name = `Piscicultura ${pesca.especie}`;
        startDate = pesca.fechaSiembra;
        endDate = pesca.fechaCosecha || undefined;
        expectedYield = pesca.cantidadAlevinos ? parseFloat(pesca.cantidadAlevinos) : undefined;
        unit = 'Alevinos / Peces';
        metadata = { ...pesca, tipoProduccion: 'PISCICULTURA' };
      } else if (tipo === 'APICULTURA') {
        name = `Apiario - ${apic.numColmenas || '0'} Colmenas (${apic.proposito})`;
        startDate = apic.fechaInicio;
        endDate = apic.fechaCosecha || undefined;
        expectedYield = apic.numColmenas ? parseFloat(apic.numColmenas) : undefined;
        unit = 'Colmenas';
        metadata = { ...apic, tipoProduccion: 'APICULTURA' };
      } else if (tipo === 'AVICULTURA') {
        name = `Avicultura - ${aves.tipoAve} (${aves.lineaRaza || 'Lote'})`;
        startDate = aves.fechaInicio;
        endDate = aves.fechaSalida || undefined;
        expectedYield = aves.cantidad ? parseFloat(aves.cantidad) : undefined;
        unit = 'Aves';
        metadata = { ...aves, tipoProduccion: 'AVICULTURA' };
      } else if (tipo === 'PORCICULTURA') {
        name = `Porcicultura - ${porcinos.tipoExplotacion} (${porcinos.lineaRaza || 'Cerdos'})`;
        startDate = porcinos.fechaInicio;
        endDate = porcinos.fechaSalida || undefined;
        expectedYield = porcinos.cantidad ? parseFloat(porcinos.cantidad) : undefined;
        unit = 'Cerdos';
        metadata = { ...porcinos, tipoProduccion: 'PORCICULTURA' };
      } else {
        name = otra.nombreActividad || 'Actividad Agropecuaria';
        startDate = otra.fechaInicio;
        endDate = otra.fechaFin || undefined;
        expectedYield = otra.cantidad ? parseFloat(otra.cantidad) : undefined;
        unit = otra.unidad || 'Unidades';
        metadata = { ...otra, tipoProduccion: 'OTRA' };
      }

      const payload = {
        name,
        type: tipo,
        status: estado,
        startDate,
        endDate,
        expectedYield,
        unit,
        fincaId,
        loteId: finalLoteId,
        metadata,
      };

      if (prod) {
        await produccionesApi.update(prod.id, payload);
        useToastStore.getState().success('Producción actualizada exitosamente.');
      } else {
        await produccionesApi.create(payload);
        useToastStore.getState().success('Producción iniciada exitosamente.');
      }

      onSave();
      onClose();
    } catch {
      useToastStore.getState().error('Error al guardar la producción. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 680, width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
              {prod ? 'Editar Ciclo Productivo' : 'Iniciar Nueva Producción'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
              Planificación técnica de cultivos, ganado o especies menores
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Base: Finca and Sector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Finca / Predio *
              </label>
              <select
                className="input-field"
                value={fincaId}
                onChange={(e) => setFincaId(e.target.value)}
                required
              >
                {fincas.map((fi) => (
                  <option key={fi.id} value={fi.id}>{fi.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Tipo de Producción *
              </label>
              <select
                className="input-field"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
              >
                <option value="AGRICULTURA">Agricultura (Cultivo / Cosecha)</option>
                <option value="CAFICULTURA">Caficultura (Café)</option>
                <option value="GANADERIA">Ganadería (Bovino / Bufalino / Menor)</option>
                <option value="PISCICULTURA">Piscicultura (Peces / Estanques)</option>
                <option value="AVICULTURA">Avicultura (Aves / Galpón)</option>
                <option value="PORCICULTURA">Porcicultura (Cerdos / Corral)</option>
                <option value="APICULTURA">Apicultura (Abejas / Miel / Apiario)</option>
                <option value="OTRA">Otra Actividad Productiva</option>
              </select>
            </div>
          </div>

          {/* Lote / Parcela Selection */}
          <div style={{ padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600 }}>
                Parcela, Lote o Potrero en {fincas.find(f => String(f.id) === String(fincaId))?.nombre || 'la finca'} *
              </label>
              <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                {loadingLotes ? 'Cargando parcelas...' : `${lotes.length} parcelas encontradas`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: loteId === '__NUEVO__' ? '1fr 1fr' : '1fr', gap: 10 }}>
              <select
                className="input-field"
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                required
              >
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre || l.name} ({l.hectareas || l.area || 1} ha)
                  </option>
                ))}
                <option value="__NUEVO__">+ Crear nueva parcela / potrero para esta producción</option>
              </select>

              {loteId === '__NUEVO__' && (
                <input
                  className="input-field"
                  placeholder="Nombre de la nueva parcela (Ej: Lote 2, Potrero Norte)"
                  value={nuevoLoteNombre}
                  onChange={(e) => setNuevoLoteNombre(e.target.value)}
                  required
                />
              )}
            </div>
          </div>

          {/* DYNAMIC FORM 1: AGRICULTURA */}
          {tipo === 'AGRICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cultivo principal *
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Arroz, Maíz tecnificado, Palma, Yuca"
                    value={agri.cultivo}
                    onChange={(e) => setAgri((a) => ({ ...a, cultivo: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Variedad / Híbrido
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Fedearroz 68, Pioneer 30F35"
                    value={agri.variedad}
                    onChange={(e) => setAgri((a) => ({ ...a, variedad: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Área sembrada (Hectáreas) *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={agri.areaSembrada}
                    onChange={(e) => setAgri((a) => ({ ...a, areaSembrada: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Sistema de cultivo
                  </label>
                  <select
                    className="input-field"
                    value={agri.sistemaCultivo}
                    onChange={(e) => setAgri((a) => ({ ...a, sistemaCultivo: e.target.value }))}
                  >
                    <option value="Secano">Secano (temporal de lluvias)</option>
                    <option value="Riego por goteo">Riego por goteo</option>
                    <option value="Riego por gravedad / inundación">Riego por gravedad / inundación</option>
                    <option value="Aspersión">Aspersión</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de siembra / inicio *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={agri.fechaInicio}
                    onChange={(e) => setAgri((a) => ({ ...a, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha estimada de cosecha
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={agri.fechaCosecha}
                    onChange={(e) => setAgri((a) => ({ ...a, fechaCosecha: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 2: CAFICULTURA */}
          {tipo === 'CAFICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Variedad de Café *
                  </label>
                  <select
                    className="input-field"
                    value={cafe.variedad}
                    onChange={(e) => setCafe((c) => ({ ...c, variedad: e.target.value }))}
                  >
                    <option value="Castillo">Castillo (resistente a roya)</option>
                    <option value="Cenicafé 1">Cenicafé 1</option>
                    <option value="Caturra">Caturra</option>
                    <option value="Colombia">Variedad Colombia</option>
                    <option value="Borbón">Borbón / Borbón Rosado</option>
                    <option value="Tabi">Tabi</option>
                    <option value="Geisha">Geisha (Café especial)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Área de lote (Hectáreas) *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 3.5"
                    value={cafe.area}
                    onChange={(e) => setCafe((c) => ({ ...c, area: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Número estimado de árboles
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 15000"
                    value={cafe.numArboles}
                    onChange={(e) => setCafe((c) => ({ ...c, numArboles: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Densidad de siembra
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: 5.000 árboles/ha"
                    value={cafe.densidad}
                    onChange={(e) => setCafe((c) => ({ ...c, densidad: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de siembra / renovación *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={cafe.fechaInicio}
                    onChange={(e) => setCafe((c) => ({ ...c, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Inicio estimado de recolección
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={cafe.fechaCosecha}
                    onChange={(e) => setCafe((c) => ({ ...c, fechaCosecha: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 3: GANADERIA */}
          {tipo === 'GANADERIA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Especie *
                  </label>
                  <select
                    className="input-field"
                    value={ganado.especie}
                    onChange={(e) => setGanado((g) => ({ ...g, especie: e.target.value }))}
                  >
                    <option value="Bovino">Bovino (Ganado vacuno)</option>
                    <option value="Bufalino">Bufalino (Búfalos)</option>
                    <option value="Ovino">Ovino (Ovejas / Carneros)</option>
                    <option value="Caprino">Caprino (Cabras)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Orientación productiva *
                  </label>
                  <select
                    className="input-field"
                    value={ganado.proposito}
                    onChange={(e) => setGanado((g) => ({ ...g, proposito: e.target.value }))}
                  >
                    <option value="Ceba / Carne">Ceba / Engorde (Carne)</option>
                    <option value="Lechería">Lechería especializada</option>
                    <option value="Doble Propósito">Doble Propósito (Carne y Leche)</option>
                    <option value="Cría y Levante">Cría y Levante</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cantidad de animales (cabezas) *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 35"
                    value={ganado.cantidadCabezas}
                    onChange={(e) => setGanado((g) => ({ ...g, cantidadCabezas: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Raza / Biotipo
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Brahman blanco, Gyr, F1 Angus"
                    value={ganado.raza}
                    onChange={(e) => setGanado((g) => ({ ...g, raza: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Sistema de pastoreo
                  </label>
                  <select
                    className="input-field"
                    value={ganado.sistemaPastoreo}
                    onChange={(e) => setGanado((g) => ({ ...g, sistemaPastoreo: e.target.value }))}
                  >
                    <option value="Pastoreo Rotacional">Pastoreo Rotacional intensivo</option>
                    <option value="Silvopastoril">Sistema Silvopastoril</option>
                    <option value="Pastoreo Continuo">Pastoreo Continuo</option>
                    <option value="Estabulado / Confinamiento">Estabulado / Confinamiento</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de ingreso al potrero *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={ganado.fechaInicio}
                    onChange={(e) => setGanado((g) => ({ ...g, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 4: PISCICULTURA */}
          {tipo === 'PISCICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Especie *
                  </label>
                  <select
                    className="input-field"
                    value={pesca.especie}
                    onChange={(e) => setPesca((p) => ({ ...p, especie: e.target.value }))}
                  >
                    <option value="Tilapia roja">Tilapia roja (Oreochromis)</option>
                    <option value="Tilapia negra">Tilapia negra / Nilótica</option>
                    <option value="Cachama blanca">Cachama blanca</option>
                    <option value="Trucha arcoiris">Trucha arcoíris</option>
                    <option value="Bocachico">Bocachico</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cantidad sembrada (alevinos) *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 5000"
                    value={pesca.cantidadAlevinos}
                    onChange={(e) => setPesca((p) => ({ ...p, cantidadAlevinos: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Peso inicial prom. (gramos)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.1"
                    placeholder="Ej: 1.5"
                    value={pesca.pesoInicialGramos}
                    onChange={(e) => setPesca((p) => ({ ...p, pesoInicialGramos: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Peso objetivo a cosecha (gramos)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 500"
                    value={pesca.pesoObjetivoGramos}
                    onChange={(e) => setPesca((p) => ({ ...p, pesoObjetivoGramos: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de siembra *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={pesca.fechaSiembra}
                    onChange={(e) => setPesca((p) => ({ ...p, fechaSiembra: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha estimada de cosecha
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={pesca.fechaCosecha}
                    onChange={(e) => setPesca((p) => ({ ...p, fechaCosecha: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 5: AVICULTURA */}
          {tipo === 'AVICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Tipo de ave *
                  </label>
                  <select
                    className="input-field"
                    value={aves.tipoAve}
                    onChange={(e) => setAves((a) => ({ ...a, tipoAve: e.target.value }))}
                  >
                    <option value="Pollo de engorde">Pollo de engorde</option>
                    <option value="Gallina ponedora">Gallina ponedora (Huevos)</option>
                    <option value="Codorniz">Codorniz</option>
                    <option value="Pavo">Pavo / Gallipavo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Línea genética / Raza
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Ross 308, Cobb 500, Hy-Line Brown"
                    value={aves.lineaRaza}
                    onChange={(e) => setAves((a) => ({ ...a, lineaRaza: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cantidad de aves (animales) *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 1000"
                    value={aves.cantidad}
                    onChange={(e) => setAves((a) => ({ ...a, cantidad: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Identificador de Galpón
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Galpón 1 - Climatizado"
                    value={aves.galpon}
                    onChange={(e) => setAves((a) => ({ ...a, galpon: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de encasetamiento / ingreso *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={aves.fechaInicio}
                    onChange={(e) => setAves((a) => ({ ...a, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha estimada de salida / beneficio
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={aves.fechaSalida}
                    onChange={(e) => setAves((a) => ({ ...a, fechaSalida: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 6: PORCICULTURA */}
          {tipo === 'PORCICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Orientación productiva *
                  </label>
                  <select
                    className="input-field"
                    value={porcinos.tipoExplotacion}
                    onChange={(e) => setPorcinos((p) => ({ ...p, tipoExplotacion: e.target.value }))}
                  >
                    <option value="Ceba / Engorde">Ceba / Engorde</option>
                    <option value="Cría y Lechones">Cría y Venta de Lechones</option>
                    <option value="Ciclo Completo">Ciclo Completo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Raza / Cruzamiento
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Pietrain x Duroc, Landrace"
                    value={porcinos.lineaRaza}
                    onChange={(e) => setPorcinos((p) => ({ ...p, lineaRaza: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cantidad de cerdos *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 60"
                    value={porcinos.cantidad}
                    onChange={(e) => setPorcinos((p) => ({ ...p, cantidad: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Identificador de Corral / Cochera
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Corral B-2"
                    value={porcinos.corral}
                    onChange={(e) => setPorcinos((p) => ({ ...p, corral: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Peso inicial prom. (kg)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.5"
                    placeholder="Ej: 25"
                    value={porcinos.pesoInicialKg}
                    onChange={(e) => setPorcinos((p) => ({ ...p, pesoInicialKg: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Peso objetivo (kg)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.5"
                    placeholder="Ej: 105"
                    value={porcinos.pesoObjetivoKg}
                    onChange={(e) => setPorcinos((p) => ({ ...p, pesoObjetivoKg: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de ingreso / inicio ceba *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={porcinos.fechaInicio}
                    onChange={(e) => setPorcinos((p) => ({ ...p, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha estimada de beneficio / salida
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={porcinos.fechaSalida}
                    onChange={(e) => setPorcinos((p) => ({ ...p, fechaSalida: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 6: APICULTURA */}
          {tipo === 'APICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Tipo / Especie de abeja *
                  </label>
                  <select
                    className="input-field"
                    value={apic.tipoAbeja}
                    onChange={(e) => setApic((a) => ({ ...a, tipoAbeja: e.target.value }))}
                  >
                    <option value="Apis mellifera (Africanizada)">Apis mellifera (Africanizada)</option>
                    <option value="Apis mellifera (Europea/Italiana)">Apis mellifera (Europea/Italiana)</option>
                    <option value="Meliponas (Sin aguijón)">Meliponas (Sin aguijón)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Propósito productivo
                  </label>
                  <select
                    className="input-field"
                    value={apic.proposito}
                    onChange={(e) => setApic((a) => ({ ...a, proposito: e.target.value }))}
                  >
                    <option value="Miel">Miel de abejas</option>
                    <option value="Polen">Polen</option>
                    <option value="Propóleo">Propóleo</option>
                    <option value="Cera">Cera</option>
                    <option value="Polinización">Servicio de Polinización</option>
                    <option value="Núcleos">Venta de Núcleos / Reinas</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Número de colmenas activas *
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    min="1"
                    placeholder="Ej: 20"
                    value={apic.numColmenas}
                    onChange={(e) => setApic((a) => ({ ...a, numColmenas: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Flora predominante / Melífera
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Café, Eucalipto, Cítricos, Bosque nativo"
                    value={apic.floraPredominante}
                    onChange={(e) => setApic((a) => ({ ...a, floraPredominante: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de postura / inicio *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={apic.fechaInicio}
                    onChange={(e) => setApic((a) => ({ ...a, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha estimada de cosecha / castra
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={apic.fechaCosecha}
                    onChange={(e) => setApic((a) => ({ ...a, fechaCosecha: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Producción estimada (kg de miel por ciclo)
                </label>
                <input
                  className="input-field"
                  type="number"
                  step="0.1"
                  placeholder="Ej: 350"
                  value={apic.kilosEstimados}
                  onChange={(e) => setApic((a) => ({ ...a, kilosEstimados: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* DYNAMIC FORM 8: OTRA ACTIVIDAD */}
          {tipo === 'OTRA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Nombre de la actividad o rubro *
                </label>
                <input
                  className="input-field"
                  placeholder="Ej: Silvopastoreo maderable, Lombricultura, Forraje hidropónico"
                  value={otra.nombreActividad}
                  onChange={(e) => setOtra((o) => ({ ...o, nombreActividad: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cantidad estimada
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    placeholder="Ej: 100"
                    value={otra.cantidad}
                    onChange={(e) => setOtra((o) => ({ ...o, cantidad: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Unidad de medida
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: Toneladas, Litros, Kilos, Árboles"
                    value={otra.unidad}
                    onChange={(e) => setOtra((o) => ({ ...o, unidad: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha de inicio *
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={otra.fechaInicio}
                    onChange={(e) => setOtra((o) => ({ ...o, fechaInicio: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Fecha estimada de cierre
                  </label>
                  <input
                    className="input-field"
                    type="date"
                    value={otra.fechaFin}
                    onChange={(e) => setOtra((o) => ({ ...o, fechaFin: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Descripción u observaciones
                </label>
                <textarea
                  className="input-field"
                  placeholder="Detalles sobre el manejo técnico de esta actividad..."
                  rows={2}
                  value={otra.descripcion}
                  onChange={(e) => setOtra((o) => ({ ...o, descripcion: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Estado de la Producción */}
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Estado del ciclo productivo
            </label>
            <select
              className="input-field"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="PLANIFICACION">Planificación</option>
              <option value="SIEMBRA">Siembra / Ingreso</option>
              <option value="CRECIMIENTO">Crecimiento / En desarrollo</option>
              <option value="COSECHA">Cosecha / Producción activa</option>
              <option value="FINALIZADO">Ciclo completado</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : prod ? 'Actualizar Producción' : 'Iniciar Producción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProduccionesPage() {
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFinca, setFiltroFinca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editProd, setEditProd] = useState<Produccion | undefined>();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: number | string | null;
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
      const [prodsRes, fincasRes] = await Promise.allSettled([
        produccionesApi.getAll(),
        fincasApi.getAll(),
      ]);
      if (prodsRes.status === 'fulfilled') {
        setProducciones(Array.isArray(prodsRes.value.data) ? prodsRes.value.data : []);
      }
      if (fincasRes.status === 'fulfilled') {
        setFincas(Array.isArray(fincasRes.value.data) ? fincasRes.value.data : []);
      }
      if (prodsRes.status === 'rejected' && fincasRes.status === 'rejected') {
        useToastStore.getState().error('No se pudo sincronizar con el servidor de producciones.');
      }
    } catch (err) {
      console.error('Error al cargar datos de producciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const confirmDeleteProduccion = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, loading: true }));
    try {
      await produccionesApi.delete(deleteModal.id);
      setProducciones((p) => p.filter((x) => x.id !== deleteModal.id));
      useToastStore.getState().success('Producción eliminada exitosamente.');
      setDeleteModal({ isOpen: false, id: null, name: '', loading: false });
    } catch {
      useToastStore.getState().error('Error al eliminar la producción.');
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = (p: Produccion) => {
    setDeleteModal({
      isOpen: true,
      id: p.id,
      name: `${p.tipo} ${p.variedad ? `(${p.variedad})` : ''}`,
      loading: false,
    });
  };

  const filtered = producciones.filter((p) => {
    const matchSearch =
      (p.tipo || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.variedad || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.finca?.nombre || '').toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo ? p.tipo === filtroTipo : true;
    const matchFinca = filtroFinca ? String(p.fincaId) === String(filtroFinca) : true;
    return matchSearch && matchTipo && matchFinca;
  });

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
            Ciclos de Producción
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            {producciones.length} ciclo{producciones.length !== 1 ? 's' : ''} registrado{producciones.length !== 1 ? 's' : ''} en tus predios
          </p>
        </div>
        <button
          onClick={() => { setEditProd(undefined); setModalOpen(true); }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          id="btn-nueva-produccion"
        >
          <Plus size={18} />
          Nueva Producción
        </button>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-subtle)' }}
          />
          <input
            className="input-field"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar por variedad, especie o predio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: 160 }}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los sectores</option>
          <option value="AGRICULTURA">Agricultura</option>
          <option value="CAFICULTURA">Caficultura</option>
          <option value="GANADERIA">Ganadería</option>
          <option value="PISCICULTURA">Piscicultura</option>
          <option value="AVICULTURA">Avicultura</option>
          <option value="PORCICULTURA">Porcicultura</option>
          <option value="APICULTURA">Apicultura</option>
        </select>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: 160 }}
          value={filtroFinca}
          onChange={(e) => setFiltroFinca(e.target.value)}
        >
          <option value="">Todas las fincas</option>
          {fincas.map((f) => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 76, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-subtle)' }}>
          <Sprout size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
            {search || filtroTipo || filtroFinca ? 'No hay resultados con los filtros aplicados' : 'No tienes producciones activas'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            Planifica o registra un nuevo ciclo de producción para monitorear cosechas y rendimiento.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Producción / Sector</th>
                  <th>Predio y Parcela</th>
                  <th>Estado</th>
                  <th>Fecha Inicio</th>
                  <th>Cosecha / Salida</th>
                  <th>Escala / Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const badge = ESTADO_BADGES[p.estado] || ESTADO_BADGES['PLANIFICACION'];
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                          {p.tipo}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {p.variedad || p.metadata?.cultivo || p.metadata?.especie || 'Producción general'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>
                          {p.finca?.nombre || `Finca #${p.fincaId}`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Layers size={11} />
                          {p.lote?.nombre || 'Lote principal'}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.text,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} />
                          {p.fechaInicio ? format(new Date(p.fechaInicio), 'd MMM yyyy', { locale: es }) : '-'}
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {p.fechaEstimadaCosecha
                          ? format(new Date(p.fechaEstimadaCosecha), 'd MMM yyyy', { locale: es })
                          : '-'}
                      </td>
                      <td style={{ color: 'var(--color-text)', fontSize: 13, fontWeight: 500 }}>
                        {p.cantidadSembrada ? `${p.cantidadSembrada} ${p.unidadMedida || ''}` : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setEditProd(p); setModalOpen(true); }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-muted)',
                              padding: 6,
                              borderRadius: 8,
                            }}
                            title="Editar producción"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#f87171',
                              padding: 6,
                              borderRadius: 8,
                            }}
                            title="Eliminar producción"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <ProduccionModal
          prod={editProd}
          fincas={fincas}
          onClose={() => setModalOpen(false)}
          onSave={loadData}
        />
      )}

      {/* Modal Confirmación Eliminación Producción */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar lote de producción?"
        itemName={deleteModal.name}
        description="Esta acción eliminará el ciclo productivo, rendimientos proyectados y registros de siembra asociados."
        loading={deleteModal.loading}
        onConfirm={confirmDeleteProduccion}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: '', loading: false })}
      />
    </div>
  );
}
