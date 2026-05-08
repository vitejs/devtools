import c from 'ansis'
import { consoleReporter, createLogger, defineDiagnostics } from 'logs-sdk'
import { ansiFormatter } from 'logs-sdk/formatters/ansi'

// Kit-side diagnostics for the hub subsystems (docks, terminals, commands,
// messages). The `DTK` prefix is shared with `@vitejs/devtools` (core);
// numbers must not collide. Kit reserves 0050+; core's codes top out
// below that today.
export const diagnostics = defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  codes: {
    DTK0050: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is already registered`,
      hint: 'Use the `force` parameter to overwrite an existing registration.',
    },
    DTK0051: {
      message: 'Cannot change the id of a dock. Use register() to add new docks.',
    },
    DTK0052: {
      message: (p: { id: string }) => `Dock with id "${p.id}" is not registered. Use register() to add new docks.`,
    },
    DTK0053: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" already registered`,
    },
    DTK0054: {
      message: (p: { id: string }) => `Terminal session with id "${p.id}" not registered`,
    },
    DTK0055: {
      message: (p: { id: string }) => `Command "${p.id}" is already registered`,
    },
    DTK0056: {
      message: 'Cannot change the id of a command. Use register() to add new commands.',
    },
    DTK0057: {
      message: (p: { id: string }) => `Command "${p.id}" is not registered`,
    },
  },
})

export const logger = createLogger({
  diagnostics: [diagnostics],
  formatter: ansiFormatter(c),
  reporters: consoleReporter,
})
