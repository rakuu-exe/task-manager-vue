<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppShell from './components/AppShell.vue'

const route = useRoute()
const showNavigation = computed(() => Boolean(route.meta.requiresAuth))
</script>

<template>
  <AppShell v-if="showNavigation">
    <RouterView />
  </AppShell>

  <main v-else class="public-layout">
    <RouterView />
  </main>
</template>
