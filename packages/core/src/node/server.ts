import type { CreateWsServerOptions } from './ws'
import { DEVTOOLS_CONNECTION_META_FILENAME } from '@vitejs/devtools-kit/constants'
import { consumeTempAuthToken, getInternalContext } from 'devframe/node'
import { createApp, eventHandler, fromNodeMiddleware, getQuery, toNodeListener } from 'h3'
import sirv from 'sirv'
import { dirClientStandalone } from '../dirs'
import { createWsServer } from './ws'

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

          localStorage.setItem('__VITE_DEVTOOLS_CONNECTION_AUTH_TOKEN__', authToken)

          try {
            const bc = new BroadcastChannel('vite-devtools-auth')
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

export async function createDevToolsMiddleware(options: CreateWsServerOptions) {
  const h3 = createApp()
  const contextInternal = getInternalContext(options.context)

  const { rpc, getConnectionMeta } = await createWsServer(options)

  h3.use(`/${DEVTOOLS_CONNECTION_META_FILENAME}`, eventHandler(async (event) => {
    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify(await getConnectionMeta()))
  }))

  h3.use('/auth-verify', eventHandler((event) => {
    const { id } = getQuery(event) as { id?: string }
    if (!id) {
      event.node.res.statusCode = 400
      return event.node.res.end('Missing id parameter')
    }

    const clientAuthToken = consumeTempAuthToken(id, contextInternal.storage.auth)
    if (!clientAuthToken) {
      event.node.res.statusCode = 403
      return event.node.res.end('Invalid or expired auth token')
    }

    event.node.res.setHeader('Content-Type', 'application/json')
    return event.node.res.end(JSON.stringify({ authToken: clientAuthToken }))
  }))

  h3.use('/auth', eventHandler((event) => {
    event.node.res.setHeader('Content-Type', 'text/html')
    return event.node.res.end(generateAuthPageHtml())
  }))

  h3.use(fromNodeMiddleware(sirv(dirClientStandalone, {
    dev: true,
    single: true,
  })))

  return {
    h3,
    rpc,
    middleware: toNodeListener(h3),
    getConnectionMeta,
  }
}
