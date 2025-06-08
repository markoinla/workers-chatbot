import { ChatSession } from './durable-object';

export interface Env {
  AI: any;
  CHAT_STORAGE: KVNamespace;
  CHAT_SESSION: DurableObjectNamespace;
  AUTORAG_NAMESPACE: string;
  OPENAI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // WebSocket upgrade for chat sessions
    if (url.pathname.startsWith('/socket/')) {
      const sessionId = url.pathname.split('/')[2];
      if (!sessionId) {
        return new Response('Session ID required', { status: 400 });
      }

      // Get Durable Object for this session
      const id = env.CHAT_SESSION.idFromName(sessionId);
      const chatSession = env.CHAT_SESSION.get(id);
      
      return chatSession.fetch(request);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Serve embed script (for now, return placeholder)
    if (url.pathname === '/embed.js') {
      return new Response('// Embed script will be served here', {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

// Export the Durable Object class
export { ChatSession }; 