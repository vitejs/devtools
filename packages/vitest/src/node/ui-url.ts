import { stripVTControlCharacters } from 'node:util'

/**
 * Carry the Vitest UI API token into `url`.
 *
 * Since Vitest 5 the UI answers `403` unless the request carries
 * `?token=<api token>` (which sets an auth cookie and redirects to the clean
 * URL) or already holds that cookie. Vitest prints the authenticated URL on
 * startup as `UI started at http://localhost:<port>/__vitest__/?token=…`.
 *
 * Returns `url` with that token, `url` unchanged when the printed URL has no
 * token (Vitest < 5), or `undefined` while the line hasn't been printed yet.
 */
export function resolveVitestUiUrl(url: string, output: string): string | undefined {
  const printed = stripVTControlCharacters(output).match(/UI started at (\S+)/)?.[1]
  if (!printed)
    return undefined
  let token: string | null
  try {
    token = new URL(printed).searchParams.get('token')
  }
  catch {
    return undefined
  }
  if (!token)
    return url
  const authenticated = new URL(url)
  authenticated.searchParams.set('token', token)
  return authenticated.href
}

/**
 * Poll the Vitest UI until it serves the app, returning the URL to embed
 * (tokenized when Vitest printed a token), or `undefined` on timeout.
 *
 * Only a `2xx` or a `3xx` (Vitest redirects a valid `?token=` to the clean
 * URL) counts as ready. A `403` is Vitest's auth-required page, which is not
 * the UI, so polling continues until the token shows up in `getOutput()`.
 */
export async function waitForVitestUi(
  url: string,
  timeout: number,
  getOutput: () => string,
  interval = 300,
): Promise<string | undefined> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const target = resolveVitestUiUrl(url, getOutput()) ?? url
    try {
      const res = await fetch(target, { redirect: 'manual' })
      await res.body?.cancel()
      if (res.status >= 200 && res.status < 400)
        return target
    }
    catch {
      // server not up yet
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  return undefined
}
