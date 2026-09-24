import axios from 'axios';

let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// If running in browser and accessed via local network IP, point to the same IP on port 3001
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  if (hostname !== 'localhost') {
    API_BASE = `http://${hostname}:3001`;
  }
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

type AnyRecord = Record<string, any>;

const withData = <T>(request: Promise<any>, mapper: (data: any) => T) =>
  request.then((response) => ({ ...response, data: mapper(response.data) }));

const mapArray = <T>(data: any, mapper: (item: AnyRecord) => T): T[] =>
  Array.isArray(data) ? data.filter(Boolean).map(mapper).filter(Boolean) : [];

const normalizeUser = (user: AnyRecord) => ({
  ...user,
  nombre: user?.nombre ?? user?.name ?? '',
  rol: user?.rol ?? user?.role ?? '',
});

const mapFinca = (finca: AnyRecord) => {
  if (!finca) return null as any;
  let parsedActividades = finca.actividades;
  if (typeof finca.actividades === 'string') {
    try {
      parsedActividades = JSON.parse(finca.actividades);
    } catch {
      parsedActividades = [];
    }
  }
  return {
    ...finca,
    nombre: finca.nombre ?? finca.name ?? '',
    ubicacion: finca.ubicacion ?? finca.location ?? '',
    hectareas: finca.hectareas ?? finca.area ?? 0,
    descripcion: finca.descripcion ?? finca.description ?? '',
    latitude: finca.latitude != null ? Number(finca.latitude) : null,
    longitude: finca.longitude != null ? Number(finca.longitude) : null,
    tipoExplotacion: finca.tipoExplotacion ?? '',
    estado: finca.estado ?? 'ACTIVA',
    tipoSuelo: finca.tipoSuelo ?? '',
    fuenteAgua: finca.fuenteAgua ?? '',
    sistemaRiego: finca.sistemaRiego ?? '',
    tipoAcceso: finca.tipoAcceso ?? '',
    departamento: finca.departamento ?? '',
    municipio: finca.municipio ?? '',
    vereda: finca.vereda ?? '',
    referenciaAcceso: finca.referenciaAcceso ?? '',
    actividades: Array.isArray(parsedActividades) ? parsedActividades : [],
    lotes: Array.isArray(finca.lotes)
      ? finca.lotes.map((lote: AnyRecord) => ({
          ...lote,
          nombre: lote.nombre ?? lote.name ?? '',
          hectareas: lote.hectareas ?? lote.area ?? 0,
          tipoSuelo: lote.tipoSuelo ?? lote.soilType ?? '',
        }))
      : [],
  };
};

const parseMetadata = (metadata: unknown) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata as AnyRecord;
  try {
    return JSON.parse(String(metadata)) as AnyRecord;
  } catch {
    return {};
  }
};

const mapProduccion = (prod: AnyRecord) => {
  if (!prod) return null as any;
  const metadata = parseMetadata(prod.metadata);
  const finca = prod.finca ?? prod.lote?.finca;
  return {
    ...prod,
    tipo: prod.tipo ?? prod.type ?? 'CULTIVO',
    variedad: prod.variedad ?? metadata.variedad ?? metadata.variety ?? prod.name ?? '',
    estado: metadata.etapa ?? prod.estado ?? prod.status ?? 'ACTIVE',
    fechaInicio: prod.fechaInicio ?? prod.startDate,
    fechaEstimadaCosecha: prod.fechaEstimadaCosecha ?? prod.endDate,
    cantidadSembrada: prod.cantidadSembrada ?? prod.expectedYield,
    unidadMedida: prod.unidadMedida ?? prod.unit,
    fincaId: prod.fincaId ?? finca?.id,
    finca: finca ? mapFinca(finca) : prod.finca,
    metadata,
  };
};

