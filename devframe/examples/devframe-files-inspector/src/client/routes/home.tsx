import type { DevToolsRpcClient } from 'devframe/client'
import { useEffect, useState } from 'preact/hooks'

export function Home({ rpc }: { rpc: DevToolsRpcClient }) {
  const [files, setFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      const result = await rpc.call('devframe-files-inspector:list-files' as any) as string[]
      setFiles(result)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <section>
      <h2>
        Files
        {' '}
        <small>
          (
          {files.length}
          )
        </small>
      </h2>
      <button onClick={refresh} disabled={loading}>
        {loading ? 'Loading…' : 'Refresh'}
      </button>
      <ul>
        {files.map(f => <li key={f}>{f}</li>)}
      </ul>
    </section>
  )
}
