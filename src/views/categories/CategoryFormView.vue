<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import LoadingIndicator from '../../components/LoadingIndicator.vue'
import { useCategoriesStore } from '../../stores/categories'
import type { ITodoCategoryCreate } from '../../types/categories'

const props = defineProps<{
  id?: string
  mode: 'create' | 'edit'
}>()

const router = useRouter()
const categoryStore = useCategoriesStore()

const form = ref<ITodoCategoryCreate>({
  categoryName: null,
  categorySort: 0,
  tag: null,
})

const isPageLoading = ref(false)
const isSubmitting = ref(false)
const backendErrors = ref<string[]>([])
const loadErrors = ref<string[]>([])

const isEditMode = computed(() => props.mode === 'edit')
const pageTitle = computed(() =>
  isEditMode.value ? 'Edit category' : 'Create category',
)
const pageSubtitle = computed(() =>
  isEditMode.value
    ? 'Change the name, order, or tag for this category.'
    : 'Add a new category to group related tasks together.',
)

const validationErrors = computed(() => {
  const errors: string[] = []
  const trimmedName = form.value.categoryName?.trim() ?? ''

  if (!trimmedName) {
    errors.push('Category name is required.')
  }

  if (trimmedName.length > 128) {
    errors.push('Category name must be 128 characters or fewer.')
  }

  return errors
})

const resetForm = (): void => {
  form.value = {
    categoryName: null,
    categorySort: 0,
    tag: null,
  }
}

const loadCategory = async (): Promise<void> => {
  backendErrors.value = []
  loadErrors.value = []

  if (!isEditMode.value || !props.id) {
    resetForm()
    return
  }

  isPageLoading.value = true

  try {
    const result = await categoryStore.getById(props.id)

    if (!result.data) {
      loadErrors.value = result.errors ?? ['Category was not found.']
      return
    }

    form.value = {
      categoryName: result.data.categoryName,
      categorySort: result.data.categorySort,
      tag: result.data.tag,
    }
  } finally {
    isPageLoading.value = false
  }
}

const handleSubmit = async (): Promise<void> => {
  backendErrors.value = []

  if (validationErrors.value.length > 0) {
    return
  }

  isSubmitting.value = true

  try {
    const payload: ITodoCategoryCreate = {
      categoryName: form.value.categoryName?.trim() ?? null,
      categorySort: Number(form.value.categorySort),
      tag: form.value.tag?.trim() ? form.value.tag.trim() : null,
    }

    const result =
      isEditMode.value && props.id
        ? await categoryStore.update(props.id, payload)
        : await categoryStore.create(payload)

    if (result.errors) {
      backendErrors.value = result.errors
      return
    }

    await router.push({ name: 'categories' })
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.id, loadCategory, { immediate: true })
</script>

<template>
  <section class="page-card">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ pageTitle }}</h1>
        <p class="page-subtitle">{{ pageSubtitle }}</p>
      </div>

      <RouterLink class="button-ghost" :to="{ name: 'categories' }">
        Back to categories
      </RouterLink>
    </header>

    <BaseAlert
      v-if="validationErrors.length > 0"
      :messages="validationErrors"
      title="Validation errors"
    />

    <BaseAlert
      v-if="loadErrors.length > 0"
      :messages="loadErrors"
      title="Could not load category"
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
        <span class="form-label">Category name</span>
        <input
          v-model.trim="form.categoryName"
          class="text-input"
          placeholder="Personal, Work, Study..."
          type="text"
        />
      </label>

      <div class="form-grid two-columns">
        <label class="form-field">
          <span class="form-label">Sort order</span>
          <input
            v-model.number="form.categorySort"
            class="text-input"
            min="0"
            step="1"
            type="number"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Tag</span>
          <input
            v-model.trim="form.tag"
            class="text-input"
            placeholder="Optional short tag"
            type="text"
          />
        </label>
      </div>

      <div class="button-row">
        <button class="button" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Saving...' : 'Save category' }}
        </button>

        <RouterLink class="button-ghost" :to="{ name: 'categories' }">
          Cancel
        </RouterLink>
      </div>
    </form>
  </section>
</template>
