import { DeleteChatButton } from '@/components/admin/delete-chat-button'
import { ReadOnlyTranscript } from '@/components/admin/read-only-transcript'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getChatAsAdmin } from '@/lib/actions/admin'
import { ownerLabel } from '@/lib/admin/labels'
import { requireAdmin } from '@/lib/auth/admin'
import { convertToUIMessages } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const dateFormat = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'long',
  timeStyle: 'short'
})

export default async function AdminChatPage(props: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await props.params
  const chat = await getChatAsAdmin(id)
  if (!chat) {
    notFound()
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/admin">
            <ArrowLeft className="mr-1 size-4" />
            Alle samtaler
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {chat.title || '(uten tittel)'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <time dateTime={chat.createdAt.toISOString()}>
                {dateFormat.format(chat.createdAt)}
              </time>
              <Badge variant="secondary" className="font-normal">
                {ownerLabel(chat)}
              </Badge>
              {chat.sharePath && (
                <Badge variant="outline" className="font-normal">
                  Delt
                </Badge>
              )}
            </div>
          </div>
          <DeleteChatButton chatId={chat.id} />
        </div>
      </header>

      <ReadOnlyTranscript messages={convertToUIMessages(chat.messages)} />
    </div>
  )
}
