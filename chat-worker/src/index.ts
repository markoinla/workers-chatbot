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
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
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
      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Serve embed script
    if (url.pathname === '/embed.js') {
      const embedScript = `(function() {
  'use strict';
  
  // Get the script tag that loaded this embed
  var currentScript = document.currentScript || document.querySelector('script[src*="embed.js"]');
  if (!currentScript) {
    console.error('Chat embed: Could not find script tag');
    return;
  }
  
  // Read configuration from script attributes
  var config = {
    userId: currentScript.getAttribute('data-user'),
    projectId: currentScript.getAttribute('data-project'),
    position: currentScript.getAttribute('data-position') || 'bottom-right',
    theme: currentScript.getAttribute('data-theme') || 'auto',
    workerUrl: currentScript.getAttribute('data-worker-url') || 'https://chat-worker.m-6bb.workers.dev',
    widgetUrl: currentScript.getAttribute('data-widget-url') || 'https://407747c2.chat-widget-b54.pages.dev'
  };
  
  // Validate required config
  if (!config.userId) {
    console.error('Chat embed: data-user attribute is required');
    return;
  }
  
  // Generate unique session ID
  var sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Create iframe URL with config
  var iframeUrl = config.widgetUrl + '?' + new URLSearchParams({
    userId: config.userId,
    projectId: config.projectId || '',
    sessionId: sessionId,
    workerUrl: config.workerUrl,
    theme: config.theme,
    embedded: 'true'
  }).toString();
  
  // Create iframe element
  var iframe = document.createElement('iframe');
  iframe.id = 'chat-widget-' + sessionId;
  iframe.src = iframeUrl;
  iframe.style.cssText = [
    'position: fixed !important',
    'border: none !important',
    'background: transparent !important',
    'z-index: 2147483647 !important', // Maximum z-index value
    'pointer-events: auto !important',
    'transition: all 0.3s ease !important',
    'width: 70px !important',
    'height: 70px !important',
    'box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important',
    'border-radius: 50% !important',
    'overflow: hidden !important',
    config.position === 'bottom-left' ? 'bottom: 20px !important; left: 20px !important' : 'bottom: 20px !important; right: 20px !important'
  ].join('; ');
  
  // State management
  var state = {
    isOpen: false,
    isLoaded: false
  };
  
  // PostMessage communication handler
  function handleMessage(event) {
    if (event.origin !== new URL(config.widgetUrl).origin) {
      return;
    }
    
    var data = event.data;
    if (!data || !data.type) return;
    
    switch (data.type) {
      case 'WIDGET_LOADED':
        state.isLoaded = true;
        iframe.style.opacity = '1';
        break;
        
      case 'TOGGLE_CHAT':
        state.isOpen = !state.isOpen;
        if (state.isOpen) {
          iframe.style.width = '400px !important';
          iframe.style.height = '600px !important';
          iframe.style.borderRadius = '12px !important';
          iframe.style.boxShadow = '0 8px 40px rgba(0,0,0,0.25) !important';
        } else {
          iframe.style.width = '70px !important';
          iframe.style.height = '70px !important';
          iframe.style.borderRadius = '50% !important';
          iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15) !important';
        }
        break;
        
      case 'RESIZE':
        if (data.width && data.height) {
          iframe.style.width = data.width + 'px !important';
          iframe.style.height = data.height + 'px !important';
        }
        break;
        
      case 'ERROR':
        console.error('Chat widget error:', data.error);
        break;
    }
  }
  
  window.addEventListener('message', handleMessage, false);
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);
  
  window.ChatWidget = {
    remove: function() {
      window.removeEventListener('message', handleMessage, false);
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    },
    toggle: function() {
      iframe.contentWindow.postMessage({ type: 'TOGGLE_CHAT' }, config.widgetUrl);
    }
  };
  
})();`;

      return new Response(embedScript, {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }

    // Serve pure JavaScript embed (no iframe)
    if (url.pathname === '/embed-js.js') {
      // Read the pure JS embed file
      const pureJsEmbedScript = `(function() {
  'use strict';
  
  // Prevent multiple instances
  if (window.LaddersChat) {
    console.warn('Ladders Chat already initialized');
    return;
  }
  
  // Get the script tag that loaded this embed
  var currentScript = document.currentScript || document.querySelector('script[src*="embed-js.js"]');
  if (!currentScript) {
    console.error('Chat embed: Could not find script tag');
    return;
  }
  
  // Read configuration from script attributes
  var config = {
    userId: currentScript.getAttribute('data-user'),
    projectId: currentScript.getAttribute('data-project'),
    position: currentScript.getAttribute('data-position') || 'bottom-right',
    theme: currentScript.getAttribute('data-theme') || 'auto',
    workerUrl: currentScript.getAttribute('data-worker-url') || 'https://chat-worker.m-6bb.workers.dev'
  };
  
  // Validate required config
  if (!config.userId) {
    console.error('Chat embed: data-user attribute is required');
    return;
  }
  
  // Generate unique session ID
  var sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Global state
  var state = {
    isOpen: false,
    isConnected: false,
    messages: [],
    websocket: null
  };
  
  // CSS Styles with high specificity to avoid conflicts
  var styles = \`
    #ladders-chat-widget { position: fixed !important; z-index: 2147483647 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; transition: all 0.3s ease !important; \${config.position === 'bottom-left' ? 'bottom: 20px !important; left: 20px !important;' : 'bottom: 20px !important; right: 20px !important;'} }
    #ladders-chat-widget.collapsed { width: 60px !important; height: 60px !important; }
    #ladders-chat-widget.expanded { width: 380px !important; height: 600px !important; max-height: calc(100vh - 40px) !important; }
    #ladders-chat-bubble { width: 60px !important; height: 60px !important; border-radius: 50% !important; background: #3b82f6 !important; color: white !important; border: none !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; transition: all 0.2s ease !important; font-size: 24px !important; }
    #ladders-chat-bubble:hover { background: #2563eb !important; transform: scale(1.05) !important; }
    #ladders-chat-panel { display: none !important; background: white !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.1) !important; border: 1px solid #e5e7eb !important; overflow: hidden !important; flex-direction: column !important; height: 100% !important; }
    #ladders-chat-panel.open { display: flex !important; }
    #ladders-chat-header { background: #f9fafb !important; padding: 16px !important; border-bottom: 1px solid #e5e7eb !important; display: flex !important; justify-content: space-between !important; align-items: center !important; }
    #ladders-chat-title { font-weight: 600 !important; color: #111827 !important; margin: 0 !important; font-size: 16px !important; }
    #ladders-chat-close { background: none !important; border: none !important; cursor: pointer !important; padding: 4px !important; color: #6b7280 !important; font-size: 18px !important; border-radius: 4px !important; }
    #ladders-chat-close:hover { background: #e5e7eb !important; }
    #ladders-chat-messages { flex: 1 !important; overflow-y: auto !important; padding: 16px !important; background: white !important; }
    #ladders-chat-input-container { padding: 16px !important; border-top: 1px solid #e5e7eb !important; background: #f9fafb !important; }
    #ladders-chat-input { width: 100% !important; padding: 12px !important; border: 1px solid #d1d5db !important; border-radius: 8px !important; font-size: 14px !important; outline: none !important; font-family: inherit !important; resize: none !important; box-sizing: border-box !important; }
    #ladders-chat-input:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important; }
    .ladders-message { margin-bottom: 16px !important; max-width: 85% !important; }
    .ladders-message.user { margin-left: auto !important; }
    .ladders-message-content { padding: 12px 16px !important; border-radius: 18px !important; font-size: 14px !important; line-height: 1.4 !important; word-wrap: break-word !important; }
    .ladders-message.user .ladders-message-content { background: #3b82f6 !important; color: white !important; }
    .ladders-message.assistant .ladders-message-content { background: #f3f4f6 !important; color: #111827 !important; }
  \`;
  
  // Inject styles
  var styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  
  // Create widget HTML
  var widgetHTML = \`
    <div id="ladders-chat-widget" class="collapsed">
      <button id="ladders-chat-bubble">💬</button>
      <div id="ladders-chat-panel">
        <div id="ladders-chat-header">
          <h3 id="ladders-chat-title">Chat Assistant</h3>
          <button id="ladders-chat-close">×</button>
        </div>
        <div id="ladders-chat-messages">
          <div class="ladders-message assistant">
            <div class="ladders-message-content">
              Hi! I'm your AI assistant. How can I help you today?
            </div>
          </div>
        </div>
        <div id="ladders-chat-input-container">
          <textarea id="ladders-chat-input" placeholder="Type your message..." rows="1"></textarea>
        </div>
      </div>
    </div>
  \`;
  
  // Add widget to page
  var widgetContainer = document.createElement('div');
  widgetContainer.innerHTML = widgetHTML;
  document.body.appendChild(widgetContainer.firstElementChild);
  
  // Get elements
  var widget = document.getElementById('ladders-chat-widget');
  var bubble = document.getElementById('ladders-chat-bubble');
  var panel = document.getElementById('ladders-chat-panel');
  var closeBtn = document.getElementById('ladders-chat-close');
  var messagesContainer = document.getElementById('ladders-chat-messages');
  var input = document.getElementById('ladders-chat-input');
  
  // WebSocket connection
  function connectWebSocket() {
    var wsUrl = config.workerUrl.replace('https://', 'wss://').replace('http://', 'ws://') + '/socket/' + sessionId;
    state.websocket = new WebSocket(wsUrl);
    
    state.websocket.onopen = function() {
      console.log('WebSocket connected');
      state.isConnected = true;
    };
    
    state.websocket.onmessage = function(event) {
      var data = JSON.parse(event.data);
      if (data.type === 'message' && data.content) {
        addMessage('assistant', data.content);
      }
    };
    
    state.websocket.onclose = function() {
      console.log('WebSocket disconnected');
      state.isConnected = false;
      setTimeout(connectWebSocket, 3000);
    };
    
    state.websocket.onerror = function(error) {
      console.error('WebSocket error:', error);
    };
  }
  
  // Add message to chat
  function addMessage(role, content) {
    var messageDiv = document.createElement('div');
    messageDiv.className = 'ladders-message ' + role;
    messageDiv.innerHTML = '<div class="ladders-message-content">' + escapeHtml(content) + '</div>';
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Send message
  function sendMessage(content) {
    if (!content.trim() || !state.isConnected) return;
    
    addMessage('user', content);
    
    var message = {
      type: 'message',
      content: content,
      userId: config.userId,
      projectId: config.projectId,
      timestamp: Date.now()
    };
    
    state.websocket.send(JSON.stringify(message));
    input.value = '';
    adjustTextareaHeight();
  }
  
  // Auto-resize textarea
  function adjustTextareaHeight() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  
  // Toggle chat
  function toggleChat() {
    state.isOpen = !state.isOpen;
    
    if (state.isOpen) {
      widget.className = 'expanded';
      bubble.style.display = 'none';
      panel.className = 'open';
      input.focus();
    } else {
      widget.className = 'collapsed';
      bubble.style.display = 'flex';
      panel.className = '';
    }
  }
  
  // Event listeners
  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  
  input.addEventListener('input', adjustTextareaHeight);
  
  // Initialize WebSocket connection
  connectWebSocket();
  
  // Expose global API
  window.LaddersChat = {
    open: function() { if (!state.isOpen) toggleChat(); },
    close: function() { if (state.isOpen) toggleChat(); },
    toggle: toggleChat,
    sendMessage: sendMessage,
    destroy: function() {
      if (state.websocket) state.websocket.close();
      if (widget && widget.parentNode) widget.parentNode.removeChild(widget);
      if (styleElement && styleElement.parentNode) styleElement.parentNode.removeChild(styleElement);
      delete window.LaddersChat;
    }
  };
  
})();`;

      return new Response(pureJsEmbedScript, {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600'
        },
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders 
    });
  },
};

// Export the Durable Object class
export { ChatSession }; 