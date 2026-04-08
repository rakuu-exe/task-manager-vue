<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import BaseAlert from '../../components/BaseAlert.vue'
import LoadingIndicator from '../../components/LoadingIndicator.vue'
import { useCategoriesStore } from '../../stores/categories'

const categoryStore = useCategoriesStore()
const actionErrors = ref<string[]>([])

const categories = computed(() => categoryStore.items)
const errorMessages = computed(() =>
  categoryStore.errorMessage ? [categoryStore.errorMessage] : [],
)

const loadCategories = async (): Promise<void> => {
  actionErrors.value = []
  await categoryStore.fetchAll()
}

const handleDelete = async (id: string): Promise<void> => {
  actionErrors.value = []

  if (!window.confirm('Delete this category?')) {
    return
  }

  const result = await categoryStore.delete(id)

  if (result.errors) {
    actionErrors.value = result.errors
  }
}

onMounted(loadCategories)
</script>

<template>
  <section class="page-card">
    <header class="page-header">
      <div>
        <h1 class="page-title">Categories</h1>
        <p class="page-subtitle">
          Create and organize the groups your tasks belong to.
        </p>
      </div>

      <div class="button-row">
        <button class="button-ghost" type="button" @click="loadCategories">
          Refresh
        </button>
        <RouterLink class="button" :to="{ name: 'categories-create' }">
          New category
        </RouterLink>
      </div>
    </header>

    <BaseAlert
      v-if="errorMessages.length > 0"
      :messages="errorMessages"
      title="Could not load categories"
    />

    <BaseAlert
      v-if="actionErrors.length > 0"
      :messages="actionErrors"
      title="Action failed"
    />

    <div v-if="categoryStore.isLoading" class="panel">
      <LoadingIndicator />
    </div>

    <div v-else-if="categories.length === 0" class="empty-state">
      No categories yet. Add your first one to get started.
    </div>

    <div v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Sort</th>
            <th>Tag</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="category in categories" :key="category.id">
            <td data-label="Name">{{ category.categoryName ?? 'Untitled' }}</td>
            <td data-label="Sort">{{ category.categorySort }}</td>
            <td data-label="Tag">{{ category.tag ?? 'None' }}</td>
            <td data-label="Actions">
              <div class="actions-cell">
                <RouterLink
                  class="button-secondary"
                  :to="{ name: 'categories-edit', params: { id: category.id } }"
                >
                  Edit
                </RouterLink>

                <button
                  class="button-danger"
                  type="button"
                  @click="handleDelete(category.id)"
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
