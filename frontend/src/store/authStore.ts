import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

export interface User {
  id: number | string;
  nombre: string;
  email: string;
  rol: string;
  organizationId?: string;
  organizationName?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await authApi.login(email, password);
          const { access_token, user } = res.data;
          localStorage.setItem('agrodata_token', access_token);
          set({ user, token: access_token, isLoading: false });
        } catch (err: unknown) {
          const axiosErr = err as {
            code?: string;
            message?: string;
            response?: { status?: number; data?: { message?: string } };
          };
          let msg = 'Error al iniciar sesión';
          if (axiosErr.response?.data?.message) {
            msg = axiosErr.response.data.message;
          } else if (axiosErr.response?.status === 401) {
            msg = 'Correo o contraseña incorrectos';
          } else if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
            msg = 'Tiempo de espera agotado al conectar con el servidor (puerto 3001)';
          } else if (axiosErr.message === 'Network Error' || !axiosErr.response) {
            msg = 'No se pudo conectar con el servidor backend (puerto 3001). Asegúrate de que el backend esté corriendo.';
          }
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          // Import useToastStore dynamically to avoid circular dependencies if any
          import('@/store/toastStore').then(({ useToastStore }) => {
            useToastStore.getState().success('Cerrando sesión...');
          });
          
          localStorage.removeItem('agrodata_token');
          localStorage.removeItem('agrodata-auth');
          
          set({ user: null, token: null });
          
          setTimeout(() => {
            window.location.href = '/login';
          }, 300);
        } else {
          set({ user: null, token: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'agrodata-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
