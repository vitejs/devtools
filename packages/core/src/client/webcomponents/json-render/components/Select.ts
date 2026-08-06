import type { VNode } from 'vue'
import { useBoundProp } from '@json-render/vue'
import { defineComponent, h, ref, useId, useTemplateRef, watch } from 'vue'
import DockIcon from '../../components/dock/DockIcon.vue'
import FloatingPopover from '../../components/floating/FloatingPopover'
import { bg, borderInput, borderSolid, primary, surfaceBadge } from './tokens'
import { registryProps } from './types'

// @unocss-include

export interface SelectOption {
  value: string
  label?: string
  /** Iconify name, rendered before the label. */
  icon?: string
  /** Secondary line under the label, also the option's `title`. */
  description?: string
}

export interface SelectProps {
  /** Two-way bindable via `{ $bindState: '...' }`. */
  value?: string
  options?: (string | SelectOption)[]
  /** Shown on the trigger while `value` is unset. */
  placeholder?: string
  label?: string
  disabled?: boolean
  /** Adds a substring filter box at the top of the panel. */
  searchable?: boolean
  /**
   * Renders a real `<select>` instead of the custom listbox. The browser draws its option
   * list outside the page's layout, so it cannot be clipped or mispositioned by any
   * ancestor — at the cost of `icon`, `description` and `searchable`, which have no
   * native equivalent.
   */
  native?: boolean
}

function normalizeOption(option: string | SelectOption): SelectOption {
  return typeof option === 'string' ? { value: option } : option
}

