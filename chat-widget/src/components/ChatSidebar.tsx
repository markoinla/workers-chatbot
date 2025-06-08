import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { X, MessageCircle, Wifi, WifiOff, PanelRightClose, PanelRightOpen, Monitor } from 'lucide-react'
import { ChatBubble } from './ChatBubble'
import { MessageInput } from './MessageInput'
import { useChatStore } from '@/stores/chatStore'

interface ChatSidebarProps {
  className?: string
  onSendMessage?: (content: string) => void
}

export function ChatSidebar({ className, onSendMessage }: ChatSidebarProps) {
  const {
    isOpen,
    isConnected,
    isConnecting,
    messages,
    error,
    toggleChat,
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

  // Add/remove body class to push content when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('chat-sidebar-open')
      document.body.style.marginRight = '400px'
      document.body.style.transition = 'margin-right 0.3s ease-in-out'
    } else {
      document.body.classList.remove('chat-sidebar-open')
      document.body.style.marginRight = '0'
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('chat-sidebar-open')
      document.body.style.marginRight = '0'
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <Button
        onClick={toggleChat}
        className={cn(
          'fixed top-1/2 right-0 h-12 w-12 rounded-l-lg rounded-r-none shadow-lg z-50 -translate-y-1/2',
          'bg-blue-500 hover:bg-blue-600 text-white',
          className
        )}
        title="Open chat sidebar"
      >
        <PanelRightOpen className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className={cn(
      'fixed top-0 right-0 h-full w-[400px] z-50 transform transition-transform duration-300 ease-in-out',
      isOpen ? 'translate-x-0' : 'translate-x-full',
      className
    )}>
      <Card className="h-full w-full flex flex-col shadow-xl bg-white border-l border-gray-200 rounded-none">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
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
              onClick={() => setMode('popup')}
              className="h-8 w-8"
              title="Switch to popup mode"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleChat}
              className="h-8 w-8"
              title="Close chat sidebar"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

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
    </div>
  )
} 