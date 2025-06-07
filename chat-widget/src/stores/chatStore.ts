import { create } from 'zustand'
import type { ChatState, ChatMessage, ConnectionStatus } from '@/types/chat'

interface ChatStore extends ChatState {
  // Actions
  toggleChat: () => void
  setConnecting: (connecting: boolean) => void
  setConnected: (connected: boolean) => void
  setError: (error: string | undefined) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, content: string) => void
  setCurrentMessage: (message: string) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>()((set, get) => ({
  // Initial state
  isOpen: false,
  isConnected: false,
  isConnecting: false,
  messages: [],
  currentMessage: '',
  error: undefined,

  // Actions
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  
  setConnecting: (connecting: boolean) => set({ isConnecting: connecting }),
  
  setConnected: (connected: boolean) => set({ 
    isConnected: connected, 
    isConnecting: false,
    error: connected ? undefined : get().error
  }),
  
  setError: (error: string | undefined) => set({ 
    error, 
    isConnecting: false,
    isConnected: false 
  }),
  
  addMessage: (message: ChatMessage) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  updateMessage: (id: string, content: string) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === id ? { ...msg, content } : msg
    )
  })),
  
  setCurrentMessage: (message: string) => set({ currentMessage: message }),
  
  clearMessages: () => set({ messages: [] })
})) 