export const Select = defineComponent({
  name: 'JrSelect',
  props: registryProps<'Select', SelectProps>(),
  setup(ctx) {
    const trigger = useTemplateRef<HTMLButtonElement>('trigger')
    const open = ref(false)
    const query = ref('')
    const activeIndex = ref(0)
    const listboxId = useId()

    const close = (options: { refocus?: boolean } = {}) => {
      open.value = false
      if (options.refocus)
        trigger.value?.focus()
    }

    // Resets the filter and highlights the current selection each time the
    // panel opens — reading `element.props` directly here (rather than
    // `useBoundProp`) since this runs outside the render pass and the latter
    // injects from the JSONUIProvider context, which is only available then.
    watch(open, (isOpen) => {
      if (!isOpen)
        return
      query.value = ''
      const options = (ctx.element.props.options ?? []).map(normalizeOption)
      const index = options.findIndex(option => option.value === ctx.element.props.value)
      activeIndex.value = index >= 0 ? index : 0
    })

    return () => {
      const { placeholder, label, disabled, searchable, native } = ctx.element.props
      const options = (ctx.element.props.options ?? []).map(normalizeOption)
      const [value, setValue] = useBoundProp<string>(ctx.element.props.value, ctx.bindings?.value)
      const change = ctx.on('change')

      const filtered = searchable && query.value
        ? options.filter(option => (option.label ?? option.value).toLowerCase().includes(query.value.toLowerCase()))
        : options

      const selected = options.find(option => option.value === value)
      const activeOption = filtered[activeIndex.value]

      const commit = (option: SelectOption) => {
        setValue(option.value)
        change.emit()
        close({ refocus: true })
      }

      const withLabel = (control: VNode) => {
        if (!label)
          return control
        return h('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '4px', flex: '1' } }, [
          h('label', { style: { fontSize: '12px', fontWeight: '500' } }, label),
          control,
        ])
      }

      if (native) {
        return withLabel(h('select', {
          'value': value ?? '',
          'disabled': disabled,
          'aria-label': label,
          'style': {
            flex: '1',
            width: '100%',
            padding: '6px 10px',
            border: borderSolid(borderInput),
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: bg,
            color: 'inherit',
            opacity: disabled ? '0.5' : '1',
            cursor: disabled ? 'not-allowed' : 'pointer',
          },
          'onChange': (e: Event) => {
            const next = (e.target as HTMLSelectElement).value
            const option = options.find(candidate => candidate.value === next)
            if (option)
              commit(option)
          },
        }, [
          // Only while unset, so the placeholder can't be re-selected afterwards.
          placeholder && value === undefined
            ? h('option', { value: '', disabled: true }, placeholder)
            : null,
          ...options.map(option => h('option', { value: option.value }, option.label ?? option.value)),
        ]))
      }

      const moveActive = (delta: number) => {
        if (filtered.length === 0)
          return
        activeIndex.value = (activeIndex.value + delta + filtered.length) % filtered.length
      }

      const onKeydown = (e: KeyboardEvent) => {
        if (disabled)
          return
        if (!open.value) {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open.value = true
          }
          return
        }
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            moveActive(1)
            break
          case 'ArrowUp':
            e.preventDefault()
            moveActive(-1)
            break
          case 'Home':
            e.preventDefault()
            activeIndex.value = 0
            break
          case 'End':
            e.preventDefault()
            activeIndex.value = filtered.length - 1
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            if (activeOption)
              commit(activeOption)
            break
          case 'Escape':
            e.preventDefault()
            close({ refocus: true })
            break
          case 'Tab':
            close()
            break
        }
      }

      const optionId = (index: number) => `${listboxId}-option-${index}`

      const listbox = h('div', {
        style: { display: 'flex', flexDirection: 'column' as const, minWidth: trigger.value ? `${trigger.value.offsetWidth}px` : undefined, maxHeight: '240px' },
      }, [
        searchable && h('input', {
          'type': 'text',
          'autofocus': true,
          'value': query.value,
          'placeholder': 'Filter…',
          'aria-label': 'Filter options',
          'style': {
            padding: '6px 10px',
            border: 'none',
            borderBottom: borderSolid(borderInput),
            fontSize: '12px',
            backgroundColor: 'transparent',
            color: 'inherit',
            outline: 'none',
            flexShrink: '0',
          },
          'onInput': (e: Event) => {
            query.value = (e.target as HTMLInputElement).value
            activeIndex.value = 0
          },
          'onKeydown': onKeydown,
        }),
        h('div', {
          role: 'listbox',
          id: listboxId,
          style: { display: 'flex', flexDirection: 'column' as const, padding: '4px', overflowY: 'auto' as const },
        }, filtered.length === 0
          ? [h('div', { style: { padding: '6px 10px', fontSize: '12px', opacity: '0.6' } }, 'No matches')]
          : filtered.map((option, index) => h('div', {
              'id': optionId(index),
              'role': 'option',
              'aria-selected': option.value === value ? 'true' : 'false',
              'title': option.description,
              'style': {
                display: 'flex',
                flexDirection: 'column' as const,
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                /* The active row needs to read over the panel's own denser surface, where `surfaceSubtle` washes out. */
                backgroundColor: index === activeIndex.value ? surfaceBadge : 'transparent',
                color: option.value === value ? primary : 'inherit',
              },
              'onMouseenter': () => { activeIndex.value = index },
              'onClick': () => commit(option),
            }, [
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
                option.icon ? h(DockIcon, { icon: option.icon, class: 'w-3.5 h-3.5' }) : null,
                h('span', option.label ?? option.value),
              ]),
              option.description ? h('span', { style: { opacity: '0.6', fontSize: '11px' } }, option.description) : null,
            ]))),
      ])

      const triggerButton = h('button', {
        'ref': 'trigger',
        'type': 'button',
        'role': 'combobox',
        'disabled': disabled,
        'aria-haspopup': 'listbox',
        'aria-expanded': open.value ? 'true' : 'false',
        'aria-controls': listboxId,
        'aria-activedescendant': open.value && activeOption ? optionId(activeIndex.value) : undefined,
        'style': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          padding: '6px 10px',
          border: borderSolid(borderInput),
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: bg,
          opacity: disabled ? '0.5' : '1',
          cursor: disabled ? 'not-allowed' : 'pointer',
        },
        'onClick': () => {
          if (!disabled)
            open.value = !open.value
        },
        'onKeydown': onKeydown,
      }, [
        h('span', {
          style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: selected ? '1' : '0.6' },
        }, selected?.label ?? selected?.value ?? placeholder ?? ''),
        h(DockIcon, { icon: 'ph:caret-down', class: 'w-3.5 h-3.5 flex-none' }),
      ])

      const control = h('div', { style: { position: 'relative' as const, flex: '1' } }, [
        triggerButton,
        h(FloatingPopover, {
          /* `DEFAULT_GAP` is tooltip spacing; a menu should sit against the control it belongs to. */
          item: open.value && trigger.value ? { el: trigger.value, content: () => listbox, placement: 'bottom' as const, gap: 4 } : null,
          panelClass: ['overflow-hidden'],
          surface: 'menu' as const,
          ignore: [trigger],
          onDismiss: () => close(),
        }),
      ])

      return withLabel(control)
    }
  },
})
