import {
  backfillFeedAndRedirect,
  listAllChats,
  logoutAdmin,
  reindexAllChatsAndRedirect
} from '@/lib/actions/admin'
import { ownerLabel } from '@/lib/admin/labels'
import { requireAdmin } from '@/lib/auth/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type Chat } from '@/lib/types'
import Link from 'next/link'

export const metadata = { title: 'Admin · Fremtidspartiet' }
export const dynamic = 'force-dynamic'

const dateFormat = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

function countTurns(chat: Chat) {
  return chat.messages.filter(m => m.role === 'user').length
}

export default async function AdminPage(props: {
  searchParams: Promise<{ page?: string; reindexed?: string; feed?: string }>
}) {
  await requireAdmin()
  const { page: pageParam, reindexed, feed } = await props.searchParams
  const feedResult = feed?.match(/^(\d+)of(\d+)$/)
  const page = Math.max(0, Number(pageParam) || 0)
  const { chats, total, pageCount } = await listAllChats(page)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Samtaler</h1>
          <p className="text-sm text-muted-foreground">
            {total} samtaler totalt. Kun synlig for deg.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={backfillFeedAndRedirect}>
            <Button type="submit" variant="outline" size="sm">
              Fyll forsiden
            </Button>
          </form>
          <form action={reindexAllChatsAndRedirect}>
            <Button type="submit" variant="outline" size="sm">
              Reindekser
            </Button>
          </form>
          <form action={logoutAdmin}>
            <Button type="submit" variant="ghost" size="sm">
              Logg ut
            </Button>
          </form>
        </div>
      </header>

      {reindexed && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Reindeksering ferdig: {reindexed} samtaler i indeksen.
        </p>
      )}
      {feedResult && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Forsiden fylt: {feedResult[1]} av {feedResult[2]} nye spørsmål godkjent.
          Godkjente spørsmål vises etter ventetiden.
        </p>
      )}

      {chats.length === 0 ? (
        <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Ingen samtaler i indeksen ennå. Trykk «Reindekser» for å hente inn
          eksisterende samtaler.
        </p>
      ) : (
        <ol className="divide-y rounded-md border">
          {chats.map(chat => (
            <li key={chat.id}>
              <Link
                href={`/admin/${chat.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <div className="line-clamp-2 text-sm font-medium">
                  {chat.title || '(uten tittel)'}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <time dateTime={chat.createdAt.toISOString()}>
                    {dateFormat.format(chat.createdAt)}
                  </time>
                  <span>{countTurns(chat)} spørsmål</span>
                  <Badge variant="secondary" className="font-normal">
                    {ownerLabel(chat)}
                  </Badge>
                  {chat.sharePath && (
                    <Badge variant="outline" className="font-normal">
                      Delt
                    </Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Sider"
          className="flex items-center justify-between text-sm"
        >
          <Button asChild variant="outline" size="sm" disabled={page === 0}>
            <Link
              href={`/admin?page=${page - 1}`}
              aria-disabled={page === 0}
              tabIndex={page === 0 ? -1 : undefined}
              className={page === 0 ? 'pointer-events-none opacity-50' : ''}
            >
              Nyere
            </Link>
          </Button>
          <span className="text-muted-foreground">
            Side {page + 1} av {pageCount}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin?page=${page + 1}`}
              aria-disabled={page + 1 >= pageCount}
              tabIndex={page + 1 >= pageCount ? -1 : undefined}
              className={
                page + 1 >= pageCount ? 'pointer-events-none opacity-50' : ''
              }
            >
              Eldre
            </Link>
          </Button>
        </nav>
      )}
    </div>
  )
}
