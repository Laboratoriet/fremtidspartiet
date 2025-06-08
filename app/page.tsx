import { Chat } from '@/components/chat'
import { getModels } from '@/lib/config/models'
import { generateId } from 'ai'

export default async function Page() {
  const id = generateId()
  const allModels = await getModels()
  const models = allModels.filter(model => model.enabled)
  return <Chat id={id} models={models} />
}
