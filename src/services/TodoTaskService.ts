import httpClient from './httpClient'
import { createErrorResult, createSuccessResult } from './serviceHelpers'

import type { IResultObject } from '../types/common'
import type { ITodoTask, ITodoTaskCreate } from '../types/tasks'

const basePath = '/api/v1/TodoTasks'

const TodoTaskService = {
  async create(model: ITodoTaskCreate): Promise<IResultObject<ITodoTask>> {
    try {
      const response = await httpClient.post<ITodoTask>(basePath, model)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoTask>(error)
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

  async getAll(): Promise<IResultObject<ITodoTask[]>> {
    try {
      const response = await httpClient.get<ITodoTask[]>(basePath)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoTask[]>(error)
    }
  },

  async getById(id: string): Promise<IResultObject<ITodoTask>> {
    try {
      const response = await httpClient.get<ITodoTask>(`${basePath}/${id}`)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoTask>(error)
    }
  },

  async update(
    id: string,
    model: ITodoTaskCreate,
  ): Promise<IResultObject<ITodoTask>> {
    try {
      const response = await httpClient.put<ITodoTask>(`${basePath}/${id}`, model)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<ITodoTask>(error)
    }
  },
}

export default TodoTaskService
