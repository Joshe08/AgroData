'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  ListFilter,
  PenTool,
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

// ─── Catálogos Agronómicos y Pecuarios del Cesar y Colombia ─────────────────

interface CropPreset {
  nombre: string;
  variedades: string[];
  unidadSugerida: string;
  unidadesDisponibles: string[];
  sistemaRiegoDefault: string;
  duracionEstimadaMeses: number;
}

const CATALOGO_CULTIVOS: Record<string, CropPreset> = {
  'Palma de Aceite': {
    nombre: 'Palma de Aceite',
    variedades: ['Híbrido OxG (Coari x Olifera)', 'Tenera (Deli x Nigeria)', 'Deli x Ghana', 'Deli x La Mé', 'Compacta'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Toneladas (RFF)', 'Kilos', 'Palmas sembradas'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 36,
  },
  'Arroz': {
    nombre: 'Arroz',
    variedades: ['Fedearroz 68', 'Fedearroz 400', 'Fedearroz 67', 'Fedearroz 2000', 'Llanero 1', 'Iniap 12'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Bultos (50 kg)', 'Toneladas', 'Kilos'],
    sistemaRiegoDefault: 'Riego por gravedad / inundación',
    duracionEstimadaMeses: 4,
  },
  'Maíz Tecnificado': {
    nombre: 'Maíz Tecnificado',
    variedades: ['Pioneer 30F35', 'Dekalb DK-7088', 'Advanta 9313', 'ICA V-109', 'Pioneer P3862', 'Semilla Certificada Local'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Toneladas', 'Bultos (50 kg)', 'Kilos'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 4,
  },
  'Café Especial': {
    nombre: 'Café Especial',
    variedades: ['Castillo (Resistente a Roya)', 'Cenicafé 1', 'Caturra', 'Variedad Colombia', 'Borbón Rosado', 'Tabi', 'Geisha'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Cargas (125 kg)', 'Arrobas (12.5 kg)', 'Kilos de Pergamino', 'Árboles'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 24,
  },
  'Yuca Industrial / Dulce': {
    nombre: 'Yuca Industrial / Dulce',
    variedades: ['ICA Costeña', 'M-Tai 8', 'Venezolana', 'Chirosa', 'Brava (Almidón)', 'Corpoica Tai'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Toneladas', 'Bultos (60 kg)', 'Kilos'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 10,
  },
  'Algodón': {
    nombre: 'Algodón',
    variedades: ['DeltaPine 1553', 'FiberMax 9180', 'Stoneville 4554', 'NuOPAL (Bollgard II)'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Toneladas de fibra', 'Kilos'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 6,
  },
  'Cacao': {
    nombre: 'Cacao',
    variedades: ['CCN-51', 'Fedecacao 2 (FSA 12)', 'ICS-95', 'TSH-565', 'Clon Criollo Fino de Aroma'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Kilos de grano seco', 'Toneladas', 'Árboles'],
    sistemaRiegoDefault: 'Riego por goteo',
    duracionEstimadaMeses: 30,
  },
  'Plátano / Banano': {
    nombre: 'Plátano / Banano',
    variedades: ['Hartón Común', 'Dominico Hartón', 'Guineo / Cuatrofilos', 'Cavitán', 'Banano Criollo'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Racimos', 'Kilos', 'Toneladas'],
    sistemaRiegoDefault: 'Riego por goteo',
    duracionEstimadaMeses: 11,
  },
  'Sorgo': {
    nombre: 'Sorgo',
    variedades: ['Sorgo Blanco JJ-T', 'Pioneer 85G46', 'ICA Niquía', 'Sorgo Forrajero'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Toneladas', 'Bultos (50 kg)'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 4,
  },
  'Mango / Frutales': {
    nombre: 'Mango / Frutales',
    variedades: ['Tommy Atkins', 'Keitt', 'Kent', 'Mango de Azúcar', 'Hilacha (Criollo)', 'Yulima'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Cajas (20 kg)', 'Toneladas', 'Árboles'],
    sistemaRiegoDefault: 'Riego por goteo',
    duracionEstimadaMeses: 36,
  },
  'Cítricos (Limón / Naranja)': {
    nombre: 'Cítricos (Limón / Naranja)',
    variedades: ['Limón Tahití', 'Naranja Valencia', 'Mandarina Oneco', 'Limón Mandarino Criollo'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Canastillas (25 kg)', 'Toneladas', 'Árboles'],
    sistemaRiegoDefault: 'Riego por goteo',
    duracionEstimadaMeses: 36,
  },
  'Hortalizas / Tomate / Ají': {
    nombre: 'Hortalizas / Tomate / Ají',
    variedades: ['Tomate Chonto', 'Tomate Milano', 'Pimentón Nathalie', 'Ají Topito dulce', 'Cebolla de Rama'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Canastillas', 'Kilos', 'Metros cuadrados'],
    sistemaRiegoDefault: 'Riego por goteo',
    duracionEstimadaMeses: 3,
  },
  'Pastos y Forrajes Tecnificados': {
    nombre: 'Pastos y Forrajes Tecnificados',
    variedades: ['Mombasa (Megathyrsus)', 'Tanzania', 'Brachiaria Decumbens', 'Brachiaria Brizantha (Marandú)', 'Pasto Cuba 22', 'Maralfalfa', 'Estrella Africana'],
    unidadSugerida: 'Hectáreas',
    unidadesDisponibles: ['Hectáreas', 'Toneladas de materia verde', 'Kilos'],
    sistemaRiegoDefault: 'Secano',
    duracionEstimadaMeses: 3,
  },
};

const CATALOGO_GANADERIA = {
  especies: [
    { value: 'Bovino', label: 'Bovino (Ganado Vacuno)' },
    { value: 'Bufalino', label: 'Bufalino (Búfalos de agua)' },
    { value: 'Ovino', label: 'Ovino (Ovejas / Carneros de lana o pelo)' },
    { value: 'Caprino', label: 'Caprino (Cabras)' },
    { value: 'Equino', label: 'Equino / Mular (Caballos, Mulas)' },
  ],
  orientaciones: [
    'Ceba / Engorde intensivo',
    'Doble Propósito (Carne y Leche)',
    'Lechería Especializada',
    'Cría y Levante',
    'Pie de Cría / Genética pura',
  ],
  razasPorEspecie: {
    Bovino: [
      'Brahman Blanco',
      'Brahman Rojo',
      'Gyr Lechero',
      'Guzerá',
      'Girolando (F1 Gyr x Holstein)',
      'Costeño con Cuernos (Criollo Cesar)',
      'Simmental / Simbrah',
      'Angus / Brangus',
      'Blanco Orejinegro (BON)',
      'Cruce Comercial / 7 Colores',
    ],
    Bufalino: ['Murrah', 'Mediterráneo', 'Jafarabadi', 'Cruce comercial bufalino'],
    Ovino: ['Pelibuey / Camuro Criollo', 'Katahdin', 'Dorper', 'Santa Inês'],
    Caprino: ['Alpina', 'Saanen', 'Boer', 'Criolla Costeña / Santandereana'],
    Equino: ['Criollo Colombiano', 'Cuarto de Milla', 'Mular de trabajo', 'Paso Fino'],
  } as Record<string, string[]>,
  sistemasPastoreo: [
    'Pastoreo Rotacional con cerca eléctrica',
    'Sistema Silvopastoril con árboles nativos',
    'Pastoreo Continuo tradicional',
    'Semi-estabulado (Pastoreo + Suplemento)',
    'Estabulado completo (Confinamiento)',
  ],
  unidades: ['Cabezas / Animales', 'Lotes de animales', 'Litros de leche / día', 'Kilos en pie'],
};

const CATALOGO_PISCICULTURA = {
  especies: [
    'Tilapia Roja (Oreochromis)',
    'Tilapia Negra / Nilótica',
    'Cachama Blanca (Piaractus brachypomus)',
    'Bocachico (Prochilodus magdalenae)',
    'Trucha Arcoíris',
    'Bagre Rayado / Yaque',
    'Pirarucú',
  ],
  unidades: ['Alevinos / Peces', 'Kilos de pescado', 'Toneladas', 'Estanques'],
};

const CATALOGO_AVICULTURA = {
  tipos: [
    'Pollo de engorde',
    'Gallina ponedora (Huevo comercial)',
    'Pollo criollo / campesino',
    'Codorniz',
    'Pavo / Gallipavo',
  ],
  lineas: ['Ross 308', 'Cobb 500', 'Isa Brown', 'Hy-Line Brown', 'Lohmann Brown', 'Hubbard'],
  unidades: ['Aves / Animales', 'Kilos de carne', 'Canastillas de huevo (30 docenas)'],
};

const CATALOGO_PORCICULTURA = {
  explotaciones: [
    'Ceba / Engorde intensivo',
    'Cría y Venta de Lechones',
    'Ciclo Completo (Cría, Levante y Ceba)',
  ],
  razas: ['Pietrain x Duroc', 'Landrace x Large White', 'PIC Comercial', 'F1 Landrace x Pietrain', 'Criollo Zungo'],
  unidades: ['Cerdos / Animales', 'Kilos en pie', 'Canales'],
};

const CATALOGO_APICULTURA = {
  especies: [
    'Apis mellifera (Africanizada)',
    'Apis mellifera (Europea / Italiana)',
    'Meliponas (Abejas nativas sin aguijón)',
  ],
  propositos: [
    'Miel de abejas',
    'Polen',
    'Propóleo',
    'Cera pura',
    'Polinización de cultivos',
    'Venta de núcleos y reinas',
  ],
  unidades: ['Colmenas activas', 'Kilos de miel', 'Litros de miel'],
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

  // Modo de ingreso: 'CATALOGO' (lista de selección) vs 'MANUAL' (entrada escrita libre)
  const [modoIngreso, setModoIngreso] = useState<'CATALOGO' | 'MANUAL'>('CATALOGO');

  // Dynamic parameters by domain
  const [agri, setAgri] = useState({
    cultivoPreset: prod?.metadata?.cultivo && CATALOGO_CULTIVOS[prod.metadata.cultivo] ? prod.metadata.cultivo : 'Palma de Aceite',
    cultivoManual: prod?.metadata?.cultivo || prod?.variedad || '',
    variedad: prod?.metadata?.variedad || (CATALOGO_CULTIVOS['Palma de Aceite']?.variedades[0] || ''),
    variedadManual: '',
    usarVariedadManual: false,
    areaSembrada: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Hectáreas',
    usarUnidadManual: false,
    unidadManual: '',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    sistemaCultivo: prod?.metadata?.sistemaCultivo || 'Secano',
    rendimientoEstimado: prod?.metadata?.rendimientoEstimado || '',
  });

  const [cafe, setCafe] = useState({
    variedad: prod?.metadata?.variedadCafe || 'Castillo (Resistente a Roya)',
    variedadManual: '',
    usarVariedadManual: false,
    area: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Hectáreas',
    numArboles: prod?.metadata?.numArboles || '',
    densidad: prod?.metadata?.densidad || '5000 árboles/ha',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    produccionEstimadaCargas: prod?.metadata?.produccionEstimadaCargas || '',
  });

  const [ganado, setGanado] = useState({
    especie: prod?.metadata?.especie || 'Bovino',
    especieManual: '',
    usarEspecieManual: false,
    proposito: prod?.metadata?.proposito || 'Doble Propósito (Carne y Leche)',
    propositoManual: '',
    usarPropositoManual: false,
    raza: prod?.metadata?.raza || 'Brahman Blanco',
    razaManual: '',
    usarRazaManual: false,
    cantidadCabezas: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Cabezas / Animales',
    pesoPromedioInicial: prod?.metadata?.pesoPromedioInicial || '',
    sistemaPastoreo: prod?.metadata?.sistemaPastoreo || 'Pastoreo Rotacional con cerca eléctrica',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
  });

  const [pesca, setPesca] = useState({
    especie: prod?.metadata?.especiePez || 'Tilapia Roja (Oreochromis)',
    especieManual: '',
    usarEspecieManual: false,
    cantidadAlevinos: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Alevinos / Peces',
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
    tipoAveManual: '',
    usarTipoAveManual: false,
    lineaRaza: prod?.metadata?.lineaRaza || 'Ross 308',
    lineaRazaManual: '',
    usarLineaManual: false,
    cantidad: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Aves / Animales',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaSalida: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    produccionEsperada: prod?.metadata?.produccionEsperada || '',
    unidadEsperada: prod?.metadata?.unidadEsperada || 'Kilos de carne',
  });

  const [porcinos, setPorcinos] = useState({
    corral: prod?.metadata?.corral || '',
    tipoExplotacion: prod?.metadata?.tipoExplotacion || 'Ceba / Engorde intensivo',
    tipoExplotacionManual: '',
    usarExplotacionManual: false,
    lineaRaza: prod?.metadata?.lineaRaza || 'Pietrain x Duroc',
    lineaRazaManual: '',
    usarRazaManual: false,
    cantidad: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Cerdos / Animales',
    pesoInicialKg: prod?.metadata?.pesoInicialKg || '25',
    pesoObjetivoKg: prod?.metadata?.pesoObjetivoKg || '105',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaSalida: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
  });

  const [apic, setApic] = useState({
    tipoAbeja: prod?.metadata?.tipoAbeja || 'Apis mellifera (Africanizada)',
    tipoAbejaManual: '',
    usarTipoAbejaManual: false,
    numColmenas: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Colmenas activas',
    proposito: prod?.metadata?.proposito || 'Miel de abejas',
    floraPredominante: prod?.metadata?.floraPredominante || '',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaCosecha: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    kilosEstimados: prod?.metadata?.kilosEstimados || '',
  });

  const [otra, setOtra] = useState({
    nombreActividad: prod?.variedad || '',
    cantidad: prod?.cantidadSembrada ? String(prod.cantidadSembrada) : '',
    unidad: prod?.unidadMedida || 'Unidades',
    fechaInicio: prod?.fechaInicio?.split('T')[0] || new Date().toISOString().split('T')[0],
    fechaFin: prod?.fechaEstimadaCosecha?.split('T')[0] || '',
    descripcion: prod?.metadata?.descripcion || '',
  });

  // Actualizar datos del cultivo cuando cambia el preset
  const handleCultivoPresetChange = (presetName: string) => {
    const selected = CATALOGO_CULTIVOS[presetName];
    if (selected) {
      setAgri((prev) => {
        // Calcular fecha estimada de cosecha si no está fijada
        let nuevaCosecha = prev.fechaCosecha;
        if (!nuevaCosecha && prev.fechaInicio && selected.duracionEstimadaMeses) {
          const d = new Date(prev.fechaInicio);
          d.setMonth(d.getMonth() + selected.duracionEstimadaMeses);
          nuevaCosecha = d.toISOString().split('T')[0];
        }
        return {
          ...prev,
          cultivoPreset: presetName,
          variedad: selected.variedades[0] || '',
          unidad: selected.unidadSugerida,
          sistemaCultivo: selected.sistemaRiegoDefault,
          fechaCosecha: nuevaCosecha,
        };
      });
    }
  };

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
        const cultivoFinal = modoIngreso === 'CATALOGO' ? agri.cultivoPreset : (agri.cultivoManual.trim() || 'Cultivo');
        const variedadFinal = agri.usarVariedadManual || modoIngreso === 'MANUAL'
          ? (agri.variedadManual.trim() || agri.variedad)
          : agri.variedad;
        const unidadFinal = agri.usarUnidadManual ? agri.unidadManual : agri.unidad;

        name = `${cultivoFinal} - ${variedadFinal || 'Lote'}`;
        startDate = agri.fechaInicio;
        endDate = agri.fechaCosecha || undefined;
        expectedYield = agri.areaSembrada ? parseFloat(agri.areaSembrada) : undefined;
        unit = unidadFinal;
        metadata = {
          ...agri,
          cultivo: cultivoFinal,
          variedad: variedadFinal,
          unidad: unidadFinal,
          tipoProduccion: 'AGRICULTURA',
        };
      } else if (tipo === 'CAFICULTURA') {
        const variedadFinal = cafe.usarVariedadManual || modoIngreso === 'MANUAL'
          ? (cafe.variedadManual.trim() || cafe.variedad)
          : cafe.variedad;

        name = `Café ${variedadFinal}`;
        startDate = cafe.fechaInicio;
        endDate = cafe.fechaCosecha || undefined;
        expectedYield = cafe.area ? parseFloat(cafe.area) : undefined;
        unit = cafe.unidad || 'Hectáreas';
        metadata = { ...cafe, variedad: variedadFinal, tipoProduccion: 'CAFICULTURA' };
      } else if (tipo === 'GANADERIA') {
        const especieFinal = ganado.usarEspecieManual || modoIngreso === 'MANUAL'
          ? (ganado.especieManual.trim() || ganado.especie)
          : ganado.especie;
        const propositoFinal = ganado.usarPropositoManual || modoIngreso === 'MANUAL'
          ? (ganado.propositoManual.trim() || ganado.proposito)
          : ganado.proposito;
        const razaFinal = ganado.usarRazaManual || modoIngreso === 'MANUAL'
          ? (ganado.razaManual.trim() || ganado.raza)
          : ganado.raza;

        name = `${especieFinal} - ${propositoFinal}`;
        startDate = ganado.fechaInicio;
        expectedYield = ganado.cantidadCabezas ? parseFloat(ganado.cantidadCabezas) : undefined;
        unit = ganado.unidad;
        metadata = {
          ...ganado,
          especie: especieFinal,
          proposito: propositoFinal,
          raza: razaFinal,
          tipoProduccion: 'GANADERIA',
        };
      } else if (tipo === 'PISCICULTURA') {
        const especieFinal = pesca.usarEspecieManual || modoIngreso === 'MANUAL'
          ? (pesca.especieManual.trim() || pesca.especie)
          : pesca.especie;

        name = `Piscicultura ${especieFinal}`;
        startDate = pesca.fechaSiembra;
        endDate = pesca.fechaCosecha || undefined;
        expectedYield = pesca.cantidadAlevinos ? parseFloat(pesca.cantidadAlevinos) : undefined;
        unit = pesca.unidad;
        metadata = { ...pesca, especie: especieFinal, tipoProduccion: 'PISCICULTURA' };
      } else if (tipo === 'AVICULTURA') {
        const tipoAveFinal = aves.usarTipoAveManual || modoIngreso === 'MANUAL'
          ? (aves.tipoAveManual.trim() || aves.tipoAve)
          : aves.tipoAve;
        const lineaFinal = aves.usarLineaManual || modoIngreso === 'MANUAL'
          ? (aves.lineaRazaManual.trim() || aves.lineaRaza)
          : aves.lineaRaza;

        name = `Avicultura - ${tipoAveFinal} (${lineaFinal || 'Lote'})`;
        startDate = aves.fechaInicio;
        endDate = aves.fechaSalida || undefined;
        expectedYield = aves.cantidad ? parseFloat(aves.cantidad) : undefined;
        unit = aves.unidad;
        metadata = { ...aves, tipoAve: tipoAveFinal, lineaRaza: lineaFinal, tipoProduccion: 'AVICULTURA' };
      } else if (tipo === 'PORCICULTURA') {
        const tipoFinal = porcinos.usarExplotacionManual || modoIngreso === 'MANUAL'
          ? (porcinos.tipoExplotacionManual.trim() || porcinos.tipoExplotacion)
          : porcinos.tipoExplotacion;
        const razaFinal = porcinos.usarRazaManual || modoIngreso === 'MANUAL'
          ? (porcinos.lineaRazaManual.trim() || porcinos.lineaRaza)
          : porcinos.lineaRaza;

        name = `Porcicultura - ${tipoFinal} (${razaFinal || 'Cerdos'})`;
        startDate = porcinos.fechaInicio;
        endDate = porcinos.fechaSalida || undefined;
        expectedYield = porcinos.cantidad ? parseFloat(porcinos.cantidad) : undefined;
        unit = porcinos.unidad;
        metadata = { ...porcinos, tipoExplotacion: tipoFinal, lineaRaza: razaFinal, tipoProduccion: 'PORCICULTURA' };
      } else if (tipo === 'APICULTURA') {
        const abejaFinal = apic.usarTipoAbejaManual || modoIngreso === 'MANUAL'
          ? (apic.tipoAbejaManual.trim() || apic.tipoAbeja)
          : apic.tipoAbeja;

        name = `Apiario - ${apic.numColmenas || '0'} Colmenas (${apic.proposito})`;
        startDate = apic.fechaInicio;
        endDate = apic.fechaCosecha || undefined;
        expectedYield = apic.numColmenas ? parseFloat(apic.numColmenas) : undefined;
        unit = apic.unidad;
        metadata = { ...apic, tipoAbeja: abejaFinal, tipoProduccion: 'APICULTURA' };
      } else {
        name = otra.nombreActividad.trim() || 'Actividad Agropecuaria';
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
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al guardar la producción. Verifica los datos requeridos.';
      useToastStore.getState().error(msg);
    } finally {
      setLoading(false);
    }
  };

  const presetActual = CATALOGO_CULTIVOS[agri.cultivoPreset] || CATALOGO_CULTIVOS['Palma de Aceite'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 700, width: '92vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
              {prod ? 'Editar Ciclo Productivo' : 'Iniciar Nueva Producción'}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
              Planificación técnica adaptativa para cultivos, ganadería o especies menores
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Base: Finca y Sector */}
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
                Sector de Producción *
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
                {loadingLotes ? 'Consultando parcelas...' : `${lotes.length} parcelas registradas`}
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

          {/* Selector de Modo: Catálogo (Lista) vs Entrada Manual */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 10,
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {modoIngreso === 'CATALOGO' ? (
                <ListFilter size={15} color="var(--color-primary)" />
              ) : (
                <PenTool size={15} color="var(--color-primary)" />
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                Modo de Formulario: {modoIngreso === 'CATALOGO' ? 'Catálogo Preestablecido' : 'Ingreso Manual Libre'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setModoIngreso('CATALOGO')}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: modoIngreso === 'CATALOGO' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  color: modoIngreso === 'CATALOGO' ? '#ffffff' : 'var(--color-text-muted)',
                }}
              >
                Catálogo (Lista)
              </button>
              <button
                type="button"
                onClick={() => setModoIngreso('MANUAL')}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: modoIngreso === 'MANUAL' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  color: modoIngreso === 'MANUAL' ? '#ffffff' : 'var(--color-text-muted)',
                }}
              >
                Manual (Texto Libre)
              </button>
            </div>
          </div>

          {/* ── 1. AGRICULTURA ────────────────────────────────────────────── */}
          {tipo === 'AGRICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {modoIngreso === 'CATALOGO' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                      Cultivo principal (Lista recomendada) *
                    </label>
                    <select
                      className="input-field"
                      value={agri.cultivoPreset}
                      onChange={(e) => handleCultivoPresetChange(e.target.value)}
                      required
                    >
                      {Object.keys(CATALOGO_CULTIVOS).map((cName) => (
                        <option key={cName} value={cName}>{cName}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                      Cultivo principal (Manual) *
                    </label>
                    <input
                      className="input-field"
                      placeholder="Ej: Ajonjolí, Malanga, Frijol caupí..."
                      value={agri.cultivoManual}
                      onChange={(e) => setAgri((a) => ({ ...a, cultivoManual: e.target.value }))}
                      required
                    />
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Variedad / Híbrido
                    </label>
                    {modoIngreso === 'CATALOGO' && (
                      <button
                        type="button"
                        onClick={() => setAgri((a) => ({ ...a, usarVariedadManual: !a.usarVariedadManual }))}
                        style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {agri.usarVariedadManual ? 'Elegir de lista' : '+ Escribir manual'}
                      </button>
                    )}
                  </div>

                  {modoIngreso === 'CATALOGO' && !agri.usarVariedadManual ? (
                    <select
                      className="input-field"
                      value={agri.variedad}
                      onChange={(e) => setAgri((a) => ({ ...a, variedad: e.target.value }))}
                    >
                      {presetActual.variedades.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input-field"
                      placeholder="Ej: Variedad local, Semilla criolla..."
                      value={agri.variedadManual}
                      onChange={(e) => setAgri((a) => ({ ...a, variedadManual: e.target.value }))}
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Cantidad sembrada o programada *
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Unidad de medida *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAgri((a) => ({ ...a, usarUnidadManual: !a.usarUnidadManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {agri.usarUnidadManual ? 'Ver opciones' : '+ Manual'}
                    </button>
                  </div>

                  {agri.usarUnidadManual ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Bultos, Kilos, Hectáreas, Matas..."
                      value={agri.unidadManual}
                      onChange={(e) => setAgri((a) => ({ ...a, unidadManual: e.target.value }))}
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={agri.unidad}
                      onChange={(e) => setAgri((a) => ({ ...a, unidad: e.target.value }))}
                    >
                      {(presetActual?.unidadesDisponibles || ['Hectáreas', 'Toneladas', 'Kilos', 'Bultos']).map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Sistema de cultivo / riego
                  </label>
                  <select
                    className="input-field"
                    value={agri.sistemaCultivo}
                    onChange={(e) => setAgri((a) => ({ ...a, sistemaCultivo: e.target.value }))}
                  >
                    <option value="Secano">Secano (temporal de lluvias)</option>
                    <option value="Riego por goteo">Riego por goteo</option>
                    <option value="Riego por gravedad / inundación">Riego por gravedad / inundación</option>
                    <option value="Aspersión">Aspersión / Microaspersión</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                    Rendimiento estimado a cosecha
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ej: 5.5 ton/ha, 80 bultos/ha..."
                    value={agri.rendimientoEstimado}
                    onChange={(e) => setAgri((a) => ({ ...a, rendimientoEstimado: e.target.value }))}
                  />
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

          {/* ── 2. CAFICULTURA ────────────────────────────────────────────── */}
          {tipo === 'CAFICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Variedad de Café *
                    </label>
                    <button
                      type="button"
                      onClick={() => setCafe((c) => ({ ...c, usarVariedadManual: !c.usarVariedadManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {cafe.usarVariedadManual ? 'Elegir de lista' : '+ Escribir manual'}
                    </button>
                  </div>

                  {cafe.usarVariedadManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Borbón Chiroso, Papayo, Maragogipe..."
                      value={cafe.variedadManual}
                      onChange={(e) => setCafe((c) => ({ ...c, variedadManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={cafe.variedad}
                      onChange={(e) => setCafe((c) => ({ ...c, variedad: e.target.value }))}
                    >
                      {CATALOGO_CULTIVOS['Café Especial'].variedades.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  )}
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

          {/* ── 3. GANADERIA ────────────────────────────────────────────── */}
          {tipo === 'GANADERIA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Especie animal *
                    </label>
                    <button
                      type="button"
                      onClick={() => setGanado((g) => ({ ...g, usarEspecieManual: !g.usarEspecieManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {ganado.usarEspecieManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {ganado.usarEspecieManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Búfalos, Asnales, Camélidos..."
                      value={ganado.especieManual}
                      onChange={(e) => setGanado((g) => ({ ...g, especieManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={ganado.especie}
                      onChange={(e) => {
                        const esp = e.target.value;
                        const razasDisponibles = CATALOGO_GANADERIA.razasPorEspecie[esp] || [];
                        setGanado((g) => ({
                          ...g,
                          especie: esp,
                          raza: razasDisponibles[0] || 'Cruce comercial',
                        }));
                      }}
                    >
                      {CATALOGO_GANADERIA.especies.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Orientación productiva *
                    </label>
                    <button
                      type="button"
                      onClick={() => setGanado((g) => ({ ...g, usarPropositoManual: !g.usarPropositoManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {ganado.usarPropositoManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {ganado.usarPropositoManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Recría de novillas, Producción de queso..."
                      value={ganado.propositoManual}
                      onChange={(e) => setGanado((g) => ({ ...g, propositoManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={ganado.proposito}
                      onChange={(e) => setGanado((g) => ({ ...g, proposito: e.target.value }))}
                    >
                      {CATALOGO_GANADERIA.orientaciones.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Raza / Biotipo
                    </label>
                    <button
                      type="button"
                      onClick={() => setGanado((g) => ({ ...g, usarRazaManual: !g.usarRazaManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {ganado.usarRazaManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {ganado.usarRazaManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: F1 Senepol x Brahman, Criollo..."
                      value={ganado.razaManual}
                      onChange={(e) => setGanado((g) => ({ ...g, razaManual: e.target.value }))}
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={ganado.raza}
                      onChange={(e) => setGanado((g) => ({ ...g, raza: e.target.value }))}
                    >
                      {(CATALOGO_GANADERIA.razasPorEspecie[ganado.especie] || ['Cruce Comercial']).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>

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
                    {CATALOGO_GANADERIA.sistemasPastoreo.map((sp) => (
                      <option key={sp} value={sp}>{sp}</option>
                    ))}
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

          {/* ── 4. PISCICULTURA ────────────────────────────────────────────── */}
          {tipo === 'PISCICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Especie de pez *
                    </label>
                    <button
                      type="button"
                      onClick={() => setPesca((p) => ({ ...p, usarEspecieManual: !p.usarEspecieManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {pesca.usarEspecieManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {pesca.usarEspecieManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Yamú, Carpa, Sábalo..."
                      value={pesca.especieManual}
                      onChange={(e) => setPesca((p) => ({ ...p, especieManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={pesca.especie}
                      onChange={(e) => setPesca((p) => ({ ...p, especie: e.target.value }))}
                    >
                      {CATALOGO_PISCICULTURA.especies.map((sp) => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                    </select>
                  )}
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

          {/* ── 5. AVICULTURA ────────────────────────────────────────────── */}
          {tipo === 'AVICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Tipo de ave *
                    </label>
                    <button
                      type="button"
                      onClick={() => setAves((a) => ({ ...a, usarTipoAveManual: !a.usarTipoAveManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {aves.usarTipoAveManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {aves.usarTipoAveManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Patos, Gansos, Avestruces..."
                      value={aves.tipoAveManual}
                      onChange={(e) => setAves((a) => ({ ...a, tipoAveManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={aves.tipoAve}
                      onChange={(e) => setAves((a) => ({ ...a, tipoAve: e.target.value }))}
                    >
                      {CATALOGO_AVICULTURA.tipos.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Línea genética / Raza
                    </label>
                    <button
                      type="button"
                      onClick={() => setAves((a) => ({ ...a, usarLineaManual: !a.usarLineaManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {aves.usarLineaManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {aves.usarLineaManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Criolla campesina, Rhode Island..."
                      value={aves.lineaRazaManual}
                      onChange={(e) => setAves((a) => ({ ...a, lineaRazaManual: e.target.value }))}
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={aves.lineaRaza}
                      onChange={(e) => setAves((a) => ({ ...a, lineaRaza: e.target.value }))}
                    >
                      {CATALOGO_AVICULTURA.lineas.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  )}
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
                    Fecha estimada de beneficio / salida
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

          {/* ── 6. PORCICULTURA ────────────────────────────────────────────── */}
          {tipo === 'PORCICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Orientación productiva *
                    </label>
                    <button
                      type="button"
                      onClick={() => setPorcinos((p) => ({ ...p, usarExplotacionManual: !p.usarExplotacionManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {porcinos.usarExplotacionManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {porcinos.usarExplotacionManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Producción de lechones destetados..."
                      value={porcinos.tipoExplotacionManual}
                      onChange={(e) => setPorcinos((p) => ({ ...p, tipoExplotacionManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={porcinos.tipoExplotacion}
                      onChange={(e) => setPorcinos((p) => ({ ...p, tipoExplotacion: e.target.value }))}
                    >
                      {CATALOGO_PORCICULTURA.explotaciones.map((exp) => (
                        <option key={exp} value={exp}>{exp}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Raza / Cruzamiento
                    </label>
                    <button
                      type="button"
                      onClick={() => setPorcinos((p) => ({ ...p, usarRazaManual: !p.usarRazaManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {porcinos.usarRazaManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {porcinos.usarRazaManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Duroc puro, Hampshire, Criollo..."
                      value={porcinos.lineaRazaManual}
                      onChange={(e) => setPorcinos((p) => ({ ...p, lineaRazaManual: e.target.value }))}
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={porcinos.lineaRaza}
                      onChange={(e) => setPorcinos((p) => ({ ...p, lineaRaza: e.target.value }))}
                    >
                      {CATALOGO_PORCICULTURA.razas.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
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

          {/* ── 7. APICULTURA ────────────────────────────────────────────── */}
          {tipo === 'APICULTURA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Especie de abeja *
                    </label>
                    <button
                      type="button"
                      onClick={() => setApic((a) => ({ ...a, usarTipoAbejaManual: !a.usarTipoAbejaManual }))}
                      style={{ fontSize: 11, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {apic.usarTipoAbejaManual ? 'Elegir de lista' : '+ Manual'}
                    </button>
                  </div>

                  {apic.usarTipoAbejaManual || modoIngreso === 'MANUAL' ? (
                    <input
                      className="input-field"
                      placeholder="Ej: Tetragonisca angustula (Angelita)..."
                      value={apic.tipoAbejaManual}
                      onChange={(e) => setApic((a) => ({ ...a, tipoAbejaManual: e.target.value }))}
                      required
                    />
                  ) : (
                    <select
                      className="input-field"
                      value={apic.tipoAbeja}
                      onChange={(e) => setApic((a) => ({ ...a, tipoAbeja: e.target.value }))}
                    >
                      {CATALOGO_APICULTURA.especies.map((sp) => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                    </select>
                  )}
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
                    {CATALOGO_APICULTURA.propositos.map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
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
                    Fecha de inicio *
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
            </div>
          )}

          {/* ── 8. OTRA ACTIVIDAD PRODUCTIVA ──────────────────────────────── */}
          {tipo === 'OTRA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  Nombre de la actividad o rubro *
                </label>
                <input
                  className="input-field"
                  placeholder="Ej: Silvopastoreo maderable, Lombricultura, Forraje hidropónico..."
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
                    placeholder="Ej: Toneladas, Litros, Kilos, Árboles..."
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
      if (prodsRes.status === 'rejected') {
        const err = prodsRes.reason;
        console.error('Error al cargar producciones:', err);
        if (err?.response?.status && err.response.status !== 404) {
          useToastStore.getState().error('No se pudieron cargar los ciclos de producción.');
        }
      }
      if (fincasRes.status === 'rejected') {
        const err = fincasRes.reason;
        console.error('Error al cargar fincas para producciones:', err);
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
          <option value="OTRA">Otra Actividad</option>
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
