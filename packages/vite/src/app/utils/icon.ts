import { makeCachedFunction } from './cache'

export interface FilterMatchRule {
  match: RegExp
  name: string
  description: string
  icon: string
}

// @unocss-include
export const ModuleTypeRules: FilterMatchRule[] = [
  {
    match: /[\\/]node_modules[\\/]/i,
    name: 'node_modules',
    description: 'Node Modules',
    icon: 'i-catppuccin-npm',
  },
  {
    match: /virtual:|^\0/,
    name: 'virtual',
    description: 'Virtual',
    icon: 'i-catppuccin-symlink',
  },
  {
    match: /^@?[\w-]+\/?/,
    name: 'package',
    description: 'Package',
    icon: 'i-catppuccin-java-class-abstract',
  },
  {
    match: /\.vue$/i,
    name: 'vue',
    description: 'Vue',
    icon: 'i-catppuccin-vue',
  },
  {
    match: /\.[cm]?[tj]sx$/i,
    name: 'jsx',
    description: 'JavaScript React',
    icon: 'i-catppuccin-javascript-react',
  },
  {
    match: /\.[cm]?ts$/i,
    name: 'ts',
    description: 'TypeScript',
    icon: 'i-catppuccin-typescript',
  },
  {
    match: /\.[cm]?js$/i,
    name: 'js',
    description: 'JavaScript',
    icon: 'i-catppuccin-javascript',
  },
  {
    match: /\.svelte$/i,
    name: 'svelte',
    description: 'Svelte',
    icon: 'i-catppuccin-svelte',
  },
  {
    match: /\.mdx$/i,
    name: 'mdx',
    description: 'MDX',
    icon: 'i-catppuccin-mdx',
  },
  {
    match: /\.md$/i,
    name: 'md',
    description: 'Markdown',
    icon: 'i-catppuccin-markdown',
  },
  {
    match: /\.astro$/i,
    name: 'astro',
    description: 'Astro',
    icon: 'i-catppuccin-astro',
  },
  {
    match: /\.angular$/i,
    name: 'angular',
    description: 'Angular',
    icon: 'i-catppuccin-angular',
  },
  {
    match: /\.html?$/i,
    name: 'html',
    description: 'HTML',
    icon: 'i-catppuccin-html',
  },
  {
    match: /\.(css|scss|less|postcss)$/i,
    name: 'css',
    description: 'CSS',
    icon: 'i-catppuccin-css',
  },
  {
    match: /\.json[c5]?$/i,
    name: 'json',
    description: 'JSON',
    icon: 'i-catppuccin-json',
  },
  {
    match: /\.(yaml|yml)$/i,
    name: 'yaml',
    description: 'YAML',
    icon: 'i-catppuccin-yaml',
  },
  {
    match: /\.toml$/i,
    name: 'toml',
    description: 'TOML',
    icon: 'i-catppuccin-toml',
  },
  {
    match: /\.svg$/i,
    name: 'svg',
    description: 'SVG',
    icon: 'i-catppuccin-svg',
  },

]

// @unocss-include
export const PluginTypeRules: FilterMatchRule[] = [
  {
    match: /^(replace|define|alias)$/,
    name: 'rollup',
    description: 'Rollup',
    icon: 'i-catppuccin-rollup',
  },
  {
    match: /^vite:/i,
    name: 'vite',
    description: 'Vite',
    icon: 'i-catppuccin-vite',
  },
  {
    match: /^unocss:/i,
    name: 'unocss',
    description: 'Unocss',
    icon: 'i-catppuccin-unocss',
  },
  {
    match: /^nuxt:/i,
    name: 'nuxt',
    description: 'Nuxt',
    icon: 'i-catppuccin-nuxt',
  },
  {
    match: /^builtin:/i,
    name: 'builtin',
    description: 'Builtin',
    icon: 'i-catppuccin-folder-prisma',
  },
]

export const DefaultFileTypeRule: FilterMatchRule = {
  name: 'file',
  match: /.*/,
  description: 'File',
  icon: 'i-catppuccin-file',
}

export const DefaultPluginType: FilterMatchRule = {
  name: 'plugin',
  match: /.*/,
  description: 'User Plugins',
  icon: 'i-catppuccin-folder-plugins',
}

export function getFileTypeFromName(name: string) {
  return ModuleTypeRules.find(rule => rule.name === name) ?? DefaultFileTypeRule
}

export const getFileTypeFromModuleId = makeCachedFunction((moduleId: string): FilterMatchRule => {
  moduleId = moduleId
    .replace(/(\?|&)v=[^&]*/, '$1')
    .replace(/\?$/, '')

  for (const rule of ModuleTypeRules) {
    if (rule.match.test(moduleId)) {
      return rule
    }
  }

  return DefaultFileTypeRule
})

export const getPluginTypeFromName = makeCachedFunction((name: string): FilterMatchRule => {
  for (const rule of PluginTypeRules) {
    if (rule.match.test(name)) {
      return rule
    }
  }
  return DefaultPluginType
})
