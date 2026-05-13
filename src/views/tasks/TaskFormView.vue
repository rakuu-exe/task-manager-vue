<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import LoadingIndicator from '../../components/LoadingIndicator.vue'
import { useTasksStore } from '../../stores/tasks'
import type { ITodoTaskCreate } from '../../types/tasks'

interface ITaskFormState {
  createdDt: string
  dueDtInput: string
  isArchived: boolean
  isCompleted: boolean
  taskName: string | null
  taskSort: number
  todoCategoryId: string
  todoPriorityId: string
}

const props = defineProps<{
  id?: string
  mode: 'create' | 'edit'
}>()

const router = useRouter()
const taskStore = useTasksStore()

const createDefaultForm = (): ITaskFormState => ({
  createdDt: new Date().toISOString(),
  dueDtInput: '',
  isArchived: false,
  isCompleted: false,
  taskName: null,
  taskSort: 0,
  todoCategoryId: '',
  todoPriorityId: '',
})

const form = ref<ITaskFormState>(createDefaultForm())
const backendErrors = ref<string[]>([])
const loadErrors = ref<string[]>([])
const isPageLoading = ref(false)
const isSubmitting = ref(false)
const displayedValidationErrors = ref<string[]>([])

const isEditMode = computed(() => props.mode === 'edit')
const pageTitle = computed(() =>
  isEditMode.value ? 'Edit task' : 'Create task',
)
const categories = computed(() => taskStore.availableCategories)
const priorities = computed(() => taskStore.availablePriorities)

const validationErrors = computed(() => {
  const errors: string[] = []
  const trimmedTaskName = form.value.taskName?.trim() ?? ''

  if (!trimmedTaskName) {
    errors.push('Task name is required.')
  }

  if (trimmedTaskName.length > 160) {
    errors.push('Task name must be 160 characters or fewer.')
  }

  if (!form.value.todoCategoryId) {
    errors.push('Category selection is required.')
  }

  if (!form.value.todoPriorityId) {
    errors.push('Priority selection is required.')
  }

  return errors
})

const toDateTimeInput = (value: string | null): string => {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 16)
}

const toPayload = (): ITodoTaskCreate => ({
  createdDt: form.value.createdDt,
  dueDt: form.value.dueDtInput
    ? new Date(form.value.dueDtInput).toISOString()
    : null,
  isArchived: form.value.isArchived,
  isCompleted: form.value.isCompleted,
  taskName: form.value.taskName?.trim() ?? null,
  taskSort: Number(form.value.taskSort),
  todoCategoryId: form.value.todoCategoryId,
  todoPriorityId: form.value.todoPriorityId,
})

const loadTask = async (): Promise<void> => {
  backendErrors.value = []
  loadErrors.value = []
  displayedValidationErrors.value = []
  isPageLoading.value = true

  try {
    const optionsResult = await taskStore.loadFormOptions()

    if (optionsResult.errors) {
      loadErrors.value = optionsResult.errors
    }

    if (!isEditMode.value || !props.id) {
      form.value = createDefaultForm()
      return
    }

    const taskResult = await taskStore.getById(props.id)

    if (!taskResult.data) {
      loadErrors.value = taskResult.errors ?? ['Task was not found.']
      return
    }

    form.value = {
      createdDt: taskResult.data.createdDt,
      dueDtInput: toDateTimeInput(taskResult.data.dueDt),
      isArchived: taskResult.data.isArchived,
      isCompleted: taskResult.data.isCompleted,
      taskName: taskResult.data.taskName,
      taskSort: taskResult.data.taskSort,
      todoCategoryId: taskResult.data.todoCategoryId,
      todoPriorityId: taskResult.data.todoPriorityId,
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
    const result =
      isEditMode.value && props.id
        ? await taskStore.update(props.id, toPayload())
        : await taskStore.create(toPayload())

    if (result.errors) {
      backendErrors.value = result.errors
      return
    }

    await router.push({ name: 'tasks' })
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.id, loadTask, { immediate: true })
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
          {{ isEditMode ? 'Update the details, status, or deadline for this task.' : 'Add a task and choose where it belongs.' }}
        </p>
      </div>

      <RouterLink class="button-ghost" :to="{ name: 'tasks' }">
        Back to tasks
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
      title="Could not load task data"
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
        <span class="form-label">Task name</span>
        <input
          v-model.trim="form.taskName"
          class="text-input"
          placeholder="Prepare report, review code, call client..."
          type="text"
        />
      </label>

      <div class="form-grid two-columns">
        <label class="form-field">
          <span class="form-label">Category</span>
          <select v-model="form.todoCategoryId" class="select-input">
            <option value="">Select a category</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.categoryName ?? 'Untitled' }}
            </option>
          </select>
        </label>

        <label class="form-field">
          <span class="form-label">Priority</span>
          <select v-model="form.todoPriorityId" class="select-input">
            <option value="">Select a priority</option>
            <option
              v-for="priority in priorities"
              :key="priority.id"
              :value="priority.id"
            >
              {{ priority.priorityName ?? 'Untitled' }}
            </option>
          </select>
        </label>
      </div>

      <div class="form-grid two-columns">
        <label class="form-field">
          <span class="form-label">Sort order</span>
          <input
            v-model.number="form.taskSort"
            class="text-input"
            min="0"
            step="1"
            type="number"
          />
        </label>

        <label class="form-field">
          <span class="form-label">Due date</span>
          <input
            v-model="form.dueDtInput"
            class="text-input"
            type="datetime-local"
          />
        </label>
      </div>

      <div class="checkbox-row">
        <label class="checkbox-card">
          <input v-model="form.isCompleted" type="checkbox" />
          <span>Completed</span>
        </label>

        <label class="checkbox-card">
          <input v-model="form.isArchived" type="checkbox" />
          <span>Archived</span>
        </label>
      </div>

      <div class="button-row">
        <button class="button" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Saving...' : 'Save task' }}
        </button>

        <RouterLink class="button-ghost" :to="{ name: 'tasks' }">
          Cancel
        </RouterLink>
      </div>
    </form>
  </section>
</template>
