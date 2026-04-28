import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const GuideSidebar = [
  { text: 'Introduction', link: '/guide/' },
  { text: 'Devtool Definition', link: '/guide/devtool-definition' },
  { text: 'Adapters', link: '/guide/adapters' },
  { text: 'RPC', link: '/guide/rpc' },
  { text: 'Shared State', link: '/guide/shared-state' },
  { text: 'Dock System', link: '/guide/dock-system' },
  { text: 'Commands', link: '/guide/commands' },
  { text: 'When Clauses', link: '/guide/when-clauses' },
  { text: 'Logs & Notifications', link: '/guide/logs' },
  { text: 'Terminals', link: '/guide/terminals' },
  { text: 'Client', link: '/guide/client' },
  { text: 'Standalone CLI', link: '/guide/standalone-cli' },
  { text: 'Nuxt Helper', link: '/guide/nuxt' },
  { text: 'Agent-Native (experimental)', link: '/guide/agent-native' },
]

export default withMermaid(defineConfig({
  title: 'DevFrame',
  description: 'Framework-neutral foundation for building generic DevTools — RPC layer, hosts, and adapters.',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Errors', link: '/errors/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: GuideSidebar,
      },
      {
        text: 'Error Reference',
        link: '/errors/',
        collapsed: true,
        items: Array.from({ length: 17 }, (_, i) => {
          const code = `DF${String(i + 1).padStart(4, '0')}`
          return { text: code, link: `/errors/${code}` }
        }),
      },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vitejs/devtools' },
    ],
    editLink: {
      pattern: 'https://github.com/vitejs/devtools/edit/main/devframe/docs/:path',
      text: 'Suggest changes to this page',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present VoidZero Inc. & Vite Contributors',
    },
    lastUpdated: {
      text: 'Last updated',
    },
  },
  mermaid: {
    theme: 'base',
    flowchart: {
      curve: 'basis',
      padding: 20,
      nodeSpacing: 50,
      rankSpacing: 60,
      useMaxWidth: true,
    },
    sequence: {
      actorMargin: 80,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 40,
      useMaxWidth: true,
    },
  },
}))
