# Plan 003: Characterization tests for the WS auth/trust boundary

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ae9555f..HEAD -- packages/core/src/node/ws.ts packages/core/src/node/auth-handler.ts`
> If either changed, compare the "Current state" excerpts against the live code
> before proceeding; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001 (so `pnpm test` terminates)
- **Category**: tests
- **Planned at**: commit `ae9555f`, 2026-07-09

## Why this matters

`packages/core/src/node/ws.ts` is the **security boundary** of the tool and the
**highest-churn node file** (repeatedly reworked, most recently the crossws + OTP-auth
migration in `ae9555f`). The `onConnected` handler decides `meta.isTrusted` across four
independent branches, and the RPC `resolver` blocks non-`anonymous:` methods for
untrusted sessions — all with **zero direct tests**. A regression that flips one branch
(treats an unknown token as trusted, or fails to gate a non-anonymous method) would
silently expose the RPC surface. This plan adds the regression net **before** plans 004
and 005 change the trust logic. It is characterization-first: extract the trust decision
into a pure, testable function without changing behavior, then pin every branch.

## Current state

- `packages/core/src/node/ws.ts`:
  - `isClientAuthDisabled` (line 65):
    ```ts
    const isClientAuthDisabled = context.mode === 'build' || context.viteConfig.devtools?.config?.clientAuth === false || process.env.VITE_DEVTOOLS_DISABLE_CLIENT_AUTH === 'true'
    ```
  - `onConnected` (lines 140-169) reads `authToken` from the `devframe_auth_token`
    query param and `requestOrigin` from the `origin` header, then sets `meta.isTrusted`
    via four branches:
    ```ts
    if (isClientAuthDisabled) { meta.isTrusted = true }
    else if (authToken && contextInternal.isRemoteTokenTrusted(authToken, requestOrigin)) { meta.isTrusted = true; meta.clientAuthToken = authToken }
    else if (authToken && contextInternal.storage.auth.value().trusted[authToken]) { meta.isTrusted = true; meta.clientAuthToken = authToken }
    else if (authToken && (context.viteConfig.devtools?.config?.clientAuthTokens ?? []).includes(authToken)) { meta.isTrusted = true; meta.clientAuthToken = authToken }
    if (!meta.isTrusted) auth.printBanner()
    ```
  - The RPC `resolver` (lines 100-126) returns a throwing stub for a non-anonymous
    method when `!rpc.$meta.isTrusted` (`throw diagnostics.DTK0013(...)`), gated by
    `isAnonymousRpcMethod(name)` from `devframe/constants`.
- Existing node-test patterns to imitate:
  - `packages/core/src/node/__tests__/open-in-editor.test.ts` — `vi.mock` of a
    `devframe/*` module, `describe`/`it`, async handler extraction.
  - `packages/core/src/node/__tests__/registration-safety.test.ts` and
    `context-capabilities.test.ts` — build a fake context via `{ ... } as unknown as ResolvedConfig`.
- The trust logic currently lives *inside* the `createWsServer` closure, which also
  opens real ports and attaches crossws — not unit-testable as-is. Hence Step 1.

## Commands you will need

| Purpose    | Command                                   | Expected      |
|------------|-------------------------------------------|---------------|
| Test (one) | `pnpm -C packages/core exec vitest run ws`| new tests pass|
| Typecheck  | `pnpm typecheck`                          | exit 0        |
| Lint       | `pnpm lint`                               | exit 0        |

## Scope

**In scope**:
- `packages/core/src/node/ws.ts` — extract a pure `decideTrust(...)` helper; call it from `onConnected`. No behavior change.
- `packages/core/src/node/__tests__/ws-decide-trust.test.ts` (create)

**Out of scope** (do NOT touch):
- The four trust branches' *semantics* — that is plan 004's job. This plan only
  relocates the logic and tests current behavior verbatim (including the object-lookup
  branch as-is; do not "fix" it here).
- `auth-handler.ts`, the resolver's structure, port allocation, crossws attach.

## Git workflow

- Branch: `test/ws-auth-characterization`.
- Conventional commits, e.g. `test(core): characterize ws trust decision`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Extract a pure `decideTrust` helper (behavior-preserving)

In `ws.ts`, add an exported pure function that captures exactly the current branch
logic, then call it from `onConnected`. Target shape:
```ts
export interface TrustInputs {
  isClientAuthDisabled: boolean
  authToken: string | undefined
  requestOrigin: string | undefined
  isRemoteTokenTrusted: (token: string, origin: string | undefined) => boolean
  storedTrusted: Record<string, unknown>
  configuredTokens: string[]
}

export function decideTrust(i: TrustInputs): { isTrusted: boolean, clientAuthToken?: string } {
  if (i.isClientAuthDisabled)
    return { isTrusted: true }
  if (i.authToken && i.isRemoteTokenTrusted(i.authToken, i.requestOrigin))
    return { isTrusted: true, clientAuthToken: i.authToken }
  if (i.authToken && i.storedTrusted[i.authToken])
    return { isTrusted: true, clientAuthToken: i.authToken }
  if (i.authToken && i.configuredTokens.includes(i.authToken))
    return { isTrusted: true, clientAuthToken: i.authToken }
  return { isTrusted: false }
}
```
In `onConnected`, replace the inline `if/else if` chain with a call:
```ts
const decision = decideTrust({
  isClientAuthDisabled,
  authToken,
  requestOrigin,
  isRemoteTokenTrusted: (t, o) => contextInternal.isRemoteTokenTrusted(t, o),
  storedTrusted: contextInternal.storage.auth.value().trusted,
  configuredTokens: context.viteConfig.devtools?.config?.clientAuthTokens ?? [],
})
if (decision.isTrusted) {
  meta.isTrusted = true
  if (decision.clientAuthToken)
    meta.clientAuthToken = decision.clientAuthToken
}
if (!meta.isTrusted)
  auth.printBanner()
```
This must be a pure refactor — same outcomes for the same inputs.

**Verify**: `pnpm typecheck` → exit 0. `pnpm -C packages/core exec vitest run` → the
existing core tests still pass (no regression).

### Step 2: Unit-test every branch of `decideTrust`

Create `packages/core/src/node/__tests__/ws-decide-trust.test.ts`, importing
`decideTrust` from `../ws`. Cover:
- `isClientAuthDisabled: true` → `{ isTrusted: true }` (no token needed).
- `authToken` matches a remote-trusted token (stub `isRemoteTokenTrusted` returns true) → trusted, `clientAuthToken` set.
- `authToken` present in `storedTrusted` → trusted.
- `authToken` present in `configuredTokens` → trusted.
- Unknown `authToken`, all sources empty, `isRemoteTokenTrusted` returns false → `{ isTrusted: false }`.
- No `authToken`, auth enabled → untrusted.
- **Regression guard for plan 004**: `authToken: 'toString'` with `storedTrusted = {}`
  (a plain empty object) — assert current behavior and add a comment
  `// NOTE: plan 004 hardens this to an own-property check`. Record the actual result
  in the test so 004 has a before/after anchor. (Do not change ws.ts to fix it here.)

**Verify**: `pnpm -C packages/core exec vitest run ws-decide-trust` → all pass.

### Step 3: Assert the untrusted resolver gate (best-effort integration)

If feasible without opening real ports, add a focused test that the resolver returns a
throwing function for a non-anonymous method when `meta.isTrusted` is false. If the
resolver cannot be reached without standing up crossws, document that limitation in a
comment at the top of the test file and rely on the `decideTrust` unit tests plus the
existing `registration-safety.test.ts`. Do not stand up a real WS server.

**Verify**: `pnpm -C packages/core exec vitest run ws` → all pass.

## Test plan

- New `ws-decide-trust.test.ts` covering the six branch outcomes plus the `toString`
  regression anchor.
- Structural pattern: `open-in-editor.test.ts` (mock/stub style) and
  `registration-safety.test.ts` (fake context).
- Verification: `pnpm -C packages/core exec vitest run ws` → all pass.

## Done criteria

ALL must hold:
- [ ] `decideTrust` exported from `ws.ts`; `onConnected` calls it; behavior unchanged
- [ ] New test file covers all four trust sources + untrusted + the `toString` anchor
- [ ] `pnpm typecheck` exits 0; `pnpm lint` exits 0; existing core tests still pass
- [ ] Only in-scope files modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `onConnected`'s branch logic in the live code differs from the "Current state" excerpt.
- Extracting `decideTrust` changes any existing test outcome (means it was not behavior-preserving — revisit).
- The refactor forces a change to the resolver or port logic (out of scope).

## Maintenance notes

- Plans 004 (own-property + constant-time compare) and 005 (origin allow-list) build
  directly on `decideTrust`; keep its signature stable.
- Reviewer: verify the extraction is truly behavior-preserving — diff the branch order
  and the `clientAuthToken` assignment carefully.
