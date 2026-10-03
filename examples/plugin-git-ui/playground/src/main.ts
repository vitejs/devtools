document.getElementById('app')!.innerHTML = `
  <div style="padding: 2rem; font-family: system-ui, sans-serif;">
    <h1>Git UI Plugin Playground</h1>
    <p>Open Vite DevTools and click the <strong>Git</strong> dock entry to see the Git UI panel.</p>
    <p style="opacity: 0.6; font-size: 14px;">
      The panel shows your current branch, staged/unstaged files, recent commits, and lets you create commits — all rendered from a JSON spec with zero client-side code.
    </p>
  </div>
`
