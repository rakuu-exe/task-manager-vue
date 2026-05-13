<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: '',
})
const backendErrors = ref<string[]>([])
const displayedValidationErrors = ref<string[]>([])
const isSubmitting = ref(false)

const validationErrors = computed(() => {
  const errors: string[] = []
  if (!form.value.email.trim()) {
    errors.push('Email is required.')
  }
  if (!form.value.password) {
    errors.push('Password is required.')
  }
  return errors
})

const handleSubmit = async (): Promise<void> => {
  backendErrors.value = []
  displayedValidationErrors.value = validationErrors.value

  if (validationErrors.value.length > 0) {
    return
  }

  displayedValidationErrors.value = []

  isSubmitting.value = true

  try {
    const result = await authStore.login({
      email: form.value.email.trim(),
      password: form.value.password,
    })

    if (result.errors) {
      backendErrors.value = result.errors
      return
    }

    await router.push({ name: 'dashboard' })
  } finally {
    isSubmitting.value = false
  }
}

watch(
  form,
  () => {
    backendErrors.value = []
    displayedValidationErrors.value = []
  },
  { deep: true },
)
</script>

<template>
  <main class="public-layout">
    <section class="page-card auth-card">
      <header class="page-header auth-card__header">
        <div>
          <p class="auth-card__eyebrow">Welcome back</p>
          <h1 class="page-title">Log in</h1>
          <p class="page-subtitle">
            Log in to see your tasks and continue where you left off.
          </p>
        </div>
      </header>

      <BaseAlert
        v-if="displayedValidationErrors.length > 0"
        :messages="displayedValidationErrors"
        title="Validation errors"
      />

      <BaseAlert
        v-if="backendErrors.length > 0"
        :messages="backendErrors"
        title="Login failed"
      />

      <form class="panel form-grid" @submit.prevent="handleSubmit">
        <label class="form-field">
          <span class="form-label">Email</span>
          <input v-model.trim="form.email" class="text-input" type="email" />
        </label>

        <label class="form-field">
          <span class="form-label">Password</span>
          <input v-model="form.password" class="text-input" type="password" />
        </label>

        <div class="button-row">
          <button class="button" type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Logging in...' : 'Log in' }}
          </button>

          <RouterLink class="button-ghost" :to="{ name: 'register' }">
            Create account
          </RouterLink>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth-card {
  width: min(100%, 560px);
}

.auth-card__header {
  align-items: flex-start;
}

.auth-card__eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-dark);
}
</style>
