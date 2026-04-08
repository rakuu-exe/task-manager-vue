<template>
  <div class="loading-indicator" role="status" aria-live="polite">
    <span class="loading-indicator__dot" />
    <span>Loading...</span>
  </div>
</template>

<style scoped>
.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.loading-indicator__dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background: var(--brand);
  animation: pulse 0.9s ease-in-out infinite alternate;
}

@keyframes pulse {
  from {
    opacity: 0.45;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1.1);
  }
}
</style>
