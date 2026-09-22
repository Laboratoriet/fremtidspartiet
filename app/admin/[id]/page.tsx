import { DeleteChatButton } from '@/components/admin/delete-chat-button'
import { ReadOnlyTranscript } from '@/components/admin/read-only-transcript'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  addChatToFeed,
  getChatAsAdmin,
  getFeedStatus,
  removeChatFromFeed
} from '@/lib/actions/admin'
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
  const feed = await getFeedStatus(id)
  const feedVisible = feed.entry && feed.entry.visibleAt <= Date.now()

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

      <section
        aria-label="Forsiden"
        className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {feed.entry
              ? feedVisible
                ? 'Vises under «Andre har spurt»'
                : 'Godkjent, vises snart under «Andre har spurt»'
              : feed.reviewed
                ? 'Ikke på forsiden (avvist eller duplikat)'
                : 'Ikke vurdert for forsiden ennå'}
          </span>
          {feed.entry && (
            <span className="text-muted-foreground">«{feed.entry.question}»</span>
          )}
        </div>
        {feed.entry ? (
          <form action={removeChatFromFeed.bind(null, id)}>
            <Button type="submit" variant="outline" size="sm">
              Fjern fra forsiden
            </Button>
          </form>
        ) : (
          <form action={addChatToFeed.bind(null, id)}>
            <Button type="submit" variant="outline" size="sm">
              Legg på forsiden
            </Button>
          </form>
        )}
      </section>

      <ReadOnlyTranscript messages={convertToUIMessages(chat.messages)} />
    </div>
  )
}
