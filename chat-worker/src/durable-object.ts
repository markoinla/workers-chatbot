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
      const messageId = message.messageId || `msg_${Date.now()}`;
      
      // Store user message in KV
      await this.persistMessage({
        id: messageId,
        content: userMessage,
        role: 'user',
        timestamp: Date.now(),
        userId,
        projectId
      });
      
      // Send acknowledgment
      socket.send(JSON.stringify({
        type: 'assistant_message',
        messageId: `assistant_${messageId}`,
        data: { content: 'Processing your message...', isComplete: false }
      }));

      try {
        // Query AutoRAG with appropriate scope filtering - try without ladders-pdf-index prefix
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
      
      // Use basic search (which works) + Workers AI for generation
      let searchResults = await this.env.AI.autorag(this.env.AUTORAG_NAMESPACE).search({
        query: query,
        max_num_results: 5,
        rewrite_query: true,
        ranking_options: {
          score_threshold: 0.3
        },
        // Add back the scope filtering
        filters: {
          type: "eq",
          key: "folder",
          value: `${scopeFilter}/`
        }
      });
      
      console.log('Search found', searchResults?.data?.length || 0, 'results');
      
      if (!searchResults?.data || searchResults.data.length === 0) {
        throw new Error('No relevant documents found');
      }
      
      // Extract content from search results
      const context = searchResults.data.map((result: any) => {
        const content = result.content.map((c: any) => c.text).join('\n');
        return `From ${result.filename}:\n${content}`;
      }).join('\n\n---\n\n');
      
      // Use Workers AI directly to generate response with proper text streaming
      const prompt = `Based on the following context from the knowledge base, please answer the user's question: "${query}"

Context:
${context}

Please provide a helpful and accurate response based on the information above.`;

      console.log('Using Workers AI to generate response...');
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-sd', {
        prompt: prompt,
        stream: true,
        max_tokens: 1000
      });

      // Convert the Workers AI response to a proper text stream
      return new ReadableStream({
        async start(controller) {
          if (response && response.readable) {
            const reader = response.readable.getReader();
            const decoder = new TextDecoder();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // Decode bytes to text and enqueue
                const text = decoder.decode(value, { stream: true });
                controller.enqueue(text);
              }
            } finally {
              reader.releaseLock();
              controller.close();
            }
          } else {
            controller.close();
          }
        }
      });
      
    } catch (error) {
      console.error('AutoRAG error:', error);
      
      // Fallback with more helpful debugging info
      const fallbackMessage = `I'm having trouble with aiSearch on the ladders-rag knowledge base. This could mean: 1) aiSearch permissions issue, 2) Model/namespace problem, or 3) Binding configuration. You asked: "${query}"`;
      
      return new ReadableStream({
        start(controller) {
          const words = fallbackMessage.split(' ');
          let index = 0;
          
          const sendNext = () => {
            if (index < words.length) {
              controller.enqueue(words[index] + ' ');
              index++;
              setTimeout(sendNext, 30); // Faster fallback
            } else {
              controller.close();
            }
          };
          
          sendNext();
        }
      });
    }
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