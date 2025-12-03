import type { ComputedRefWithControl } from '@vueuse/core'
import type { HierarchyLink, HierarchyNode } from 'd3-hierarchy'
import type { ComputedRef, InjectionKey, MaybeRef, Ref, ShallowReactive, ShallowRef } from 'vue'
import type { ModuleListItem } from '~~/shared/types'
import { computedWithControl, onKeyPressed, useEventListener, useMagicKeys } from '@vueuse/core'
import { hierarchy, tree } from 'd3-hierarchy'
import { linkHorizontal, linkVertical } from 'd3-shape'
import Fuse from 'fuse.js'
import { computed, inject, nextTick, provide, ref, shallowReactive, shallowRef, unref } from 'vue'
import { useZoomElement } from './zoomElement'

export interface ModuleGraphNode<M, I> {
  module: M
  import?: I
  expanded?: boolean
  hasChildren?: boolean
}

export interface ModuleGraphSpacing {
  width: MaybeRef<number>
  height: MaybeRef<number>
  linkOffset: MaybeRef<number>
  margin: MaybeRef<number>
  gap: MaybeRef<number>
}

export type ModuleGraphLink<M, I> = HierarchyLink<ModuleGraphNode<M, I>> & {
  id: string
  import?: I
}

interface ModuleGraphGenerateBaseOptions {
  spacing: ModuleGraphSpacing
  isFirstCalculateGraph: Ref<boolean>
  container: Ref<HTMLDivElement>
  nodesRefMap: ShallowReactive<Map<string, HTMLDivElement>>
  width: Ref<number>
  height: Ref<number>
  scale: Ref<number, number>
  childToParentMap: ShallowReactive<Map<string, string>>
  collapsedNodes: ShallowReactive<Set<string>>
}

interface ModuleGraphOptions<M, I> {
  spacing: ModuleGraphSpacing
  modules: Ref<M[]> | ComputedRef<M[]>
  generateGraph: (options: ModuleGraphGenerateBaseOptions & {
    nodes: ShallowRef<HierarchyNode<ModuleGraphNode<M, I>>[], HierarchyNode<ModuleGraphNode<M, I>>[]>
    links: ShallowRef<ModuleGraphLink<M, I>[], ModuleGraphLink<M, I>[]>
    hierarchy: typeof hierarchy
    tree: typeof tree
    modulesMap: ComputedRef<Map<string, M>>
    nodesMap: ShallowReactive<Map<string, HierarchyNode<ModuleGraphNode<M, I>>>>
    linksMap: ShallowReactive<Map<string, ModuleGraphLink<M, I>>>

    focusOn: (id: string, animated?: boolean) => void
  }) => (focusOnFirstRootNode?: boolean) => void
}

const ViteDevToolsModuleGraphStateSymbol: InjectionKey<ModuleGraphGenerateBaseOptions & {
  nodes: ShallowRef<HierarchyNode<ModuleGraphNode<any, any>>[], HierarchyNode<ModuleGraphNode<any, any>>[]>
  links: ShallowRef<ModuleGraphLink<any, any>[], ModuleGraphLink<any, any>[]>
  calculateGraph: (focusOnFirstRootNode?: boolean) => void
  ZOOM_MIN: number
  ZOOM_MAX: number
  zoomIn: (factor?: number) => void
  zoomOut: (factor?: number) => void
}> = Symbol.for('ViteDevToolsModuleGraphState')

export const createLinkHorizontal = linkHorizontal()
  .x(d => d[0])
  .y(d => d[1])

export const createLinkVertical = linkVertical()
  .x(d => d[0])
  .y(d => d[1])

export function generateModuleGraphLink<M, I>(link: ModuleGraphLink<M, I>, spacing?: ModuleGraphSpacing) {
  if (!spacing) {
    if (link.target.x! <= link.source.x!) {
      return createLinkVertical({
        source: [link.source.x!, link.source.y!],
        target: [link.target.x!, link.target.y!],
      })
    }
    return createLinkHorizontal({
      source: [link.source.x!, link.source.y!],
      target: [link.target.x!, link.target.y!],
    })
  }
  else {
    if (link.target.x! <= link.source.x!) {
      return createLinkVertical({
        source: [link.source.x! + unref(spacing.width) / 2 - unref(spacing.linkOffset), link.source.y!],
        target: [link.target.x! - unref(spacing.width) / 2 + unref(spacing.linkOffset), link.target.y!],
      })
    }
    return createLinkHorizontal({
      source: [link.source.x! + unref(spacing.width) / 2 - unref(spacing.linkOffset), link.source.y!],
      target: [link.target.x! - unref(spacing.width) / 2 + unref(spacing.linkOffset), link.target.y!],
    })
  }
}
// @unocss-include
export function getModuleGraphLinkColor<M, I>(_link: ModuleGraphLink<M, I>) {
  return 'stroke-#8885'
}

