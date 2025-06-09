(function() {
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
    widgetUrl: currentScript.getAttribute('data-widget-url') || 'https://eaa079de.chat-widget-b54.pages.dev'
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
    'position: fixed',
    'border: none',
    'background: transparent',
    'z-index: 999999',
    'pointer-events: auto',
    'transition: all 0.3s ease',
    // Initial collapsed size
    'width: 70px',
    'height: 70px',
    // Position based on config
    config.position === 'bottom-left' ? 'bottom: 20px; left: 20px' : 'bottom: 20px; right: 20px'
  ].join('; ');
  
  // State management
  var state = {
    isOpen: false,
    isLoaded: false
  };
  
  // PostMessage communication handler
  function handleMessage(event) {
    // Security: verify origin
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
          // Expanded size
          iframe.style.width = '400px';
          iframe.style.height = '600px';
        } else {
          // Collapsed size
          iframe.style.width = '70px';
          iframe.style.height = '70px';
        }
        break;
        
      case 'RESIZE':
        if (data.width && data.height) {
          iframe.style.width = data.width + 'px';
          iframe.style.height = data.height + 'px';
        }
        break;
        
      case 'ERROR':
        console.error('Chat widget error:', data.error);
        break;
    }
  }
  
  // Add message listener
  window.addEventListener('message', handleMessage, false);
  
  // Initial iframe styling (hidden until loaded)
  iframe.style.opacity = '0';
  
  // Add iframe to page
  document.body.appendChild(iframe);
  
  // Cleanup function (optional - for dynamic removal)
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
  
})(); 