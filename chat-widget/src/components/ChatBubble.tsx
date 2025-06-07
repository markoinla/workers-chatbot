import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/chat'
import { Bot, User } from 'lucide-react'

interface ChatBubbleProps {
  message: ChatMessage
  className?: string
}

export function ChatBubble({ message, className }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'

  return (
    <div 
      className={cn(
        'flex gap-3 max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
        className
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          'text-xs',
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        'flex flex-col gap-1',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          'relative rounded-lg px-3 py-2 text-sm break-words',
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900 border'
        )}>
          <div className="whitespace-pre-wrap">
            {message.content}
          </div>
          
          {isStreaming && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
        
        {message.timestamp && (
          <span className="text-xs text-gray-500 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
        
        {message.status === 'error' && (
          <Badge variant="destructive" className="text-xs">
            Failed to send
          </Badge>
        )}
      </div>
    </div>
  )
} 