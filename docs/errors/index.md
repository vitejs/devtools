---
outline: deep
---

# Error Reference

Vite DevTools uses structured diagnostics to surface actionable warnings and errors at runtime. Each diagnostic has a unique error code, a human-readable message, and a link back to this documentation.

## How error codes work

- Codes follow the pattern **prefix + 4-digit number** (e.g., `DTK0001`, `RDDT0002`).
- Each prefix maps to a package: `DTK` for `@vitejs/devtools` core/kit, `RDDT` for `@vitejs/devtools-rolldown`.
- Every error page includes the cause, recommended fix, and a reference to the source file that emits it.
- The diagnostics system is powered by [`logs-sdk`](https://github.com/vercel-labs/logs-sdk), which provides structured logging with docs URLs, ANSI-formatted console output, and level-based filtering.

## DevTools Kit (DTK)

Emitted by `@vitejs/devtools` and `@vitejs/devtools-kit`.

| Code | Level | Title | Package |
|------|-------|-------|---------|
| [DTK0001](./DTK0001) | error | RPC Function Already Registered | `@vitejs/devtools` |
| [DTK0002](./DTK0002) | error | RPC Function Not Registered | `@vitejs/devtools` |
| [DTK0003](./DTK0003) | error | RPC Function Not Registered | `@vitejs/devtools` |
| [DTK0004](./DTK0004) | error | Missing RPC Handler | `@vitejs/devtools` |
| [DTK0005](./DTK0005) | error | Function Not in Dump Store | `@vitejs/devtools` |
| [DTK0006](./DTK0006) | error | No Dump Match | `@vitejs/devtools` |
| [DTK0007](./DTK0007) | error | Invalid Dump Configuration | `@vitejs/devtools` |
| [DTK0008](./DTK0008) | warn | Client Auth Disabled | `@vitejs/devtools` |
| [DTK0009](./DTK0009) | warn | Storage Parse Failed | `@vitejs/devtools` |
| [DTK0010](./DTK0010) | warn | Experimental Static Build | `@vitejs/devtools` |
| [DTK0011](./DTK0011) | error | RPC Function Error | `@vitejs/devtools` |
| [DTK0012](./DTK0012) | error | RPC General Error | `@vitejs/devtools` |
| [DTK0013](./DTK0013) | error | Unauthorized RPC Access | `@vitejs/devtools` |
| [DTK0014](./DTK0014) | error | Plugin Setup Error | `@vitejs/devtools` |
| [DTK0015](./DTK0015) | error | Dock Already Registered | `@vitejs/devtools` |
| [DTK0016](./DTK0016) | error | Cannot Change Dock ID | `@vitejs/devtools` |
| [DTK0017](./DTK0017) | error | Dock Not Registered | `@vitejs/devtools` |
| [DTK0018](./DTK0018) | error | Terminal Session Already Registered | `@vitejs/devtools` |
| [DTK0019](./DTK0019) | error | Terminal Session Not Registered | `@vitejs/devtools` |
| [DTK0020](./DTK0020) | error | RPC Function Not Registered (Local) | `@vitejs/devtools` |
| [DTK0021](./DTK0021) | error | AsyncLocalStorage Not Set | `@vitejs/devtools` |
| [DTK0022](./DTK0022) | error | View distDir Not Found | `@vitejs/devtools` |
| [DTK0023](./DTK0023) | error | Vite Server Required | `@vitejs/devtools` |
| [DTK0024](./DTK0024) | error | Command Already Registered | `@vitejs/devtools` |
| [DTK0025](./DTK0025) | error | Cannot Change Command ID | `@vitejs/devtools` |
| [DTK0026](./DTK0026) | error | Command Not Registered | `@vitejs/devtools` |
| [DTK0027](./DTK0027) | error | Shared State Not Found | `@vitejs/devtools` |
| [DTK0028](./DTK0028) | error | Path Outside Workspace Root | `@vitejs/devtools` |
| [DTK0029](./DTK0029) | error | Path Outside Workspace Root | `@vitejs/devtools` |
| [DTK0030](./DTK0030) | error | Dock Entry Not Found | `@vitejs/devtools` |
| [DTK0031](./DTK0031) | error | Dock Entry Not a Launcher | `@vitejs/devtools` |
| [DTK0032](./DTK0032) | error | Dock Launch Error | `@vitejs/devtools` |

## Rolldown DevTools (RDDT)

Emitted by `@vitejs/devtools-rolldown`.

| Code | Level | Title | Package |
|------|-------|-------|---------|
| [RDDT0001](./RDDT0001) | warn | Rolldown Logs Directory Not Found | `@vitejs/devtools-rolldown` |
| [RDDT0002](./RDDT0002) | warn | JSON Parse Stream Bad Line | `@vitejs/devtools-rolldown` |
