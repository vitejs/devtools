import { makeCachedFunction } from './cache'

interface Basic {
  name: string
  description: string
  icon: string
}
export interface ModuleTypeRule extends Basic {
  match: RegExp
}

export interface PluginType extends Basic {}

// @unocss-include
export const ModuleTypeRules: ModuleTypeRule[] = [
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
    match: /[\\/]node_modules[\\/]/i,
    name: 'node_modules',
    description: 'Node Modules',
    icon: 'i-catppuccin-npm',
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
export const PluginTypes: PluginType[] = [

  {
    name: 'vite',
    description: 'Vite',
    icon: 'i-catppuccin-vite',
  },
  {
    name: 'vue',
    description: 'Vue',
    icon: 'i-catppuccin-vue',
  },
  {
    name: 'unocss',
    description: 'Unocss',
    icon: 'i-catppuccin-unocss',
  },
  {
    name: 'nuxt',
    description: 'Nuxt',
    icon: 'i-catppuccin-nuxt',
  },
  {
    name: 'builtin',
    description: 'Builtin',
    icon: 'i-catppuccin-folder-prisma',
  },
]

const DefaultFileTypeRule: ModuleTypeRule = {
  name: 'file',
  match: /.*/,
  description: 'File',
  icon: 'i-catppuccin-file',
}

const DefaultPluginType: PluginType = {
  name: 'plugin',
  description: 'Plugin',
  icon: 'i-catppuccin-folder-plugins',
}

export function getPluginTypeFromName(name: string) {
  return PluginTypes.find(rule => rule.name === name) ?? DefaultPluginType
}

export function getFileTypeFromName(name: string) {
  return ModuleTypeRules.find(rule => rule.name === name) ?? DefaultFileTypeRule
}

export const getFileTypeFromModuleId = makeCachedFunction((moduleId: string): ModuleTypeRule => {
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
