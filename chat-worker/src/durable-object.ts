import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface Env {
  AI: any;
  CHAT_STORAGE: any;
  AUTORAG_NAMESPACE: string;
  OPENAI_API_KEY: string;
}

// Configuration for the chat assistant
const CHAT_CONFIG = {
  // Legacy Workers AI model (not used - we use OpenAI for better quality)
  model: "@cf/meta/llama-3.1-8b-instruct-fast",
  
  // OpenAI model configuration (primary generation model)
  openaiModel: "gpt-4.1-mini", // Best balance of quality/speed/cost
  
  // Search configuration - Conservative settings for reliability
  maxResults: 10,         // Good balance of context vs performance
  scoreThreshold: 0.2,   // Lower threshold for more comprehensive results
  maxTokens: 2000,       // Reasonable response limit
  
  // Message appended to every user query (optional)
  queryAppend: `
`,

  // Enhanced but concise system prompt
  systemPrompt: `You are an expert AI assistant specializing in architectural document analysis and project planning. 

##Guidelines you must follow:
**Never mention file names, document sources, or metadata in your responses**
**Never include details like this "user-123/webhook-test-1749327626988/Firehouse%20Subs%20-%20London(BidSet).pdf" in your responses**
**Never include details about the document sources in your responses**
`
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
    console.log(`📨 Processing message for user: ${userId}, project: ${projectId}`);
    console.log(`📝 Message type: ${message.type}`);
    
    if (message.type === 'user_message') {
      const originalMessage = message.data.content;
      console.log(`💬 User message received: "${originalMessage}"`);
      console.log(`🔧 Current OpenAI model configured: ${CHAT_CONFIG.openaiModel}`);
      
      // Append additional message if configured
      const userMessage = CHAT_CONFIG.queryAppend ? 
        originalMessage + CHAT_CONFIG.queryAppend : 
        originalMessage;

      console.log('Original user message:', originalMessage);
      console.log('Enhanced user message:', userMessage);

      const messageId = message.messageId || `msg_${Date.now()}`;
      
      // Store original user message in KV (without the appended instructions)
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
        data: { content: 'Searching through plans...', isComplete: false }
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
      console.log(`🔍 Querying AutoRAG for: "${query}"`);
      console.log(`📁 Namespace: ${this.env.AUTORAG_NAMESPACE}`);
      console.log(`🏷️ Scope filter: ${scopeFilter}`);
      console.log(`⚡ Attempting AutoRAG aiSearch first...`);
      
      // Check if namespace exists
      if (!this.env.AUTORAG_NAMESPACE) {
        throw new Error('AUTORAG_NAMESPACE not configured');
      }
      
      console.log('🔍 Using AutoRAG search() + OpenAI generation for best quality...');
      
      // Skip aiSearch completely - go straight to search() + OpenAI
      // This gives us better control over the generation model
      
      // Use search() to get relevant documents, then generate with OpenAI
      console.log('📚 Step 1: AutoRAG document search...');
      const searchResponse = await this.env.AI.autorag(this.env.AUTORAG_NAMESPACE).search({
        query: query,
        rewrite_query: true,
        max_num_results: CHAT_CONFIG.maxResults,
        ranking_options: {
          score_threshold: CHAT_CONFIG.scoreThreshold
        }
      });
      
      if (searchResponse?.data && searchResponse.data.length > 0) {
        // Join all document chunks into a single string
        const chunks = searchResponse.data
          .map((item: any) => {
            const data = item.content
              .map((content: any) => {
                return content.text;
              })
              .join("\n\n");

            return `<file name="${item.filename}">${data}</file>`;
          })
          .join("\n\n");

        // Generate response using OpenAI
        const openai = createOpenAI({
          apiKey: this.env.OPENAI_API_KEY,
        });
        
        const modelName = CHAT_CONFIG.openaiModel;
        console.log(`🤖 Step 2: OpenAI generation using model: ${modelName}`);
        
        const generateResult = await generateText({
          model: openai(modelName),
          messages: [
            {
              role: "system",
              content: CHAT_CONFIG.systemPrompt,
            },
            { role: "user", content: chunks },
            { role: "user", content: query },
          ],
          maxTokens: CHAT_CONFIG.maxTokens,
        });
        
        console.log(`✅ OpenAI response received. Model used: ${modelName}`);
        console.log(`📊 Response metadata:`, {
          usage: generateResult.usage,
          finishReason: generateResult.finishReason,
          responseLength: generateResult.text?.length || 0
        });
        
        if (generateResult?.text) {
          return this.createStreamFromText(generateResult.text);
        }
      }
      
      throw new Error('No response from AutoRAG aiSearch or search fallback');
      
    } catch (error) {
      console.error('AutoRAG error details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error message:', errorMessage);
      
      const fallbackMessage = `I'm having trouble accessing the knowledge base right now. This might be due to:
      
- Temporary connectivity issues with the document database
- The specific information you're looking for might not be indexed yet
- The query might need to be rephrased for better results

Please try rephrasing your question or ask about a different aspect of the project. I'm here to help with architectural documents, project planning, and technical specifications.`;
      
      return this.createStreamFromText(fallbackMessage);
    }
  }

  private cleanResponse(text: string): string {
    console.log('Original text:', text);
    
    // Enhanced cleaning based on AutoRAG best practices
    const cleaned = text
      // Remove AutoRAG metadata and system artifacts
      .replace(/\[CONTENT TRIMMED[^\]]*\]/gi, '')
      .replace(/\[[^\]]*Firehouse[^\]]*\]/gi, '')
      .replace(/<\/document[^>]*>/gi, '')
      .replace(/<document[^>]*>/gi, '')
      .replace(/\[\/INST\]/gi, '')
      .replace(/\[INST\]/gi, '')
      
      // Clean up common AutoRAG artifacts
      .replace(/Based on the provided documents?,?\s*/gi, '')
      .replace(/According to the (available\s+)?(documents?|information)\s*,?\s*/gi, '')
      .replace(/The (available\s+)?(documents?|files?)\s+(indicate|show|state|mention)\s+that\s*/gi, '')
      .replace(/is listed as the architect in the provided documents/gi, 'is the architect')
      .replace(/The available at \|/gi, '')
      
      // Remove file references and metadata
      .replace(/\b[a-zA-Z0-9._-]+\.(pdf|doc|docx|txt|md)\b/gi, '')
      .replace(/\bfile\s*:\s*[^\s]+/gi, '')
      .replace(/\bsource\s*:\s*[^\s]+/gi, '')
      
      // Clean up formatting artifacts
      .replace(/\|\s*$|^\s*\|/gm, '')  // Remove trailing/leading pipes
      .replace(/\s*\|\s*/g, ' ')        // Replace internal pipes with spaces
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Normalize multiple line breaks
      .replace(/[ \t]+/g, ' ')          // Normalize whitespace
      .replace(/^\s+|\s+$/gm, '')       // Trim lines
      
      // Improve readability
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper sentence spacing
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