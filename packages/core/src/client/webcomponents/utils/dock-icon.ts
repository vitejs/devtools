export type DockIconValue = string | { dark: string, light: string }

function resolveIconUrl(icon: string, baseOrigin: string): string {
  if (!icon.startsWith('/') || !baseOrigin)
    return icon

  try {
    return new URL(icon, baseOrigin).href
  }
  catch {
    return icon
  }
}

export function resolveDockIcon(icon: DockIconValue, baseOrigin: string): DockIconValue {
  if (typeof icon === 'string')
    return resolveIconUrl(icon, baseOrigin)

  return {
    dark: resolveIconUrl(icon.dark, baseOrigin),
    light: resolveIconUrl(icon.light, baseOrigin),
  }
}
