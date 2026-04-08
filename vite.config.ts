import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

const normalizeBaseUrl = (value?: string): string => {
  if (!value || value.trim() === '') {
    return '/'
  }

  return value.endsWith('/') ? value : `${value}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBaseUrl(env.BASE_URL)

  return {
    base,
    plugins: [vue()],
    server: {
      proxy: {
        '/api': 'http://localhost:3003',
      },
    },
  }
})
