# Plan 010: Reset the message-client flush latch on reconnect

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/core/src/client/webcomponents/state/messages-client.ts`
> Compare "Current state" against live code first.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`createClientMessagesClient` buffers message operations (`add`/`remove`/`clear`) while
the RPC session is untrusted, and flushes them once trust is granted. The flush latch
`flushing` is set the first time and **never reset**: after the drain loop resolves,
`flushing` stays a permanently-resolved promise. On a second untrust→trust cycle
(reconnect / re-auth — a normal event given the OTP model), operations get re-buffered,
but `flush()` returns the stale resolved promise without draining, so those ops never
resolve (hang) or are silently dropped. Toasts/messages stop working after a reconnect.

## Current state

- `packages/core/src/client/webcomponents/state/messages-client.ts` (relevant parts):
  ```ts
  const buffer: (() => Promise<void>)[] = []
  let flushing: Promise<void> | undefined

  async function flush() {
    if (rpc.isTrusted !== true)
      return
    if (flushing === undefined) {
      // eslint-disable-next-line no-async-promise-executor
      flushing = new Promise(async (resolve) => {
        while (buffer.length > 0) {
          const op = buffer.shift()!
          await op()
        }
        resolve()
      })
    }
    return flushing
  }

  async function enqueue<T>(op: () => Promise<T>): Promise<T> {
    if (rpc.isTrusted === true && buffer.length !== 0)
      await flush()
    if (rpc.isTrusted === true && buffer.length === 0)
      return await op()
    return new Promise<T>((resolve) => {
      buffer.push(async () => {
        const result = await op()
        resolve(result)
      })
    })
  }

  rpc.events.on('rpc:is-trusted:updated', (isTrusted) => {
    if (isTrusted && buffer.length > 0)
      flush()
  })
  ```
- This is client-side code (webcomponents). Per `AGENTS.md`, client code uses plain
  `throw`/`console` and is excluded from the structured-diagnostics rule. No diagnostic
  code needed here.
- The nearest existing client-state test to imitate:
  `packages/core/src/client/webcomponents/state/__tests__/context-cache.test.ts`
  (and siblings `popup.test.ts`, `dock-groups.test.ts`).

## Commands you will need

| Purpose    | Command                                                       | Expected    |
|------------|---------------------------------------------------------------|-------------|
| Test (one) | `pnpm -C packages/core exec vitest run messages-client`       | tests pass  |
| Typecheck  | `pnpm typecheck`                                              | exit 0      |
| Lint       | `pnpm lint`                                                  | exit 0      |

## Scope

**In scope**:
- `packages/core/src/client/webcomponents/state/messages-client.ts`
- `packages/core/src/client/webcomponents/state/__tests__/messages-client.test.ts` (create)

**Out of scope**:
- `messages.ts` (the `updateMessages` race is a separate concern — not this plan).
- Server-side `messages-list.ts` (that is plan 011).

## Git workflow

- Branch: `fix/messages-client-flush-latch`.
- Conventional commit, e.g. `fix(core): re-arm message flush latch after reconnect`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Clear the latch when the drain completes, and re-arm if needed

Rework `flush()` so `flushing` is cleared once the buffer drains, and a fresh drain is
started if new ops arrived. Target shape:
```ts
async function flush(): Promise<void> {
  if (rpc.isTrusted !== true)
    return
  if (flushing !== undefined)
    return flushing
  flushing = (async () => {
    try {
      while (buffer.length > 0) {
        const op = buffer.shift()!
        await op()
      }
    }
    finally {
      flushing = undefined
    }
  })()
  await flushing
  // If ops were enqueued during the drain and trust is still held, drain again.
  if (rpc.isTrusted === true && buffer.length > 0)
    await flush()
}
```
Keep `enqueue` and the `rpc:is-trusted:updated` handler as-is (they call `flush()`).

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Test the multi-cycle behavior

Create `messages-client.test.ts`. Build a fake `rpc` with a mutable `isTrusted`, a
`call` spy that resolves, and an `events` emitter supporting `on(...)` + a way to fire
`rpc:is-trusted:updated`. Model structure on `context-cache.test.ts`. Assert:
- While untrusted, `client.info('a')` does not call `rpc.call` (buffered).
- After firing trust=true, the buffered op flushes (its promise resolves; `rpc.call` invoked).
- **Reconnect cycle**: set `isTrusted=false`, enqueue another op (buffered), set
  `isTrusted=true` and fire the event again → the second op **also** flushes and its
  returned promise resolves. (This is the case that currently hangs.)
- A trusted, empty-buffer `client.info(...)` calls through immediately.

**Verify**: `pnpm -C packages/core exec vitest run messages-client` → all pass. Give the
awaited-resolution assertions a real await (e.g. `await expect(p).resolves...`) so a hang
fails via the 10s `testTimeout` rather than passing silently.

## Test plan

- New `messages-client.test.ts` covering buffer-while-untrusted, first flush, and the
  reconnect (second-cycle) flush. Pattern: `context-cache.test.ts`.
- Verification: `pnpm -C packages/core exec vitest run messages-client` → all pass.

## Done criteria

ALL must hold:
- [ ] `flushing` is reset to `undefined` after each drain (in a `finally`)
- [ ] A second untrust→trust cycle flushes newly-buffered ops (test proves it, no hang)
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The live `flush()` already resets the latch (drift).
- The `rpc` client shape (`isTrusted`, `events.on`, `call`) differs from the excerpt so a
  faithful fake can't be built — report the real shape.

## Maintenance notes

- The `updateMessages` concurrent-invocation race in `messages.ts` is a related but
  separate issue (double-counted unread badge); note it for a follow-up if you touch that file.
- Reviewer: verify the re-drain recursion terminates (it only recurses while the buffer is
  non-empty and trust is held).
