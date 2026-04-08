<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import LoadingIndicator from '../../components/LoadingIndicator.vue'
import { usePrioritiesStore } from '../../stores/priorities'

const priorityStore = usePrioritiesStore()
const actionErrors = ref<string[]>([])

const priorities = computed(() => priorityStore.items)
const errorMessages = computed(() =>
  priorityStore.errorMessage ? [priorityStore.errorMessage] : [],
)

const loadPriorities = async (): Promise<void> => {
  actionErrors.value = []
  await priorityStore.fetchAll()
}

const handleDelete = async (id: string): Promise<void> => {
  actionErrors.value = []

  if (!window.confirm('Delete this priority?')) {
    return
  }

  const result = await priorityStore.delete(id)

  if (result.errors) {
    actionErrors.value = result.errors
  }
}

onMounted(loadPriorities)
</script>

<template>
  <section class="page-card">
    <header class="page-header">
      <div>
        <h1 class="page-title">Priorities</h1>
        <p class="page-subtitle">
          Set the levels you want to use when deciding what to do first.
        </p>
      </div>

      <div class="button-row">
        <button class="button-ghost" type="button" @click="loadPriorities">
          Refresh
        </button>
        <RouterLink class="button" :to="{ name: 'priorities-create' }">
          New priority
        </RouterLink>
      </div>
    </header>

    <BaseAlert
      v-if="errorMessages.length > 0"
      :messages="errorMessages"
      title="Could not load priorities"
    />

    <BaseAlert
      v-if="actionErrors.length > 0"
      :messages="actionErrors"
      title="Action failed"
    />

    <div v-if="priorityStore.isLoading" class="panel">
      <LoadingIndicator />
    </div>

    <div v-else-if="priorities.length === 0" class="empty-state">
      No priorities yet. Add one so tasks can be sorted by importance.
    </div>

    <div v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Sort</th>
            <th>Sync date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="priority in priorities" :key="priority.id">
            <td data-label="Name">{{ priority.priorityName ?? 'Untitled' }}</td>
            <td data-label="Sort">{{ priority.prioritySort }}</td>
            <td data-label="Sync date">{{ priority.syncDt }}</td>
            <td data-label="Actions">
              <div class="actions-cell">
                <RouterLink
                  class="button-secondary"
                  :to="{ name: 'priorities-edit', params: { id: priority.id } }"
                >
                  Edit
                </RouterLink>

                <button
                  class="button-danger"
                  type="button"
                  @click="handleDelete(priority.id)"
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
