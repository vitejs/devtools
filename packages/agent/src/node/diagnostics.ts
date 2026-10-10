import { createConsoleReporter, defineDiagnostics } from 'nostics'

export const diagnostics = /* #__PURE__ */ defineDiagnostics({
  docsBase: 'https://devtools.vite.dev/errors',
  reporters: [createConsoleReporter()],
  codes: {
    AGDT0001: {
      why: (p: { id: string }) => `Rolldown session "${p.id}" was not found in this project.`,
      fix: 'List recorded builds in the selected project and use an id from that list.',
    },
    AGDT0002: {
      why: () => 'Vite inspection is not active in this project.',
      fix: 'Install @vitejs/devtools-vite and restart the dev server, or explicitly register DevToolsViteInspect() when built-in integrations are disabled.',
    },
  },
})