const mapInventario = (item: AnyRecord) => {
  if (!item) return null;
  return {
    ...item,
    id: item.id,
    nombre: item.nombre ?? item.name ?? '',
    categoria: item.categoria ?? item.category ?? 'OTRO',
    cantidad: item.cantidad ?? item.quantity ?? 0,
    unidad: item.unidad ?? item.unit ?? 'unidades',
    stockMinimo: item.stockMinimo ?? item.minAlertQuantity,
    proveedor: item.proveedor ?? '',
    costo: item.costo,
    fincaId: item.fincaId ?? item.finca?.id,
    finca: item.finca ? { id: item.finca.id, nombre: item.finca.name ?? item.finca.nombre, ubicacion: item.finca.location ?? item.finca.ubicacion } : undefined,
  };
};

const mapFinanza = (tx: AnyRecord) => ({
  ...tx,
  tipo: tx.tipo ?? tx.type,
  categoria: tx.categoria ?? tx.category,
  monto: tx.monto ?? tx.amount ?? 0,
  descripcion: tx.descripcion ?? tx.description,
  fecha: tx.fecha ?? tx.date,
});

const mapPersonal = (persona: AnyRecord) => ({
  ...persona,
  id: persona.id,
  nombre: persona.nombre ?? persona.name ?? '',
  apellido: persona.apellido ?? persona.lastName ?? '',
  documento: persona.documento ?? '',
  email: persona.email ?? '',
  cargo: persona.cargo ?? persona.role ?? '',
  salario: persona.salario ?? persona.dailyRate,
  telefono: persona.telefono ?? persona.phone ?? '',
  tipoContrato: persona.tipoContrato ?? persona.status ?? 'ACTIVE',
  fechaIngreso: persona.fechaIngreso ?? null,
  fincaId: persona.fincaId ?? null,
  finca: persona.finca ? { id: persona.finca.id, nombre: persona.finca.nombre ?? persona.finca.name } : null,
  notes: persona.notes ?? '',
});

const backendToUiStatus: Record<string, string> = {
  OPERATIVE: 'OPERATIVO',
  MAINTENANCE: 'MANTENIMIENTO',
  BROKEN: 'DANADO',
};

const uiToBackendStatus: Record<string, string> = {
  OPERATIVO: 'OPERATIVE',
  MANTENIMIENTO: 'MAINTENANCE',
  DANADO: 'BROKEN',
  'DAÑADO': 'BROKEN',
  INACTIVO: 'BROKEN',
};

const mapMaquinaria = (maquina: AnyRecord) => ({
  ...maquina,
  id: maquina.id,
  nombre: maquina.nombre ?? maquina.name ?? '',
  tipo: maquina.tipo ?? 'OTRO',
  marca: maquina.marca ?? '',
  modelo: maquina.modelo ?? '',
  fincaId: maquina.fincaId ?? null,
  finca: maquina.finca ? { id: maquina.finca.id, nombre: maquina.finca.nombre ?? maquina.finca.name } : null,
  fechaAdquisicion: maquina.fechaAdquisicion ?? null,
  valor: maquina.valor != null ? Number(maquina.valor) : null,
  horasUso: maquina.horasUso != null ? Number(maquina.horasUso) : null,
  estado: maquina.estado ?? backendToUiStatus[maquina.status] ?? maquina.status ?? 'OPERATIVO',
  observaciones: maquina.observaciones ?? '',
  proximoMantenimiento: maquina.proximoMantenimiento ?? maquina.lastMaintenance,
  costoMantenimiento: maquina.costoMantenimiento ?? maquina.maintenanceCost ?? 0,
});

const fincaPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  location: data.location ?? data.ubicacion,
  area: data.area !== undefined && data.area !== '' ? parseFloat(data.area) : (data.hectareas !== undefined && data.hectareas !== '' ? parseFloat(data.hectareas) : 0),
  description: data.description ?? data.descripcion ?? null,
  latitude: data.latitude != null && data.latitude !== '' ? parseFloat(data.latitude) : null,
  longitude: data.longitude != null && data.longitude !== '' ? parseFloat(data.longitude) : null,
  tipoExplotacion: data.tipoExplotacion,
  estado: data.estado,
  tipoSuelo: data.tipoSuelo,
  fuenteAgua: data.fuenteAgua,
  sistemaRiego: data.sistemaRiego,
  tipoAcceso: data.tipoAcceso,
  departamento: data.departamento,
  municipio: data.municipio,
  vereda: data.vereda,
  referenciaAcceso: data.referenciaAcceso,
  actividades: data.actividades,
});

const inventarioPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  category: data.category ?? data.categoria,
  quantity: data.quantity !== undefined ? parseFloat(data.quantity) : (data.cantidad !== undefined ? parseFloat(data.cantidad) : 0),
  unit: data.unit ?? data.unidad,
  minAlertQuantity: data.minAlertQuantity !== undefined ? parseFloat(data.minAlertQuantity) : (data.stockMinimo !== undefined ? parseFloat(data.stockMinimo) : 10),
  proveedor: data.proveedor ? String(data.proveedor).trim() : null,
  costo: data.costo !== undefined && data.costo !== null && data.costo !== '' ? parseFloat(data.costo) : null,
  fincaId: data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null,
});

const finanzaPayload = (data: AnyRecord) => ({
  type: data.type ?? data.tipo,
  category: data.category ?? data.categoria,
  amount: data.amount ?? data.monto,
  description: data.description ?? data.descripcion,
  date: data.date ?? data.fecha,
});

const personalPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  lastName: data.lastName ?? data.apellido ?? '',
  documento: data.documento ?? '',
  email: data.email ?? '',
  role: data.role ?? data.cargo,
  dailyRate: data.dailyRate !== undefined && data.dailyRate !== '' ? parseFloat(data.dailyRate) : (data.salario !== undefined && data.salario !== '' ? parseFloat(data.salario) : undefined),
  phone: data.phone ?? data.telefono ?? '',
  status: data.status ?? data.tipoContrato ?? 'ACTIVE',
  fechaIngreso: data.fechaIngreso || null,
  fincaId: data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null,
  notes: data.notes ?? '',
});

const maquinariaPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  tipo: data.tipo ?? 'OTRO',
  marca: data.marca ?? '',
  modelo: data.modelo ?? '',
  fincaId: data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null,
  fechaAdquisicion: data.fechaAdquisicion || null,
  valor: data.valor !== undefined && data.valor !== '' && data.valor !== null ? parseFloat(data.valor) : null,
  horasUso: data.horasUso !== undefined && data.horasUso !== '' && data.horasUso !== null ? parseFloat(data.horasUso) : null,
  status: uiToBackendStatus[data.status ?? data.estado] ?? data.status ?? 'OPERATIVE',
  observaciones: data.observaciones ?? '',
  lastMaintenance: data.lastMaintenance ?? data.proximoMantenimiento,
  maintenanceCost: data.maintenanceCost !== undefined && data.maintenanceCost !== '' ? parseFloat(data.maintenanceCost) : (data.costoMantenimiento !== undefined && data.costoMantenimiento !== '' ? parseFloat(data.costoMantenimiento) : 0),
});

const ensureLoteId = async (fincaId?: string | number) => {
  if (!fincaId) return undefined;
  const lotesRes = await api.get(`/fincas/${fincaId}/lotes`);
  const lotes = Array.isArray(lotesRes.data) ? lotesRes.data : [];
  if (lotes.length > 0) return lotes[0].id;

  const newLote = await api.post(`/fincas/${fincaId}/lotes`, {
    name: 'Lote General',
    area: 1,
  });
  return newLote.data.id;
};

const mapStatusToBackend = (st?: string) => {
  if (!st) return 'ACTIVE';
  const s = String(st).toUpperCase();
  if (s === 'FINALIZADO' || s === 'COMPLETED' || s === 'TERMINADO') return 'COMPLETED';
  if (s === 'CANCELADO' || s === 'CANCELLED') return 'CANCELLED';
  return 'ACTIVE';
};

