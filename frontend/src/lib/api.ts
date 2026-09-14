import axios from 'axios';

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: DEFAULT_API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

type AnyRecord = Record<string, any>;

const withData = <T>(request: Promise<any>, mapper: (data: any) => T) =>
  request.then((response) => ({ ...response, data: mapper(response.data) }));

const mapArray = <T>(data: any, mapper: (item: AnyRecord) => T) =>
  Array.isArray(data) ? data.map(mapper) : data;

const normalizeUser = (user: AnyRecord) => ({
  ...user,
  nombre: user.nombre ?? user.name ?? '',
  rol: user.rol ?? user.role ?? '',
});

const mapFinca = (finca: AnyRecord) => ({
  ...finca,
  nombre: finca.nombre ?? finca.name ?? '',
  ubicacion: finca.ubicacion ?? finca.location ?? '',
  hectareas: finca.hectareas ?? finca.area ?? 0,
  lotes: Array.isArray(finca.lotes)
    ? finca.lotes.map((lote: AnyRecord) => ({
        ...lote,
        nombre: lote.nombre ?? lote.name ?? '',
        hectareas: lote.hectareas ?? lote.area ?? 0,
        tipoSuelo: lote.tipoSuelo ?? lote.soilType ?? '',
      }))
    : finca.lotes,
});

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
  const metadata = parseMetadata(prod.metadata);
  const finca = prod.finca ?? prod.lote?.finca;
  return {
    ...prod,
    tipo: prod.tipo ?? prod.type ?? 'CULTIVO',
    variedad: prod.variedad ?? metadata.variedad ?? metadata.variety ?? prod.name ?? '',
    estado: prod.estado ?? prod.status ?? 'ACTIVE',
    fechaInicio: prod.fechaInicio ?? prod.startDate,
    fechaEstimadaCosecha: prod.fechaEstimadaCosecha ?? prod.endDate,
    cantidadSembrada: prod.cantidadSembrada ?? prod.expectedYield,
    unidadMedida: prod.unidadMedida ?? prod.unit,
    fincaId: prod.fincaId ?? finca?.id,
    finca: finca ? mapFinca(finca) : prod.finca,
  };
};

const mapInventario = (item: AnyRecord) => ({
  ...item,
  nombre: item.nombre ?? item.name ?? '',
  categoria: item.categoria ?? item.category ?? 'OTRO',
  cantidad: item.cantidad ?? item.quantity ?? 0,
  unidad: item.unidad ?? item.unit ?? 'unidades',
  stockMinimo: item.stockMinimo ?? item.minAlertQuantity,
});

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
  nombre: persona.nombre ?? persona.name ?? '',
  cargo: persona.cargo ?? persona.role ?? '',
  salario: persona.salario ?? persona.dailyRate,
  telefono: persona.telefono ?? persona.phone,
  tipoContrato: persona.tipoContrato ?? persona.status ?? 'ACTIVE',
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
  'DAÃ‘ADO': 'BROKEN',
  INACTIVO: 'BROKEN',
};

const mapMaquinaria = (maquina: AnyRecord) => ({
  ...maquina,
  nombre: maquina.nombre ?? maquina.name ?? '',
  tipo: maquina.tipo ?? 'OTRO',
  estado: maquina.estado ?? backendToUiStatus[maquina.status] ?? maquina.status ?? 'OPERATIVO',
  proximoMantenimiento: maquina.proximoMantenimiento ?? maquina.lastMaintenance,
  costoMantenimiento: maquina.costoMantenimiento ?? maquina.maintenanceCost,
});

const fincaPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  location: data.location ?? data.ubicacion,
  area: data.area ?? data.hectareas,
  latitude: data.latitude,
  longitude: data.longitude,
});

const inventarioPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  category: data.category ?? data.categoria,
  quantity: data.quantity ?? data.cantidad,
  unit: data.unit ?? data.unidad,
  minAlertQuantity: data.minAlertQuantity ?? data.stockMinimo,
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
  role: data.role ?? data.cargo,
  dailyRate: data.dailyRate ?? data.salario,
  phone: data.phone ?? data.telefono,
  status: data.status ?? 'ACTIVE',
});

