import { getCurrentUser } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { generateId } from 'ai'
import { Chat } from '../components/chat'

export default async function IndexPage() {
  const id = generateId()
  const models = await getModels()
  const user = await getCurrentUser()
  return <Chat id={id} models={models} user={user} />
}
