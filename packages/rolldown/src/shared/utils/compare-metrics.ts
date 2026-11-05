import type { SessionCompareMetricValue } from '../types'

export function createModuleMetric(previous: number | null, current: number | null): SessionCompareMetricValue<number | null> {
  const delta = previous == null || current == null ? null : current - previous
  return {
    previous,
    current,
    delta,
    deltaRatio: delta == null || previous === 0 ? (delta === 0 ? 0 : null) : delta / previous!,
  }
}

export function sumMetrics(values: (number | null)[]): number | null {
  return values.reduce<number | null>((total, value) => total == null || value == null ? null : total + value, 0)
}

export function formatMetricRatio(item: SessionCompareMetricValue<number | null>) {
  if (item.delta == null)
    return 'Unavailable'
  if (item.deltaRatio == null)
    return '—'
  if (item.deltaRatio === 0)
    return '0%'
  return `${item.deltaRatio > 0 ? '+' : ''}${(item.deltaRatio * 100).toFixed(2)}%`
}
