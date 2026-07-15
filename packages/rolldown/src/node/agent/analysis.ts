import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { createAnalysisContext } from './context'
import { createBuildAnalysis } from './modules/build-analysis'
import { createBuildComparison } from './modules/build-comparison'
import { createBuildTimeAnalysis } from './modules/build-time-analysis'
import { createBundleSizeAnalysis } from './modules/bundle-size-analysis'
import { createDependencyTrace } from './modules/dependency-trace'

export type {
  BuildAnalysisInput,
} from './modules/build-analysis'
export type {
  BuildComparisonInput,
} from './modules/build-comparison'
export type {
  BuildTimeAnalysisInput,
} from './modules/build-time-analysis'
export type {
  BundleSizeAnalysisInput,
} from './modules/bundle-size-analysis'
export type {
  DependencyTraceInput,
} from './modules/dependency-trace'
export type {
  AnalysisInsight,
  AnalysisReport,
} from './types'

export function createRolldownAnalysis(context: ViteDevToolsNodeContext) {
  const analysisContext = createAnalysisContext(context)

  return {
    buildAnalysis: createBuildAnalysis(analysisContext),
    buildTimeAnalysis: createBuildTimeAnalysis(analysisContext),
    bundleSizeAnalysis: createBundleSizeAnalysis(analysisContext),
    dependencyTrace: createDependencyTrace(analysisContext),
    buildComparison: createBuildComparison(analysisContext),
  }
}
