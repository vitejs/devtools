import type { DevToolsRpcClient } from 'devframe/client'
import { useEffect, useState } from 'preact/hooks'

export function About({ rpc, basePath }: { rpc: DevToolsRpcClient, basePath: string }) {
  const [cwd, setCwd] = useState<string>('')

  useEffect(() => {
    rpc.call('devframe-files-inspector:get-cwd' as any).then((r: any) => {
      setCwd(r.cwd)
    })
  }, [rpc])

  return (
    <section>
      <h2>About</h2>
      <p>
        This page demonstrates that the SPA discovers its mount path at
        runtime — the same bundle works under any base path.
      </p>
      <dl>
        <dt>Resolved base path</dt>
        <dd><code>{basePath}</code></dd>
        <dt>Server cwd</dt>
        <dd><code>{cwd || '…'}</code></dd>
        <dt>RPC backend</dt>
        <dd><code>{rpc.connectionMeta.backend}</code></dd>
      </dl>
    </section>
  )
}
