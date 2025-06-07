import { ChatPanel } from '@/components/ChatPanel'
import { useWebSocket } from '@/hooks/useWebSocket'

function App() {
  // Demo configuration - this will come from parent window
  const config = {
    userId: 'demo-user-123',
    projectId: 'demo-project-456',
    websocketUrl: 'ws://localhost:8787/socket/demo-session-123', // Cloudflare Worker URL
  }

  // Initialize WebSocket connection
  const { sendMessage } = useWebSocket({
    url: config.websocketUrl,
    userId: config.userId,
    projectId: config.projectId,
  })

  return (
    <div className="min-h-screen bg-transparent">
      <ChatPanel onSendMessage={sendMessage} />
    </div>
  )
}

export default App 