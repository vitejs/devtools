import type { NodeHandler } from 'h3'
import type { CreateWsServerOptions } from './ws'
import { DEVTOOLS_CONNECTION_META_FILENAME } from '@vitejs/devtools-kit/constants'
import { consumeTempAuthToken } from 'devframe/node/auth'
import { getInternalContext } from 'devframe/node/hub-internals'
import { mountStaticHandler } from 'devframe/utils/serve-static'
import { defineHandler, getQuery, H3, toNodeHandler } from 'h3'
import { dirClientStandalone } from '../dirs'
import { createWsServer } from './ws'

export interface DevToolsMiddleware {
  h3: H3
  rpc: Awaited<ReturnType<typeof createWsServer>>['rpc']
  middleware: NodeHandler
  getConnectionMeta: Awaited<ReturnType<typeof createWsServer>>['getConnectionMeta']
}

function generateAuthPageHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Vite DevTools Authorization</title>
  <style>
    html { font-family: system-ui, sans-serif; padding: 2rem; }
    body { height: 80vh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem; }
    #message { font-size: 1.2rem; }
    @media (prefers-color-scheme: dark) { html { background: #1a1a1a; color: #e0e0e0; } }
  </style>
</head>
<body>
  <div id="message">Verifying...</div>
  <script>
    const query = new URLSearchParams(location.search)
    const id = query.get('id')
    const el = document.getElementById('message')

    if (!id) {
      el.textContent = '\\u26a0\\ufe0f No auth token found. Please check your URL.'
      el.style.color = '#df513f'
    } else {
      fetch(location.pathname.replace(/\\/$/, '') + '-verify?id=' + encodeURIComponent(id))
        .then(async (r) => {
          if (r.status !== 200) throw new Error(await r.text())
          const data = await r.json()
          const authToken = data.authToken

          localStorage.setItem('__DEVFRAME_CONNECTION_AUTH_TOKEN__', authToken)

          try {
            const bc = new BroadcastChannel('devframe-auth')
            bc.postMessage({ type: 'auth-update', authToken: authToken })
          } catch {}

          el.textContent = '\\u2705 Authorized! You can close this window now.'
          window.close()
        })
        .catch((err) => {
          el.textContent = '\\u26a0\\ufe0f Failed to authorize: ' + err.message
          el.style.color = '#df513f'
        })
    }
  </script>
</body>
</html>`
}

export async function createDevToolsMiddleware(options: CreateWsServerOptions): Promise<DevToolsMiddleware> {
  const h3 = new H3()
  const contextInternal = getInternalContext(options.context)

  const { rpc, getConnectionMeta } = await createWsServer(options)

  h3.use(`/${DEVTOOLS_CONNECTION_META_FILENAME}`, defineHandler(async (event) => {
    event.res.headers.set('Content-Type', 'application/json')
    return JSON.stringify(await getConnectionMeta())
  }))

  h3.use('/auth-verify', defineHandler((event) => {
    const { id } = getQuery(event) as { id?: string }
    if (!id) {
      event.res.status = 400
      return 'Missing id parameter'
    }

    const clientAuthToken = consumeTempAuthToken(id, contextInternal.storage.auth)
    if (!clientAuthToken) {
      event.res.status = 403
      return 'Invalid or expired auth token'
    }

    event.res.headers.set('Content-Type', 'application/json')
    return JSON.stringify({ authToken: clientAuthToken })
  }))

  h3.use('/auth', defineHandler((event) => {
    event.res.headers.set('Content-Type', 'text/html; charset=utf-8')
    return generateAuthPageHtml()
  }))

  mountStaticHandler(h3, '', dirClientStandalone)

  return {
    h3,
    rpc,
    middleware: toNodeHandler(h3),
    getConnectionMeta,
  }
}