const produccionPayload = async (data: AnyRecord) => {
  const loteId = data.loteId ?? (await ensureLoteId(data.fincaId));
  const variedad = data.variedad ?? data.name;
  const uiStatus = data.estado ?? data.status ?? 'ACTIVE';
  const backendStatus = mapStatusToBackend(uiStatus);
  return {
    name: data.name ?? [data.tipo ?? data.type ?? 'Produccion', variedad].filter(Boolean).join(' - '),
    type: data.type ?? data.tipo,
    status: backendStatus,
    startDate: data.startDate ?? data.fechaInicio,
    endDate: data.endDate ?? data.fechaEstimadaCosecha,
    expectedYield: data.expectedYield !== undefined && data.expectedYield !== '' ? parseFloat(data.expectedYield) : (data.cantidadSembrada !== undefined && data.cantidadSembrada !== '' ? parseFloat(data.cantidadSembrada) : undefined),
    unit: data.unit ?? data.unidadMedida,
    loteId,
    metadata: {
      ...(typeof data.metadata === 'object' ? data.metadata : {}),
      etapa: uiStatus,
      variedad,
      fincaId: data.fincaId,
    },
  };
};

// Interceptor: derive backend URL from current browser host at runtime
// This way the app works from any IP/device on the LAN without rebuilding
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Always use the same host the browser is on, port 3001
    const backendUrl = `http://${window.location.hostname}:3001`;
    config.baseURL = backendUrl;

    const token = localStorage.getItem('agrodata_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor to handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.endsWith('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest && typeof window !== 'undefined') {
      localStorage.removeItem('agrodata_token');
      localStorage.removeItem('agrodata-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    withData(api.post('/auth/login', { email, password }), (data) => ({
      ...data,
      user: normalizeUser(data.user),
    })),
  me: () => withData(api.get('/auth/profile'), normalizeUser),
};

// Fincas
export const fincasApi = {
  getAll: () => withData(api.get('/fincas'), (data) => mapArray(data, mapFinca)),
  getOne: (id: number | string) => withData(api.get(`/fincas/${id}`), mapFinca),
  create: (data: unknown) => withData(api.post('/fincas', fincaPayload(data as AnyRecord)), mapFinca),
  update: (id: number | string, data: unknown) => withData(api.put(`/fincas/${id}`, fincaPayload(data as AnyRecord)), mapFinca),
  delete: (id: number | string) => api.delete(`/fincas/${id}`),
  getLotes: (fincaId: string | number) => api.get(`/fincas/${fincaId}/lotes`),
  createLote: (fincaId: string | number, data: { name: string; area: number; soilType?: string }) =>
    api.post(`/fincas/${fincaId}/lotes`, data),
  deleteLote: (loteId: string | number) => api.delete(`/fincas/lotes/${loteId}`),
};

// Producciones
export const produccionesApi = {
  getAll: (fincaId?: number | string) =>
    withData(api.get('/producciones', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapProduccion)),
  getOne: (id: number | string) => withData(api.get(`/producciones/${id}`), mapProduccion),
  create: async (data: unknown) => withData(api.post('/producciones', await produccionPayload(data as AnyRecord)), mapProduccion),
  update: async (id: number | string, data: unknown) => withData(api.put(`/producciones/${id}`, await produccionPayload(data as AnyRecord)), mapProduccion),
  delete: (id: number | string) => api.delete(`/producciones/${id}`),
};

// Inventario
export const inventarioApi = {
  getAll: (fincaId?: number | string) =>
    withData(api.get('/inventario', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapInventario)),
  create: (data: unknown) => withData(api.post('/inventario', inventarioPayload(data as AnyRecord)), mapInventario),
  update: (id: number | string, data: unknown) => withData(api.put(`/inventario/${id}`, inventarioPayload(data as AnyRecord)), (res) => res),
  delete: (id: number | string) => api.delete(`/inventario/${id}`),
  alertas: () => withData(api.get('/inventario/alertas'), (data) => mapArray(data, mapInventario)),
};

