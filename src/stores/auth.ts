import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import AccountService from '../services/AccountService'
import { registerAuthHandlers } from '../services/httpClient'
import type {
  ILogin,
  IProfileInfo,
  IRegister,
  IUserInfo,
} from '../types/auth'
import type { IResultObject } from '../types/common'

const storageKey = 'task-vue-auth'
const appBaseUrl = import.meta.env.BASE_URL
const normalizedBaseUrl = appBaseUrl.endsWith('/')
  ? appBaseUrl.slice(0, -1)
  : appBaseUrl
const loginPath = normalizedBaseUrl ? `${normalizedBaseUrl}/login` : '/login'

interface IStoredAuthData {
  email: string | null
  firstName: string | null
  lastName: string | null
  token: string | null
}

const redirectToLogin = (): void => {
  if (typeof window === 'undefined' || window.location.pathname === loginPath) {
    return
  }

  void import('../router')
    .then(({ default: router }) => router.replace({ name: 'login' }))
    .catch(() => {
      window.location.replace(loginPath)
    })
}

const readStoredAuthData = (): IStoredAuthData | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(storageKey)
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<IStoredAuthData>

    return {
      email:
        typeof parsedValue.email === 'string' ? parsedValue.email : null,
      firstName:
        typeof parsedValue.firstName === 'string' ? parsedValue.firstName : null,
      lastName:
        typeof parsedValue.lastName === 'string' ? parsedValue.lastName : null,
      token:
        typeof parsedValue.token === 'string' ? parsedValue.token : null,
    }
  } catch {
    window.localStorage.removeItem(storageKey)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const email = ref<string | null>(null)
  const firstName = ref<string | null>(null)
  const lastName = ref<string | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const userName = computed(() => {
    const fullName = [firstName.value, lastName.value]
      .filter((value): value is string => Boolean(value))
      .join(' ')
      .trim()

    return fullName || email.value || null
  })

  const persistAuthData = (): void => {
    if (typeof window === 'undefined') {
      return
    }

    if (!token.value) {
      window.localStorage.removeItem(storageKey)
      return
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        email: email.value,
        firstName: firstName.value,
        lastName: lastName.value,
        token: token.value,
      } satisfies IStoredAuthData),
    )
  }

  const setAuthData = (userInfo: IUserInfo): void => {
    email.value = userInfo.email
    firstName.value = userInfo.firstName
    lastName.value = userInfo.lastName
    token.value = userInfo.token
    persistAuthData()
  }

  const clearAuthData = (): void => {
    email.value = null
    firstName.value = null
    lastName.value = null
    token.value = null

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }
  }

  const restoreAuthFromStorage = (): void => {
    const storedData = readStoredAuthData()
    if (!storedData) {
      return
    }

    email.value = storedData.email
    firstName.value = storedData.firstName
    lastName.value = storedData.lastName
    token.value = storedData.token
  }

  const login = async (credentials: ILogin): Promise<IResultObject<IUserInfo>> => {
    const result = await AccountService.login(credentials)
    if (result.data) {
      setAuthData(result.data)
    }
    return result
  }

  const register = async (
    model: IRegister,
  ): Promise<IResultObject<IUserInfo>> => {
    const result = await AccountService.register(model)
    if (result.data) {
      setAuthData(result.data)
    }
    return result
  }

  const refreshProfile = async (): Promise<IResultObject<IProfileInfo>> => {
    const result = await AccountService.getProfile()
    if (result.data) {
      email.value = result.data.email
      firstName.value = result.data.firstName
      lastName.value = result.data.lastName
      persistAuthData()
    }
    return result
  }

  const refreshAccessToken = async (): Promise<string | null> => {
    if (!token.value) {
      return null
    }

    const result = await AccountService.refreshToken()

    if (!result.data) {
      clearAuthData()
      return null
    }

    setAuthData(result.data)
    return result.data.token
  }

  const logout = async (): Promise<void> => {
    try {
      if (token.value) {
        await AccountService.logout()
      }
    } finally {
      clearAuthData()
      redirectToLogin()
    }
  }

  registerAuthHandlers({
    clearAuth: clearAuthData,
    getAccessToken: () => token.value,
    onUnauthorized: redirectToLogin,
    refreshAccessToken,
  })

  return {
    clearAuthData,
    email,
    firstName,
    isAuthenticated,
    lastName,
    login,
    logout,
    refreshAccessToken,
    refreshProfile,
    register,
    restoreAuthFromStorage,
    setAuthData,
    token,
    userName,
  }
})
