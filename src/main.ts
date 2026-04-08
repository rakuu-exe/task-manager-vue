import { createApp } from 'vue'

import App from './App.vue'
import './assets/main.css'
import router from './router'
import { useAuthStore } from './stores/auth'
import { pinia } from './stores/pinia'

const authStore = useAuthStore(pinia)
authStore.restoreAuthFromStorage()
if (authStore.isAuthenticated) {
  void authStore.refreshProfile()
}

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
