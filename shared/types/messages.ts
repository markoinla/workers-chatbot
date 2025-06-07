// Shared types for cross-component communication

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  userId: string;
  projectId?: string;
}

export interface EmbedConfig {
  userId: string;
  projectId?: string;
  // JWT will be added later
}

export interface WebSocketMessage {
  type: 'user_message' | 'assistant_message' | 'error' | 'connection_status';
  data: any;
  messageId?: string;
}

export interface PostMessageData {
  type: 'INIT' | 'TOGGLE' | 'RESIZE' | 'ERROR';
  payload?: any;
}

export interface AutoRAGResponse {
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
} 