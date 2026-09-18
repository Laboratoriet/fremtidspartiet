import { type Chat } from '@/lib/types'

/** Human label for who owns a chat, shown in the admin view. */
export function ownerLabel(chat: Chat) {
  if (chat.userId?.startsWith('anon:tmp-')) return 'Uten cookie'
  if (chat.userId?.startsWith('anon:')) return 'Anonym'
  if (chat.userId === 'anonymous') return 'Gammel delt historikk'
  return 'Innlogget'
}
