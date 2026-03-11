import type { DevToolsLogLevel } from '@vitejs/devtools-kit'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'
import axe from 'axe-core'

const SOURCE = 'a11y-checker'

function impactToLevel(impact: string | undefined | null): DevToolsLogLevel {
  switch (impact) {
    case 'critical':
    case 'serious':
      return 'error'
    case 'moderate':
      return 'warn'
    case 'minor':
    default:
      return 'info'
  }
}

async function runA11yCheck(): Promise<void> {
  const rpc = await getDevToolsRpcClient()

  try {
    const results = await axe.run(document)

    for (const violation of results.violations) {
      const level = impactToLevel(violation.impact)
      const firstNode = violation.nodes[0]

      await rpc.call('devtoolskit:internal:logs:add', {
        message: violation.description,
        level,
        description: `${violation.help}\n\n${violation.helpUrl}`,
        category: 'a11y',
        labels: violation.tags.filter(t => t.startsWith('wcag') || t.startsWith('best-practice')),
        elementPosition: firstNode
          ? {
              selector: firstNode.target.join(' '),
              description: firstNode.html,
            }
          : undefined,
      }, SOURCE)
    }

    const violationCount = results.violations.length
    const passCount = results.passes.length

    await rpc.call('devtoolskit:internal:logs:add', {
      message: violationCount > 0
        ? `Found ${violationCount} violation${violationCount > 1 ? 's' : ''}, ${passCount} passed`
        : `All ${passCount} checks passed`,
      level: (violationCount > 0 ? 'warn' : 'success') as DevToolsLogLevel,
      category: 'a11y',
      notify: true,
      autoDismiss: 4000,
    }, SOURCE)
  }
  catch (err) {
    await rpc.call('devtoolskit:internal:logs:add', {
      message: 'A11y audit failed',
      level: 'error' as DevToolsLogLevel,
      description: String(err),
      category: 'a11y',
      notify: true,
    }, SOURCE)
  }
}

// Auto-execute after page load
if (document.readyState === 'complete') {
  runA11yCheck()
}
else {
  window.addEventListener('load', () => runA11yCheck())
}
