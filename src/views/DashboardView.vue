<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const quickLinks = [
  {
    description:
      'Create groups like Work, School, or Personal so your tasks stay organized.',
    routeName: 'categories',
    title: 'Categories',
  },
  {
    description: 'Set what matters most first and keep your task list in a clear order.',
    routeName: 'priorities',
    title: 'Priorities',
  },
  {
    description:
      'Add tasks, update progress, and keep deadlines in sight.',
    routeName: 'tasks',
    title: 'Tasks',
  },
]

const greeting = computed(() =>
  authStore.userName ? `Good to see you, ${authStore.userName}.` : 'Good to see you.',
)
</script>

<template>
  <section class="page-card">
    <header class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">{{ greeting }}</p>
      </div>

      <RouterLink class="button" :to="{ name: 'tasks-create' }">
        New task
      </RouterLink>
    </header>

    <section class="panel dashboard-hero">
      <div>
        <p class="dashboard-hero__eyebrow">Start here</p>
        <h2 class="dashboard-hero__title">What do you want to work on?</h2>
      </div>

      <p class="dashboard-hero__copy">
        Choose a section below to add categories, set priorities, or update your
        task list.
      </p>
    </section>

    <section class="dashboard-grid">
      <RouterLink
        v-for="link in quickLinks"
        :key="link.routeName"
        :to="{ name: link.routeName }"
        class="panel dashboard-card"
      >
        <h3>{{ link.title }}</h3>
        <p>{{ link.description }}</p>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.dashboard-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(111, 72, 49, 0.16);
  color: #4f3526;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.65) 0, transparent 34%),
    linear-gradient(135deg, rgba(233, 216, 197, 0.92) 0%, rgba(214, 186, 155, 0.82) 100%);
}

.dashboard-hero__eyebrow {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-dark);
  opacity: 1;
}

.dashboard-hero__title {
  margin: 0.45rem 0 0;
  font-size: clamp(1.5rem, 3vw, 2.15rem);
  line-height: 1.08;
}

.dashboard-hero__copy {
  max-width: 36ch;
  margin: 0;
  color: #6c5545;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.15rem;
}

.dashboard-card {
  border-color: rgba(111, 72, 49, 0.14);
  background:
    linear-gradient(180deg, rgba(255, 252, 248, 0.95) 0%, rgba(247, 238, 227, 0.94) 100%);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
  border-color: rgba(111, 72, 49, 0.24);
}

.dashboard-card h3 {
  margin-top: 0;
  color: #4f3526;
}

.dashboard-card p {
  margin-bottom: 0;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .dashboard-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
