import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/chat'
import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Basic content cleanup only - no aggressive preprocessing
function cleanContent(content: string): string {
  return content
    // Only decode HTML entities that might come from the backend
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

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
            <div className="markdown-content text-gray-900 prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Minimal custom styling - let markdown render naturally
                  p: ({ ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc ml-4 mb-3 space-y-1" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal ml-4 mb-3 space-y-1" {...props} />,
                  li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
                  h1: ({ ...props }) => <h1 className="text-lg font-bold mb-3 mt-2" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-base font-bold mb-2 mt-2" {...props} />,
                  h3: ({ ...props }) => <h3 className="text-sm font-semibold mb-2 mt-2" {...props} />,
                  strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                  em: ({ ...props }) => <em className="italic" {...props} />,
                  code: ({ ...props }) => <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                  blockquote: ({ ...props }) => <blockquote className="border-l-4 border-blue-400 pl-4 py-2 bg-blue-50 italic text-gray-700 my-3 rounded-r" {...props} />,
                }}
              >
                {cleanContent(message.content)}
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