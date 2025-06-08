import { ChatWidget } from '@/components/ChatWidget'
import { useWebSocket } from '@/hooks/useWebSocket'

function App() {
  // Real configuration for testing
  const config = {
    userId: 'user-123',
    projectId: 'webhook-test-1749327626988',
    websocketUrl: 'wss://chat-worker.m-6bb.workers.dev/socket/user-123-session', // Production Cloudflare Worker URL
  }

  // Initialize WebSocket connection
  const { sendMessage } = useWebSocket({
    url: config.websocketUrl,
    userId: config.userId,
    projectId: config.projectId,
  })

  return (
    <div className="min-h-screen bg-transparent">
      <ChatWidget onSendMessage={sendMessage} />
    </div>
  )
}

export default App 