import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/chat'
import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
          {isUser ? (
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                // Custom styling for markdown elements
                h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1">{children}</h3>,
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside ml-3 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside ml-3 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-3 border-blue-400 pl-3 py-1 bg-blue-50 italic text-gray-700 my-2 rounded-r">{children}</blockquote>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="border-collapse border border-gray-300 text-xs w-full">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">{children}</th>,
                td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
              }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          
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