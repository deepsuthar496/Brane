import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/components/branezo/types';

interface ChatState {
  messages: ChatMessage[];
  isThinking: boolean;
  tokensUsed: number;
  cost: number;
  currentSessionId: string;
  workspacePath: string | null;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updater: (msg: ChatMessage) => ChatMessage) => void;
  setThinking: (status: boolean) => void;
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  setWorkspacePath: (path: string | null) => void;
  setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      isThinking: false,
      tokensUsed: 0,
      cost: 0,
      currentSessionId: `session-${Date.now()}`,
      workspacePath: null,

      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      
      updateMessage: (id, updater) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? updater(m) : m)
      })),

      setThinking: (status) => set({ isThinking: status }),
      
      clearMessages: () => set({ messages: [], currentSessionId: `session-${Date.now()}` }),
      
      setSessionId: (id) => set({ currentSessionId: id }),

      setWorkspacePath: (path) => set({ workspacePath: path }),

      setMessages: (updater) => set((state) => ({ messages: updater(state.messages) }))
    }),
    {
      name: 'branezo-chat-storage',
      partialize: (state) => ({ messages: state.messages, tokensUsed: state.tokensUsed, cost: state.cost, workspacePath: state.workspacePath })
    }
  )
);
