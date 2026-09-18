// Smoke-test Veiviseren's answer modes against a running dev server.
// Usage: bun run dev  (in another terminal)  then:  node scripts/chat-smoke.mjs [baseUrl]
// Prints each answer with word count so you can eyeball length and tone per mode.
const base = process.argv[2] ?? 'http://localhost:3000'
const models = await (await fetch(`${base}/config/models.json`)).json()
const byMode = Object.fromEntries(models.models.map(m => [m.mode, `${m.providerId}:${m.id}`]))

const cases = [
  ['kort', 'Hva er Fremtidspartiet?'],
  ['kort', 'Er dere det samme som FrP?'],
  ['kort', 'Hva betyr logoen deres?'],
  ['kort', 'Hvem står bak, og hvordan kan jeg bidra?'],
  ['reflektert', 'Er borgerlønn en god idé?'],
  ['analytisk', 'Hvordan kunne en direkte demokrati-app fungere i praksis?']
]

// One throwaway visitor for the whole run, so the chats can be deleted afterwards
const visitor = (await fetch(`${base}/`, { redirect: 'manual' })).headers.get('set-cookie')?.match(/fp_visitor=([^;]+)/)?.[1]
const created = []

for (const [mode, question] of cases) {
  const modelId = byMode[mode]
  const id = Math.random().toString(36).slice(2, 18)
  created.push(id)
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `selectedModelId=${modelId}; fp_visitor=${visitor}` },
    body: JSON.stringify({
      id,
      isSearchEnabled: false,
      messages: [{ id: 'u1', role: 'user', content: question }]
    })
  })
  let text = ''
  for (const line of (await res.text()).split('\n')) {
    if (line.startsWith('0:')) text += JSON.parse(line.slice(2))
    else if (line.startsWith('3:')) text += `[ERROR] ${line.slice(2)}`
  }
  console.log(`\n=== ${mode} (${modelId}) · ${text.split(/\s+/).length} ord\nQ: ${question}\nA: ${text.trim()}`)
}

// Clean up the chats this run created so they don't show in history or /admin
let cleaned = 0
for (const id of created) {
  const res = await fetch(`${base}/api/chat/${id}`, { method: 'DELETE', headers: { Cookie: `fp_visitor=${visitor}` } })
  if (res.ok) cleaned++
}
console.log(`\nINFO  cleaned up ${cleaned}/${created.length} test chats`)
