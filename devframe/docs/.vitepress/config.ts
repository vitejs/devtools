import type { DefaultTheme } from 'vitepress'
import { fileURLToPath } from 'node:url'
import { globSync } from 'tinyglobby'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const errorsDir = fileURLToPath(new URL('../errors/', import.meta.url))

function listErrorCodes(prefix: string): string[] {
  return globSync(`${prefix}*.md`, { cwd: errorsDir })
    .map(f => f.replace(/\.md$/, ''))
    .sort()
}

function guideItems(prefix: string): DefaultTheme.NavItemWithLink[] {
  return [
    { text: 'Introduction', link: `${prefix}/guide/` },
    { text: 'Devframe Definition', link: `${prefix}/guide/devframe-definition` },
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
  ]
}

export function devframeSidebar(prefix = ''): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Guide',
      items: guideItems(prefix),
    },
    {
      text: 'Error Reference',
      link: `${prefix}/errors/`,
      collapsed: true,
      items: listErrorCodes('DF').map(code => ({
        text: code,
        link: `${prefix}/errors/${code}`,
      })),
    },
  ]
}

export function devframeNav(prefix = ''): DefaultTheme.NavItemWithLink[] {
  return [
    ...guideItems(prefix),
    { text: 'Error Reference', link: `${prefix}/errors/` },
  ]
}

export default withMermaid(defineConfig({
  title: 'Devframe',
  description: 'Framework-neutral foundation for building generic DevTools — RPC layer, hosts, and adapters.',
  themeConfig: {
    nav: [
      { text: 'Guide', items: guideItems('') },
      { text: 'Error Reference', link: '/errors/' },
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
