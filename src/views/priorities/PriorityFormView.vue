<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import LoadingIndicator from '../../components/LoadingIndicator.vue'
import { usePrioritiesStore } from '../../stores/priorities'
import type { ITodoPriorityCreate } from '../../types/priorities'

const props = defineProps<{
  id?: string
  mode: 'create' | 'edit'
}>()

const router = useRouter()
const priorityStore = usePrioritiesStore()

const createDefaultForm = (): ITodoPriorityCreate => ({
  priorityName: null,
  prioritySort: 0,
})

const form = ref<ITodoPriorityCreate>(createDefaultForm())
const isPageLoading = ref(false)
const isSubmitting = ref(false)
const backendErrors = ref<string[]>([])
const loadErrors = ref<string[]>([])
const displayedValidationErrors = ref<string[]>([])

const isEditMode = computed(() => props.mode === 'edit')
const pageTitle = computed(() =>
  isEditMode.value ? 'Edit priority' : 'Create priority',
)

const validationErrors = computed(() => {
  const errors: string[] = []
  const trimmedName = form.value.priorityName?.trim() ?? ''

  if (!trimmedName) {
    errors.push('Priority name is required.')
  }

  if (trimmedName.length > 128) {
    errors.push('Priority name must be 128 characters or fewer.')
  }

  return errors
})

const loadPriority = async (): Promise<void> => {
  backendErrors.value = []
  loadErrors.value = []
  displayedValidationErrors.value = []

  if (!isEditMode.value || !props.id) {
    form.value = createDefaultForm()
    return
  }

  isPageLoading.value = true

  try {
    const result = await priorityStore.getById(props.id)

    if (!result.data) {
      loadErrors.value = result.errors ?? ['Priority was not found.']
      return
    }

    form.value = {
      priorityName: result.data.priorityName,
      prioritySort: result.data.prioritySort,
    }
  } finally {
    isPageLoading.value = false
  }
}

const handleSubmit = async (): Promise<void> => {
  backendErrors.value = []
  displayedValidationErrors.value = validationErrors.value

  if (validationErrors.value.length > 0) {
    return
  }

  displayedValidationErrors.value = []

  isSubmitting.value = true

  try {
    const payload: ITodoPriorityCreate = {
      priorityName: form.value.priorityName?.trim() ?? null,
      prioritySort: Number(form.value.prioritySort),
    }

    const result =
      isEditMode.value && props.id
        ? await priorityStore.update(props.id, payload)
        : await priorityStore.create(payload)

    if (result.errors) {
      backendErrors.value = result.errors
      return
    }

    await router.push({ name: 'priorities' })
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.id, loadPriority, { immediate: true })
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
  <section class="page-card">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ pageTitle }}</h1>
        <p class="page-subtitle">
          {{ isEditMode ? 'Update this priority or move it into a better order.' : 'Add a priority level you can use on tasks.' }}
        </p>
      </div>

      <RouterLink class="button-ghost" :to="{ name: 'priorities' }">
        Back to priorities
      </RouterLink>
    </header>

    <BaseAlert
      v-if="displayedValidationErrors.length > 0"
      :messages="displayedValidationErrors"
      title="Validation errors"
    />

    <BaseAlert
      v-if="loadErrors.length > 0"
      :messages="loadErrors"
      title="Could not load priority"
    />

    <BaseAlert
      v-if="backendErrors.length > 0"
      :messages="backendErrors"
      title="Save failed"
    />

    <div v-if="isPageLoading" class="panel">
      <LoadingIndicator />
    </div>

    <form v-else class="panel form-grid" @submit.prevent="handleSubmit">
      <label class="form-field">
        <span class="form-label">Priority name</span>
        <input
          v-model.trim="form.priorityName"
          class="text-input"
          placeholder="Low, Medium, High..."
          type="text"
        />
      </label>

      <label class="form-field">
        <span class="form-label">Sort order</span>
        <input
          v-model.number="form.prioritySort"
          class="text-input"
          min="0"
          step="1"
          type="number"
        />
      </label>

      <div class="button-row">
        <button class="button" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Saving...' : 'Save priority' }}
        </button>

        <RouterLink class="button-ghost" :to="{ name: 'priorities' }">
          Cancel
        </RouterLink>
      </div>
    </form>
  </section>
</template>
