const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i

export function getWindowOrigin(): string {
  try {
    return window.location.origin
  }
  catch {
    return ''
  }
}

export function resolveDockIframeUrl(url: string, baseOrigin = getWindowOrigin()): string {
  const value = url.trim()
  if (!value)
    return value

  if (ABSOLUTE_URL_RE.test(value))
    return value

  if (value.startsWith('/')) {
    if (!baseOrigin)
      return value

    try {
      return new URL(value, baseOrigin).href
    }
    catch {
      return value
    }
  }

  return `http://${value}`
}
