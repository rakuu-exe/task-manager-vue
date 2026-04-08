import httpClient from './httpClient'
import { createErrorResult, createSuccessResult } from './serviceHelpers'

import type {
  ILogin,
  IProfileInfo,
  IRegister,
  IUserInfo,
} from '../types/auth'
import type { IResultObject } from '../types/common'

const basePath = '/api/v1/Account'

const AccountService = {
  async getProfile(): Promise<IResultObject<IProfileInfo>> {
    try {
      const response = await httpClient.get<IProfileInfo>(`${basePath}/Me`)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<IProfileInfo>(error)
    }
  },

  async login(credentials: ILogin): Promise<IResultObject<IUserInfo>> {
    try {
      const response = await httpClient.post<IUserInfo>(
        `${basePath}/Login`,
        credentials,
      )
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<IUserInfo>(error)
    }
  },

  async refreshToken(): Promise<IResultObject<IUserInfo>> {
    try {
      const response = await httpClient.post<IUserInfo>(`${basePath}/RefreshToken`)
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<IUserInfo>(error)
    }
  },

  async logout(): Promise<IResultObject<true>> {
    try {
      await httpClient.post(`${basePath}/Logout`)
      return createSuccessResult(true)
    } catch (error) {
      return createErrorResult<true>(error)
    }
  },

  async register(model: IRegister): Promise<IResultObject<IUserInfo>> {
    try {
      const response = await httpClient.post<IUserInfo>(
        `${basePath}/Register`,
        model,
      )
      return createSuccessResult(response.data)
    } catch (error) {
      return createErrorResult<IUserInfo>(error)
    }
  },
}

export default AccountService
