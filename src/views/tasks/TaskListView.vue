<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import LoadingIndicator from '../../components/LoadingIndicator.vue'
import { useTasksStore } from '../../stores/tasks'

const taskStore = useTasksStore()
const actionErrors = ref<string[]>([])

const tasks = computed(() => taskStore.items)
const errorMessages = computed(() =>
  taskStore.errorMessage ? [taskStore.errorMessage] : [],
)

const categoryMap = computed(
  () =>
    new Map(
      taskStore.availableCategories.map((category) => [
        category.id,
        category.categoryName ?? 'Untitled',
      ]),
    ),
)

const priorityMap = computed(
  () =>
    new Map(
      taskStore.availablePriorities.map((priority) => [
        priority.id,
        priority.priorityName ?? 'Untitled',
      ]),
    ),
)

const loadTasks = async (): Promise<void> => {
  actionErrors.value = []
  await taskStore.loadFormOptions()
  await taskStore.fetchAll()
}

const handleDelete = async (id: string): Promise<void> => {
  actionErrors.value = []

  if (!window.confirm('Delete this task?')) {
    return
  }

  const result = await taskStore.delete(id)

  if (result.errors) {
    actionErrors.value = result.errors
  }
}

onMounted(loadTasks)
</script>

<template>
  <section class="page-card">
    <header class="page-header">
      <div>
        <h1 class="page-title">Tasks</h1>
        <p class="page-subtitle">
          See everything in one place and update tasks as you go.
        </p>
      </div>

      <div class="button-row">
        <button class="button-ghost" type="button" @click="loadTasks">
          Refresh
        </button>
        <RouterLink class="button" :to="{ name: 'tasks-create' }">
          New task
        </RouterLink>
      </div>
    </header>

    <BaseAlert
      v-if="errorMessages.length > 0"
      :messages="errorMessages"
      title="Could not load tasks"
    />

    <BaseAlert
      v-if="actionErrors.length > 0"
      :messages="actionErrors"
      title="Action failed"
    />

    <div v-if="taskStore.isLoading" class="panel">
      <LoadingIndicator />
    </div>

    <div v-else-if="tasks.length === 0" class="empty-state">
      No tasks yet. Add one to start building your list.
    </div>

    <div v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Priority</th>
            <th>State</th>
            <th>Due date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="task in tasks" :key="task.id">
            <td data-label="Name">{{ task.taskName ?? 'Untitled' }}</td>
            <td data-label="Category">
              {{ categoryMap.get(task.todoCategoryId) ?? task.todoCategoryId }}
            </td>
            <td data-label="Priority">
              {{ priorityMap.get(task.todoPriorityId) ?? task.todoPriorityId }}
            </td>
            <td data-label="State">
              <span
                class="status-pill"
                :class="task.isCompleted ? 'success' : 'danger'"
              >
                {{ task.isCompleted ? 'Completed' : 'Open' }}
              </span>

              <span v-if="task.isArchived" class="status-pill danger">
                Archived
              </span>
            </td>
            <td data-label="Due date">{{ task.dueDt ?? 'No due date' }}</td>
            <td data-label="Actions">
              <div class="actions-cell">
                <RouterLink
                  class="button-secondary"
                  :to="{ name: 'tasks-edit', params: { id: task.id } }"
                >
                  Edit
                </RouterLink>

                <button
                  class="button-danger"
                  type="button"
                  @click="handleDelete(task.id)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
