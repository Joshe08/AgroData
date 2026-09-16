import { create } from 'zustand';

export interface Lote {
  id: string | number;
  nombre: string;
  hectareas: number;
  tipoSuelo?: string;
  fincaId?: string | number;
}

export interface Finca {
  id: string | number;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  unidadMedida?: string;
  tipoSuelo?: string;
  descripcion?: string;
  departamento?: string;
  municipio?: string;
  vereda?: string;
  referenciaAcceso?: string;
  tipoExplotacion?: string;
  estado?: string;
  fuenteAgua?: string;
  sistemaRiego?: string;
  tipoAcceso?: string;
  actividades?: string[];
  latitude?: number;
  longitude?: number;
  lotes?: Lote[];
  createdAt?: string;
}

interface FincasState {
  fincas: Finca[];
  selectedFinca: Finca | null;
  isLoading: boolean;
  setFincas: (fincas: Finca[]) => void;
  setSelectedFinca: (finca: Finca | null) => void;
  setLoading: (loading: boolean) => void;
  addFinca: (finca: Finca) => void;
  updateFinca: (finca: Finca) => void;
  removeFinca: (id: string | number) => void;
}

export const useFincasStore = create<FincasState>((set) => ({
  fincas: [],
  selectedFinca: null,
  isLoading: false,

  setFincas: (fincas) => set({ fincas }),
  setSelectedFinca: (finca) => set({ selectedFinca: finca }),
  setLoading: (isLoading) => set({ isLoading }),
  addFinca: (finca) => set((state) => ({ fincas: [...state.fincas, finca] })),
  updateFinca: (updated) =>
    set((state) => ({
      fincas: state.fincas.map((f) => (f.id === updated.id ? updated : f)),
    })),
  removeFinca: (id) =>
    set((state) => ({ fincas: state.fincas.filter((f) => f.id !== id) })),
}));
