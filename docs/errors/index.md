---
outline: deep
---

# Error Reference

Vite DevTools uses structured diagnostics to surface actionable warnings and errors at runtime. Each diagnostic has a unique error code, a human-readable message, and a link back to this documentation.

## How error codes work

- Codes follow the pattern **prefix + 4-digit number** (e.g., `DF0001`, `DTK0008`, `RDDT0002`).
- Each prefix maps to a package: `DTK` for `@vitejs/devtools` (Vite-specific pieces), `RDDT` for `@vitejs/devtools-rolldown`. The framework-neutral `devframe` package documents its own `DF`-prefixed codes at the [Devframe docs site](https://devfra.me/errors/).
- Every error page includes the cause, recommended fix, and a reference to the source file that emits it.
- The diagnostics system is powered by [`nostics`](https://github.com/vercel-labs/nostics), which provides structured diagnostic codes with docs URLs and ANSI-formatted console output.

## DevTools Kit (DTK)

Emitted by `@vitejs/devtools` and `@vitejs/devtools-kit`.

| Code | Level | Title |
|------|-------|-------|
| [DTK0008](./DTK0008) | warn | Client Auth Disabled |
| [DTK0010](./DTK0010) | warn | Experimental Static Build |
| [DTK0011](./DTK0011) | error | RPC Function Error |
| [DTK0012](./DTK0012) | error | RPC General Error |
| [DTK0013](./DTK0013) | error | Unauthorized RPC Access |
| [DTK0014](./DTK0014) | error | Plugin Setup Error |
| [DTK0023](./DTK0023) | error | Vite Server Required |
| [DTK0028](./DTK0028) | error | Path Outside Workspace Root |
| [DTK0029](./DTK0029) | error | Path Outside Workspace Root |
| [DTK0030](./DTK0030) | error | Dock Entry Not Found |
| [DTK0031](./DTK0031) | error | Dock Entry Not a Launcher |
| [DTK0032](./DTK0032) | error | Dock Launch Error |
| [DTK0050](./DTK0050) | error | Dock Already Registered |
| [DTK0051](./DTK0051) | error | Cannot Change Dock ID |
| [DTK0052](./DTK0052) | error | Dock Not Registered |
| [DTK0053](./DTK0053) | error | Terminal Session Already Registered |
| [DTK0054](./DTK0054) | error | Terminal Session Not Registered |
| [DTK0055](./DTK0055) | error | Command Already Registered |
| [DTK0056](./DTK0056) | error | Cannot Change Command ID |
| [DTK0057](./DTK0057) | error | Command Not Registered |

## Rolldown DevTools (RDDT)

Emitted by `@vitejs/devtools-rolldown`.

| Code | Level | Title |
|------|-------|-------|
| [RDDT0001](./RDDT0001) | warn | Rolldown Logs Directory Not Found |
| [RDDT0002](./RDDT0002) | warn | Rolldown Log Reader Bad Line |
