import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import devframeSidebar from './sidebar'

export default withMermaid(defineConfig({
  title: 'DevFrame',
  description: 'Framework-neutral foundation for building generic DevTools — RPC layer, hosts, and adapters.',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Errors', link: '/errors/' },
    ],
    sidebar: devframeSidebar(),
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
