import type { DevToolsDockEntry, DevToolsServerCommandEntry } from '@vitejs/devtools-kit'

/**
 * A representative set of dock entries covering every user entry type:
 * iframe frames, a launcher, a custom-render view, an action, and a
 * collapsed group with members. Mirrors the shapes registered by the core
 * playground so stories exercise realistic dock layouts.
 */
export function dockEntriesFixture(): DevToolsDockEntry[] {
  return [
    {
      type: 'iframe',
      id: 'overview',
      title: 'Overview',
      icon: 'ph:gauge-duotone',
      url: 'about:blank',
    },
    {
      type: 'iframe',
      id: 'modules',
      title: 'Modules',
      icon: 'ph:plugs-connected-duotone',
      url: 'about:blank',
      badge: '128',
    },
    {
      type: 'custom-render',
      id: 'notes',
      title: 'Notes',
      icon: 'ph:newspaper-clipping-duotone',
      renderer: { importFrom: 'virtual:story-noop' },
    },
    {
      type: 'launcher',
      id: 'launcher',
      title: 'Launcher',
      icon: 'ph:rocket-launch-duotone',
      launcher: {
        title: 'Launch My Cool App',
        description: 'Start the dev server and open the app in a frame.',
        buttonStart: 'Start',
        onLaunch: async () => {},
      },
    },
    {
      type: 'action',
      id: 'ping',
      title: 'Ping',
      icon: 'ph:bell-simple-ringing-duotone',
      action: { importFrom: 'virtual:story-noop' },
    },
    // A collapsed group ("Nuxt") with several iframe members.
    {
      type: 'group',
      id: 'nuxt',
      title: 'Nuxt',
      icon: 'logos:nuxt-icon',
      category: 'framework',
      defaultChildId: 'nuxt:overview',
    },
    {
      type: 'iframe',
      id: 'nuxt:overview',
      title: 'Nuxt Overview',
      icon: 'ph:gauge-duotone',
      url: 'about:blank',
      groupId: 'nuxt',
      defaultOrder: 0,
    },
    {
      type: 'iframe',
      id: 'nuxt:pages',
      title: 'Pages',
      icon: 'ph:files-duotone',
      url: 'about:blank',
      groupId: 'nuxt',
      defaultOrder: 1,
    },
    {
      type: 'iframe',
      id: 'nuxt:components',
      title: 'Components',
      icon: 'ph:puzzle-piece-duotone',
      url: 'about:blank',
      groupId: 'nuxt',
      defaultOrder: 2,
    },
  ]
}

/**
 * Server-side commands, surfaced in the command palette alongside the
 * client-registered navigation/settings commands seeded by the context.
 */
export function serverCommandsFixture(): DevToolsServerCommandEntry[] {
  return [
    {
      id: 'vite:restart',
      source: 'server',
      title: 'Restart Vite Server',
      icon: 'ph:arrow-clockwise-duotone',
      keybindings: [{ key: 'Mod+Shift+R' }],
    },
    {
      id: 'vite:clear-cache',
      source: 'server',
      title: 'Clear Optimize-Deps Cache',
      icon: 'ph:broom-duotone',
    },
    {
      id: 'vite:open-in-editor',
      source: 'server',
      title: 'Open in Editor',
      icon: 'ph:pencil-simple-duotone',
    },
  ]
}
