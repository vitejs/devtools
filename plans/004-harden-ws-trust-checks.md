# Plan 004: Harden WS trust checks (own-property + constant-time compare)

> **Executor instructions**: Follow step by step; verify each step. Honor STOP
> conditions. Update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/core/src/node/ws.ts`
> Also confirm plan 003 has landed (a `decideTrust` function exists in `ws.ts`). If it
> has NOT landed, see Step 0.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/003 (characterization tests + `decideTrust` extraction)
- **Category**: security
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

Two hardening gaps in the WS trust decision (`packages/core/src/node/ws.ts`):

1. **Prototype-chain lookup.** `contextInternal.storage.auth.value().trusted[authToken]`
   indexes the trusted-token map with the raw, attacker-supplied `devframe_auth_token`
   query value. If `trusted` is an ordinary object, inherited `Object.prototype` names
   (`toString`, `constructor`, …) satisfy the truthiness test even though no such token
   was granted — a potential trust-gate bypass. WebSocket upgrades are not same-origin
   constrained, so this is reachable cross-site.
2. **Non-constant-time comparison.** Configured `clientAuthTokens` — documented
   long-lived pre-shared secrets — are matched with `Array.prototype.includes` (`===`
   per element), a length/prefix-short-circuiting comparison that leaks timing about a
   stable credential, and the server may bind to a non-loopback host.

Both fixes are behavior-preserving for legitimate tokens.

## Current state

- After plan 003, `ws.ts` contains `decideTrust(i: TrustInputs)` with:
  ```ts
  if (i.authToken && i.storedTrusted[i.authToken])
    return { isTrusted: true, clientAuthToken: i.authToken }
  if (i.authToken && i.configuredTokens.includes(i.authToken))
    return { isTrusted: true, clientAuthToken: i.authToken }
  ```
  `storedTrusted: Record<string, unknown>` and `configuredTokens: string[]` are the
  inputs; `i.authToken` is the untrusted query value.
- `packages/core/src/node/__tests__/ws-decide-trust.test.ts` (from 003) has a
  `toString` regression anchor asserting the *current* (unsafe) behavior.

### Step 0 (only if plan 003 has NOT landed)

If `decideTrust` does not exist in `ws.ts`, STOP and report that 003 is a prerequisite.
Do not inline these fixes into the raw `onConnected` chain — the tests from 003 are the
safety net for this change.

## Commands you will need

| Purpose    | Command                                              | Expected       |
|------------|------------------------------------------------------|----------------|
| Test (one) | `pnpm -C packages/core exec vitest run ws-decide-trust` | tests pass  |
| Typecheck  | `pnpm typecheck`                                     | exit 0         |
| Lint       | `pnpm lint`                                          | exit 0         |

## Scope

**In scope**:
- `packages/core/src/node/ws.ts` (`decideTrust` body + a small compare helper)
- `packages/core/src/node/__tests__/ws-decide-trust.test.ts` (update the `toString` anchor to assert the *new* safe behavior; add a constant-time-compare test)

**Out of scope**:
- The `isRemoteTokenTrusted` branch — that logic lives upstream in devframe; do not reimplement it.
- Origin validation — that is plan 005.

## Git workflow

- Branch: `fix/ws-trust-hardening`.
- Conventional commit, e.g. `fix(core): harden ws trust token checks`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Own-property check for the stored-trusted lookup

In `decideTrust`, replace the stored-token branch with an own-property test:
```ts
if (i.authToken && Object.hasOwn(i.storedTrusted, i.authToken))
  return { isTrusted: true, clientAuthToken: i.authToken }
```
`Object.hasOwn` ignores the prototype chain, so `toString`/`constructor`/etc. no longer
pass unless genuinely granted.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Constant-time comparison for configured tokens

Add a helper at module scope using `node:crypto` and use it for the configured-tokens
branch. Constant-time comparison requires equal-length buffers, so hash both sides:
```ts
import { createHash, timingSafeEqual } from 'node:crypto'

function tokenMatches(candidate: string, tokens: string[]): boolean {
  const c = createHash('sha256').update(candidate).digest()
  let matched = false
  for (const t of tokens) {
    const h = createHash('sha256').update(t).digest()
    // timingSafeEqual over fixed-length digests; keep scanning all tokens.
    if (timingSafeEqual(c, h))
      matched = true
  }
  return matched
}
```
Then:
```ts
if (i.authToken && tokenMatches(i.authToken, i.configuredTokens))
  return { isTrusted: true, clientAuthToken: i.authToken }
```
Scanning all tokens (rather than short-circuiting on first match) keeps the timing
independent of position.

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Update/extend the tests

In `ws-decide-trust.test.ts`:
- Change the `toString` anchor to assert `{ isTrusted: false }` now (with
  `storedTrusted = {}`), and rename/comment it as the hardened behavior.
- Add: `storedTrusted = { 'real-token': true }` with `authToken: 'real-token'` → trusted
  (own-property still works for a real grant).
- Add: `configuredTokens: ['abc']`, `authToken: 'abc'` → trusted; `authToken: 'ab'` → untrusted (constant-time compare still matches exact tokens and rejects near-misses).

**Verify**: `pnpm -C packages/core exec vitest run ws-decide-trust` → all pass.

## Test plan

- Update the `toString` regression anchor + add real-grant and configured-token cases as in Step 3.
- Verification: `pnpm -C packages/core exec vitest run ws-decide-trust` → all pass; `pnpm typecheck` exits 0.

## Done criteria

ALL must hold:
- [ ] Stored-token branch uses `Object.hasOwn`
- [ ] Configured-token branch uses a `timingSafeEqual`-based compare over digests, scanning all tokens
- [ ] `toString`/inherited-property tokens no longer grant trust (test asserts it)
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `decideTrust` is absent (plan 003 not landed).
- Real tokens stored in `trusted` are keyed in a way `Object.hasOwn` would miss (e.g. the map is a `Map`, not an object) — if `storedTrusted` is already a `Map`, adapt the check to `i.storedTrusted.has(i.authToken)` and note it.

## Maintenance notes

- If devframe later exposes `trusted` as a `Map` or null-prototype object, this guard
  is still correct but redundant; leave it as defense in depth.
- Reviewer: confirm the compare scans all configured tokens (no early `return`/`break`).
