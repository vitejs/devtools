import type { DevToolsDockEntry, DevToolsViewBuiltin } from '@vitejs/devtools-kit'
import { defineRpcFunction } from '@vitejs/devtools-kit'

export const docksList = defineRpcFunction({
  name: 'vite:internal:docks:list',
  type: 'static',
  setup: (context) => {
    const builtinDocksEntries: DevToolsViewBuiltin[] = [
      {
        type: '~builtin',
        id: '~terminals',
        title: 'Terminals',
        icon: 'ph:terminal-duotone',
        get isHidden() {
          return context.terminals.sessions.size === 0
        },
      },
    ]

    return {
      handler: (): DevToolsDockEntry[] => [
        ...Array.from(context.docks.values()),
        ...builtinDocksEntries,
      ],
    }
  },
})
