'use client'

import { CHAT_ID } from '@/lib/constants'
import { useSearchMode } from '@/lib/hooks/use-search-mode'
import { Model } from '@/lib/types/models'
import { cn, createModelId } from '@/lib/utils'
import { getCookie } from '@/lib/utils/cookies'
import { useChat } from '@ai-sdk/react'
import { User } from '@supabase/supabase-js'
import { ChatRequestOptions } from 'ai'
import { Message } from 'ai/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'

// Define section structure
interface ChatSection {
  id: string // User message ID
  userMessage: Message
  assistantMessages: Message[]
}

export function Chat({
  id,
  savedMessages = [],
  query,
  models,
  user
}: {
  id: string
  savedMessages?: Message[]
  query?: string
  models?: Model[]
  user: User | null
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [isSearchEnabled] = useSearchMode()
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  // Get the initial messages
  const initialMessages = savedMessages

  // Update selected model ID from cookie
  useEffect(() => {
    const savedModelId = getCookie('selectedModelId')
    if (savedModelId) {
      setSelectedModelId(savedModelId)
    } else if (models && models.length > 0) {
      const defaultModelId = createModelId(models[0])
      setSelectedModelId(defaultModelId)
    }
  }, [models])

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop,
    append,
    data,
    setData,
    addToolResult,
    reload
  } = useChat({
    initialMessages,
    id: CHAT_ID,
    body: {
      id,
      modelId: selectedModelId
    },
    onFinish: () => {
      window.history.replaceState({}, '', `/search/${id}`)
      window.dispatchEvent(new CustomEvent('chat-history-updated'))
    },
    onError: error => {
      toast.error(`Error in chat: ${error.message}`)
    },
    sendExtraMessageFields: false, // Disable extra message fields,
    experimental_throttle: 100
  })

  const selectedModel = useMemo(
    () => models?.find(m => createModelId(m) === selectedModelId),
    [models, selectedModelId]
  )

  // Reset chat if selected model is invalid
  useEffect(() => {
    const savedModelId = getCookie('selectedModelId')
    if (
      models &&
      models.length > 0 &&
      savedModelId &&
      !models.some(m => createModelId(m) === savedModelId)
    ) {
      console.log('Clearing chat history due to invalid model')
      setMessages([])
    }
  }, [models, selectedModelId, setMessages])

  const isLoading = status === 'submitted' || status === 'streaming'

  // Convert messages array to sections array
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let currentSection: ChatSection | null = null

    for (const message of messages) {
      if (message.role === 'user') {
        // Start a new section when a user message is found
        if (currentSection) {
          result.push(currentSection)
        }
        currentSection = {
          id: message.id,
          userMessage: message,
          assistantMessages: []
        }
      } else if (currentSection && message.role === 'assistant') {
        // Add assistant message to the current section
        currentSection.assistantMessages.push(message)
      }
      // Ignore other role types like 'system' for now
    }

    // Add the last section if exists
    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [messages])

  // Detect if scroll container is at the bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 50 // threshold in pixels
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        setIsAtBottom(true)
      } else {
        setIsAtBottom(false)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Set initial state

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to the section when a new user message is sent
  useEffect(() => {
    if (sections.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        // If the last message is from user, find the corresponding section
        const sectionId = lastMessage.id
        requestAnimationFrame(() => {
          const sectionElement = document.getElementById(`section-${sectionId}`)
          sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }, [sections, messages])

  const onQuerySelect = (query: string) => {
    append(
      {
        role: 'user',
        content: query
      },
      {
        body: {
          isSearchEnabled
        }
      }
    )
  }

  const handleUpdateAndReloadMessage = async (
    messageId: string,
    newContent: string
  ) => {
    setMessages(currentMessages =>
      currentMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      )
    )

    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      const messagesUpToEdited = messages.slice(0, messageIndex + 1)

      setMessages(messagesUpToEdited)

      setData(undefined)

      await reload({
        body: {
          chatId: id,
          regenerate: true
        }
      })
    } catch (error) {
      console.error('Failed to reload after message update:', error)
      toast.error(`Failed to reload conversation: ${(error as Error).message}`)
    }
  }

  const handleReloadFrom = async (
    messageId: string,
    options?: ChatRequestOptions
  ) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      const userMessageIndex = messages
        .slice(0, messageIndex)
        .findLastIndex(m => m.role === 'user')
      if (userMessageIndex !== -1) {
        const trimmedMessages = messages.slice(0, userMessageIndex + 1)
        setMessages(trimmedMessages)
        return await reload({
          ...options,
          body: { ...options?.body, isSearchEnabled }
        })
      }
    }
    return await reload({
      ...options,
      body: { ...options?.body, isSearchEnabled }
    })
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setData(undefined)
    handleSubmit(e, {
      body: {
        isSearchEnabled
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        models={models || []}
        selectedModel={selectedModel}
        setSelectedModelId={setSelectedModelId}
        user={user}
      />
      <div
        className={cn(
          'flex-1 overflow-hidden',
          messages.length > 0 ? '' : 'flex'
        )}
      >
        <ChatMessages
          sections={sections}
          data={data}
          onQuerySelect={onQuerySelect}
          isLoading={isLoading}
          chatId={id}
          addToolResult={addToolResult}
          scrollContainerRef={scrollContainerRef}
          onUpdateMessage={handleUpdateAndReloadMessage}
          reload={handleReloadFrom}
        />
        <ChatPanel
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={onSubmit}
          isLoading={isLoading}
          messages={messages}
          setMessages={setMessages}
          stop={stop}
          query={query}
          append={append}
          models={models}
          showScrollToBottomButton={!isAtBottom}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  )
}
