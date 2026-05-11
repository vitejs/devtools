import type { DevToolsRpcClient } from 'devframe/client'
import type { StreamReader } from 'devframe/utils/streaming-channel'
import type { ChatHistory, ChatMessage } from '../devframe'
import { connectDevframe } from 'devframe/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'

const CHANNEL_NAME = 'devframe-streaming-chat:tokens'
const HISTORY_KEY = 'devframe-streaming-chat:history'

export function App() {
  const [rpc, setRpc] = useState<DevToolsRpcClient | null>(null)
  const [demoPrompts, setDemoPrompts] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [liveTokens, setLiveTokens] = useState<Record<string, string>>({})
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)

  const readersRef = useRef<Map<string, StreamReader<string>>>(new Map())
  const messagesRef = useRef<HTMLDivElement | null>(null)

  // Connect once and surface demo prompts.
  useEffect(() => {
    let cancelled = false
    connectDevframe().then(async (r) => {
      if (cancelled)
        return
      setRpc(r)
      try {
        const result = await r.call(
          'devframe-streaming-chat:demo-prompts' as any,
        ) as { prompts: string[] }
        if (!cancelled)
          setDemoPrompts(result.prompts)
      }
      catch {
        // demo prompts are optional
      }
    })
    return () => {
      cancelled = true
      for (const reader of readersRef.current.values())
        reader.cancel()
      readersRef.current.clear()
    }
  }, [])

  // Bind to the server-side chat history shared state.
  useEffect(() => {
    if (!rpc)
      return
    let off: (() => void) | undefined
    let active = true
    rpc.sharedState
      .get(HISTORY_KEY, { initialValue: { messages: [] } })
      .then((state) => {
        if (!active)
          return
        setMessages(state.value().messages as ChatMessage[])
        off = state.on('updated', (full: ChatHistory) => {
          setMessages([...full.messages])
        })
      })
    return () => {
      active = false
      off?.()
    }
  }, [rpc])

  // For each assistant message that's currently streaming, subscribe to the
  // tokens channel and accumulate into `liveTokens`. When the server commits
  // the final content (`streamId` cleared), we drop the live overlay.
  useEffect(() => {
    if (!rpc)
      return
    for (const msg of messages) {
      if (msg.role !== 'assistant' || !msg.streamId)
        continue
      if (readersRef.current.has(msg.id))
        continue

      const reader = rpc.streaming.subscribe<string>(CHANNEL_NAME, msg.streamId)
      readersRef.current.set(msg.id, reader)
      setLiveTokens(prev => ({ ...prev, [msg.id]: '' }))

      ;(async () => {
        try {
          for await (const token of reader) {
            setLiveTokens(prev => ({
              ...prev,
              [msg.id]: (prev[msg.id] ?? '') + token,
            }))
          }
        }
        catch {
          // Stream ended with error — leave whatever we accumulated.
        }
      })()
    }

    // Drop overlays for messages whose stream is now committed.
    setLiveTokens((prev) => {
      const next = { ...prev }
      let changed = false
      for (const id of Object.keys(next)) {
        const m = messages.find(x => x.id === id)
        if (!m || !m.streamId) {
          delete next[id]
          readersRef.current.delete(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [rpc, messages])

  // Auto-scroll on new messages / live tokens.
  useEffect(() => {
    const el = messagesRef.current
    if (!el)
      return
    el.scrollTop = el.scrollHeight
  }, [messages, liveTokens])

  const activeAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'assistant' && m.streamId)
        return m.id
    }
    return undefined
  }, [messages])

  const isStreaming = !!activeAssistantId

  const send = useCallback(async (text: string) => {
    if (!rpc || isStreaming || !text.trim())
      return
    setError(null)
    setPrompt('')
    try {
      await rpc.call('devframe-streaming-chat:send' as any, {
        prompt: text.trim(),
      })
    }
    catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [rpc, isStreaming])

  const cancel = useCallback(() => {
    if (!activeAssistantId)
      return
    const reader = readersRef.current.get(activeAssistantId)
    reader?.cancel()
  }, [activeAssistantId])

  const clear = useCallback(async () => {
    if (!rpc || isStreaming)
      return
    try {
      await rpc.call('devframe-streaming-chat:clear' as any)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [rpc, isStreaming])

  if (!rpc)
    return <main><p>Connecting to devframe…</p></main>

  return (
    <main>
      <header>
        <div>
          <h1>Streaming Chat</h1>
          <small>history persists in shared state · tokens stream over a channel</small>
        </div>
        <div class="toolbar">
          <button
            type="button"
            onClick={clear}
            disabled={isStreaming || messages.length === 0}
          >
            Clear
          </button>
        </div>
      </header>

      <div class="messages" ref={messagesRef}>
        {messages.length === 0
          ? (
              <div class="empty">
                <p>No messages yet.</p>
                <p>
                  Type a prompt and hit
                  {' '}
                  <kbd>Enter</kbd>
                  {' '}
                  — or pick a demo prompt below.
                </p>
              </div>
            )
          : messages.map(msg => <Message key={msg.id} msg={msg} live={liveTokens[msg.id]} />)}
      </div>

      {!isStreaming && demoPrompts.length > 0 && (
        <div class="demo-prompts">
          {demoPrompts.map(p => (
            <button key={p} type="button" onClick={() => send(p)}>{p}</button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(prompt)
        }}
      >
        <input
          type="text"
          value={prompt}
          onInput={e => setPrompt((e.target as HTMLInputElement).value)}
          placeholder={isStreaming ? 'Streaming reply… cancel to send another' : 'Ask anything…'}
          disabled={isStreaming}
        />
        {isStreaming
          ? <button type="button" class="cancel" onClick={cancel}>Cancel</button>
          : <button type="submit" class="send" disabled={!prompt.trim()}>Send</button>}
      </form>

      <div class="status">
        backend:
        {' '}
        <code>{rpc.connectionMeta.backend}</code>
        {' · '}
        {messages.length}
        {' '}
        message
        {messages.length === 1 ? '' : 's'}
        {error && (
          <span class="err">
            {' · error: '}
            {error}
          </span>
        )}
      </div>
    </main>
  )
}

function Message({ msg, live }: { msg: ChatMessage, live: string | undefined }) {
  // Prefer the live token overlay while streaming; fall back to the
  // committed content from shared state once the producer closes.
  const displayed = msg.streamId !== undefined && live !== undefined
    ? live
    : msg.content
  const cls = [
    'msg',
    `msg-${msg.role}`,
    msg.streamId ? 'streaming' : '',
    msg.cancelled ? 'cancelled' : '',
  ].filter(Boolean).join(' ')

  return (
    <div class={cls}>
      {displayed || (msg.streamId ? '' : '(empty)')}
      {msg.cancelled && <div class="msg-meta">cancelled</div>}
    </div>
  )
}
