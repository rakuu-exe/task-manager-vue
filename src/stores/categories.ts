import { ref } from 'vue'
import { defineStore } from 'pinia'

import TodoCategoryService from '../services/TodoCategoryService'
import type {
  ITodoCategory,
  ITodoCategoryCreate,
} from '../types/categories'
import type { IResultObject } from '../types/common'

const toMessage = (errors?: string[]): string | null =>
  errors && errors.length > 0 ? errors.join(' ') : null

export const useCategoriesStore = defineStore('categories', () => {
  const items = ref<ITodoCategory[]>([])
  const currentCategory = ref<ITodoCategory | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const fetchAll = async (): Promise<IResultObject<ITodoCategory[]>> => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const result = await TodoCategoryService.getAll()

      if (result.data) {
        items.value = result.data
      }

      errorMessage.value = toMessage(result.errors)
      return result
    } finally {
      isLoading.value = false
    }
  }

  const getById = async (id: string): Promise<IResultObject<ITodoCategory>> => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const result = await TodoCategoryService.getById(id)

      currentCategory.value = result.data ?? null
      errorMessage.value = toMessage(result.errors)
      return result
    } finally {
      isLoading.value = false
    }
  }

  const create = async (
    model: ITodoCategoryCreate,
  ): Promise<IResultObject<ITodoCategory>> => {
    const result = await TodoCategoryService.create(model)
    errorMessage.value = toMessage(result.errors)
    return result
  }

  const update = async (
    id: string,
    model: ITodoCategoryCreate,
  ): Promise<IResultObject<ITodoCategory>> => {
    const result = await TodoCategoryService.update(id, model)
    errorMessage.value = toMessage(result.errors)
    return result
  }

  const deleteCategory = async (id: string): Promise<IResultObject<void>> => {
    const result = await TodoCategoryService.delete(id)

    if (!result.errors) {
      items.value = items.value.filter((item) => item.id !== id)
    }

    errorMessage.value = toMessage(result.errors)
    return result
  }

  return {
    create,
    currentCategory,
    delete: deleteCategory,
    errorMessage,
    fetchAll,
    getById,
    isLoading,
    items,
    update,
  }
})
