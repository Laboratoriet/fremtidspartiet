import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { listFeed } from '@/lib/feed/store'
import { generateId } from 'ai'
import { Chat } from '../components/chat'

export const dynamic = 'force-dynamic'

export default async function IndexPage() {
  const id = generateId()
  const models = await getModels()
  const user = await getCurrentUser()
  const publicQuestions = (await listFeed(8)).map(({ question, createdAt }) => ({
    question,
    createdAt
  }))
  return (
    <Chat id={id} models={models} user={user} publicQuestions={publicQuestions} />
  )
}
