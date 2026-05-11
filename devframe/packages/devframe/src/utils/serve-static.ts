import type { EventHandler, EventHandlerRequest } from 'h3'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { defineEventHandler, sendStream, setResponseHeader, setResponseStatus } from 'h3'
import { lookup } from 'mrmime'
import { extname, join, normalize, resolve, sep } from 'pathe'

export interface ServeStaticOptions {
  /** Default: `['index.html']`. */
  indexNames?: string[]
  /** SPA fallback to `indexNames[0]` on miss. Default: `true`. */
  single?: boolean
}

interface ResolvedFile {
  abs: string
  size: number
  mtime: Date
}

const HTML_EXTENSIONS = ['.html', '.htm']

async function statFile(abs: string): Promise<ResolvedFile | null> {
  try {
    const s = await stat(abs)
    if (!s.isFile())
      return null
    return { abs, size: s.size, mtime: s.mtime }
  }
  catch {
    return null
  }
}

async function resolveTarget(
  absDir: string,
  urlPath: string,
  indexNames: string[],
  single: boolean,
): Promise<ResolvedFile | null> {
  let cleaned: string
  try {
    cleaned = decodeURIComponent(urlPath || '/')
  }
  catch {
    return null
  }
  cleaned = cleaned.replace(/[?#].*$/, '')
  if (cleaned.endsWith('/'))
    cleaned = cleaned.slice(0, -1)
  if (cleaned.startsWith('/'))
    cleaned = cleaned.slice(1)

  const abs = normalize(join(absDir, cleaned))

  if (abs !== absDir && !abs.startsWith(absDir + sep))
    return null

  const direct = await statFile(abs)
  if (direct)
    return direct

  try {
    const s = await stat(abs)
    if (s.isDirectory()) {
      for (const name of indexNames) {
        const candidate = await statFile(join(abs, name))
        if (candidate)
          return candidate
      }
    }
  }
  catch {
    // not found / not a directory — continue
  }

  // Mirror sirv's `extensions: ['html', 'htm']` default: when the request
  // has no file extension, try `${path}.html` / `${path}.htm` before SPA
  // fallback so pretty-URL deployments resolve to the right page.
  if (!extname(cleaned)) {
    for (const ext of HTML_EXTENSIONS) {
      const candidate = await statFile(abs + ext)
      if (candidate)
        return candidate
    }
  }

  const fallbackIndex = indexNames[0]
  if (single && fallbackIndex && !/\.[a-z0-9]+$/i.test(cleaned)) {
    const indexFile = await statFile(join(absDir, fallbackIndex))
    if (indexFile)
      return indexFile
  }

  return null
}

function contentTypeFor(abs: string): string {
  const type = lookup(abs)
  if (!type)
    return 'application/octet-stream'
  if (type === 'text/html')
    return 'text/html; charset=utf-8'
  return type
}

function setStaticHeaders(res: ServerResponse, file: ResolvedFile): void {
  res.setHeader('Content-Type', contentTypeFor(file.abs))
  res.setHeader('Content-Length', file.size)
  res.setHeader('Last-Modified', file.mtime.toUTCString())
  res.setHeader('Cache-Control', 'no-store')
}

interface NormalizedOptions {
  indexNames: string[]
  single: boolean
}

function normalizeOptions(options: ServeStaticOptions | undefined): NormalizedOptions {
  return {
    indexNames: options?.indexNames ?? ['index.html'],
    single: options?.single ?? true,
  }
}

/**
 * h3 event handler that serves files from `dir` with SPA fallback.
 *
 * Drop-in replacement for `fromNodeMiddleware(sirv(dir, { dev: true, single: true }))`
 * when the surrounding server is an h3 app — no `Cache-Control` beyond
 * `no-store`, `Content-Type` resolved via `mrmime`, and a miss with no
 * file extension falls back to `<dir>/index.html` so client-side routing
 * works.
 */
export function serveStaticHandler(
  dir: string,
  options?: ServeStaticOptions,
): EventHandler<EventHandlerRequest> {
  const absDir = resolve(dir)
  const opts = normalizeOptions(options)
  return defineEventHandler(async (event) => {
    const method = event.node.req.method
    if (method !== 'GET' && method !== 'HEAD') {
      setResponseStatus(event, 405)
      setResponseHeader(event, 'Allow', 'GET, HEAD')
      return ''
    }
    const url = event.node.req.url ?? '/'
    const file = await resolveTarget(absDir, url, opts.indexNames, opts.single)
    if (!file) {
      setResponseStatus(event, 404)
      return ''
    }
    setStaticHeaders(event.node.res, file)
    if (method === 'HEAD') {
      event.node.res.end()
      return ''
    }
    return sendStream(event, createReadStream(file.abs))
  })
}

/**
 * Connect/Express-style Node middleware variant of {@link serveStaticHandler}.
 *
 * Use when mounting onto `viteServer.middlewares.use(base, …)` or any other
 * Connect stack — avoids forcing the host package to depend on h3 just to
 * adapt an event handler back into Node middleware.
 */
export function serveStaticNodeMiddleware(
  dir: string,
  options?: ServeStaticOptions,
): (req: IncomingMessage, res: ServerResponse, next?: (err?: Error) => void) => void {
  const absDir = resolve(dir)
  const opts = normalizeOptions(options)
  return (req, res, next) => {
    void (async () => {
      const method = req.method
      if (method !== 'GET' && method !== 'HEAD') {
        if (next) {
          next()
          return
        }
        res.statusCode = 405
        res.setHeader('Allow', 'GET, HEAD')
        res.end()
        return
      }
      const url = req.url ?? '/'
      const file = await resolveTarget(absDir, url, opts.indexNames, opts.single)
      if (!file) {
        if (next) {
          next()
          return
        }
        res.statusCode = 404
        res.end()
        return
      }
      setStaticHeaders(res, file)
      if (method === 'HEAD') {
        res.end()
        return
      }
      createReadStream(file.abs).pipe(res)
    })().catch((err: unknown) => {
      if (next) {
        next(err instanceof Error ? err : new Error(String(err)))
        return
      }
      res.statusCode = 500
      res.end()
    })
  }
}
