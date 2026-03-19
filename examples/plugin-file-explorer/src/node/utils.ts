import type { ResolvedFilePath } from './types'
import process from 'node:process'
import { relative, resolve } from 'pathe'
import { DEFAULT_TARGET_DIR, DEFAULT_UI_BASE } from './constants'

export function resolveUiBase(base = process.env.KIT_PLUGIN_FILE_EXPLORER_UI_BASE || DEFAULT_UI_BASE): string {
  let normalized = base.trim()
  if (!normalized.startsWith('/'))
    normalized = `/${normalized}`
  if (!normalized.endsWith('/'))
    normalized = `${normalized}/`
  return normalized
}

export function resolveTargetDir(targetDir = process.env.KIT_PLUGIN_FILE_EXPLORER_TARGET_DIR || DEFAULT_TARGET_DIR): string {
  const normalized = targetDir
    .trim()
    .replace(/^[/\\]+/, '')
    .replace(/[/\\]+$/, '')
  return normalized || DEFAULT_TARGET_DIR
}

export function toPosixPath(path: string): string {
  return path.replace(/\\/g, '/')
}

export function resolveSafePath(rootDir: string, path: string): ResolvedFilePath {
  const normalized = toPosixPath(path.trim()).replace(/^\/+/, '')

  if (!normalized || normalized.includes('\0'))
    throw new Error(`Invalid file path: ${JSON.stringify(path)}`)

  if (normalized.split('/').includes('..'))
    throw new Error(`Path traversal is not allowed: ${JSON.stringify(path)}`)

  const absolutePath = resolve(rootDir, normalized)
  const relativePath = toPosixPath(relative(rootDir, absolutePath))

  if (!relativePath || relativePath.startsWith('../') || relativePath === '..')
    throw new Error(`Path is outside of root directory: ${JSON.stringify(path)}`)

  return {
    absolutePath,
    relativePath,
  }
}