const maquinariaPayload = (data: AnyRecord) => ({
  name: data.name ?? data.nombre,
  status: uiToBackendStatus[data.status ?? data.estado] ?? data.status ?? 'OPERATIVE',
  lastMaintenance: data.lastMaintenance ?? data.proximoMantenimiento,
  maintenanceCost: data.maintenanceCost ?? data.costoMantenimiento ?? 0,
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

const produccionPayload = async (data: AnyRecord) => {
  const loteId = data.loteId ?? (await ensureLoteId(data.fincaId));
  const variedad = data.variedad ?? data.name;
  return {
    name: data.name ?? [data.tipo ?? data.type ?? 'Produccion', variedad].filter(Boolean).join(' - '),
    type: data.type ?? data.tipo,
    status: data.status ?? data.estado ?? 'ACTIVE',
    startDate: data.startDate ?? data.fechaInicio,
    endDate: data.endDate ?? data.fechaEstimadaCosecha,
    expectedYield: data.expectedYield ?? data.cantidadSembrada,
    unit: data.unit ?? data.unidadMedida,
    loteId,
    metadata: {
      ...(typeof data.metadata === 'object' ? data.metadata : {}),
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
  update: (id: number | string, data: unknown) => withData(api.put(`/fincas/${id}`, fincaPayload(data as AnyRecord)), (res) => res),
  delete: (id: number) => api.delete(`/fincas/${id}`),
};

// Producciones
export const produccionesApi = {
  getAll: (fincaId?: number) =>
    withData(api.get('/producciones', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapProduccion)),
  getOne: (id: number | string) => withData(api.get(`/producciones/${id}`), mapProduccion),
  create: async (data: unknown) => withData(api.post('/producciones', await produccionPayload(data as AnyRecord)), mapProduccion),
  update: async (id: number | string, data: unknown) => withData(api.put(`/producciones/${id}`, await produccionPayload(data as AnyRecord)), mapProduccion),
  delete: (id: number) => api.delete(`/producciones/${id}`),
};

// Inventario
export const inventarioApi = {
  getAll: (fincaId?: number) =>
    withData(api.get('/inventario', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapInventario)),
  create: (data: unknown) => withData(api.post('/inventario', inventarioPayload(data as AnyRecord)), mapInventario),
  update: (id: number | string, data: unknown) => withData(api.put(`/inventario/${id}`, inventarioPayload(data as AnyRecord)), (res) => res),
  delete: (id: number) => api.delete(`/inventario/${id}`),
  alertas: () => withData(api.get('/inventario/alertas'), (data) => mapArray(data, mapInventario)),
};

// Finanzas
export const finanzasApi = {
  getAll: (fincaId?: number) =>
    withData(api.get('/finanzas', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapFinanza)),
  resumen: (fincaId?: number) =>
    api.get('/finanzas/resumen', { params: fincaId ? { fincaId } : {} }),
  create: (data: unknown) => withData(api.post('/finanzas', finanzaPayload(data as AnyRecord)), mapFinanza),
  update: (id: number | string, data: unknown) => withData(api.put(`/finanzas/${id}`, finanzaPayload(data as AnyRecord)), (res) => res),
  delete: (id: number) => api.delete(`/finanzas/${id}`),
};

// Personal
export const personalApi = {
  getAll: (fincaId?: number) =>
    withData(api.get('/personal', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapPersonal)),
  create: (data: unknown) => withData(api.post('/personal', personalPayload(data as AnyRecord)), mapPersonal),
  update: (id: number | string, data: unknown) => withData(api.put(`/personal/${id}`, personalPayload(data as AnyRecord)), (res) => res),
  delete: (id: number) => api.delete(`/personal/${id}`),
};

// Maquinaria
export const maquinariaApi = {
  getAll: (fincaId?: number) =>
    withData(api.get('/maquinaria', { params: fincaId ? { fincaId } : {} }), (data) => mapArray(data, mapMaquinaria)),
  create: (data: unknown) => withData(api.post('/maquinaria', maquinariaPayload(data as AnyRecord)), mapMaquinaria),
  update: (id: number | string, data: unknown) => withData(api.put(`/maquinaria/${id}`, maquinariaPayload(data as AnyRecord)), (res) => res),
  delete: (id: number) => api.delete(`/maquinaria/${id}`),
};

// Clima
export const climaApi = {
  current: (ciudad: string) => api.get(`/clima/current?ciudad=${encodeURIComponent(ciudad)}`),
  forecast: (ciudad: string) => api.get(`/clima/forecast?ciudad=${encodeURIComponent(ciudad)}`),
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
    nit?: string;
    subscription?: string;
    ownerEmail?: string;
    ownerName?: string;
    ownerPassword?: string;
  }) => api.post('/saas/organizations', data),
  updateOrganization: (id: string, data: unknown) => api.put(`/saas/organizations/${id}`, data),
  deleteOrganization: (id: string) => api.delete(`/saas/organizations/${id}`),
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

