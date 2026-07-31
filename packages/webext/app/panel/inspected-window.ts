import type { DevframeConnection } from 'devframe/client'
import { DEVFRAME_CONNECTION_KEY } from 'devframe/constants'

export const connectionEval
  = `window[${JSON.stringify(DEVFRAME_CONNECTION_KEY)}] || undefined`

function inspectWindow(): Promise<DevframeConnection | null> {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval<DevframeConnection>(connectionEval, (connection, exceptionInfo) => {
      resolve(exceptionInfo || !connection ? null : connection)
    })
  })
}

export async function getInspectedWindowConnection(): Promise<DevframeConnection | null> {
  const connection = await inspectWindow()
  if (!connection?.connectionMeta || !connection.metaBaseUrl)
    return null

  return connection
}

export async function registerBrowserExtensionOrigin(
  connectionMetaUrl: string,
  extensionOrigin = globalThis.location.origin,
): Promise<void> {
  const registrationUrl = new URL(connectionMetaUrl)
  registrationUrl.searchParams.set('browser-extension-origin', extensionOrigin)
  const response = await fetch(registrationUrl.href, {
    cache: 'no-store',
  })
  if (!response.ok)
    throw new Error(`Unable to register the browser extension origin (${response.status}).`)
}
