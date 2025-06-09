import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { X, MessageCircle, Wifi, WifiOff, Maximize2, Minimize2, PanelRight } from 'lucide-react'
import { ChatBubble } from './ChatBubble'
import { MessageInput } from './MessageInput'
import { useChatStore } from '@/stores/chatStore'

interface ChatPanelProps {
  className?: string
  onSendMessage?: (content: string) => void
}

export function ChatPanel({ className, onSendMessage }: ChatPanelProps) {
  const {
    isOpen,
    isExpanded,
    isConnected,
    isConnecting,
    messages,
    error,
    toggleChat,
    toggleExpanded,
    setMode,
  } = useChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (content: string) => {
    if (onSendMessage) {
      onSendMessage(content)
    }
  }

  // Handle chat toggle for embedded mode
  const handleToggleChat = () => {
    toggleChat()
    
    // For embedded mode, send message to parent
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'TOGGLE_CHAT' }, '*')
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={handleToggleChat}
        className={cn(
          'fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50',
          'bg-blue-500 hover:bg-blue-600 text-white',
          className
        )}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={cn(
      'fixed flex flex-col shadow-xl z-50 bg-white border border-gray-200 transition-all duration-300 ease-in-out',
      isExpanded 
        ? 'top-4 left-4 right-4 bottom-4 w-auto h-auto' 
        : 'bottom-4 right-4 w-[28rem] h-[40rem]',
      className
    )}>
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat Assistant
        </CardTitle>
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Badge variant={isConnected ? 'default' : isConnecting ? 'secondary' : 'outline'} className="text-xs">
            {isConnecting ? (
              <>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1" />
                Connecting...
              </>
            ) : isConnected ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          
          {/* Mode Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMode('sidebar')}
            className="h-8 w-8"
            title="Switch to sidebar mode"
          >
            <PanelRight className="h-4 w-4" />
          </Button>

          {/* Expand/Contract Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
            className="h-8 w-8"
            title={isExpanded ? 'Minimize chat' : 'Expand chat'}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleChat}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages Area */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-bold">
                  Welcome to Ladders AI!
                </p>
                <p className="text-md font-semibold">
                  Ask me anything about your project!
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input Area */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={!isConnected}
        placeholder={
          isConnected 
            ? "Type your question..." 
            : "Connecting to chat..."
        }
      />
    </Card>
  )
} 