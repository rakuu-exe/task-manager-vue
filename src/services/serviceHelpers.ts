import axios from 'axios'

import type { IResultObject } from '../types/common'

const getNestedErrorMessages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap((entry) => getNestedErrorMessages(entry))
  }

  return []
}

export const extractErrorMessages = (error: unknown): string[] => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | {
          detail?: string
          errors?: unknown
          message?: string
          messages?: string[]
          title?: string
        }
      | undefined

    const collectedErrors = getNestedErrorMessages(responseData?.errors)

    if (collectedErrors.length > 0) {
      return collectedErrors
    }

    if (responseData?.detail) {
      return [responseData.detail]
    }

    if (responseData?.message) {
      return [responseData.message]
    }

    if (responseData?.messages && responseData.messages.length > 0) {
      return responseData.messages
    }

    if (responseData?.title) {
      return [responseData.title]
    }

    if (error.message) {
      return [error.message]
    }
  }

  if (error instanceof Error && error.message) {
    return [error.message]
  }

  return ['Unexpected error. Please try again.']
}

export const createErrorResult = <TData>(error: unknown): IResultObject<TData> => ({
  errors: extractErrorMessages(error),
})

export const createSuccessResult = <TData>(data: TData): IResultObject<TData> => ({
  data,
})
