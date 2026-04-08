<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const route = useRoute()

const navigationItems = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'categories', label: 'Categories' },
  { name: 'priorities', label: 'Priorities' },
  { name: 'tasks', label: 'Tasks' },
]

const userName = computed(() => authStore.userName ?? 'Your account')

const isActiveRoute = (routeName: string): boolean => {
  if (typeof route.name !== 'string') {
    return false
  }

  return route.name === routeName || route.name.startsWith(`${routeName}-`)
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-shell__sidebar">
      <div>
        <p class="app-shell__eyebrow">Task Vue</p>
        <h1 class="app-shell__title">Task manager</h1>
        <p class="app-shell__summary">
          Keep your tasks, categories, and priorities together in one place.
        </p>
      </div>

      <nav class="app-shell__nav" aria-label="Main navigation">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="app-shell__nav-link"
          :class="{ 'is-active': isActiveRoute(item.name) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="app-shell__footer">
        <div>
          <p class="app-shell__user-label">You are signed in as</p>
          <p class="app-shell__user-name">{{ userName }}</p>
        </div>

        <button
          class="button-ghost app-shell__logout"
          type="button"
          @click="authStore.logout()"
        >
          Logout
        </button>
      </div>
    </aside>

    <div class="app-shell__content">
      <div class="app-shell__content-inner">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
  min-height: 100vh;
}

.app-shell__sidebar {
  display: grid;
  gap: 1.8rem;
  padding: 2rem 1.5rem 1.75rem;
  color: #fff9f1;
  background:
    radial-gradient(circle at top, rgba(255, 243, 228, 0.2) 0, transparent 38%),
    linear-gradient(180deg, #926947 0%, #795338 52%, #603f2c 100%);
  box-shadow: inset -1px 0 0 rgba(255, 244, 232, 0.1);
}

.app-shell__eyebrow,
.app-shell__user-label {
  margin: 0;
  letter-spacing: 0.08em;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.8;
}

.app-shell__title,
.app-shell__user-name {
  margin: 0.35rem 0 0;
  font-size: 1.8rem;
  line-height: 1.1;
}

.app-shell__summary {
  margin: 0.75rem 0 0;
  max-width: 22ch;
  color: rgba(255, 247, 237, 0.84);
}

.app-shell__nav {
  display: grid;
  gap: 0.65rem;
}

.app-shell__nav-link {
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 241, 224, 0.12);
  color: rgba(255, 249, 242, 0.92);
  background: rgba(255, 249, 242, 0.08);
  box-shadow: 0 10px 22px rgba(58, 36, 23, 0.08);
  transition:
    transform 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.app-shell__nav-link:hover,
.app-shell__nav-link.is-active {
  transform: translateX(6px);
  border-color: rgba(255, 241, 224, 0.4);
  color: #573827;
  background: linear-gradient(
    135deg,
    rgba(255, 248, 240, 0.98) 0%,
    rgba(228, 203, 177, 0.95) 100%
  );
}

.app-shell__footer {
  align-self: end;
  display: grid;
  gap: 1rem;
}

.app-shell__content {
  display: flex;
  justify-content: center;
  padding: clamp(1.4rem, 3vw, 2.4rem);
}

.app-shell__content-inner {
  width: min(100%, 1240px);
}

.app-shell__logout {
  width: 100%;
  color: #fff9f1;
  border-color: rgba(255, 243, 228, 0.16);
  background: rgba(53, 33, 22, 0.22);
}

.app-shell__logout:hover {
  color: #573827;
  background: rgba(255, 248, 240, 0.94);
}

@media (max-width: 960px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .app-shell__sidebar {
    gap: 1.25rem;
  }

  .app-shell__summary {
    max-width: none;
  }

  .app-shell__content {
    padding-top: 0;
  }
}
</style>
