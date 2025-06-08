// Re-export shared types and add widget-specific types
export * from '../../../shared/types/messages';
import type { ChatMessage } from '../../../shared/types/messages';

export interface ChatState {
  isOpen: boolean;
  isExpanded: boolean;
  mode: 'popup' | 'sidebar';
  isConnected: boolean;
  isConnecting: boolean;
  messages: ChatMessage[];
  currentMessage: string;
  error?: string;
}

export interface WidgetConfig {
  userId: string;
  projectId?: string;
  websocketUrl: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left';
}

export interface StreamingState {
  isStreaming: boolean;
  streamingMessageId?: string;
  partialContent: string;
}

export interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError?: string;
  retryCount: number;
} 