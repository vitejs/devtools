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
        { text: 'When Clauses', link: `${prefix}/guide/when-clauses` },
        { text: 'Structured Diagnostics', link: `${prefix}/guide/diagnostics` },
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
      items: [
        6,
        7,
        8,
        12,
        13,
        14,
        15,
        16,
        17,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
      ].map((n) => {
        const code = `DF${String(n).padStart(4, '0')}`
        return { text: code, link: `${prefix}/errors/${code}` }
      }),
    },
  ]
}
