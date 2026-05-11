import type { DevToolsRpcClient } from 'devframe/client'
import { connectDevframe } from 'devframe/client'
import { useEffect, useState } from 'preact/hooks'
import { About } from './routes/about'
import { Home } from './routes/home'

function getBasePath(): string {
  return new URL(document.baseURI).pathname
}

function getRoute(basePath: string): string {
  const path = location.pathname
  if (!path.startsWith(basePath))
    return '/'
  const sub = path.slice(basePath.length)
  return sub.startsWith('/') ? sub : `/${sub}`
}

export function App() {
  const basePath = getBasePath()
  const [route, setRoute] = useState(getRoute(basePath))
  const [rpc, setRpc] = useState<DevToolsRpcClient | null>(null)

  useEffect(() => {
    let cancelled = false
    connectDevframe().then((r) => {
      if (!cancelled)
        setRpc(r)
    })
    const onPop = () => setRoute(getRoute(basePath))
    window.addEventListener('popstate', onPop)
    return () => {
      cancelled = true
      window.removeEventListener('popstate', onPop)
    }
  }, [basePath])

  function navigate(to: string) {
    const target = `${basePath}${to.replace(/^\//, '')}`
    history.pushState(null, '', target)
    setRoute(to)
  }

  if (!rpc)
    return <p>Connecting to devframe…</p>

  return (
    <main>
      <header>
        <h1>Files Inspector</h1>
        <nav>
          <a
            href={basePath}
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
          >
            Home
          </a>
          {' · '}
          <a
            href={`${basePath}about`}
            onClick={(e) => {
              e.preventDefault()
              navigate('/about')
            }}
          >
            About
          </a>
        </nav>
        <small>
          base:
          {' '}
          <code>{basePath}</code>
          {' | '}
          backend:
          {' '}
          <code>{rpc.connectionMeta.backend}</code>
        </small>
      </header>
      <hr />
      {route === '/about'
        ? <About rpc={rpc} basePath={basePath} />
        : <Home rpc={rpc} />}
    </main>
  )
}
