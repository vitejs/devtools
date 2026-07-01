import type { Plugin } from 'vite'
import type { ViteInspectContext } from './context'
import type { ViteInspectQuery } from './types'
import { Buffer } from 'node:buffer'
import { relative } from 'pathe'

export const DUMMY_LOAD_PLUGIN_NAME = '__load__'

export function serializePlugin(plugin: Plugin): unknown {
  return JSON.parse(JSON.stringify(plugin, (key, value) => {
    if (typeof value === 'function') {
      let name = value.name
      if (name === 'anonymous')
        name = ''
      if (name === key)
        name = ''
      return name ? `[Function ${name}]` : '[Function]'
    }
    if (key === 'api' && value)
      return '[Object API]'
    return value
  }))
}

export function removeVersionQuery(url: string): string {
  if (!url.includes('v='))
    return url
  return url
    .replace(/&v=\w+/, '')
    .replace(/\?v=\w+/, '?')
    .replace(/\?$/, '')
}

export function normalizeModuleId(id: string, root: string): string {
  const normalizedId = id
    .replace(/%2F/gi, '/')
    .replace(/\\/g, '/')
  const normalizedRoot = root
    .replace(/%2F/gi, '/')
    .replace(/\\/g, '/')
  const isAbsolutePath = normalizedId.startsWith('/') || /^[a-z]:\//i.test(normalizedId)
  if (!isAbsolutePath || !normalizedId.includes('/node_modules/'))
    return normalizedId

  let result = relative(normalizedRoot, normalizedId)
  if (!result.startsWith('./') && !result.startsWith('../'))
    result = `./${result}`
  return result
}

export function getUtf8Size(value?: string | null): number {
  return value ? Buffer.byteLength(value, 'utf8') : 0
}

export function parseError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || String(error),
      stack: typeof error.stack === 'string'
        ? error.stack.split('\n').map(line => line.trim()).filter(Boolean)
        : [],
      raw: error,
    }
  }

  return {
    message: String(error),
    stack: [],
    raw: error,
  }
}

export function stringifyError(error: unknown): string {
  if (error instanceof Error)
    return error.stack || error.message
  return String(error)
}

export function getAllQueryEnvs(ctx: ViteInspectContext): ViteInspectQuery[] {
  const result: ViteInspectQuery[] = []
  for (const vite of ctx.idToInstances.values()) {
    for (const envName of vite.environments.keys()) {
      result.push({
        vite: vite.id,
        env: envName,
      })
    }
  }
  return result
}

export function getAllModuleIds(ctx: ViteInspectContext): [ViteInspectQuery, string][] {
  const result: [ViteInspectQuery, string][] = []
  for (const vite of ctx.idToInstances.values()) {
    for (const [envName, env] of vite.environments) {
      const query = {
        vite: vite.id,
        env: envName,
      }
      for (const id of Object.keys(env.data.transform))
        result.push([query, id])
    }
  }
  return result
}
