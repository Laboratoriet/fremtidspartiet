'use client'

import { Message } from 'ai'
import { useMemo, useRef } from 'react'
import { ChatMessages } from '../chat-messages'

interface ChatSection {
  id: string
  userMessage: Message
  assistantMessages: Message[]
}

/**
 * Renders a saved conversation with the same components as the live chat,
 * but with no input and no actions. Used by the admin view.
 */
export function ReadOnlyTranscript({ messages }: { messages: Message[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let current: ChatSection | null = null
    for (const message of messages) {
      if (message.role === 'user') {
        if (current) result.push(current)
        current = { id: message.id, userMessage: message, assistantMessages: [] }
      } else if (current && message.role === 'assistant') {
        current.assistantMessages.push(message)
      }
    }
    if (current) result.push(current)
    return result
  }, [messages])

  if (sections.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
        Samtalen har ingen meldinger.
      </p>
    )
  }

  return (
    <div ref={scrollContainerRef} className="rounded-md border px-2 py-4">
      <ChatMessages
        sections={sections}
        data={undefined}
        onQuerySelect={() => {}}
        isLoading={false}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  )
}
