import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

const GET_INFO_RPC = 'kit-plugin-file-explorer:getInfo'
const LIST_FILES_RPC = 'kit-plugin-file-explorer:listFiles'
const READ_FILE_RPC = 'kit-plugin-file-explorer:readFile'
const WRITE_FILE_RPC = 'kit-plugin-file-explorer:writeFile'
const rpcPromise = getDevToolsRpcClient()

interface FileExplorerInfo {
  rootDir: string
}

interface FileEntry {
  path: string
  size: number
  ext: string
}

interface FileDetail {
  path: string
  content: string
  size: number
}

function formatBytes(size: number): string {
  if (size < 1024)
    return `${size} B`
  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function Stat(props: { label: string, value: string | number }) {
  return (
    <div className="min-w-[9rem] max-w-64 rounded-lg border border-slate-200 bg-white/75 px-3 py-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <div className="truncate text-xs text-slate-500 uppercase tracking-wider dark:text-slate-400">{props.label}</div>
      <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{props.value}</div>
    </div>
  )
}

function App() {
  const [rpc, setRpc] = React.useState<Awaited<ReturnType<typeof getDevToolsRpcClient>> | null>(null)
  const [isStaticMode, setIsStaticMode] = React.useState(false)
  const [info, setInfo] = React.useState<FileExplorerInfo | null>(null)
  const [files, setFiles] = React.useState<FileEntry[]>([])
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<FileDetail | null>(null)
  const [draft, setDraft] = React.useState('')
  const [isLoadingFile, setIsLoadingFile] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const client = await rpcPromise
        if (!active)
          return
        setRpc(client)
        setIsStaticMode(client.connectionMeta.backend === 'static')

        const [infoValue, filesValue] = await Promise.all([
          client.call(GET_INFO_RPC) as Promise<FileExplorerInfo>,
          client.call(LIST_FILES_RPC) as Promise<FileEntry[]>,
        ])

        if (!active)
          return

        const sortedFiles = filesValue
          .slice()
          .sort((a, b) => a.path.localeCompare(b.path))

        setInfo(infoValue)
        setFiles(sortedFiles)
        setSelectedPath(sortedFiles[0]?.path ?? null)
      }
      catch (err) {
        if (!active)
          return
        setError((err as Error).message)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (!rpc || !selectedPath) {
      setDetail(null)
      setDraft('')
      return
    }

    let active = true
    setIsLoadingFile(true)
    setError(null)
    setStatus(null)

    rpc.call(READ_FILE_RPC, selectedPath)
      .then((value) => {
        if (!active)
          return
        const file = value as FileDetail | null
        setDetail(file)
        setDraft(file?.content ?? '')
      })
      .catch((err) => {
        if (!active)
          return
        setError((err as Error).message)
      })
      .finally(() => {
        if (active)
          setIsLoadingFile(false)
      })

    return () => {
      active = false
    }
  }, [rpc, selectedPath])

  async function saveCurrentFile() {
    if (!rpc || !selectedPath || isStaticMode)
      return

    setIsSaving(true)
    setStatus(null)
    setError(null)

    try {
      await rpc.call(WRITE_FILE_RPC, selectedPath, draft)

      const size = new TextEncoder().encode(draft).length
      setDetail((prev) => {
        if (!prev || prev.path !== selectedPath)
          return prev
        return {
          ...prev,
          content: draft,
          size,
        }
      })
      setFiles(prev => prev.map(file => file.path === selectedPath ? { ...file, size } : file))
      setStatus(`Saved ${selectedPath}`)
    }
    catch (err) {
      setError((err as Error).message)
    }
    finally {
      setIsSaving(false)
    }
  }

  const isDirty = detail != null && draft !== detail.content

  if (!info) {
    return (
      <div className="grid h-screen place-items-center bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 px-4 text-center text-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-200">
        <div className="rounded-lg border border-slate-200 bg-white/75 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
          {error || 'Loading file explorer...'}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
      <div className="grid h-full grid-rows-[auto_1fr]">
        <header className="border-b border-slate-200 px-4 py-3 backdrop-blur-sm dark:border-slate-700">
          <h1 className="m-0 text-lg font-semibold sm:text-xl">File Explorer</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Stat label="Files" value={files.length} />
            <Stat label="Root" value={info.rootDir} />
            <Stat label="Backend" value={isStaticMode ? 'static' : 'websocket'} />
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[minmax(220px,280px)_1fr]">
          <aside className="overflow-auto border-r border-slate-200 bg-white/45 dark:border-slate-700 dark:bg-slate-900/45">
            {files.length === 0 && (
              <div className="p-3 text-sm text-slate-500 dark:text-slate-400">
                No files indexed under
                {' '}
                <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-xs dark:bg-slate-700/70">{info.rootDir}</code>
                .
              </div>
            )}
            {files.map(file => (
              <button
                key={file.path}
                type="button"
                className={[
                  'w-full border-0 border-b border-slate-200 px-3 py-2 text-left transition-colors dark:border-slate-700',
                  selectedPath === file.path
                    ? 'bg-sky-100/90 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100'
                    : 'bg-transparent text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/80',
                ].join(' ')}
                onClick={() => setSelectedPath(file.path)}
              >
                <span className="block truncate text-sm">{file.path}</span>
                <span className="text-xs opacity-80">
                  {file.ext || '(no ext)'}
                  {' • '}
                  {formatBytes(file.size)}
                </span>
              </button>
            ))}
          </aside>

          <main className="overflow-auto p-4">
            {!selectedPath && (
              <div className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2 text-sm shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/65">
                Select a file to load content on demand.
              </div>
            )}

            {selectedPath && isLoadingFile && (
              <div className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2 text-sm shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/65">
                Loading file record for
                {' '}
                <code className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-xs dark:bg-slate-700/70">{selectedPath}</code>
                ...
              </div>
            )}

            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            {status && (
              <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                {status}
              </div>
            )}

            {selectedPath && !isLoadingFile && !detail && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                File not found in static dump index.
              </div>
            )}

            {selectedPath && !isLoadingFile && detail && (
              <div className="grid min-h-[20rem] gap-2 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
                <div className="break-all text-sm font-semibold text-slate-800 dark:text-slate-100">{detail.path}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Size:
                  {' '}
                  {formatBytes(detail.size)}
                </div>
                {!isStaticMode && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-sky-700 bg-sky-700 px-3 py-1.5 text-sm font-medium text-white transition-colors enabled:hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-500 dark:bg-sky-500 dark:enabled:hover:bg-sky-400"
                      disabled={!isDirty || isSaving}
                      onClick={() => {
                        void saveCurrentFile()
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:enabled:hover:bg-slate-700"
                      disabled={!isDirty || isSaving}
                      onClick={() => setDraft(detail.content)}
                    >
                      Discard
                    </button>
                  </div>
                )}
                <textarea
                  className={[
                    'min-h-[20rem] h-full w-full resize-none rounded-lg border border-slate-300 p-3 font-mono text-xs leading-relaxed text-slate-900 outline-none transition-colors',
                    'focus:border-sky-500 dark:border-slate-600 dark:text-slate-100 dark:focus:border-sky-400',
                    isStaticMode ? 'bg-slate-100 dark:bg-slate-900/60' : 'bg-white dark:bg-slate-950',
                  ].join(' ')}
                  value={draft}
                  readOnly={isStaticMode}
                  onChange={event => setDraft(event.target.value)}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app)
  throw new Error('Missing #app root')

createRoot(app).render(<App />)
