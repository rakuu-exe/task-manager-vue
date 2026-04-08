<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  email: '',
  firstName: '',
  lastName: '',
  password: '',
})
const backendErrors = ref<string[]>([])
const isSubmitting = ref(false)

const validationErrors = computed(() => {
  const errors: string[] = []
  if (!form.value.firstName.trim()) {
    errors.push('First name is required.')
  }
  if (!form.value.lastName.trim()) {
    errors.push('Last name is required.')
  }
  if (!form.value.email.trim()) {
    errors.push('Email is required.')
  }
  if (form.value.password.length < 8) {
    errors.push('Password must be at least 8 characters.')
  }
  return errors
})

const handleSubmit = async (): Promise<void> => {
  backendErrors.value = []
  if (validationErrors.value.length > 0) {
    return
  }

  isSubmitting.value = true

  try {
    const result = await authStore.register({
      email: form.value.email.trim(),
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
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
</script>

<template>
  <main class="public-layout">
    <section class="page-card auth-card">
      <header class="page-header auth-card__header">
        <div>
          <p class="auth-card__eyebrow">New here?</p>
          <h1 class="page-title">Create account</h1>
          <p class="page-subtitle">
            Create your account to start adding tasks, categories, and priorities.
          </p>
        </div>
      </header>

      <BaseAlert
        v-if="validationErrors.length > 0"
        :messages="validationErrors"
        title="Validation errors"
      />

      <BaseAlert
        v-if="backendErrors.length > 0"
        :messages="backendErrors"
        title="Registration failed"
      />

      <form class="panel form-grid" @submit.prevent="handleSubmit">
        <div class="form-grid two-columns">
          <label class="form-field">
            <span class="form-label">First name</span>
            <input
              v-model.trim="form.firstName"
              class="text-input"
              type="text"
            />
          </label>

          <label class="form-field">
            <span class="form-label">Last name</span>
            <input
              v-model.trim="form.lastName"
              class="text-input"
              type="text"
            />
          </label>
        </div>

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
            {{ isSubmitting ? 'Creating account...' : 'Create account' }}
          </button>

          <RouterLink class="button-ghost" :to="{ name: 'login' }">
            Back to login
          </RouterLink>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth-card {
  width: min(100%, 620px);
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
