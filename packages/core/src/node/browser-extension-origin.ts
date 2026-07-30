const BROWSER_EXTENSION_PROTOCOLS = new Set([
  'chrome-extension:',
  'moz-extension:',
])

export function isBrowserExtensionOrigin(origin: string | undefined): origin is string {
  if (!origin)
    return false

  try {
    const url = new URL(origin)
    return BROWSER_EXTENSION_PROTOCOLS.has(url.protocol)
      && !!url.hostname
      && origin === `${url.protocol}//${url.host}`
  }
  catch {
    return false
  }
}

export function registerBrowserExtensionOrigin(
  allowedOrigins: string[],
  origin: string | undefined,
): boolean {
  if (!isBrowserExtensionOrigin(origin))
    return false

  if (!allowedOrigins.includes(origin))
    allowedOrigins.push(origin)
  return true
}
