import { Chat } from '@/components/chat'
import { getChat } from '@/lib/actions/chat'
import { getCurrentUser, getCurrentUserId } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { convertToUIMessages } from '@/lib/utils'
import { notFound, redirect } from 'next/navigation'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const userId = await getCurrentUserId()
  const chat = await getChat(id, userId)
  if (!chat || (chat.userId !== userId && !chat.sharePath)) {
    return { title: 'Fremtidspartiet' }
  }
  return {
    title: chat?.title.toString().slice(0, 50) || 'Search'
  }
}

export default async function SearchPage(props: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  const userId = await getCurrentUserId()
  const { id } = await props.params

  const chat = await getChat(id, userId)
  // convertToUIMessages for useChat hook
  const messages = convertToUIMessages(chat?.messages || [])

  if (!chat) {
    redirect('/')
  }

  // Only the owner may open a chat here; everyone else goes via /share
  if (chat.userId !== userId && !chat.sharePath) {
    notFound()
  }

  const allModels = await getModels()
  const models = allModels.filter(model => model.enabled)
  return (
    <div className="flex flex-col h-full">
      <Chat
        key={id}
        id={id}
        savedMessages={messages}
        models={models}
        user={user}
      />
    </div>
  )
}
