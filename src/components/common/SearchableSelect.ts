import { defineComponent, h, isVNode, Fragment, type VNode, type PropType } from 'vue'
import AppCombobox from './AppCombobox.vue'

// Compatibility wrapper: legacy native selects now use the same single-field,
// keyboard-first combobox as new forms. Existing v-model and @change bindings
// remain valid, so the improvement reaches every form without duplicate UI.
export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Boolean] as PropType<string | number | boolean | null>,
      default: undefined,
    },
    modelModifiers: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, slots, emit }) {
    const flatten = (nodes: VNode[]): VNode[] =>
      nodes.flatMap((node) =>
        node.type === Fragment && Array.isArray(node.children)
          ? flatten(node.children.filter(isVNode))
          : [node],
      )
    const label = (node: VNode): string =>
      Array.isArray(node.children)
        ? node.children.map((c) => (isVNode(c) ? label(c) : String(c ?? ''))).join('')
        : String(node.children ?? '')
    return () => {
      const nodes = flatten(slots.default?.() ?? []).filter((node) => node.type === 'option')
      const placeholder = nodes.find((node) => {
        const value = node.props?.value
        return value === '' || value === 0 || value == null
      })
      const options = nodes
        .filter((node) => node !== placeholder)
        .map((node) => ({
          value: node.props?.value as string | number,
          label: label(node).trim(),
        }))
      const convert = (raw: string | number | Array<string | number> | null) => {
        let value: string | number | boolean | null = Array.isArray(raw) ? (raw[0] ?? null) : raw
        if (
          props.modelModifiers.number &&
          value !== null &&
          value !== '' &&
          !Number.isNaN(Number(value))
        )
          value = Number(value)
        emit('update:modelValue', value)
        if (typeof attrs.onChange === 'function') attrs.onChange(value)
      }
      const legacyClass = String(attrs.class ?? '')
        .split(/\s+/)
        .filter((value) => value && value !== 'field' && value !== 'mt-1')
        .join(' ')
      return h(AppCombobox, {
        modelValue: props.modelValue == null ? null : (props.modelValue as string | number),
        options,
        emptyLabel: placeholder ? label(placeholder).trim() : 'Pilih',
        placeholder: 'Ketik untuk mencari…',
        resultLabel: 'pilihan',
        disabled: Boolean(attrs.disabled),
        required: Boolean(attrs.required),
        class: legacyClass,
        'onUpdate:modelValue': convert,
      })
    }
  },
})
