export interface Env {
  AI: any;
  CHAT_STORAGE: any;
  AUTORAG_NAMESPACE: string;
}

export class ChatSession {
  private sessions: Map<any, { userId: string; projectId?: string }> = new Map();
  private state: any;
  private env: Env;

  constructor(state: any, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: any): Promise<any> {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  private async handleWebSocket(request: any): Promise<any> {
    const webSocketPair = new (WebSocketPair as any)();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket connection
    (server as any).accept();

    // Parse user/project info from URL or headers (for now, simple implementation)
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || 'anonymous';
    const projectId = url.searchParams.get('projectId') || undefined;

    // Store session info
    this.sessions.set(server, { userId, projectId });

    // Handle incoming messages
    (server as any).addEventListener('message', async (event: any) => {
      try {
        const message = JSON.parse(event.data as string);
        await this.processMessage(message, server as any, userId, projectId);
      } catch (error) {
        console.error('Error processing message:', error);
        (server as any).send(JSON.stringify({
          type: 'error',
          data: { message: 'Failed to process message' }
        }));
      }
    });

    // Handle connection close
    (server as any).addEventListener('close', () => {
      this.sessions.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client as any,
    });
  }

  private async processMessage(
    message: any,
    socket: any,
    userId: string,
    projectId?: string
  ): Promise<void> {
    if (message.type === 'user_message') {
      const userMessage = message.data.content;
      
      // Send acknowledgment
      socket.send(JSON.stringify({
        type: 'assistant_message',
        data: { content: 'Processing your message...', isComplete: false }
      }));

      try {
        // Query AutoRAG with appropriate scope filtering
        const scopeFilter = projectId ? `${userId}/${projectId}/` : `${userId}/`;
        const response = await this.queryAutoRAG(userMessage, scopeFilter);
        
        // Stream the response
        await this.streamResponse(response, socket);
        
      } catch (error) {
        console.error('AutoRAG query failed:', error);
        socket.send(JSON.stringify({
          type: 'error',
          data: { message: 'Failed to generate response' }
        }));
      }
    }
  }

  private async queryAutoRAG(query: string, scopeFilter: string): Promise<ReadableStream> {
    // For now, return a simple mock response until we connect to actual AutoRAG
    // This will be replaced with actual AutoRAG integration
    const mockResponse = `I understand you're asking about: "${query}". This is a mock response from the ${scopeFilter} scope. AutoRAG integration coming soon!`;
    
    return new ReadableStream({
      start(controller) {
        // Simulate streaming by sending words one by one
        const words = mockResponse.split(' ');
        let index = 0;
        
        const sendNext = () => {
          if (index < words.length) {
            controller.enqueue(words[index] + ' ');
            index++;
            setTimeout(sendNext, 50); // 50ms delay between words
          } else {
            controller.close();
          }
        };
        
        sendNext();
      }
    });
  }

  private async streamResponse(stream: ReadableStream, socket: any): Promise<void> {
    const reader = stream.getReader();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Send final complete message
          socket.send(JSON.stringify({
            type: 'assistant_message',
            data: { content: fullContent, isComplete: true }
          }));
          break;
        }

        fullContent += value;
        
        // Send streaming update
        socket.send(JSON.stringify({
          type: 'assistant_message',
          data: { content: fullContent, isComplete: false }
        }));
      }
    } finally {
      reader.releaseLock();
    }
  }
} 