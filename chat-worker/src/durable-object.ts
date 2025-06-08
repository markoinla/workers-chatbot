export interface Env {
  AI: any;
  CHAT_STORAGE: any;
  AUTORAG_NAMESPACE: string;
}

// Configuration for the chat assistant
const CHAT_CONFIG = {
  // Model to use for AI responses
  model: "@cf/meta/llama-3.1-8b-instruct-fast",
  
  // System message/prompt for the assistant
  systemPrompt: `You are an expert construction assistant with access to architectural documents. Answer questions directly and confidently based on the provided context.

RESPONSE GUIDELINES:
- Answer immediately without rephrasing or restating the question
- If you find relevant information, present it clearly and directly
- Reference page numbers when available, but never include file names, paths, or metadata
- Use technical language appropriate for contractors and architects
- Be concise and actionable - focus on the specific information requested
- Only say you cannot find information if the context truly contains nothing relevant
- Format responses using markdown for better readability (headings, lists, tables, bold text, etc.)

DO NOT:
- Start with "I've searched..." or "Based on the knowledge base..."
- Say "According to the documents" or "The documents show"
- Rephrase or restate the user's question
- Include file paths, document names, .pdf references, or folder paths
- Reference "user-123", "webhook-test", or any technical identifiers
- Mention specific filenames or document metadata
- Use phrases like "[Document: ...]" or "(Document: ...)" 
- Include any bracketed or parenthetical document references
- Be overly cautious when relevant information is available

CRITICAL: Present information as direct facts without referencing the source documents. Never include file names, paths, or document identifiers in your response.`,
  
  // Search configuration
  maxResults: 5,
  scoreThreshold: 0.3,
  maxTokens: 800,
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
      console.log(`Scope filter: ${scopeFilter}`);
      
      // First try aiSearch with filters
      try {
        console.log('Trying aiSearch with folder filter...');
        const aiResponse = await this.env.AI.autorag(this.env.AUTORAG_NAMESPACE).aiSearch({
          query: query,
          model: CHAT_CONFIG.model,
          system_prompt: CHAT_CONFIG.systemPrompt,
          max_num_results: CHAT_CONFIG.maxResults,
          rewrite_query: true,
          ranking_options: {
            score_threshold: CHAT_CONFIG.scoreThreshold
          },
          filters: {
            type: "eq",
            key: "folder",
            value: `${scopeFilter}/`
          },
          stream: false
        });
        
        console.log('aiSearch with filter response:', JSON.stringify(aiResponse));
        
        if (aiResponse?.response) {
          return this.createStreamFromText(aiResponse.response);
        }
      } catch (filterError) {
        console.log('aiSearch with filter failed:', filterError);
      }
      
      // Fallback: try aiSearch without filters
      try {
        console.log('Trying aiSearch without filters...');
        const aiResponse = await this.env.AI.autorag(this.env.AUTORAG_NAMESPACE).aiSearch({
          query: query,
          model: CHAT_CONFIG.model,
          system_prompt: CHAT_CONFIG.systemPrompt,
          max_num_results: CHAT_CONFIG.maxResults,
          rewrite_query: true,
          ranking_options: {
            score_threshold: CHAT_CONFIG.scoreThreshold
          },
          stream: false
        });
        
        console.log('aiSearch without filter response:', JSON.stringify(aiResponse));
        
        if (aiResponse?.response) {
          return this.createStreamFromText(aiResponse.response);
        }
      } catch (noFilterError) {
        console.log('aiSearch without filter failed:', noFilterError);
      }
      
      // Final fallback: use search() to debug what's available
      console.log('Trying basic search for debugging...');
      let searchResults = await this.env.AI.autorag(this.env.AUTORAG_NAMESPACE).search({
        query: query,
        max_num_results: CHAT_CONFIG.maxResults,
        rewrite_query: true,
        ranking_options: {
          score_threshold: CHAT_CONFIG.scoreThreshold
        }
      });
      
      console.log('Basic search found', searchResults?.data?.length || 0, 'results');
      if (searchResults?.data?.length > 0) {
        console.log('Available folders:', searchResults.data.map((r: any) => r.attributes?.folder));
        
        // Extract content from search results (without file names)
        const context = searchResults.data.map((result: any) => {
          const content = result.content.map((c: any) => c.text).join('\n');
          // Get page number if available, but exclude file path/name
          const pageInfo = result.attributes?.page ? `Page ${result.attributes.page}` : '';
          return pageInfo ? `${pageInfo}:\n${content}` : content;
        }).join('\n\n---\n\n');
        
        // Use Workers AI for generation
        const prompt = `${CHAT_CONFIG.systemPrompt}

User Question: ${query}

Context from architectural documents:
${context}

Provide a direct answer based on the context above.`;

        const response = await this.env.AI.run(CHAT_CONFIG.model, {
          prompt: prompt,
          stream: false,
          max_tokens: CHAT_CONFIG.maxTokens
        });

        const responseText = response?.response || 'No response generated';
        return this.createStreamFromText(responseText);
      }
      
      throw new Error('No relevant documents found in AutoRAG');
      
    } catch (error) {
      console.error('AutoRAG error:', error);
      
      // Fallback with more helpful debugging info
      const fallbackMessage = `I'm having trouble accessing the ladders-rag knowledge base. This could mean: 1) aiSearch permissions issue, 2) Model/namespace problem, or 3) Binding configuration. You asked: "${query}"`;
      
      return this.createStreamFromText(fallbackMessage);
    }
  }

  private cleanResponse(text: string): string {
    // Remove file references and technical metadata
    let cleaned = text
      // Remove file paths and names
      .replace(/user-123\/[^/\s]+\/[^\s]*\.pdf[^\s]*/gi, '')
      .replace(/user-123\/[^/\s]+\/[^\s]*/gi, '')
      .replace(/webhook-test-[0-9]+/gi, '')
      .replace(/user-123/gi, '')
      // Remove PDF references
      .replace(/[^\s]*\.pdf[^\s]*/gi, '')
      // Remove file type references
      .replace(/- \d+\.md/gi, '')
      .replace(/\.md/gi, '')
      // Remove document references in square brackets
      .replace(/\[Document:[^\]]*\]/gi, '')
      .replace(/\[document:[^\]]*\]/gi, '')
      // Remove parenthetical document references
      .replace(/\([^)]*document[^)]*\)/gi, '')
      .replace(/\([^)]*Document[^)]*\)/gi, '')
      // Remove "According to the documents" type phrases
      .replace(/According to the documents?,?\s*/gi, '')
      .replace(/Based on the documents?,?\s*/gi, '')
      .replace(/From the documents?,?\s*/gi, '')
      .replace(/The documents? show that?\s*/gi, '')
      .replace(/In the documents?,?\s*/gi, '')
      // Remove HTML entities
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      // Clean up extra spaces and formatting
      .replace(/\s+/g, ' ')
      .replace(/\(\s*\)/g, '')
      .replace(/,\s*,/g, ',')
      .replace(/\s*,\s*\./g, '.')
      .replace(/:\s*\*/g, ':')
      .trim();
    
    return cleaned;
  }

  private createStreamFromText(text: string): ReadableStream {
    const cleanedText = this.cleanResponse(text);
    
    return new ReadableStream({
      start(controller) {
        const words = cleanedText.split(' ');
        let index = 0;
        
        const sendNext = () => {
          if (index < words.length) {
            controller.enqueue(words[index] + ' ');
            index++;
            setTimeout(sendNext, 50); // Simulate streaming
          } else {
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