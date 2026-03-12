import type { DevToolsLogLevel } from '@vitejs/devtools-kit'

// @unocss-include

export type LogSource = 'server' | 'client'

export interface LevelStyle {
  icon: string
  color: string
  bg: string
}

export interface SourceStyle {
  icon: string
  color: string
  label: string
}

export const levels: Record<DevToolsLogLevel, LevelStyle> = {
  info: { icon: 'i-ph:info-duotone', color: 'text-blue', bg: 'bg-blue' },
  warn: { icon: 'i-ph:warning-duotone', color: 'text-amber', bg: 'bg-amber' },
  error: { icon: 'i-ph:x-circle-duotone', color: 'text-red', bg: 'bg-red' },
  success: { icon: 'i-ph:check-circle-duotone', color: 'text-green', bg: 'bg-green' },
  debug: { icon: 'i-ph:bug-duotone', color: 'text-gray', bg: 'bg-gray' },
}

export const sources: Record<LogSource, SourceStyle> = {
  server: { icon: 'i-ph:hexagon-duotone', color: 'text-green', label: 'Server' },
  client: { icon: 'i-ph:globe-simple-duotone', color: 'text-amber', label: 'Client' },
}
