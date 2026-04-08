import httpClient from './httpClient'
import { createErrorResult, createSuccessResult } from './serviceHelpers'

import type {
  ITodoCategory,
  ITodoCategoryCreate,
} from '../types/categories'
import type { IResultObject } from '../types/common'

const basePath = '/api/v1/TodoCategories'

const TodoCategoryService = {
  async create(
    model: ITodoCategoryCreate,
  ): Promise<IResultObject<ITodoCategory>> {
    try {
      const response = await httpClient.post<ITodoCategory>(basePath, model)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoCategory>(error)
    }
  },

  async delete(id: string): Promise<IResultObject<void>> {
    try {
      await httpClient.delete(`${basePath}/${id}`)
      return createSuccessResult(undefined)
    } catch (error) {
      return createErrorResult<void>(error)
    }
  },

  async getAll(): Promise<IResultObject<ITodoCategory[]>> {
    try {
      const response = await httpClient.get<ITodoCategory[]>(basePath)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoCategory[]>(error)
    }
  },

  async getById(id: string): Promise<IResultObject<ITodoCategory>> {
    try {
      const response = await httpClient.get<ITodoCategory>(`${basePath}/${id}`)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoCategory>(error)
    }
  },

  async update(
    id: string,
    model: ITodoCategoryCreate,
  ): Promise<IResultObject<ITodoCategory>> {
    try {
      const response = await httpClient.put<ITodoCategory>(
        `${basePath}/${id}`,
        model,
      )
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoCategory>(error)
    }
  },
}

export default TodoCategoryService
