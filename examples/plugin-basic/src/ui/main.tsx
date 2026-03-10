import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const SUMMARY_RPC = 'kit-plugin-basic:modules:summary'
const DETAIL_RPC = 'kit-plugin-basic:modules:detail'
const rpcPromise = getDevToolsRpcClient()

interface ModuleSummary {
  generatedAt: string
  totalModules: number
  totalBytes: number
  moduleIds: string[]
}

interface ModuleDetail {
  id: string
  bytes: number
  lines: number
  importsCount: number
  exportsCount: number
  checksum: string
  preview: string
  source: string
}

function Stat(props: { label: string, value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-label">{props.label}</div>
      <div className="stat-value">{props.value}</div>
    </div>
  )
}

function App() {
  const [summary, setSummary] = React.useState<ModuleSummary | null>(null)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<ModuleDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loadedDetails, setLoadedDetails] = React.useState<Set<string>>(() => new Set())

  React.useEffect(() => {
    let active = true
    rpcPromise
      .then(async (rpc) => {
        const value = await rpc.call(SUMMARY_RPC) as ModuleSummary
        if (!active)
          return
        setSummary(value)
      })
      .catch((err: Error) => {
        if (!active)
          return
        setError(err.message)
      })

    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (!selectedId)
      return

    let active = true
    setIsLoadingDetail(true)
    setError(null)

    rpcPromise
      .then(async (rpc) => {
        const value = await rpc.call(DETAIL_RPC, selectedId) as ModuleDetail | null
        if (!active)
          return
        setDetail(value)
        setLoadedDetails((prev) => {
          const next = new Set(prev)
          next.add(selectedId)
          return next
        })
      })
      .catch((err: Error) => {
        if (!active)
          return
        setError(err.message)
      })
      .finally(() => {
        if (active)
          setIsLoadingDetail(false)
      })

    return () => {
      active = false
    }
  }, [selectedId])

  if (!summary) {
    return (
      <div className="main">Loading module summary...</div>
    )
  }

  return (
    <div className="page">
      <header className="header">
        <h1 className="title">Build Module Explorer</h1>
        <div className="stats">
          <Stat label="Modules" value={summary.totalModules} />
          <Stat label="Total Bytes" value={summary.totalBytes} />
          <Stat label="Loaded Details" value={loadedDetails.size} />
        </div>
      </header>

      <div className="content">
        <aside className="list">
          {summary.moduleIds.map(id => (
            <button
              key={id}
              type="button"
              className={[
                'item-button',
                selectedId === id ? 'selected' : '',
              ].join(' ')}
              onClick={() => setSelectedId(id)}
            >
              {id}
            </button>
          ))}
        </aside>

        <main className="main">
          {!selectedId && (
            <div>Select a module to load detail JSON on demand.</div>
          )}

          {selectedId && isLoadingDetail && (
            <div>
              Loading detail shard for
              {' '}
              {selectedId}
              ...
            </div>
          )}

          {error && (
            <div className="error">{error}</div>
          )}

          {selectedId && !isLoadingDetail && detail && (
            <div className="detail">
              <div className="detail-title">{detail.id}</div>
              <div className="detail-meta">
                Size:
                {' '}
                {detail.bytes}
                {' '}
                bytes · Lines:
                {' '}
                {detail.lines}
                {' '}
                · Imports:
                {' '}
                {detail.importsCount}
              </div>
              <pre className="detail-preview">{detail.preview}</pre>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app)
  throw new Error('Missing #app root')

createRoot(app).render(<App />)
