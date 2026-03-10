import { alphaModule, summarizeAlpha } from './modules/alpha'
import { betaModule, summarizeBeta } from './modules/beta'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app)
  throw new Error('Missing #app root')

app.innerHTML = `
  <div class="card">
    <h1>Kit Plugin Basic Playground</h1>
    <p>
      Open Vite DevTools and switch to <strong>Module Explorer</strong>.
      The dock uses static RPC dumps with sharded JSON records for on-demand loading.
    </p>
    <p style="margin-top: 16px;">
      Alpha: ${summarizeAlpha()}
    </p>
    <p>
      Beta: ${summarizeBeta()}
    </p>
    <pre style="margin-top: 16px; white-space: pre-wrap;">${JSON.stringify({
      alpha: alphaModule,
      beta: betaModule,
    }, null, 2)}</pre>
  </div>
`
