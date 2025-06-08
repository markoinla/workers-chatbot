export interface Env {
  AI: any;
  CHAT_STORAGE: any;
  AUTORAG_NAMESPACE: string;
}

// Configuration for the chat assistant
const CHAT_CONFIG = {
  // Model to use for AI responses
  model: "@cf/meta/llama-3.1-8b-instruct-fast",
  
  // Search configuration - Reduced to avoid overwhelming the model
  maxResults: 3,         // Much smaller set of documents
  scoreThreshold: 0.4,   // Higher threshold for better quality matches
  maxTokens: 1000,       // Smaller response limit
};

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
      const originalMessage = message.data.content;
      
      // For now, let's test without query modifications
      const userMessage = originalMessage;

      const messageId = message.messageId || `msg_${Date.now()}`;
      
      // Store original user message in KV (without instructions)
      await this.persistMessage({
        id: messageId,
        content: originalMessage,
        role: 'user',
        timestamp: Date.now(),
        userId,
        projectId
      });
      
      // Send acknowledgment
      socket.send(JSON.stringify({
        type: 'assistant_message',
        messageId: `assistant_${messageId}`,
        data: { content: 'Processing your request...', isComplete: false }
      }));

      try {
        // Query AutoRAG with the enhanced message
        const scopeFilter = projectId ? `${userId}/${projectId}` : `${userId}`;
        const response = await this.queryAutoRAG(userMessage, scopeFilter);
        
        // Stream the response
        await this.streamResponse(response, socket, `assistant_${messageId}`, userId, projectId);
        
      } catch (error) {
        console.error('AutoRAG query failed:', error);
        socket.send(JSON.stringify({
          type: 'error',
          data: { error: 'Failed to generate response' }
        }));
      }
    }
  }

  private async queryAutoRAG(query: string, scopeFilter: string): Promise<ReadableStream> {
    try {
      console.log(`Querying AutoRAG for: "${query}"`);
      console.log(`Namespace: ${this.env.AUTORAG_NAMESPACE}`);
      console.log(`Scope filter: ${scopeFilter}`);
      
      // Check if namespace exists
      if (!this.env.AUTORAG_NAMESPACE) {
        throw new Error('AUTORAG_NAMESPACE not configured');
      }
      
      console.log('Using aiSearch...');
      const aiResponse = await this.env.AI.autorag(this.env.AUTORAG_NAMESPACE).aiSearch({
        query: query,
        model: CHAT_CONFIG.model,
        system_prompt: `Answer questions directly and concisely. Do not mention sources or documents. State facts clearly.`,
        max_num_results: CHAT_CONFIG.maxResults,
        rewrite_query: true,
        ranking_options: {
          score_threshold: CHAT_CONFIG.scoreThreshold
        },
        stream: false
      });
      
      console.log('aiSearch response:', aiResponse);
      console.log('aiSearch response length:', aiResponse?.response?.length || 0);
      console.log('aiSearch response preview:', aiResponse?.response?.substring(0, 200) || 'No response');
      
      if (aiResponse?.response && aiResponse.response.trim().length > 0) {
        console.log('✅ Using aiSearch response');
        console.log('Raw response before cleaning:', aiResponse.response);
        return this.createStreamFromText(aiResponse.response);
      }
      
      throw new Error('No response from AutoRAG aiSearch');
      
    } catch (error) {
      console.error('AutoRAG error details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error message:', errorMessage);
      
      const fallbackMessage = `I'm having trouble accessing the knowledge base. Error: ${errorMessage}`;
      return this.createStreamFromText(fallbackMessage);
    }
  }

  private cleanResponse(text: string): string {
    console.log('Original text:', text);
    
    // Minimal cleaning to test
    const cleaned = text
      // Remove only the most obvious metadata
      .replace(/\[CONTENT TRIMMED[^\]]*\]/gi, '')
      .replace(/\[[^\]]*Firehouse[^\]]*\]/gi, '')
      .replace(/<\/document[^>]*>/gi, '')
      .replace(/is listed as the architect in the provided documents/gi, 'is the architect')
      .replace(/The available at \|/gi, '')
      // Basic cleanup
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
    
    console.log('Cleaned text:', cleaned);
    return cleaned;
  }

  private createStreamFromText(text: string): ReadableStream {
    const cleanedText = this.cleanResponse(text);
    
    console.log('Text after cleaning:', cleanedText);
    console.log('Cleaned text length:', cleanedText.length);
    
    return new ReadableStream({
      start(controller) {
        const words = cleanedText.split(' ');
        console.log('Word count for streaming:', words.length);
        let index = 0;
        
        const sendNext = () => {
          if (index < words.length) {
            controller.enqueue(words[index] + ' ');
            index++;
            setTimeout(sendNext, 50); // Simulate streaming
          } else {
            console.log('Streaming completed, sent', index, 'words');
            controller.close();
          }
        };
        
        sendNext();
      }
    });
  }

  private async streamResponse(
    stream: ReadableStream, 
    socket: any, 
    messageId: string, 
    userId: string, 
    projectId?: string
  ): Promise<void> {
    const reader = stream.getReader();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Store final assistant message in KV
          await this.persistMessage({
            id: messageId,
            content: fullContent,
            role: 'assistant',
            timestamp: Date.now(),
            userId,
            projectId
          });

          // Send final complete message
          socket.send(JSON.stringify({
            type: 'assistant_message',
            messageId: messageId,
            data: { content: fullContent, isComplete: true }
          }));
          break;
        }

        fullContent += value;
        
        // Send streaming update
        socket.send(JSON.stringify({
          type: 'assistant_message',
          messageId: messageId,
          data: { content: fullContent, isComplete: false }
        }));
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async persistMessage(message: {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: number;
    userId: string;
    projectId?: string;
  }): Promise<void> {
    try {
      const key = `chat:${message.userId}:${message.projectId || 'default'}:${message.id}`;
      await this.env.CHAT_STORAGE.put(key, JSON.stringify(message));
    } catch (error) {
      console.error('Failed to persist message:', error);
    }
  }
} 