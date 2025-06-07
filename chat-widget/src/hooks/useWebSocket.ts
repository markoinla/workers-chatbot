import { useEffect, useCallback, useRef } from 'react'
import { useChatStore } from '@/stores/chatStore'
import type { ChatMessage, WebSocketMessage } from '@/types/chat'

interface UseWebSocketProps {
  url: string
  userId: string
  projectId?: string
}

export function useWebSocket({ url, userId, projectId }: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const {
    setConnecting,
    setConnected,
    setError,
    addMessage,
    updateMessage,
  } = useChatStore()

  // Generate message ID
  const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || 
        ws.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setConnecting(true)
    setError(undefined)

    try {
      // Add auth params to URL
      const wsUrl = new URL(url)
      wsUrl.searchParams.set('userId', userId)
      if (projectId) {
        wsUrl.searchParams.set('projectId', projectId)
      }

      ws.current = new WebSocket(wsUrl.toString())

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setConnected(true)
        reconnectAttempts.current = 0
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setConnected(false)
        
        if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
          reconnectTimeout.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection failed. Please try again.')
        setConnected(false)
      }

    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setError('Failed to establish connection')
      setConnecting(false)
    }
  }, [url, userId, projectId, setConnecting, setConnected, setError])

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'assistant_message':
        if (message.messageId && message.data.content) {
          const existingMessage = useChatStore.getState().messages
            .find(m => m.id === message.messageId)

          if (existingMessage) {
            // Update existing streaming message
            updateMessage(message.messageId, message.data.content)
          } else {
            // Add new assistant message
            addMessage({
              id: message.messageId,
              content: message.data.content,
              role: 'assistant',
              timestamp: Date.now(),
              userId,
              projectId,
              status: message.data.isComplete ? 'sent' : 'streaming'
            })
          }
        }
        break

      case 'error':
        setError(message.data.error || 'An error occurred')
        break

      case 'connection_status':
        // Handle connection status updates
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }, [userId, projectId, addMessage, updateMessage, setError])

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError('Not connected. Please wait for connection.')
      return
    }

    const messageId = generateMessageId()
    
    // Add user message to store immediately
    const userMessage: ChatMessage = {
      id: messageId,
      content,
      role: 'user',
      timestamp: Date.now(),
      userId,
      projectId,
      status: 'sending'
    }
    addMessage(userMessage)

    // Send to WebSocket
    const wsMessage: WebSocketMessage = {
      type: 'user_message',
      data: { content },
      messageId
    }

    try {
      ws.current.send(JSON.stringify(wsMessage))
      // Update status to sent
      updateMessage(messageId, content)
    } catch (error) {
      console.error('Failed to send message:', error)
      updateMessage(messageId, content) // This will need status update logic
      setError('Failed to send message')
    }
  }, [userId, projectId, addMessage, updateMessage, setError])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
    }
    if (ws.current) {
      ws.current.close(1000, 'User disconnected')
      ws.current = null
    }
    setConnected(false)
  }, [setConnected])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    sendMessage,
    disconnect,
    reconnect: connect,
    isConnected: useChatStore((state) => state.isConnected),
    isConnecting: useChatStore((state) => state.isConnecting),
  }
} 