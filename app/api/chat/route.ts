import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { CHAT_LIMITS, checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { chatRequestSchema, sanitizeMessages } from '@/lib/schema/chat-request'
import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { Model } from '@/lib/types/models'
import { createModelId } from '@/lib/utils'
import { isProviderEnabled } from '@/lib/utils/registry'
import { cookies } from 'next/headers'

export const maxDuration = 30

const RATE_LIMIT_MESSAGE =
  'Du har sendt mange meldinger på kort tid. Prøv igjen om noen minutter.'

function textResponse(body: string, status: number, headers?: HeadersInit) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers }
  })
}

export async function POST(req: Request) {
  try {
    const referer = req.headers.get('referer')
    if (referer?.includes('/share/')) {
      return textResponse('Chat API is not available on share pages', 403)
    }

    // 1. Validate the body before spending anything on it
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return textResponse('Ugyldig forespørsel.', 400)
    }
    const parsed = chatRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return textResponse('Ugyldig forespørsel.', 400)
    }
    const { id: chatId, isSearchEnabled: searchMode } = parsed.data
    const messages = sanitizeMessages(parsed.data.messages)

    // 2. Rate limit per visitor and per IP
    const userId = await getCurrentUserId()
    const limits = [
      await checkRateLimit(userId, CHAT_LIMITS.visitor),
      await checkRateLimit(getClientIp(req), CHAT_LIMITS.ip)
    ]
    const blocked = limits.find(result => !result.allowed)
    if (blocked) {
      return textResponse(RATE_LIMIT_MESSAGE, 429, {
        'Retry-After': String(blocked.retryAfterSeconds)
      })
    }

    // 3. A chat id belongs to whoever created it
    const existingChat = await getChat(chatId, userId)
    if (existingChat && existingChat.userId !== userId) {
      return textResponse('Denne samtalen tilhører noen andre.', 403)
    }

    const cookieStore = await cookies()
    const modelId = cookieStore.get('selectedModelId')?.value

    // The first model in public/config/models.json is the default mode
    const allModels = await getModels()
    let selectedModel: Model | undefined = modelId
      ? allModels.find((m: Model) => createModelId(m) === modelId)
      : undefined

    if (!selectedModel) {
      selectedModel = allModels[0]
    }

    if (!selectedModel) {
      return textResponse('No models configured', 500)
    }

    if (
      !isProviderEnabled(selectedModel.providerId) ||
      selectedModel.enabled === false
    ) {
      return textResponse(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        404
      )
    }

    const supportsToolCalling = selectedModel.toolCallType === 'native'

    return supportsToolCalling
      ? createToolCallingStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
      : createManualToolStreamResponse({
          messages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
  } catch (error) {
    console.error('API route error:', error)
    return textResponse('Error processing your request', 500)
  }
}
