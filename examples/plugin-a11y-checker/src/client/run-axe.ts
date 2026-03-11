import type { DevToolsLogLevel } from '@vitejs/devtools-kit'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import axe from 'axe-core'

const SOURCE = 'a11y-checker'
const SUMMARY_LOG_ID = 'a11y-checker-summary'

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

export default async function runA11yCheck(context: DockClientScriptContext): Promise<void> {
  const { rpc } = context

  // Show loading state
  await rpc.call('devtoolskit:internal:logs:add', {
    id: SUMMARY_LOG_ID,
    message: 'Running accessibility audit...',
    level: 'info' as DevToolsLogLevel,
    category: 'a11y',
    status: 'loading',
    notify: true,
  }, SOURCE)

  try {
    const results = await axe.run(document)

    for (const violation of results.violations) {
      const level = impactToLevel(violation.impact)
      const firstNode = violation.nodes[0]

      await rpc.call('devtoolskit:internal:logs:add', {
        id: `a11y-violation-${violation.id}`,
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

    // Update the summary log (dedup by id)
    await rpc.call('devtoolskit:internal:logs:add', {
      id: SUMMARY_LOG_ID,
      message: violationCount > 0
        ? `Found ${violationCount} violation${violationCount > 1 ? 's' : ''}, ${passCount} passed`
        : `All ${passCount} checks passed`,
      level: (violationCount > 0 ? 'warn' : 'success') as DevToolsLogLevel,
      category: 'a11y',
      status: 'idle',
      notify: true,
      autoDismiss: 4000,
    }, SOURCE)
  }
  catch (err) {
    // Update the summary log with error
    await rpc.call('devtoolskit:internal:logs:add', {
      id: SUMMARY_LOG_ID,
      message: 'A11y audit failed',
      level: 'error' as DevToolsLogLevel,
      description: String(err),
      category: 'a11y',
      status: 'idle',
      notify: true,
    }, SOURCE)
  }
}
