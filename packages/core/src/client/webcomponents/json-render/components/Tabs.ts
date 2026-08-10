import { useBoundProp } from '@json-render/vue'
import { defineComponent, h, ref, watchEffect } from 'vue'
import { getIconifySvg } from '../../utils/iconify'
import { useUncontrolledValue } from '../composables/useUncontrolledValue'
import { colors, primary, surfaceSubtle } from './tokens'
import { registryProps } from './types'

export interface TabDescriptor {
  value: string
  label: string
  icon?: string
  badge?: string
  badgeVariant?: 'default' | 'info' | 'success' | 'warning' | 'danger'
}

export interface TabsProps {
  /** `children[i]` renders when `tabs[i]` is active — the two arrays are positional. */
  tabs: TabDescriptor[]
  /** Two-way bindable via `{ $bindState: '...' }`; otherwise the tab switches local, uncontrolled state. */
  value?: string
  /** Seeds the uncontrolled case only — ignored once `value` is bound. */
  defaultValue?: string
  orientation?: 'horizontal' | 'vertical'
}

export const Tabs = defineComponent({
  name: 'JrTabs',
  props: registryProps<'Tabs', TabsProps>(),
  setup(ctx, { slots }) {
    /** Local, session-persisted fallback for when `value` has no `$bindState` binding — `useBoundProp`'s setter is a no-op without one. */
    const uncontrolledValue = useUncontrolledValue(ctx, 'value', ctx.element.props.defaultValue ?? ctx.element.props.tabs?.[0]?.value)

    /** Icon SVGs keyed by name, resolved like `Icon.ts` — one tab's icon changing shouldn't refetch the others. */
    const iconSvgs = ref<Record<string, string>>({})
    watchEffect(async () => {
      const names = (ctx.element.props.tabs ?? [])
        .map(tab => tab.icon)
        .filter((name): name is string => !!name && !(name in iconSvgs.value))
      for (const name of names) {
        const match = name.match(/^(?:i-)?([\w-]+):([\w-]+)$/)
        if (match?.[1] && match[2]) {
          const svg = await getIconifySvg(match[1], match[2])
          if (svg)
            iconSvgs.value = { ...iconSvgs.value, [name]: svg }
        }
      }
    })

    return () => {
      const tabs: TabDescriptor[] = ctx.element.props.tabs ?? []
      const orientation: 'horizontal' | 'vertical' = ctx.element.props.orientation === 'vertical' ? 'vertical' : 'horizontal'
      const isVertical = orientation === 'vertical'

      const [boundValue, setBoundValue] = useBoundProp<string>(ctx.element.props.value, ctx.bindings?.value)
      const controlled = ctx.bindings?.value != null
      const activeValue = controlled ? boundValue : uncontrolledValue.value
      const change = ctx.on('change')
      const setActive = (next: string) => {
        if (controlled)
          setBoundValue(next)
        else uncontrolledValue.value = next
        change.emit()
      }

      /** Roving tabindex per WAI-ARIA — arrow keys move focus and selection together. */
      const move = (fromIndex: number, delta: number, container: HTMLElement) => {
        if (tabs.length === 0)
          return
        const nextIndex = (fromIndex + delta + tabs.length) % tabs.length
        const nextTab = tabs[nextIndex]!
        setActive(nextTab.value)
        requestAnimationFrame(() => {
          (container.querySelectorAll('[role="tab"]')[nextIndex] as HTMLElement | undefined)?.focus()
        })
      }

      const tabButtons = tabs.map((tab, index) => {
        const active = tab.value === activeValue
        return h('button', {
          'type': 'button',
          'role': 'tab',
          'aria-selected': active ? 'true' : 'false',
          'tabindex': active ? '0' : '-1',
          'class': 'jr-tab',
          'style': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: active ? '600' : '400',
            color: active ? primary : 'inherit',
            background: 'none',
            border: 'none',
            borderBottom: !isVertical ? `2px solid ${active ? primary : 'transparent'}` : undefined,
            borderLeft: isVertical ? `2px solid ${active ? primary : 'transparent'}` : undefined,
            // Rounds the corners away from the active-tab indicator: top for the horizontal underline, right for the vertical rail.
            borderRadius: isVertical ? '0 4px 4px 0' : '4px 4px 0 0',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s ease',
          },
          'onClick': () => setActive(tab.value),
          'onMouseenter': (e: MouseEvent) => {
            if (!active)
              (e.currentTarget as HTMLElement).style.backgroundColor = surfaceSubtle
          },
          'onMouseleave': (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.backgroundColor = '' },
          'onKeydown': (e: KeyboardEvent) => {
            const container = (e.currentTarget as HTMLElement).parentElement
            if (!container)
              return
            const forward = isVertical ? 'ArrowDown' : 'ArrowRight'
            const backward = isVertical ? 'ArrowUp' : 'ArrowLeft'
            if (e.key === forward) {
              e.preventDefault()
              move(index, 1, container)
            }
            else if (e.key === backward) {
              e.preventDefault()
              move(index, -1, container)
            }
            else if (e.key === 'Home') {
              e.preventDefault()
              move(index, -index, container)
            }
            else if (e.key === 'End') {
              e.preventDefault()
              move(index, tabs.length - 1 - index, container)
            }
          },
        }, [
          tab.icon && h('span', {
            style: { display: 'inline-flex', width: '14px', height: '14px', lineHeight: '1' },
            innerHTML: iconSvgs.value[tab.icon] || '',
          }),
          h('span', tab.label),
          tab.badge && h('span', {
            class: `jr-badge jr-badge-${tab.badgeVariant ?? 'default'}`,
            style: {
              display: 'inline-block',
              padding: '1px 6px',
              borderRadius: '9px',
              fontSize: '10px',
              fontWeight: '500',
              backgroundColor: (colors[tab.badgeVariant ?? 'default'] ?? colors.default).bg,
              color: (colors[tab.badgeVariant ?? 'default'] ?? colors.default).fg,
            },
          }, tab.badge),
        ])
      })

      const panels = slots.default?.() ?? []
      const activeIndex = tabs.findIndex(tab => tab.value === activeValue)
      const activePanel = activeIndex >= 0 ? panels[activeIndex] : undefined

      return h('div', {
        style: { display: 'flex', flexDirection: isVertical ? 'row' : 'column', gap: '8px' },
      }, [
        h('div', {
          'role': 'tablist',
          'aria-orientation': orientation,
          'style': {
            display: 'flex',
            flexDirection: isVertical ? 'column' : 'row',
            gap: '2px',
            borderBottom: !isVertical ? '1px solid var(--jr-border, rgba(128,128,128,0.2))' : undefined,
            borderRight: isVertical ? '1px solid var(--jr-border, rgba(128,128,128,0.2))' : undefined,
            flexShrink: '0',
          },
        }, tabButtons),
        h('div', { role: 'tabpanel', style: { flex: '1', minWidth: '0' } }, activePanel ? [activePanel] : []),
      ])
    }
  },
})
