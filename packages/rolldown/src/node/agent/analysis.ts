import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import { createAnalysisContext } from './context'
import { createBuildAnalysis } from './modules/build-analysis'
import { createBuildComparison } from './modules/build-comparison'
import { createBuildTimeAnalysis } from './modules/build-time-analysis'
import { createBundleSizeAnalysis } from './modules/bundle-size-analysis'
import { createDependencyTrace } from './modules/dependency-trace'

export type {
  AnalysisInsight,
  AnalysisReport,
  BuildAnalysisInput,
  BuildComparisonInput,
  BuildTimeAnalysisInput,
  BundleSizeAnalysisInput,
  DependencyTraceInput,
} from './context'

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
