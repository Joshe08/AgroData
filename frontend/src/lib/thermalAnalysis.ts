import { Lote } from '@/store/fincasStore';

export type ThermalZoneLevel = 'fresco' | 'templado' | 'moderado' | 'estres' | 'critico';

export interface LoteThermalAnalysis {
  loteId: string | number;
  nombre: string;
  level: ThermalZoneLevel;
  estresPct: number; // 0 - 100% (0 = frío/óptimo, 100 = calor extremo/estrés)
  scoreSalud: number; // 0 - 100 puntos (100 = máxima salud)
  tempEstimada: string;
  color: string;
  strokeColor: string;
  badgeLabel: string;
  alerta: string;
  recomendacion: string;
  cultivo: string;
  hectareas: number;
}

export const THERMAL_CONFIG: Record<
  ThermalZoneLevel,
  {
    label: string;
    sublabel: string;
    color: string;
    strokeColor: string;
    bg: string;
    text: string;
    border: string;
    tempRange: string;
  }
> = {
  fresco: {
    label: 'Zona Fresca / Óptima',
    sublabel: 'Bajo estrés térmico, humedad favorable',
    color: '#00d2ff', // Cian eléctrico
    strokeColor: '#0284c7',
    bg: 'rgba(0, 210, 255, 0.12)',
    text: '#0284c7',
    border: 'rgba(0, 210, 255, 0.4)',
    tempRange: '26°C - 29°C',
  },
  templado: {
    label: 'Zona Templada / Confort',
    sublabel: 'Transpiración y fotosíntesis balanceadas',
    color: '#06d6a0', // Menta esmeralda
    strokeColor: '#059669',
    bg: 'rgba(6, 214, 160, 0.12)',
    text: '#059669',
    border: 'rgba(6, 214, 160, 0.4)',
    tempRange: '30°C - 33°C',
  },
  moderado: {
    label: 'Calor Moderado',
    sublabel: 'Evaporación activa, monitorear humedad',
    color: '#ffd166', // Amarillo mostaza cálido
    strokeColor: '#d97706',
    bg: 'rgba(255, 209, 102, 0.15)',
    text: '#b45309',
    border: 'rgba(255, 209, 102, 0.45)',
    tempRange: '34°C - 37°C',
  },
  estres: {
    label: 'Estrés Hídrico Elevado',
    sublabel: 'Alta radiación diurna, requiere riego',
    color: '#ff5400', // Naranja lava
    strokeColor: '#c2410c',
    bg: 'rgba(255, 84, 0, 0.15)',
    text: '#c2410c',
    border: 'rgba(255, 84, 0, 0.45)',
    tempRange: '38°C - 41°C',
  },
  critico: {
    label: 'Calor Crítico / Alerta',
    sublabel: 'Golpe térmico severo o suelo desprotegido',
    color: '#d90429', // Rojo carmesí intenso
    strokeColor: '#800f2f',
    bg: 'rgba(217, 4, 41, 0.16)',
    text: '#991b1b',
    border: 'rgba(217, 4, 41, 0.5)',
    tempRange: '> 41°C',
  },
};

export function calcularAnalisisTermicoLote(lote: Lote): LoteThermalAnalysis {
  let estres = 20; // Base: 20% estrés estándar en clima cálido del Cesar

  const status = (lote.status || 'ACTIVO').toUpperCase();
  const suelo = ((lote as any).tipoSuelo || (lote as any).soilType || '').toUpperCase();
  const riego = ((lote as any).sistemaRiego || '').toUpperCase();
  const cultivo = (lote as any).cultivoActual || (lote as any).crop || '';
  const ha = lote.hectareas || 1;

  // 1. Estado del lote y cobertura vegetal
  if (status === 'DESCANSO') {
    estres += 35; // Suelo desnudo / barbecho se calienta drásticamente bajo el sol del Cesar
  } else if (status === 'PREPARACION') {
    estres += 25; // Tierra arada expuesta
  } else if (status === 'PASTOREO') {
    estres += 15;
  } else if (status === 'RIEGO') {
    estres -= 15; // Riego activo refresca el microclima del lote
  } else if (status === 'RESERVA') {
    estres -= 20; // Bosque / ronda hídrica tiene microclima fresco
  }

  // 2. Sistema de riego
  if (riego === 'GOTEO' || riego === 'ASPERSION') {
    estres -= 18;
  } else if (riego === 'GRAVEDAD' || riego === 'INUNDACION') {
    estres -= 8;
  } else {
    // Secano / Sin riego
    estres += 18;
  }

  // 3. Suelo y retención de humedad
  if (suelo === 'ARENOSO') {
    estres += 16; // Pierde agua muy rápido, alta temperatura superficial
  } else if (suelo === 'ARCILLOSO') {
    estres += 8; // Riesgo de agrietamiento y calor en superficie
  } else if (suelo === 'FRANCO' || suelo === 'ALUVIAL') {
    estres -= 10; // Retiene bien humedad y amortigua temperatura
  }

  // 4. Cultivo
  if (!cultivo && status !== 'RESERVA') {
    estres += 10;
  }

  // Limitar estrés entre 5% y 98%
  estres = Math.max(5, Math.min(98, Math.round(estres)));
  const scoreSalud = 100 - estres;

  // Clasificar en las 5 zonas térmicas distintivas
  let level: ThermalZoneLevel;
  let tempEstimada: string;
  let alerta: string;
  let recomendacion: string;

  if (estres <= 25) {
    level = 'fresco';
    tempEstimada = '27.4°C';
    alerta = 'Microclima óptimo: humedad edáfica y follaje en equilibrio.';
    recomendacion = 'Mantener programa habitual de fertirriego y monitoreo preventivo.';
  } else if (estres <= 45) {
    level = 'templado';
    tempEstimada = '31.2°C';
    alerta = 'Confort térmico favorable para fotosíntesis activa.';
    recomendacion = 'Monitorear humedad en zona radicular antes del mediodía.';
  } else if (estres <= 65) {
    level = 'moderado';
    tempEstimada = '35.8°C';
    alerta = 'Calor moderado: evapotranspiración diurna acelerada.';
    recomendacion = 'Priorizar turnos de riego temprano (antes de las 8:00 AM) o al atardecer.';
  } else if (estres <= 80) {
    level = 'estres';
    tempEstimada = '39.5°C';
    alerta = 'Estrés hídrico elevado: riesgo de marchitez foliar temporal.';
    recomendacion = 'Aplicar riego de soporte urgente y revisar cobertura vegetal o mulch.';
  } else {
    level = 'critico';
    tempEstimada = '42.8°C';
    alerta = 'Zona de calor crítico: suelo desprotegido o déficit hídrico severo.';
    recomendacion = 'Suspender labores pesadas en horas de sol. Activar riego nocturno de emergencia.';
  }

  const cfg = THERMAL_CONFIG[level];

  return {
    loteId: lote.id,
    nombre: lote.nombre || `Lote #${lote.id}`,
    level,
    estresPct: estres,
    scoreSalud,
    tempEstimada,
    color: cfg.color,
    strokeColor: cfg.strokeColor,
    badgeLabel: cfg.label,
    alerta,
    recomendacion,
    cultivo: cultivo || 'Sin cultivo especificado',
    hectareas: ha,
  };
}
