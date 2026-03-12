import type { DevToolsLogLevel } from '@vitejs/devtools-kit'
import type { DockClientScriptContext } from '@vitejs/devtools-kit/client'
import axe from 'axe-core'

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
  const { logs } = context

  // Show loading state
  const summary = await logs.add({
    id: SUMMARY_LOG_ID,
    message: 'Running accessibility audit...',
    level: 'info',
    category: 'a11y',
    status: 'loading',
    notify: true,
  })

  try {
    const results = await axe.run(document)

    for (const violation of results.violations) {
      const level = impactToLevel(violation.impact)
      const firstNode = violation.nodes[0]

      // Fire-and-forget — no need to await when handle isn't needed
      logs.add({
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
      })
    }

    const violationCount = results.violations.length
    const passCount = results.passes.length

    // Update the summary log via handle
    await summary.update({
      message: violationCount > 0
        ? `Found ${violationCount} violation${violationCount > 1 ? 's' : ''}, ${passCount} passed`
        : `All ${passCount} checks passed`,
      level: violationCount > 0 ? 'warn' : 'success',
      status: 'idle',
      notify: true,
      autoDismiss: 4000,
    })
  }
  catch (err) {
    // Update the summary log with error via handle
    await summary.update({
      message: 'A11y audit failed',
      level: 'error',
      description: String(err),
      status: 'idle',
      notify: true,
    })
  }
}
