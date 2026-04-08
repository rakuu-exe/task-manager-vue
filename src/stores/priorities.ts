import { ref } from 'vue'
import { defineStore } from 'pinia'

import TodoPriorityService from '../services/TodoPriorityService'
import type { IResultObject } from '../types/common'
import type {
  ITodoPriority,
  ITodoPriorityCreate,
} from '../types/priorities'

const toMessage = (errors?: string[]): string | null =>
  errors && errors.length > 0 ? errors.join(' ') : null

export const usePrioritiesStore = defineStore('priorities', () => {
  const items = ref<ITodoPriority[]>([])
  const currentPriority = ref<ITodoPriority | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const fetchAll = async (): Promise<IResultObject<ITodoPriority[]>> => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const result = await TodoPriorityService.getAll()

      if (result.data) {
        items.value = result.data
      }

      errorMessage.value = toMessage(result.errors)
      return result
    } finally {
      isLoading.value = false
    }
  }

  const getById = async (id: string): Promise<IResultObject<ITodoPriority>> => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const result = await TodoPriorityService.getById(id)

      currentPriority.value = result.data ?? null
      errorMessage.value = toMessage(result.errors)
      return result
    } finally {
      isLoading.value = false
    }
  }

  const create = async (
    model: ITodoPriorityCreate,
  ): Promise<IResultObject<ITodoPriority>> => {
    const result = await TodoPriorityService.create(model)
    errorMessage.value = toMessage(result.errors)
    return result
  }

  const update = async (
    id: string,
    model: ITodoPriorityCreate,
  ): Promise<IResultObject<ITodoPriority>> => {
    const result = await TodoPriorityService.update(id, model)
    errorMessage.value = toMessage(result.errors)
    return result
  }

  const deletePriority = async (id: string): Promise<IResultObject<void>> => {
    const result = await TodoPriorityService.delete(id)

    if (!result.errors) {
      items.value = items.value.filter((item) => item.id !== id)
    }

    errorMessage.value = toMessage(result.errors)
    return result
  }

  return {
    create,
    currentPriority,
    delete: deletePriority,
    errorMessage,
    fetchAll,
    getById,
    isLoading,
    items,
    update,
  }
})
