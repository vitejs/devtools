# Plan 011: Fix multi-client removal pruning in `messages:list`

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/core/src/node/rpc/internal/messages-list.ts`
> Compare "Current state" against live code first.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`messages:list` serves incremental polls: a client passes its `since` version cursor and
gets entries + removed ids newer than that cursor. After answering, the handler prunes
the shared `removals` log using **that one caller's `since`** as the global threshold
(`while (removals[0].time <= since) shift()`). With more than one connected DevTools
client (multiple tabs/devices — an explicitly supported scenario given the auth model), a
client polling with a newer cursor prunes removal records a lagging client has not yet
consumed. The lagging client then never learns those entries were removed and shows
ghost/stale messages indefinitely. The fix: prune only removals older than the **minimum
cursor across all live sessions**, never based on a single request's cursor.

## Current state

- `packages/core/src/node/rpc/internal/messages-list.ts` (full handler):
  ```ts
  async handler(since?: number | null): Promise<MessagesListResult> {
    const currentVersion = (host as any)._clock as number
    if (since == null) {
      return { entries: Array.from(host.entries.values()), removedIds: [], version: currentVersion }
    }
    const entries: DevToolsMessageEntry[] = []
    for (const [id, entry] of host.entries) {
      const mod = (host as any).lastModified?.get(id) as number | undefined
      if (mod != null && mod > since)
        entries.push(entry)
    }
    const removedIds: string[] = []
    const removals = (host as any).removals as Array<{ id: string, time: number }>
    for (const r of removals) {
      if (r.time > since)
        removedIds.push(r.id)
    }
    // Prune old removals that all clients have consumed
    // (keep only removals newer than `since` — conservative, but simple)
    const pruneThreshold = since
    while (removals.length > 0 && removals[0]!.time <= pruneThreshold)
      removals.shift()
    return { entries, removedIds, version: currentVersion }
  }
  ```
- The handler reaches into the host's private fields via `as any` (`_clock`, `lastModified`,
  `removals`). `host` is `context.messages` cast to `DevToolsMessagesHost`. This coupling is
  pre-existing; do not try to "fix" the casts here beyond what's needed.
- **Key open question (resolve in Step 1):** is there an existing way to enumerate the
  live sessions' cursors? The RPC layer tracks sessions (`ws.ts` maintains a client set;
  `rpcHost._emitSessionDisconnected`). The safest, self-contained approach that does not
  depend on cross-cutting session bookkeeping is a **per-session cursor watermark kept in
  this function's own module/closure state**, keyed by the calling session id, pruning to
  the min across known-live sessions.

## Commands you will need

| Purpose    | Command                                                    | Expected    |
|------------|------------------------------------------------------------|-------------|
| Test (one) | `pnpm -C packages/core exec vitest run messages-list`      | tests pass  |
| Typecheck  | `pnpm typecheck`                                            | exit 0      |
| Lint       | `pnpm lint`                                                | exit 0      |

## Scope

**In scope**:
- `packages/core/src/node/rpc/internal/messages-list.ts`
- `packages/core/src/node/rpc/internal/__tests__/messages-list.test.ts` (create)

**Out of scope**:
- The client (`messages-client.ts` / `messages.ts`).
- Changing the host's data structures upstream (they are in devframe/kit).

## Git workflow

- Branch: `fix/messages-list-multiclient-prune`.
- Conventional commit, e.g. `fix(core): prune message removals by min client cursor`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Decide the watermark source (investigate)

Determine how to identify the calling session and enumerate live cursors. Two acceptable
designs, in order of preference:
1. **Per-session cursor map in closure state.** Get the current session id from the RPC
   async context (the WS server stores a session on `AsyncLocalStorage`; see
   `ws.ts` `asyncStorage` / `rpcHost._asyncStorage`, and `DevToolsNodeRpcSession.meta.id`).
   On each call, record `cursors.set(sessionId, since)`. Prune removals with
   `time <= min(...cursors.values())`. Drop a session's entry when it disconnects
   (hook available via the session-disconnected path) — or, more simply, if enumerating
   live sessions is awkward, keep the map and treat the min of currently-known cursors as
   the threshold, accepting bounded memory (removals still get pruned as all clients advance).
2. **Stop pruning here; document the leak owner.** If reliably identifying sessions from
   this function is not possible without upstream changes, the correct conservative fix is
   to **remove the per-request prune** (so no client loses removals) and file a follow-up
   for the host to own removal GC keyed by the lowest outstanding cursor. Never prune on a
   single caller's cursor.

Pick option 1 if the session id is reachable from the RPC context; otherwise option 2.
Record the choice in the PR description.

### Step 2: Implement the chosen fix

- **Option 1**: add module-scope `const cursors = new Map<string, number>()`, resolve the
  session id, `cursors.set(id, since)`, compute `const threshold = Math.min(...cursors.values())`
  (guard empty), prune `while (removals.length && removals[0].time <= threshold) shift()`.
- **Option 2**: delete the `while (...) shift()` prune block and the `pruneThreshold` line;
  add a comment pointing at the follow-up.

Leave the entries/removedIds computation unchanged.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Test the multi-client scenario

Create `messages-list.test.ts`. Build a fake `messages` host exposing `entries` (Map),
`_clock`, `lastModified` (Map), and `removals` (array) — the fields the handler reads.
Extract the handler via `messagesList.setup(fakeContext)` (see how `open-in-editor.test.ts`
extracts a handler). Simulate two clients:
- Client A polls with an old `since` (e.g. 100); client B polls with a newer `since` (e.g. 500).
- A removal exists at `time = 300`.
- Assert: after B's poll, A's subsequent poll (since=100) **still** reports the removal at
  300 in `removedIds` (option 1: because the min cursor is 100; option 2: because nothing
  is pruned).
- Assert a single-client steady state still prunes/serves correctly (option 1) or that
  removals older than every client's cursor eventually stop being replayed once all
  cursors advance past them.

**Verify**: `pnpm -C packages/core exec vitest run messages-list` → all pass.

## Test plan

- New `messages-list.test.ts` with the two-client ghost-removal case in Step 3, plus a
  steady-state case. Pattern: `open-in-editor.test.ts` for handler extraction.
- Verification: `pnpm -C packages/core exec vitest run messages-list` → all pass.

## Done criteria

ALL must hold:
- [ ] Pruning is no longer driven by a single request's `since`
- [ ] A lagging client still receives removals a newer client already consumed (test proves it)
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- The session id is not reachable from the RPC context AND removing the prune would grow
  `removals` unbounded in a way the host never GCs — in that case report and recommend the
  upstream (devframe/kit) fix rather than shipping a memory leak.
- The host's private field names (`_clock`, `lastModified`, `removals`) differ from the
  excerpt (drift).

## Maintenance notes

- The real owner of removal GC is arguably the messages host upstream; this plan is a
  correctness patch at the RPC boundary. Note the upstream follow-up in the PR.
- Reviewer: confirm disconnected sessions don't pin the watermark forever (option 1 needs
  a disconnect cleanup or a bounded-staleness argument).
