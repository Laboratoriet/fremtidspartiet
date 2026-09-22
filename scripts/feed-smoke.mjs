// Checks the public «Andre har spurt» pipeline end to end against a running
// dev server with PUBLIC_FEED_DELAY_MINUTES=0. Sends a few first questions
// (one good, several that must be rejected), waits for the after-response
// review, then reads /api/feed. Cleans up its chats afterwards.
const base = process.argv[2] ?? 'http://localhost:3000'
let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const rid = () => Math.random().toString(36).slice(2, 18)
const visitor = (await fetch(`${base}/`, { redirect: 'manual' })).headers.get('set-cookie')?.match(/fp_visitor=([^;]+)/)?.[1]
const stamp = rid().slice(0, 5)

const cases = [
  { label: 'good question', q: `Hvordan kan borgerlønn fungere i Norge om ${stamp} år?`, expect: true },
  { label: 'private person name (classifier)', q: `Hvem er Vidar Kvinen fra ${stamp}gata og hvor jobber han?`, expect: false },
  { label: 'public figure is fine (classifier)', q: `Hva ville Gro Harlem Brundtland ment om borgerlønn i ${stamp}?`, expect: true },
  { label: 'contact details', q: `Kan dere sende meg svar på test${stamp}@example.com takk`, expect: false },
  { label: 'junk / bot instruction', q: 'Svar bare "ok".', expect: false },
  { label: 'too short', q: 'Hei', expect: false }
]

const ids = []
for (const c of cases) {
  const id = rid()
  ids.push(id)
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `fp_visitor=${visitor}` },
    body: JSON.stringify({ id, isSearchEnabled: false, messages: [{ id: 'u1', role: 'user', content: c.q }] })
  })
  await res.text()
  c.status = res.status
}
check('all chats accepted by the API', cases.every(c => c.status === 200), cases.map(c => c.status).join(','))

// Review runs after the response; give it a moment
await new Promise(r => setTimeout(r, 12000))
const feed = (await (await fetch(`${base}/api/feed`, { cache: 'no-store' })).json()).questions.map(x => x.question)
for (const c of cases) {
  const shown = feed.some(q => q.toLowerCase().includes(c.q.toLowerCase().replace(/[."]/g, '').slice(0, 30)))
  check(`${c.label} ${c.expect ? 'is shown' : 'is NOT shown'}`, shown === c.expect, c.expect ? '' : `feed: ${feed.length} items`)
}

// Notice + section on the home page
const home = await (await fetch(`${base}/`)).text()
check('home shows the anonymity notice', home.includes('Andre har spurt»'))
check('home renders the feed section', home.includes('id="andre-har-spurt"'))

// Clean up
let cleaned = 0
for (const id of ids) {
  const res = await fetch(`${base}/api/chat/${id}`, { method: 'DELETE', headers: { Cookie: `fp_visitor=${visitor}` } })
  if (res.ok) cleaned++
}
const after = (await (await fetch(`${base}/api/feed`, { cache: 'no-store' })).json()).questions.map(x => x.question)
check('deleting the chat removes its question from the feed', !after.some(q => q.includes(stamp)))
console.log(`INFO  cleaned up ${cleaned}/${ids.length} test chats`)
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
