import { isIP } from 'node:net'

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function normalizeHttpServerUrl(host: string, port: number | string): string {
  const normalizedHost
    = host === '127.0.0.1'
      ? 'localhost'
      : isIP(host) === 6
        ? `[${host}]`
        : host

  return `http://${normalizedHost}:${port}`
}