// Finanzas
export const finanzasApi = {
  getAll: (fincaId?: number | string) =>
    withData(api.get('/finanzas', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapFinanza)),
  resumen: (fincaId?: number | string) =>
    api.get('/finanzas/resumen', { params: fincaId ? { fincaId } : {} }),
  create: (data: unknown) => withData(api.post('/finanzas', finanzaPayload(data as AnyRecord)), mapFinanza),
  update: (id: number | string, data: unknown) => withData(api.put(`/finanzas/${id}`, finanzaPayload(data as AnyRecord)), mapFinanza),
  delete: (id: number | string) => api.delete(`/finanzas/${id}`),
};

// Personal
export const personalApi = {
  getAll: (fincaId?: number | string) =>
    withData(api.get('/personal', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapPersonal)),
  create: (data: unknown) => withData(api.post('/personal', personalPayload(data as AnyRecord)), mapPersonal),
  update: (id: number | string, data: unknown) => withData(api.put(`/personal/${id}`, personalPayload(data as AnyRecord)), mapPersonal),
  delete: (id: number | string) => api.delete(`/personal/${id}`),
};

// Maquinaria
export const maquinariaApi = {
  getAll: (fincaId?: number | string) =>
    withData(api.get('/maquinaria', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapMaquinaria)),
  create: (data: unknown) => withData(api.post('/maquinaria', maquinariaPayload(data as AnyRecord)), mapMaquinaria),
  update: (id: number | string, data: unknown) => withData(api.put(`/maquinaria/${id}`, maquinariaPayload(data as AnyRecord)), mapMaquinaria),
  delete: (id: number | string) => api.delete(`/maquinaria/${id}`),
};

// Clima
export const climaApi = {
  current: (ciudad?: string, lat?: number, lon?: number) => {
    const params: Record<string, any> = {};
    if (ciudad) params.ciudad = ciudad;
    if (lat !== undefined && lon !== undefined) {
      params.lat = lat;
      params.lon = lon;
    }
    return api.get('/clima/current', { params });
  },
  forecast: (ciudad?: string, lat?: number, lon?: number) => {
    const params: Record<string, any> = {};
    if (ciudad) params.ciudad = ciudad;
    if (lat !== undefined && lon !== undefined) {
      params.lat = lat;
      params.lon = lon;
    }
    return api.get('/clima/forecast', { params });
  },
};

// Colaboradores (Multitenant User Management)
export const colaboradoresApi = {
  getAll: () => api.get('/users'),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// AI
export const aiApi = {
  recomendaciones: (data: unknown) => api.post('/ai/recomendaciones', data),
};

// SaaS Management (Solo SuperAdmin)
export const saasApi = {
  getStats: () => api.get('/saas/stats'),
  getOrganizations: () => api.get('/saas/organizations'),
  createOrganization: (data: {
    name: string;
    orgType?: string;
    nit?: string;
    subscription?: string;
    phone?: string;
    address?: string;
    ownerEmail?: string;
    ownerName?: string;
    ownerPassword?: string;
  }) => api.post('/saas/organizations', data),
  updateOrganization: (id: string, data: unknown) => api.put(`/saas/organizations/${id}`, data),
  deleteOrganization: (id: string) => api.delete(`/saas/organizations/${id}`),
  suspendOrganization: (id: string, reason: string) => api.patch(`/saas/organizations/${id}/suspend`, { reason }),
  reactivateOrganization: (id: string) => api.patch(`/saas/organizations/${id}/reactivate`),
  getSuspensionHistory: (id: string) => api.get(`/saas/organizations/${id}/history`),
  getUsers: () => api.get('/saas/users'),
  createUser: (data: {
    email: string;
    name: string;
    password?: string;
    role?: string;
    organizationId: string;
  }) => api.post('/saas/users', data),
  updateUser: (id: string, data: unknown) => api.put(`/saas/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/saas/users/${id}`),
};

