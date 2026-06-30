import type { ViteDevToolsNodeContext } from '@vitejs/devtools-kit'
import type {
  BuildAnalysisInput,
  BuildComparisonInput,
  BuildTimeAnalysisInput,
  BundleSizeAnalysisInput,
  DependencyTraceInput,
} from './analysis'
import { createRolldownAnalysis } from './analysis'

const sessionProperty = {
  type: 'string',
  description: 'Rolldown session id to analyze. Use "latest" or omit this field to analyze the newest session.',
} as const

const limitProperty = {
  type: 'number',
  description: 'Maximum number of ranked insights, items, or paths to return. Defaults to 5 and is capped at 200.',
  minimum: 1,
  maximum: 200,
} as const

const readOnlyTags = ['rolldown', 'build-analysis'] as const

const outputSchema = {
  type: 'object',
  additionalProperties: true,
} as const

export function registerRolldownAgentTools(ctx: ViteDevToolsNodeContext) {
  if (ctx.agent.getTool('rolldown:build-analysis'))
    return

  let analysis: ReturnType<typeof createRolldownAnalysis> | undefined
  const getAnalysis = () => {
    analysis ??= createRolldownAnalysis(ctx)
    return analysis
  }

  ctx.agent.registerTool({
    id: 'rolldown:build-analysis',
    title: 'Rolldown build analysis',
    description: 'Analyze a Rolldown build session and return a high-level explanation with notable insights across build time, bundle size, chunks, assets, and dependencies. Use this as the default entry point when the user asks what happened in a build or reports an unclear build problem.',
    safety: 'read',
    tags: readOnlyTags,
    inputSchema: {
      type: 'object',
      properties: {
        session: sessionProperty,
        issue: {
          type: 'string',
          description: 'Optional issue hint that helps prioritize insights.',
          enum: ['general', 'slow-build', 'large-bundle', 'unexpected-dependency', 'chunking', 'dependency-duplication'],
        },
        limit: limitProperty,
      },
      additionalProperties: false,
    },
    outputSchema,
    examples: [
      {
        args: [{ session: 'latest', issue: 'general', limit: 5 }],
        description: 'Explain the latest build and return the top insights.',
      },
    ],
    handler: args => getAnalysis().buildAnalysis(args as BuildAnalysisInput),
  })

  ctx.agent.registerTool({
    id: 'rolldown:build-time-analysis',
    title: 'Rolldown build time analysis',
    description: 'Analyze where build time is spent in a Rolldown session. Returns hook breakdowns, top plugin costs, top module costs, and explanations for likely build-time bottlenecks.',
    safety: 'read',
    tags: [...readOnlyTags, 'performance'],
    inputSchema: {
      type: 'object',
      properties: {
        session: sessionProperty,
        limit: limitProperty,
      },
      additionalProperties: false,
    },
    outputSchema,
    examples: [
      {
        args: [{ session: 'latest', limit: 5 }],
        description: 'Find the highest-cost plugins and hooks in the latest build.',
      },
    ],
    handler: args => getAnalysis().buildTimeAnalysis(args as BuildTimeAnalysisInput),
  })

  ctx.agent.registerTool({
    id: 'rolldown:bundle-size-analysis',
    title: 'Rolldown bundle size analysis',
    description: 'Analyze emitted asset size, initial JavaScript, large chunks, large packages, and duplicated packages in a Rolldown build session. Use this when the user asks why output is large or which dependencies contribute most to bundle size.',
    safety: 'read',
    tags: [...readOnlyTags, 'bundle-size'],
    inputSchema: {
      type: 'object',
      properties: {
        session: sessionProperty,
        scope: {
          type: 'string',
          description: 'Output scope to focus on.',
          enum: ['all', 'initial', 'async', 'assets'],
        },
        limit: limitProperty,
      },
      additionalProperties: false,
    },
    outputSchema,
    examples: [
      {
        args: [{ session: 'latest', scope: 'initial', limit: 5 }],
        description: 'Analyze the largest contributors to initial output size.',
      },
    ],
    handler: args => getAnalysis().bundleSizeAnalysis(args as BundleSizeAnalysisInput),
  })

  ctx.agent.registerTool({
    id: 'rolldown:dependency-trace',
    title: 'Rolldown dependency trace',
    description: 'Trace why a dependency, module, package, or asset is present in a Rolldown build. Returns importer paths, matched modules, related chunks, and a concise explanation of the path that brought it into the output.',
    safety: 'read',
    tags: [...readOnlyTags, 'trace'],
    inputSchema: {
      type: 'object',
      required: ['target'],
      properties: {
        session: sessionProperty,
        target: {
          type: 'object',
          required: ['type', 'id'],
          additionalProperties: false,
          properties: {
            type: {
              type: 'string',
              description: 'Kind of build entity to trace.',
              enum: ['module', 'package', 'asset'],
            },
            id: {
              type: 'string',
              description: 'Module id, package name/id, or asset filename to trace.',
            },
          },
        },
        direction: {
          type: 'string',
          description: 'Trace importers, imports, or both directions. Importers answer why something is included.',
          enum: ['importers', 'imports', 'both'],
        },
        maxDepth: {
          type: 'number',
          description: 'Maximum graph depth to traverse. Defaults to 8 and is capped at 100.',
          minimum: 1,
          maximum: 100,
        },
        limit: limitProperty,
      },
      additionalProperties: false,
    },
    outputSchema,
    examples: [
      {
        args: [{ session: 'latest', target: { type: 'package', id: 'lodash' }, direction: 'importers', maxDepth: 8, limit: 5 }],
        description: 'Explain why a package is included in the latest build.',
      },
    ],
    handler: args => getAnalysis().dependencyTrace(args as DependencyTraceInput),
  })

  ctx.agent.registerTool({
    id: 'rolldown:build-comparison',
    title: 'Rolldown build comparison',
    description: 'Compare two Rolldown build sessions and explain changes in build duration, emitted output size, assets, chunks, packages, and plugin costs. Use this when the user asks why a build got slower, larger, or changed after a commit or PR.',
    safety: 'read',
    tags: [...readOnlyTags, 'comparison'],
    inputSchema: {
      type: 'object',
      required: ['baseSession', 'currentSession'],
      properties: {
        baseSession: {
          type: 'string',
          description: 'Older or baseline Rolldown session id.',
        },
        currentSession: {
          type: 'string',
          description: 'Newer or candidate Rolldown session id.',
        },
        limit: limitProperty,
      },
      additionalProperties: false,
    },
    outputSchema,
    examples: [
      {
        args: [{ baseSession: 'previous-session-id', currentSession: 'current-session-id', limit: 5 }],
        description: 'Compare two builds and return the most relevant changes.',
      },
    ],
    handler: args => getAnalysis().buildComparison(args as BuildComparisonInput),
  })
}
