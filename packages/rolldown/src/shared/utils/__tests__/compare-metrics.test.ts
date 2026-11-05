import { describe, expect, it } from 'vitest'
import { createModuleMetric, formatMetricRatio, sumMetrics } from '../compare-metrics'

describe('module comparison measurements', () => {
  it('keeps unavailable measurements distinct from measured zero', () => {
    expect(createModuleMetric(null, 42)).toEqual({ previous: null, current: 42, delta: null, deltaRatio: null })
    expect(createModuleMetric(0, 42)).toEqual({ previous: 0, current: 42, delta: 42, deltaRatio: null })
    expect(createModuleMetric(42, null).delta).toBeNull()
    expect(createModuleMetric(null, null).delta).toBeNull()
    expect(createModuleMetric(42, 0)).toMatchObject({ delta: -42, deltaRatio: -1 })
  })

  it('does not present incomplete totals or zero baselines as new modules', () => {
    expect(sumMetrics([12, null, 30])).toBeNull()
    expect(sumMetrics([12, 0, 30])).toBe(42)
    expect(sumMetrics([])).toBe(0)
    expect(formatMetricRatio(createModuleMetric(0, 42))).toBe('—')
    expect(formatMetricRatio(createModuleMetric(null, 42))).toBe('Unavailable')
    expect(formatMetricRatio(createModuleMetric(0, 0))).toBe('0%')
    expect(formatMetricRatio(createModuleMetric(20, 30))).toBe('+50.00%')
  })
})
