import { consoleReporter, createLogger, defineDiagnostics, plainFormatter } from 'logs-sdk'

export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    DTK0001: {
      message: (p: { name: string }) => `RPC function "${p.name}" is already registered`,
      hint: 'Use the `force` parameter to overwrite an existing registration.',
    },
    DTK0002: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered. Use register() to add new functions.`,
    },
    DTK0003: {
      message: (p: { name: string }) => `RPC function "${p.name}" is not registered`,
    },
    DTK0004: {
      message: (p: { name: string }) => `Either handler or setup function must be provided for RPC function "${p.name}"`,
    },
    DTK0005: {
      message: (p: { name: string }) => `Function "${p.name}" not found in dump store`,
    },
    DTK0006: {
      message: (p: { name: string, args: string }) => `No dump match for "${p.name}" with args: ${p.args}`,
    },
    DTK0007: {
      message: (p: { name: string, type: string }) => `Function "${p.name}" with type "${p.type}" cannot have dump configuration. Only "static" and "query" types support dumps.`,
    },
    DTK0008: {
      message: (p: { name: string, type: string }) => `Function "${p.name}" with type "${p.type}" cannot use \`snapshot: true\`. Only "query" functions support this sugar; "static" functions have equivalent default behavior already.`,
      hint: 'Remove `snapshot: true`, or change the function type to `query`.',
    },
  },
})

export const dfDiagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/devframe/errors',
  codes: {
    DF0018: {
      message: (p: { name: string }) =>
        `RPC function "${p.name}" has \`agent\` set but \`jsonSerializable\` is not \`true\` — MCP requires JSON-serializable data.`,
      hint: 'Set `jsonSerializable: true` if the payload is JSON-safe, or remove `agent` to keep it RPC-only.',
    },
    DF0019: {
      message: (p: { name: string, type: string, path: string }) =>
        `RPC function "${p.name}" declares \`jsonSerializable: true\` but the value at "${p.path}" is a ${p.type}.`,
      hint: 'Either drop `jsonSerializable: true` (falls back to structured-clone) or change the value to a JSON-safe shape.',
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics, dfDiagnostics],
  formatter: plainFormatter,
  reporters: consoleReporter,
})
