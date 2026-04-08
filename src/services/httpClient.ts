import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'

interface AuthHandlers {
  clearAuth: () => void
  getAccessToken: () => string | null
  onUnauthorized: () => void
  refreshAccessToken: () => Promise<string | null>
}

const ignoredAuthRoutes = [
  '/api/v1/Account/Login',
  '/api/v1/Account/RefreshToken',
  '/api/v1/Account/Register',
]

let authHandlers: AuthHandlers | null = null
let isRefreshing = false
let pendingRequests: Array<{
  reject: (error: unknown) => void
  resolve: (accessToken: string) => void
}> = []

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const isIgnoredAuthRoute = (url?: string): boolean =>
  ignoredAuthRoutes.some((route) => url?.includes(route))

export const registerAuthHandlers = (handlers: AuthHandlers): void => {
  authHandlers = handlers
}

const updateAuthorizationHeader = (
  config: InternalAxiosRequestConfig,
  accessToken: string,
): void => {
  const headers = AxiosHeaders.from(config.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  config.headers = headers
}

const releasePendingRequests = (
  error: unknown,
  accessToken: string | null,
): void => {
  for (const request of pendingRequests) {
    if (accessToken) {
      request.resolve(accessToken)
    } else {
      request.reject(error)
    }
  }

  pendingRequests = []
}

const httpClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

httpClient.interceptors.request.use((config) => {
  const accessToken = authHandlers?.getAccessToken()

  if (accessToken && !isIgnoredAuthRoute(config.url)) {
    updateAuthorizationHeader(config, accessToken)
  }

  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      authHandlers &&
      originalRequest &&
      !originalRequest._retry &&
      !isIgnoredAuthRoute(originalRequest.url) &&
      Boolean(authHandlers.getAccessToken())

    if (shouldAttemptRefresh) {
      originalRequest._retry = true

      try {
        if (isRefreshing) {
          const nextAccessToken = await new Promise<string>((resolve, reject) => {
            pendingRequests.push({ reject, resolve })
          })

          updateAuthorizationHeader(originalRequest, nextAccessToken)
          return httpClient(originalRequest)
        }

        isRefreshing = true
        const nextAccessToken = await authHandlers.refreshAccessToken()
        if (!nextAccessToken) {
          throw error
        }

        releasePendingRequests(null, nextAccessToken)
        updateAuthorizationHeader(originalRequest, nextAccessToken)
        return httpClient(originalRequest)
      } catch (refreshError) {
        releasePendingRequests(refreshError, null)
      } finally {
        isRefreshing = false
      }
    }

    if (
      error.response?.status === 401 &&
      authHandlers &&
      !isIgnoredAuthRoute(originalRequest?.url)
    ) {
      authHandlers.clearAuth()
      authHandlers.onUnauthorized()
    }

    return Promise.reject(error)
  },
)

export default httpClient
