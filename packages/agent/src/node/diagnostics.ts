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
      fix: 'Restart the dev server so the installed @vitejs/devtools-vite is mounted, or explicitly register DevToolsViteInspect() when built-in integrations are disabled.',
    },
    AGDT0003: {
      why: (p: { pkg: string }) => `${p.pkg} is not installed in this project.`,
      fix: 'Install it as a dev dependency and restart the dev server.',
    },
  },
})
