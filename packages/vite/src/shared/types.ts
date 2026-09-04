/** A node in the HMR propagation graph. */
export interface HmrGraphNode {
  /** Module ID (relative to project root). */
  id: string
  /** Role of the node in the propagation. */
  type: 'source' | 'intermediate' | 'boundary'
  /** Vite module type. */
  moduleType?: 'js' | 'css' | 'asset'
  /** Whether this module accepts its own updates. */
  selfAccepting?: boolean
  /** Module IDs this boundary accepts as HMR deps. */
  acceptedDeps?: string[]
  /** Exports accepted for partial HMR (null = full accept). */
  acceptedExports?: string[] | null
  /** Number of modules that import this one. */
  importersCount?: number
}

/** A directed edge in the HMR propagation graph. */
export interface HmrGraphEdge {
  /** Importing module (relative to project root). */
  from: string
  /** Imported module (relative to project root). */
  to: string
}

export interface HmrUpdate {
  /** Auto-incremented identifier, unique within the current session. */
  id: string
  /** Unix timestamp (ms) when the update was received. */
  timestamp: number
  /** Whether the change was a hot module replacement or a full page reload. */
  type: 'update' | 'full-reload'
  /** How the file changed on disk. */
  changeType?: 'create' | 'update' | 'delete'
  /** File paths (relative to project root) that triggered the update. */
  files: string[]
  /** Module IDs (relative to project root) invalidated by the change. */
  modules: string[]
  /** Module IDs that accepted the update (HMR boundaries). */
  boundaries: string[]
  /** Propagation graph from changed file to HMR boundaries. */
  graph: { nodes: HmrGraphNode[], edges: HmrGraphEdge[] }
}
