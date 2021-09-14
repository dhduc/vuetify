// Composables
import { useForm } from '@/composables/form'

// Utilities
import { computed, getCurrentInstance, onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { getUid, propsFactory, wrapInPromise } from '@/util'

// Types
import type { PropType } from 'vue'

export type ValidationResult = string | true
export type ValidationRule = string | ((value: any) => ValidationResult) | Promise<ValidationResult>

export interface ValidationProps {
  maxErrors?: string | number
  rules: ValidationRule[]
  modelValue?: any
}

export const makeValidationProps = propsFactory({
  maxErrors: {
    type: [Number, String],
    default: 1,
  },
  rules: {
    type: Array as PropType<ValidationRule[]>,
    default: () => ([]),
  },
  modelValue: {
    type: [Number, String, Array, Object],
    default: undefined,
  },
})

export function useValidation (props: ValidationProps) {
  const errorMessages = ref<string[]>([])
  const isPristine = ref(true)
  const isValid = computed(() => isPristine.value ? null : errorMessages.value.length === 0)
  const isValidating = ref(false)
  const vm = getCurrentInstance()

  if (vm) {
    const form = useForm()

    if (form) {
      const id = getUid()

      onBeforeMount(() => {
        form.register(id, validate, reset, clear)
      })

      onBeforeUnmount(() => {
        form.unregister(id)
      })
    }
  }

  function reset () {
    clear()

    vm?.emit('update:modelValue', null)
  }

  function clear () {
    isPristine.value = true
    errorMessages.value = []
  }

  async function validate () {
    const results = []

    errorMessages.value = []
    isValidating.value = true

    for (const rule of props.rules) {
      if (results.length >= (props.maxErrors || 1)) {
        break
      }

      const handler = typeof rule === 'function' ? rule : () => rule
      const result = await wrapInPromise<ValidationResult>(handler(props?.modelValue?.value ?? props.modelValue))

      if (result === true) continue

      if (typeof result !== 'string') {
        // eslint-disable-next-line no-console
        console.warn(`${result} is not a valid value. Rule functions must return boolean true or a string.`)

        continue
      }

      results.push(result)
    }

    errorMessages.value = results
    isValidating.value = false
    isPristine.value = false

    return isValid.value
  }

  return {
    errorMessages,
    isPristine,
    isValid,
    isValidating,
    clear,
    reset,
    validate,
  }
}
