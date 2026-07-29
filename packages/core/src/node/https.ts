// Port from https://github.com/vitejs/vite/blob/main/packages/vite/src/node/http.ts#L146

import type { Buffer } from 'node:buffer'
import type { ServerOptions as HttpsServerOptions } from 'node:https'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function resolveHttpsConfig(https: HttpsServerOptions | undefined): Promise<HttpsServerOptions | undefined> {
  if (!https)
    return undefined

  const [ca, cert, key, pfx] = await Promise.all([
    readFileIfExists(https.ca),
    readFileIfExists(https.cert),
    readFileIfExists(https.key),
    readFileIfExists(https.pfx),
  ])

  return {
    ...https,
    ca,
    cert,
    key,
    pfx,
  }
}

async function readFileIfExists<T>(value: T): Promise<T | Buffer> {
  if (typeof value === 'string')
    return readFile(resolve(value)).catch(() => value)

  return value
}
