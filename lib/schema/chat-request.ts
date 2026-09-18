import type { Message } from 'ai'
import { z } from 'zod'

/**
 * What the chat API accepts from the browser. Anything else is a 400.
 * The client controls this payload, so treat it as untrusted: only user
 * and assistant turns, bounded sizes, and no system messages.
 */

export const MAX_USER_MESSAGE_CHARS = 2_000
export const MAX_ASSISTANT_MESSAGE_CHARS = 12_000
export const MAX_MESSAGES = 40

const userMessageSchema = z
  .object({
    role: z.literal('user'),
    content: z.string().trim().min(1).max(MAX_USER_MESSAGE_CHARS)
  })
  .passthrough()

const assistantMessageSchema = z
  .object({
    role: z.literal('assistant'),
    content: z.string().max(MAX_ASSISTANT_MESSAGE_CHARS)
  })
  .passthrough()

export const chatRequestSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  isSearchEnabled: z.boolean().optional().default(false),
  messages: z
    .array(z.discriminatedUnion('role', [userMessageSchema, assistantMessageSchema]))
    .min(1)
    .max(MAX_MESSAGES)
    .refine(messages => messages[messages.length - 1].role === 'user', {
      message: 'Last message must come from the user'
    })
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

/** Strip fields the server never wants from the client and give each turn an id. */
export function sanitizeMessages(messages: ChatRequest['messages']): Message[] {
  return messages.map((message, index) => {
    const { experimental_attachments, data, id, ...rest } = message as Record<
      string,
      unknown
    >
    return {
      ...rest,
      id: typeof id === 'string' ? id : `m${index}`
    } as Message
  })
}
