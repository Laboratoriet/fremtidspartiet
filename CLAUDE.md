# Fremtidspartiet — Veiviseren

AI chat for www.fremtidspartiet.no. Fork of Morphic (miurla/morphic), Next.js 15 + Vercel AI SDK v4, Tailwind v3, shadcn. Deploys automatically from `main` via Vercel project `fremtidspartiet`.

## Run
- `bun install` · `bun run dev` → http://localhost:3000 (bun is the package manager, see `bun.lock`)
- If the shell already exports `ANTHROPIC_API_KEY` (or another provider key), Next.js keeps the shell value and ignores `.env.local`. Start with `env -u ANTHROPIC_API_KEY bun run dev` when Reflektert reports "API key is invalid" even though the file is right.
- Chat history needs Redis. Local dev uses Homebrew Redis (`brew services start redis`) via `USE_LOCAL_REDIS=true` in `.env.local`. Set it to `false` only when you deliberately want production history from Upstash.
- Smoke-test answers per mode: `node scripts/chat-smoke.mjs` (server must be running).
- Security checks (validation, rate limits, ownership, admin gating): `node scripts/security-smoke.mjs`. Run both after touching `app/api/chat/route.ts`, `middleware.ts` or `lib/actions/chat.ts`.
- Admin area in a real browser: `ADMIN_PASSWORD=… python3 scripts/admin-ui-test.py` (login, reindex, transcript, logout). Login is limited to 10 attempts per 10 min per IP; reset locally with `redis-cli --scan --pattern 'ratelimit:admin-login:*' | xargs redis-cli del`.
- Verify UI with local Playwright (`~/.claude/tools/render-js-page.py` or a scratch script), not the Chrome MCP.

## Where things live
- `lib/prompts/veiviseren.ts` — the single source of truth for facts about Fremtidspartiet, guardrails (never Fremskrittspartiet), tone, and per-mode style. Edit facts here only.
- `lib/agents/researcher.ts` (native tool-calling models) and `lib/agents/manual-researcher.ts` (manual tool-calling) both build their system prompt from that module; they only add tool/search instructions.
- `public/config/models.json` — the three user-facing modes. Each entry carries `mode: kort | reflektert | analytisk`; the first entry is the default. `lib/config/default-models.json` is the fallback copy — keep the first three entries in sync.
- `lib/agents/generate-related-questions.ts` — the "Relatert" follow-up suggestions (Norwegian, project-aware).
- `app/manifest/page.tsx` — the manifest text. If it changes, update the facts in `lib/prompts/veiviseren.ts` too.

## Abuse protection (Priority 1, 2026-09-18)
- `middleware.ts` issues an httpOnly `fp_visitor` cookie; `getCurrentUserId()` returns the Supabase id or `anon:<visitor>`. Never fall back to the shared `anonymous` id again — the legacy `user:v2:chat:anonymous` key in Upstash is the old shared history and is no longer read.
- `lib/schema/chat-request.ts` validates the chat body (user/assistant only, size and count caps, last turn is the user's).
- `lib/rate-limit.ts` is a fixed-window limiter on the shared Redis wrapper (works with local Redis and Upstash). Limits live in `CHAT_LIMITS`.
- Chats are owned: posting to, opening, or deleting someone else's chat id fails. `/share/<id>` is the only public path.
- Server actions (`clearChats`, `deleteChat`) resolve the caller's identity themselves; never trust an id passed from the client.

## Admin view (/admin, 2026-09-18)
- **Supabase auth is dead**: the project behind `NEXT_PUBLIC_SUPABASE_URL` no longer exists (NXDOMAIN), so `/auth/*` login and sign-up cannot work. Don't build on `getCurrentUser()` returning a user.
- `/admin` is gated by `ADMIN_PASSWORD` + a signed httpOnly cookie (`lib/auth/admin.ts`, secret `ADMIN_SESSION_SECRET`). Both must be set in Vercel too, or the page says it's unconfigured.
- Lists every chat from the global index `chats:all` (`lib/redis/keys.ts`), maintained by `saveChat`/`deleteChat`/`clearChats`. Press «Reindekser» once after deploying to pull in older chats, including the legacy shared history (label «Gammel delt historikk»).
- `lib/actions/admin.ts` holds the server actions; every one calls `requireAdmin()` first. Transcripts render read-only via `components/admin/read-only-transcript.tsx`.
- `convertToUIMessages` now emits `parts`; before, reloaded chats (history sidebar, share links, admin) showed questions without answers.

## Rules
- Direkte (mode key `kort`) is the default and must stay short (2–4 sentences). Check with the smoke script after any prompt change.
- Facts about the project come only from the prompt module; the assistant must never invent people, numbers or contact details, and never name the studio behind it.
- Anthropic model ids retire; if Reflektert errors, check the model id first.
