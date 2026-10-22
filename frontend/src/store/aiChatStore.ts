import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
  actionSuggestion?: {
    type: string;
    data: any;
  } | null;
  actionExecuted?: boolean;
  imageUrl?: string;
  kpis?: any;
}

interface AiChatState {
  messages: AiMessage[];
  selectedFinca: string;
  setMessages: (messages: AiMessage[]) => void;
  addMessage: (message: AiMessage) => void;
  updateMessage: (id: string, patch: Partial<AiMessage>) => void;
  setSelectedFinca: (fincaId: string) => void;
  clearChat: () => void;
}

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set) => ({
      messages: [],
      selectedFinca: '',

      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      updateMessage: (id, patch) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      setSelectedFinca: (selectedFinca) => set({ selectedFinca }),

      clearChat: () => set({ messages: [] }),
    }),
    {
      name: 'agrodata-ai-chat',
      // Solo persistir mensajes y finca seleccionada
      partialize: (state) => ({
        messages: state.messages,
        selectedFinca: state.selectedFinca,
      }),
    }
  )
);
