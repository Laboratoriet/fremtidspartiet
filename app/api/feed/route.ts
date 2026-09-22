import { listFeed } from '@/lib/feed/store'

export const dynamic = 'force-dynamic'

/** Public, read-only: the questions currently shown under «Andre har spurt». */
export async function GET() {
  const questions = await listFeed(8)
  return Response.json(
    { questions: questions.map(({ question, createdAt }) => ({ question, createdAt })) },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  )
}
