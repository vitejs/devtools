import { DEVFRAME_CONNECTION_KEY } from 'devframe/constants'
import { setActionIcon } from '../shared/action-icon'

type DetectionStatus = 'detected' | 'vite-detected' | 'not-detected' | 'restricted' | 'error'

const DETECTION_TIMEOUT = 10_000
const DETECTION_INTERVAL = 500
const RESTRICTED_PROTOCOLS = new Set([
  'about:',
  'chrome:',
  'chrome-extension:',
  'devtools:',
  'edge:',
])
const DETECTION_STATUSES = new Set<DetectionStatus>([
  'detected',
  'vite-detected',
  'not-detected',
])

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url)
    return false

  try {
    const parsed = new URL(url)
    return RESTRICTED_PROTOCOLS.has(parsed.protocol)
      || parsed.hostname === 'chromewebstore.google.com'
      || (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore'))
  }
  catch {
    return true
  }
}

async function detectPage(
  connectionKey: string,
  timeout: number,
  interval: number,
): Promise<DetectionStatus> {
  const sleep = (duration: number) => new Promise(resolve => setTimeout(resolve, duration))
  const isViteDevToolsEnabled = () => {
    const connection = (globalThis as Record<string, unknown>)[connectionKey]
    return Boolean(
      connection
      && typeof connection === 'object'
      && typeof (connection as { metaBaseUrl?: unknown }).metaBaseUrl === 'string'
      && (connection as { metaBaseUrl: string }).metaBaseUrl,
    )
  }

  const viteDetected = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'),
  ).some((script) => {
    const url = new URL(script.src, document.baseURI)
    return url.pathname.endsWith('/@vite/client')
  })

  if (isViteDevToolsEnabled())
    return 'detected'
  if (!viteDetected)
    return 'not-detected'

  const attempts = Math.ceil(timeout / interval)
  for (let attempt = 0; attempt < attempts; attempt++) {
    await sleep(interval)

    if (isViteDevToolsEnabled())
      return 'detected'
  }

  return 'vite-detected'
}

async function detectTab(
  tab: chrome.tabs.Tab,
  timeout = 0,
): Promise<DetectionStatus> {
  if (!tab.id)
    return 'error'
  if (isRestrictedUrl(tab.url))
    return 'restricted'

  try {
    const [injection] = await chrome.scripting.executeScript({
      args: [DEVFRAME_CONNECTION_KEY, timeout, DETECTION_INTERVAL],
      func: detectPage,
      target: { tabId: tab.id },
      world: 'MAIN',
    })
    const status = injection?.result
    return status && DETECTION_STATUSES.has(status) ? status : 'error'
  }
  catch {
    return isRestrictedUrl(tab.url) ? 'restricted' : 'error'
  }
}

async function updateTabIcon(tab: chrome.tabs.Tab, timeout = 0): Promise<DetectionStatus> {
  const status = await detectTab(tab, timeout)
  if (tab.id)
    await setActionIcon(tab.id, status === 'detected')
  return status
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    setActionIcon(tabId, false)
  }
  else if (changeInfo.status === 'complete') {
    updateTabIcon(tab, DETECTION_TIMEOUT)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'vite-devtools:detect-active-tab')
    return

  chrome.tabs.query({ active: true, currentWindow: true })
    .then(async ([tab]) => {
      if (!tab)
        return 'error' satisfies DetectionStatus
      return updateTabIcon(tab)
    })
    .then(sendResponse, () => sendResponse('error'))

  return true
})
