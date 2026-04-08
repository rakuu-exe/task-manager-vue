import { ref } from 'vue'
import { defineStore } from 'pinia'

import TodoCategoryService from '../services/TodoCategoryService'
import TodoPriorityService from '../services/TodoPriorityService'
import TodoTaskService from '../services/TodoTaskService'
import type { ITodoCategory } from '../types/categories'
import type { IResultObject } from '../types/common'
import type { ITodoPriority } from '../types/priorities'
import type {
  ITaskFormDependencies,
  ITodoTask,
  ITodoTaskCreate,
} from '../types/tasks'

const toMessage = (errors?: string[]): string | null =>
  errors && errors.length > 0 ? errors.join(' ') : null

export const useTasksStore = defineStore('tasks', () => {
  const items = ref<ITodoTask[]>([])
  const currentTask = ref<ITodoTask | null>(null)
  const availableCategories = ref<ITodoCategory[]>([])
  const availablePriorities = ref<ITodoPriority[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const fetchAll = async (): Promise<IResultObject<ITodoTask[]>> => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const result = await TodoTaskService.getAll()

      if (result.data) {
        items.value = result.data
      }

      errorMessage.value = toMessage(result.errors)
      return result
    } finally {
      isLoading.value = false
    }
  }

  const getById = async (id: string): Promise<IResultObject<ITodoTask>> => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const result = await TodoTaskService.getById(id)

      currentTask.value = result.data ?? null
      errorMessage.value = toMessage(result.errors)
      return result
    } finally {
      isLoading.value = false
    }
  }

  const create = async (
    model: ITodoTaskCreate,
  ): Promise<IResultObject<ITodoTask>> => {
    const result = await TodoTaskService.create(model)
    errorMessage.value = toMessage(result.errors)
    return result
  }

  const update = async (
    id: string,
    model: ITodoTaskCreate,
  ): Promise<IResultObject<ITodoTask>> => {
    const result = await TodoTaskService.update(id, model)
    errorMessage.value = toMessage(result.errors)
    return result
  }

  const deleteTask = async (id: string): Promise<IResultObject<void>> => {
    const result = await TodoTaskService.delete(id)

    if (!result.errors) {
      items.value = items.value.filter((item) => item.id !== id)
    }

    errorMessage.value = toMessage(result.errors)
    return result
  }

  const loadFormOptions = async (): Promise<
    IResultObject<ITaskFormDependencies>
  > => {
    isLoading.value = true
    errorMessage.value = null

    try {
      const [categoriesResult, prioritiesResult] = await Promise.all([
        TodoCategoryService.getAll(),
        TodoPriorityService.getAll(),
      ])

      if (categoriesResult.data) {
        availableCategories.value = categoriesResult.data
      }

      if (prioritiesResult.data) {
        availablePriorities.value = prioritiesResult.data
      }

      const combinedErrors = [
        ...(categoriesResult.errors ?? []),
        ...(prioritiesResult.errors ?? []),
      ]

      errorMessage.value = toMessage(combinedErrors)

      return {
        data: {
          categories: availableCategories.value,
          priorities: availablePriorities.value,
        },
        errors: combinedErrors.length > 0 ? combinedErrors : undefined,
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    availableCategories,
    availablePriorities,
    create,
    currentTask,
    delete: deleteTask,
    errorMessage,
    fetchAll,
    getById,
    isLoading,
    items,
    loadFormOptions,
    update,
  }
})
