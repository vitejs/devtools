import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { extendConfig } from '@voidzero-dev/vitepress-theme/config'
import { defineConfig } from 'vitepress'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import { withMermaid } from 'vitepress-plugin-mermaid'
import { version } from '../../package.json'

const DevToolsKitNav = [
  { text: 'Introduction', link: '/kit/' },
  { text: 'DevTools Plugin', link: '/kit/devtools-plugin' },
  { text: 'Dock System', link: '/kit/dock-system' },
  { text: 'RPC', link: '/kit/rpc' },
  { text: 'Shared State', link: '/kit/shared-state' },
  { text: 'Commands', link: '/kit/commands' },
  { text: 'When Clauses', link: '/kit/when-clauses' },
  { text: 'Logs & Notifications', link: '/kit/logs' },
  { text: 'Terminals & Processes', link: '/kit/terminals' },
  { text: 'Examples', link: '/kit/examples' },
]

const SocialLinks = [
  { icon: 'bluesky', link: 'https://bsky.app/profile/vite.dev' },
  { icon: 'mastodon', link: 'https://elk.zone/m.webtoo.ls/@vite' },
  { icon: 'x', link: 'https://x.com/vite_js' },
  { icon: 'discord', link: 'https://chat.vite.dev' },
  { icon: 'github', link: 'https://github.com/vitejs/devtools' },
]

// https://vitepress.dev/reference/site-config
export default extendConfig(withMermaid(defineConfig({
  title: 'Vite DevTools',
  description: 'An extensible devtools framework for the Vite ecosystem. Build, compose, and integrate developer tools with a unified foundation.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],
  themeConfig: {
    variant: 'vite',

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/' },
      {
        text: 'Builtin DevTools',
        items: [
          { text: 'DevTools for Rolldown', link: '/rolldown/' },
        ],
      },
      {
        text: 'DevTools Kit',
        items: DevToolsKitNav,
      },
      {
        text: `v${version}`,
        items: [
          { text: 'Release Notes', link: 'https://github.com/vitejs/devtools/releases' },
          { text: 'Contributing', link: 'https://github.com/vitejs/devtools/blob/main/CONTRIBUTING.md' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/' },
        ],
      },
      {
        text: 'DevTools for Rolldown',
        items: [
          { text: 'Introduction', link: '/rolldown/' },
          { text: 'Features', link: '/rolldown/features' },
        ],
      },
      {
        text: 'DevTools Kit',
        items: [
          { text: 'Introduction', link: '/kit/' },
          { text: 'DevTools Plugin', link: '/kit/devtools-plugin' },
          { text: 'Dock System', link: '/kit/dock-system' },
          { text: 'RPC', link: '/kit/rpc' },
          { text: 'Shared State', link: '/kit/shared-state' },
          { text: 'Commands', link: '/kit/commands' },
          { text: 'When Clauses', link: '/kit/when-clauses' },
          { text: 'Logs', link: '/kit/logs' },
          { text: 'JSON Render', link: '/kit/json-render' },
          { text: 'Terminals', link: '/kit/terminals' },
          { text: 'Examples', link: '/kit/examples' },
        ],
      },
      {
        text: 'Error Reference',
        link: '/errors/',
        collapsed: true,
        items: [
          {
            text: 'DevTools Kit (DTK)',
            collapsed: true,
            items: Array.from({ length: 32 }, (_, i) => {
              const code = `DTK${String(i + 1).padStart(4, '0')}`
              return { text: code, link: `/errors/${code}` }
            }),
          },
          {
            text: 'Rolldown DevTools (RDDT)',
            collapsed: true,
            items: [
              { text: 'RDDT0001', link: '/errors/RDDT0001' },
              { text: 'RDDT0002', link: '/errors/RDDT0002' },
            ],
          },
        ],
      },
    ],

    search: {
      provider: 'local',
    },

    logo: {
      light: '/logo.svg',
      dark: '/logo.svg',
    },

    footer: {
      message: `Released under the MIT License.`,
      copyright: 'Copyright © 2025-present VoidZero Inc. & Vite Contributors',
      nav: [
        {
          title: 'Vite DevTools',
          items: [
            { text: 'Guide', link: '/guide/' },
            { text: 'DevTools for Rolldown', link: '/rolldown/' },
            { text: 'Release Notes', link: 'https://github.com/vitejs/devtools/releases' },
            { text: 'Contributing', link: 'https://github.com/vitejs/devtools/blob/main/CONTRIBUTING.md' },
          ],
        },
        {
          title: 'DevTools Kit',
          items: DevToolsKitNav,
        },
        {
          title: 'Builtin DevTools',
          items: [
            { text: 'DevTools for Rolldown', link: '/rolldown/' },
          ],
        },
      ],
      social: SocialLinks,
    },

    lastUpdated: {
      text: 'Last updated',
    },

    editLink: {
      pattern: 'https://github.com/vitejs/devtools/edit/main/docs/:path',
      text: 'Suggest changes to this page',
    },

    socialLinks: SocialLinks,
  },
  markdown: {
    codeTransformers: [
      transformerTwoslash(),
    ],
    config(md) {
      md.use(groupIconMdPlugin)
    },
  },
  vite: {
    plugins: [
      groupIconVitePlugin(),
    ],
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
})))
