import type { DefaultTheme } from 'vitepress'

export default function devframeSidebar(prefix = ''): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: `${prefix}/guide/` },
        { text: 'Devtool Definition', link: `${prefix}/guide/devtool-definition` },
        { text: 'Adapters', link: `${prefix}/guide/adapters` },
        { text: 'RPC', link: `${prefix}/guide/rpc` },
        { text: 'Shared State', link: `${prefix}/guide/shared-state` },
        { text: 'Streaming', link: `${prefix}/guide/streaming` },
        { text: 'Dock System', link: `${prefix}/guide/dock-system` },
        { text: 'Commands', link: `${prefix}/guide/commands` },
        { text: 'When Clauses', link: `${prefix}/guide/when-clauses` },
        { text: 'Messages & Notifications', link: `${prefix}/guide/messages` },
        { text: 'Structured Diagnostics', link: `${prefix}/guide/diagnostics` },
        { text: 'Terminals', link: `${prefix}/guide/terminals` },
        { text: 'Client', link: `${prefix}/guide/client` },
        { text: 'Standalone CLI', link: `${prefix}/guide/standalone-cli` },
        { text: 'Nuxt Helper', link: `${prefix}/guide/nuxt` },
        { text: 'Agent-Native (experimental)', link: `${prefix}/guide/agent-native` },
      ],
    },
    {
      text: 'Error Reference',
      link: `${prefix}/errors/`,
      collapsed: true,
      items: Array.from({ length: 36 }, (_, i) => {
        const code = `DF${String(i + 1).padStart(4, '0')}`
        return { text: code, link: `${prefix}/errors/${code}` }
      }),
    },
  ]
}
