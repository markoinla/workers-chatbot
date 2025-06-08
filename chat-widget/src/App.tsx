import React from 'react'
import { ChatWidget } from '@/components/ChatWidget'
import { useWebSocket } from '@/hooks/useWebSocket'

function App() {
  // Get configuration from URL parameters (for embed) or use defaults
  const urlParams = new URLSearchParams(window.location.search);
  const config = {
    userId: urlParams.get('userId') || 'user-123',
    projectId: urlParams.get('projectId') || 'webhook-test-1749327626988',
    sessionId: urlParams.get('sessionId') || 'user-123-session',
    workerUrl: urlParams.get('workerUrl') || 'https://chat-worker.m-6bb.workers.dev',
    theme: urlParams.get('theme') || 'auto',
    embedded: urlParams.get('embedded') === 'true',
  }

  // Build WebSocket URL dynamically
  const websocketUrl = `${config.workerUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/socket/${config.sessionId}`

  // Initialize WebSocket connection
  const { sendMessage } = useWebSocket({
    url: websocketUrl,
    userId: config.userId,
    projectId: config.projectId,
  })

  // PostMessage communication for embedded mode
  React.useEffect(() => {
    if (config.embedded && window.parent !== window) {
      // Notify parent that widget is loaded
      window.parent.postMessage({ type: 'WIDGET_LOADED' }, '*');
      
      // Listen for messages from parent
      const handleParentMessage = (event: MessageEvent) => {
        if (event.data?.type === 'TOGGLE_CHAT') {
          // Handle toggle from parent
          console.log('Toggle chat from parent');
        }
      };
      
      window.addEventListener('message', handleParentMessage);
      return () => window.removeEventListener('message', handleParentMessage);
    }
  }, [config.embedded]);

  return (
    <div className="min-h-screen bg-transparent">
      <ChatWidget onSendMessage={sendMessage} />
    </div>
  )
}

export default App 