export function createModuleGraph<M extends { id: string }, I>(options: ModuleGraphOptions<M, I>) {
  const ZOOM_MIN = 0.4
  const ZOOM_MAX = 2
  const container = ref<HTMLDivElement>() as Ref<HTMLDivElement>
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  const nodesRefMap = shallowReactive(new Map<string, HTMLDivElement>())
  const collapsedNodes = shallowReactive(new Set<string>())
  const isFirstCalculateGraph = ref(true)
  const childToParentMap = shallowReactive(new Map<string, string>())

  const nodes = shallowRef<HierarchyNode<ModuleGraphNode<M, I>>[]>([])
  const links = shallowRef<ModuleGraphLink<M, I>[]>([])
  const nodesMap = shallowReactive(new Map<string, HierarchyNode<ModuleGraphNode<M, I>>>())
  const linksMap = shallowReactive(new Map<string, ModuleGraphLink<M, I>>())

  const modulesMap = computed(() => {
    const map = new Map<string, M>()
    for (const module of options.modules.value) {
      map.set(module.id, module)
    }
    return map
  })

  const { control } = useMagicKeys()
  const { scale, zoomIn, zoomOut } = useZoomElement(container, {
    wheel: control,
    minScale: ZOOM_MIN,
    maxScale: ZOOM_MAX,
  })

  function focusOn(id: string, animated = true) {
    const el = nodesRefMap.get(id)
    el?.scrollIntoView({
      block: 'center',
      inline: 'center',
      behavior: animated ? 'smooth' : 'instant',
    })
  }

  const _calculateGraph = options.generateGraph({
    isFirstCalculateGraph,
    hierarchy,
    tree,
    nodesRefMap,
    container,
    modulesMap,
    nodes,
    links,
    scale,
    nodesMap,
    linksMap,
    width,
    height,
    childToParentMap,
    focusOn,
    collapsedNodes,
    spacing: options.spacing,
  })

  provide(ViteDevToolsModuleGraphStateSymbol, {
    spacing: options.spacing,
    calculateGraph: _calculateGraph,
    isFirstCalculateGraph,
    container,
    width,
    height,
    scale,
    nodes,
    links,
    nodesRefMap,
    collapsedNodes,
    childToParentMap,
    ZOOM_MIN,
    ZOOM_MAX,
    zoomIn,
    zoomOut,
  })
}

export function useModuleGraph() {
  const state = inject(ViteDevToolsModuleGraphStateSymbol)!
  return state
}

export function useToggleGraphNodeExpanded<M extends { id: string, imports: unknown[] }>(options: {
  modules: MaybeRef<M[]>
}) {
  const { nodesRefMap, container, calculateGraph, collapsedNodes } = inject(ViteDevToolsModuleGraphStateSymbol)!
  const isGraphNodeToggling = ref(false)

  function restoreScrollPosition(id: string, beforePosition: { x: number, y: number }) {
  // Ensure this runs after the nextTick inside calculateGraph completes (width and height are computed)
    nextTick(() => {
      nextTick(() => {
        const newNode = nodesRefMap.get(id)

        if (newNode && beforePosition && container.value) {
          const containerRect = container.value.getBoundingClientRect()
          const newRect = newNode.getBoundingClientRect()

          const viewportDiffX = newRect.left - containerRect.left - beforePosition.x
          const viewportDiffY = newRect.top - containerRect.top - beforePosition.y

          container.value.scrollLeft += viewportDiffX
          container.value.scrollTop += viewportDiffY
        }
      })
    })
  }

  function toggleNode(id: string) {
    if (isGraphNodeToggling.value)
      return
    isGraphNodeToggling.value = true

    const node = nodesRefMap.get(id)
    let prevNodeOffset: null | { x: number, y: number } = null

    // Record position relative to the scroll container to avoid drift after reflow
    if (node && container.value) {
      const containerRect = container.value.getBoundingClientRect()
      const rect = node.getBoundingClientRect()
      prevNodeOffset = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
      }
    }

    if (collapsedNodes.has(id)) {
      collapsedNodes.delete(id)
    }
    else {
      collapsedNodes.add(id)
    }

    calculateGraph()

    // Adjust scroll position after layout changes
    if (prevNodeOffset) {
      restoreScrollPosition(id, prevNodeOffset)
    }

    isGraphNodeToggling.value = false
  }

  function expandAll() {
    if (isGraphNodeToggling.value)
      return

    isGraphNodeToggling.value = true

    collapsedNodes.clear()
    calculateGraph()

    setTimeout(() => {
      isGraphNodeToggling.value = false
    }, 300)
  }

  function collapseAll() {
    if (isGraphNodeToggling.value)
      return

    isGraphNodeToggling.value = true

    unref(options.modules).forEach((module) => {
      if (module.imports.length > 0) {
        collapsedNodes.add(module.id)
      }
    })
    calculateGraph()

    setTimeout(() => {
      isGraphNodeToggling.value = false
    }, 300)
  }

  return {
    isGraphNodeToggling,
    toggleNode,
    expandAll,
    collapseAll,
  }
}

