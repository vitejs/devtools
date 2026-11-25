export const MIN_VITE_PLUS_VERSION = '1.6.0'

/** Compare a parsed CLI version against the minimum stable release. */
export function isVitePlusVersionSupported(version: string): boolean {
  const [release, prerelease] = version.split('-')
  const parts = release!.split('.').map(Number)
  for (const [index, minimum] of MIN_VITE_PLUS_VERSION.split('.').map(Number).entries()) {
    if (parts[index] !== minimum)
      return parts[index]! > minimum
  }
  return prerelease === undefined
}
