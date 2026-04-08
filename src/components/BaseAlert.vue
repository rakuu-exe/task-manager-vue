<script setup lang="ts">
withDefaults(
  defineProps<{
    messages: string[]
    title?: string
    variant?: 'error' | 'info' | 'success'
  }>(),
  {
    title: '',
    variant: 'error',
  },
)
</script>

<template>
  <div class="base-alert" :class="`base-alert--${variant}`" role="alert">
    <p v-if="title" class="base-alert__title">{{ title }}</p>

    <ul class="base-alert__list">
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
  </div>
</template>

<style scoped>
.base-alert {
  padding: 1rem 1.1rem;
  border-radius: 16px;
  border: 1px solid transparent;
}

.base-alert--error {
  color: #9b2226;
  background: rgba(255, 224, 224, 0.9);
  border-color: rgba(201, 42, 42, 0.18);
}

.base-alert--info {
  color: #0b7285;
  background: rgba(215, 239, 244, 0.88);
  border-color: rgba(11, 114, 133, 0.14);
}

.base-alert--success {
  color: #2b8a3e;
  background: rgba(227, 250, 227, 0.9);
  border-color: rgba(43, 138, 62, 0.16);
}

.base-alert__title {
  margin: 0 0 0.6rem;
  font-weight: 700;
}

.base-alert__list {
  margin: 0;
  padding-left: 1.2rem;
}
</style>
