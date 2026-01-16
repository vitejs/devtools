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
  description: 'Visualize and analyze your Vite build process with powerful developer tools. Extensible architecture for building custom DevTools integrations.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],
  themeConfig: {
    variant: 'vite',

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/' },
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
          { text: 'Features', link: '/guide/features/' },
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
            { text: 'Features', link: '/guide/features' },
            { text: 'Release Notes', link: 'https://github.com/vitejs/devtools/releases' },
            { text: 'Contributing', link: 'https://github.com/vitejs/devtools/blob/main/CONTRIBUTING.md' },
          ],
        },
        {
          title: 'DevTools Kit',
          items: DevToolsKitNav,
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