export function useGraphZoom() {
  const state = inject(ViteDevToolsModuleGraphStateSymbol)!

  const { scale, zoomIn, zoomOut, ZOOM_MIN, ZOOM_MAX } = state

  onKeyPressed(['-', '_'], (e) => {
    if (e.ctrlKey)
      zoomOut()
  })

  onKeyPressed(['=', '+'], (e) => {
    if (e.ctrlKey)
      zoomIn()
  })

  return {
    ZOOM_MIN,
    ZOOM_MAX,
    scale,
    zoomIn,
    zoomOut,
  }
}

export function useGraphDraggingScroll() {
  const { container } = inject(ViteDevToolsModuleGraphStateSymbol)!
  const isGrabbing = ref(false)
  const SCROLLBAR_THICKNESS = 20
  let x = 0
  let y = 0

  function init() {
    useEventListener(container, 'mousedown', (e) => {
      // prevent dragging when clicking on scrollbar
      const rect = container.value!.getBoundingClientRect()
      const distRight = rect.right - e.clientX
      const distBottom = rect.bottom - e.clientY

      if (distRight <= SCROLLBAR_THICKNESS || distBottom <= SCROLLBAR_THICKNESS) {
        return
      }

      isGrabbing.value = true
      x = container.value!.scrollLeft + e.pageX
      y = container.value!.scrollTop + e.pageY
    })
    useEventListener(container, 'contextmenu', e => e.preventDefault())
    useEventListener('mouseleave', () => isGrabbing.value = false)
    useEventListener('mouseup', () => isGrabbing.value = false)
    useEventListener('mousemove', (e) => {
      if (!isGrabbing.value)
        return
      e.preventDefault()
      container.value!.scrollLeft = x - e.pageX
      container.value!.scrollTop = y - e.pageY
    })
  }

  return {
    init,
    isGrabbing,
  }
}

export interface ModulePathSelector {
  state: { value: { search: string, selected: string | null } }
  modules: ComputedRef<ModuleListItem[]>
  fuse: Ref<ComputedRefWithControl<Fuse<ModuleListItem>> | undefined>
  initSelector: (modules: ComputedRef<ModuleListItem[]>) => void
  select: (module: ModuleListItem) => void
  clear: () => void
}

export function useModulePathSelector(options: {
  getModules: () => ModuleListItem[]
}): ModulePathSelector {
  const state = ref<{
    search: string
    selected: string | null
  }>({
    search: '',
    selected: null,
  })
  const fuse = ref<ComputedRefWithControl<Fuse<ModuleListItem>>>()

  const modules = computed(options.getModules)

  function initSelector(modules: ComputedRef<ModuleListItem[]>) {
    fuse.value = computedWithControl(
      modules,
      () => new Fuse(modules.value, {
        includeScore: true,
        keys: ['id'],
        ignoreLocation: true,
        threshold: 0.4,
      }),
    )
  }

  function select(node: ModuleListItem) {
    state.value.selected = node.id
    state.value.search = ''
  }

  function clear() {
    state.value.selected = null
  }

  return {
    state,
    modules,
    fuse,
    initSelector,
    select,
    clear,
  }
}
