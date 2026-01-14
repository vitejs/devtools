import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { defineConfig } from 'vitepress'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import { version } from '../../package.json'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Vite DevTools',
  description: 'Visualize and analyze your Vite build process with powerful developer tools. Extensible architecture for building custom DevTools integrations.',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'DevTools Kit', link: '/kit/' },
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
    },

    lastUpdated: {
      text: 'Last updated',
    },

    editLink: {
      pattern: 'https://github.com/vitejs/devtools/edit/main/docs/:path',
      text: 'Suggest changes to this page',
    },

    socialLinks: [
      { icon: 'bluesky', link: 'https://bsky.app/profile/vite.dev' },
      { icon: 'mastodon', link: 'https://elk.zone/m.webtoo.ls/@vite' },
      { icon: 'x', link: 'https://x.com/vite_js' },
      { icon: 'discord', link: 'https://chat.vite.dev' },
      { icon: 'github', link: 'https://github.com/vitejs/devtools' },
    ],
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
})
