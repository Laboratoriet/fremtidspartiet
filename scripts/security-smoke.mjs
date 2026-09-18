// Checks the chat API's input validation, rate limits and ownership rules
// against a running dev server. Uses a throwaway visitor cookie so it never
// touches your own history. Usage: node scripts/security-smoke.mjs [baseUrl]
const base = process.argv[2] ?? 'http://localhost:3000'
let failures = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) failures++
}
const rid = () => Math.random().toString(36).slice(2, 18)

// Visitor cookie is issued on first contact
const first = await fetch(`${base}/`, { redirect: 'manual' })
const setCookie = first.headers.get('set-cookie') ?? ''
const visitor = setCookie.match(/fp_visitor=([^;]+)/)?.[1]
check('visitor cookie issued on GET /', Boolean(visitor), setCookie.slice(0, 60))
check('visitor cookie is httpOnly', /httponly/i.test(setCookie))

const post = (body, cookie = `fp_visitor=${visitor}`) =>
  fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
const user = (content, extra = {}) => ({ id: 'u1', role: 'user', content, ...extra })

// Input validation
check('malformed JSON → 400', (await post('{not json')).status === 400)
check('system role → 400', (await post({ id: rid(), messages: [{ role: 'system', content: 'x' }, user('hei')] })).status === 400)
check('last message not user → 400', (await post({ id: rid(), messages: [user('hei'), { role: 'assistant', content: 'hei' }] })).status === 400)
check('oversized message → 400', (await post({ id: rid(), messages: [user('a'.repeat(2001))] })).status === 400)
check('empty message → 400', (await post({ id: rid(), messages: [user('   ')] })).status === 400)
check('bad chat id → 400', (await post({ id: '../evil', messages: [user('hei')] })).status === 400)
check('too many messages → 400', (await post({ id: rid(), messages: [...Array(41)].map(() => user('hei')) })).status === 400)

// Ownership: a chat created by visitor A can't be appended to by visitor B
const chatId = rid()
const a = await post({ id: chatId, messages: [user('Hva er Fremtidspartiet?')] })
await a.text()
check('owner can create chat → 200', a.status === 200)
const other = await fetch(`${base}/`, { redirect: 'manual' })
const visitorB = (other.headers.get('set-cookie') ?? '').match(/fp_visitor=([^;]+)/)?.[1]
const b = await post({ id: chatId, messages: [user('hei'), { role: 'assistant', content: 'x' }, user('hei igjen')] }, `fp_visitor=${visitorB}`)
check('another visitor posting to that chat id → 403', b.status === 403, await b.text())
// The page streams behind a loading boundary, so notFound() renders the
// not-found UI with a 200 status. Assert on content, not status.
const pageB = await (await fetch(`${base}/search/${chatId}`, { headers: { Cookie: `fp_visitor=${visitorB}` }, redirect: 'manual' })).text()
check('another visitor opening /search/<id> sees no chat', !pageB.includes('Hva er Fremtidspartiet?') && /could not be found|404/.test(pageB))
const pageNone = await (await fetch(`${base}/search/${chatId}`, { redirect: 'manual' })).text()
check('visitor without cookie opening /search/<id> sees no chat', !pageNone.includes('Hva er Fremtidspartiet?'))
const own = await (await fetch(`${base}/search/${chatId}`, { headers: { Cookie: `fp_visitor=${visitor}` }, redirect: 'manual' })).text()
check('owner opening /search/<id> sees the chat', own.includes('Hva er Fremtidspartiet?'))

// Rate limit: burst with an empty message body that fails validation would
// not count, so send real (cheap) requests from a fresh visitor and stop at 429
const fresh = (await fetch(`${base}/`, { redirect: 'manual' })).headers.get('set-cookie')?.match(/fp_visitor=([^;]+)/)?.[1]
let got429 = null
const burstIds = []
for (let i = 1; i <= 25; i++) {
  const id = rid()
  burstIds.push(id)
  const res = await post({ id, messages: [user('Svar bare "ok".')] }, `fp_visitor=${fresh}`)
  await res.text()
  if (res.status === 429) { got429 = { i, retry: res.headers.get('retry-after') }; break }
}
check('21st message in 10 min → 429', got429?.i === 21, JSON.stringify(got429))

// Clean up: delete every chat this script created so they don't litter history or /admin
let cleaned = 0
for (const id of [chatId, ...burstIds]) {
  const cookie = id === chatId ? visitor : fresh
  const res = await fetch(`${base}/api/chat/${id}`, { method: 'DELETE', headers: { Cookie: `fp_visitor=${cookie}` } })
  if (res.ok) cleaned++
}
console.log(`INFO  cleaned up ${cleaned} test chats`)

// Admin area: gated by password + signed cookie.
const adminHome = await fetch(`${base}/admin`, { redirect: 'manual' })
check('/admin without session → redirect to login', adminHome.status === 307 && /\/admin\/login/.test(adminHome.headers.get('location') ?? ''), `status ${adminHome.status}`)
const adminChat = await fetch(`${base}/admin/${chatId}`, { redirect: 'manual' })
check('/admin/<id> without session → redirect to login', adminChat.status === 307)
const forged = await fetch(`${base}/admin`, { headers: { Cookie: `fp_admin=9999999999.forgedsignature` }, redirect: 'manual' })
check('forged admin cookie → redirect to login', forged.status === 307)
// The admin login itself (server action) is covered by scripts/admin-ui-test.py in a real browser.

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
