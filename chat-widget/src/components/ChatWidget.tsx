import { ChatPanel } from './ChatPanel'
import { ChatSidebar } from './ChatSidebar'
import { useChatStore } from '@/stores/chatStore'

interface ChatWidgetProps {
  className?: string
  onSendMessage?: (content: string) => void
}

export function ChatWidget({ className, onSendMessage }: ChatWidgetProps) {
  const { mode } = useChatStore()

  if (mode === 'sidebar') {
    return <ChatSidebar className={className} onSendMessage={onSendMessage} />
  }

  return <ChatPanel className={className} onSendMessage={onSendMessage} />
} 