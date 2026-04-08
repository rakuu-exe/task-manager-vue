import httpClient from './httpClient'
import { createErrorResult, createSuccessResult } from './serviceHelpers'

import type { IResultObject } from '../types/common'
import type {
  ITodoPriority,
  ITodoPriorityCreate,
} from '../types/priorities'

const basePath = '/api/v1/TodoPriorities'

const TodoPriorityService = {
  async create(
    model: ITodoPriorityCreate,
  ): Promise<IResultObject<ITodoPriority>> {
    try {
      const response = await httpClient.post<ITodoPriority>(basePath, model)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoPriority>(error)
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

  async getAll(): Promise<IResultObject<ITodoPriority[]>> {
    try {
      const response = await httpClient.get<ITodoPriority[]>(basePath)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoPriority[]>(error)
    }
  },

  async getById(id: string): Promise<IResultObject<ITodoPriority>> {
    try {
      const response = await httpClient.get<ITodoPriority>(`${basePath}/${id}`)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoPriority>(error)
    }
  },

  async update(
    id: string,
    model: ITodoPriorityCreate,
  ): Promise<IResultObject<ITodoPriority>> {
    try {
      const response = await httpClient.put<ITodoPriority>(
        `${basePath}/${id}`,
        model,
      )
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoPriority>(error)
    }
  },
}

export default TodoPriorityService
