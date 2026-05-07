import type { DevToolsRpcClient } from 'devframe/client'
import type { StreamReader } from 'devframe/utils/streaming-channel'
import { connectDevtool } from 'devframe/client'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const CHANNEL_NAME = 'devframe-streaming-chat:tokens'

export function App() {
  const [rpc, setRpc] = useState<DevToolsRpcClient | null>(null)
  const [demoPrompts, setDemoPrompts] = useState<string[]>([])
  const [prompt, setPrompt] = useState('Tell me about devframe.')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const readerRef = useRef<StreamReader<string> | null>(null)

  useEffect(() => {
    let cancelled = false
    connectDevtool().then(async (r) => {
      if (cancelled)
        return
      setRpc(r)
      try {
        const { prompts } = await r.call(
          'devframe-streaming-chat:demo-prompts' as any,
        ) as { prompts: string[] }
        if (!cancelled)
          setDemoPrompts(prompts)
      }
      catch {
        // demo prompts are optional
      }
    })
    return () => {
      cancelled = true
      readerRef.current?.cancel()
    }
  }, [])

  const start = useCallback(async (text: string) => {
    if (!rpc || streaming || !text.trim())
      return
    setError(null)
    setOutput('')
    setStreaming(true)
    try {
      const { streamId } = await rpc.call(
        'devframe-streaming-chat:start' as any,
        { prompt: text },
      ) as { streamId: string }

      const reader = rpc.streaming.subscribe<string>(CHANNEL_NAME, streamId)
      readerRef.current = reader
      try {
        for await (const token of reader)
          setOutput(prev => prev + token)
      }
      finally {
        readerRef.current = null
      }
    }
    catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
    finally {
      setStreaming(false)
    }
  }, [rpc, streaming])

  const cancel = useCallback(() => {
    readerRef.current?.cancel()
  }, [])

  if (!rpc)
    return <p>Connecting to devtool…</p>

  return (
    <main>
      <header>
        <h1>Streaming Chat</h1>
        <small>
          A devframe streaming-API demo. Server emits one token every ~40 ms;
          client renders incrementally via
          {' '}
          <code>for await</code>
          .
        </small>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          start(prompt)
        }}
      >
        <input
          type="text"
          value={prompt}
          onInput={e => setPrompt((e.target as HTMLInputElement).value)}
          placeholder="Ask anything…"
          disabled={streaming}
        />
        {!streaming
          ? <button type="submit" disabled={!prompt.trim()}>Send</button>
          : <button type="button" onClick={cancel}>Cancel</button>}
      </form>

      {demoPrompts.length > 0 && !streaming && (
        <div class="demo-prompts">
          <small>try:</small>
          {demoPrompts.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPrompt(p)
                start(p)
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div class={streaming ? 'output streaming' : 'output'}>{output}</div>

      <div class="status">
        backend:
        {' '}
        <code>{rpc.connectionMeta.backend}</code>
        {error && (
          <span class="err">
            {' '}
            · error:
            {error}
          </span>
        )}
      </div>
    </main>
  )
}
