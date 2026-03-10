import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

// @unocss-include

const app = document.querySelector<HTMLDivElement>('#app')
if (!app)
  throw new Error('Missing #app root')

app.innerHTML = `
  <div class="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-100 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
    <main class="mx-auto max-w-4xl px-6 py-10">
      <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-300/20 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-black/25">
        <h1 class="m-0 text-3xl font-semibold tracking-tight">Kit Plugin File Explorer Playground</h1>
        <p class="mt-3 leading-7 text-slate-700 dark:text-slate-300">
          Open Vite DevTools and switch to <strong>File Explorer</strong>.
          The panel lists files under <code class="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-xs dark:bg-slate-700/70">playground/src</code> and loads file contents on demand.
          <strong>Save</strong> is available in websocket mode and hidden in static build mode.
        </p>
        <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 dark:border-slate-700 dark:bg-slate-800/70">
          <p class="m-0 font-medium">Try this:</p>
          <ol class="my-2 pl-5">
            <li>Select <code class="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-xs dark:bg-slate-700/70">src/main.ts</code> in the File Explorer dock.</li>
            <li>Edit a sentence and click <strong>Save</strong> in websocket mode.</li>
            <li>Run static build and confirm write controls are hidden.</li>
          </ol>
          <p class="m-0 text-slate-600 dark:text-slate-400">
            This playground keeps the source folder intentionally small so file operations are easy to inspect.
          </p>
        </div>
      </section>
    </main>
  </div>
`
