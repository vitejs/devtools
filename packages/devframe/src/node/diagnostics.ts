import c from 'ansis'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

// `DF` codes cover the framework-neutral host / shared-state / auth
// surface owned by devframe. Vite-specific codes stay under the `DTK`
// prefix in `@vitejs/devtools`.
//
// Numbers intentionally start at 0001 — they do not correspond to the
// historical DTK numbers. See `docs/errors/DF\**.md` + the
// `DTK -> DF` redirect table in the migration guide for the mapping.
export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    DF0001: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is already registered`,
      hint: 'Use the `force` parameter to overwrite an existing registration.',
    },
    DF0002: {
      message: 'Cannot change the id of a dock. Use register() to add new docks.',
    },
    DF0003: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is not registered. Use register() to add new docks.`,
    },
    DF0004: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" already registered`,
    },
    DF0005: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" not registered`,
    },
    DF0006: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered`,
    },
    DF0007: {
      message: 'AsyncLocalStorage is not set, it likely to be an internal bug of the DevTools foundation',
    },
    DF0008: {
      message: (p: { distDir: string }) => `distDir ${p.distDir} does not exist`,
    },
    DF0009: {
      message: (p: { id: string }) => `Command "${p.id}" is already registered`,
    },
    DF0010: {
      message: 'Cannot change the id of a command. Use register() to add new commands.',
    },
    DF0011: {
      message: (p: { id: string }) => `Command "${p.id}" is not registered`,
    },
    DF0012: {
      message: (p: { filepath: string }) => `Failed to parse storage file: ${p.filepath}, falling back to defaults.`,
      level: 'warn',
    },
    DF0013: {
      message: (p: { key: string }) => `Shared state of "${p.key}" is not found, please provide an initial value for the first time`,
    },
    DF0014: {
      message: (p: { name: string }) => `RPC function "${p.name}" has an invalid \`agent\` field — \`description\` must be a non-empty string.`,
      hint: 'Provide a short description (~1–3 sentences) explaining what the tool does and when agents should invoke it.',
    },
    DF0015: {
      message: (p: { id: string }) => `Agent tool "${p.id}" is already registered.`,
      hint: 'Tool ids must be unique across RPC functions with an `agent` field and tools registered via `ctx.agent.registerTool()`.',
    },
    DF0016: {
      message: (p: { id: string }) => `Agent resource "${p.id}" is already registered.`,
    },
    DF0017: {
      message: (p: { transport: string, reason: string }) => `Failed to start MCP server (${p.transport}): ${p.reason}`,
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(c),
  reporters: consoleReporter,
})
