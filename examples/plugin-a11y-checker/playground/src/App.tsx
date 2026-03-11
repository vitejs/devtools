// @unocss-include

/**
 * This component has intentional accessibility issues
 * for testing the A11y Checker plugin.
 */
export default function App() {
  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-100 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
      <main class="mx-auto max-w-4xl px-6 py-10">
        <section class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-300/20 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:shadow-black/25">
          <h1 class="m-0 text-3xl font-semibold tracking-tight">A11y Checker Playground</h1>
          <p class="mt-3 leading-7 text-slate-700 dark:text-slate-300">
            Open Vite DevTools and click the
            {' '}
            <strong>A11y Checker</strong>
            {' '}
            icon
            (wheelchair) to run an accessibility audit on this page.
            The results will appear in the
            {' '}
            <strong>Logs</strong>
            {' '}
            panel.
          </p>
        </section>

        {/* Intentional a11y issues below */}

        <section class="mt-6 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900/70">
          <h2 class="text-xl font-semibold mb-4">Test Cases</h2>

          {/* Issue: image without alt */}
          <div class="mb-4">
            <h3 class="text-sm font-medium mb-2 op50">Image without alt text</h3>
            <img src="https://placehold.co/200x100" width="200" height="100" />
          </div>

          {/* Issue: button with no accessible name */}
          <div class="mb-4">
            <h3 class="text-sm font-medium mb-2 op50">Button without label</h3>
            <button class="px-3 py-1 rounded bg-blue-500 text-white" />
          </div>

          {/* Issue: low contrast text */}
          <div class="mb-4">
            <h3 class="text-sm font-medium mb-2 op50">Low contrast text</h3>
            <p style={{ 'color': '#ccc', 'background-color': '#fff' }}>
              This text has very low contrast and is hard to read.
            </p>
          </div>

          {/* Issue: form input without label */}
          <div class="mb-4">
            <h3 class="text-sm font-medium mb-2 op50">Input without label</h3>
            <input type="text" placeholder="Enter something..." class="border rounded px-2 py-1" />
          </div>

          {/* Issue: clickable div without role */}
          <div class="mb-4">
            <h3 class="text-sm font-medium mb-2 op50">Clickable div without role</h3>
            <div
              onClick={() => {}}
              class="cursor-pointer bg-purple-100 dark:bg-purple-900 rounded px-3 py-2 inline-block"
            >
              Click me (I'm a div, not a button)
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
