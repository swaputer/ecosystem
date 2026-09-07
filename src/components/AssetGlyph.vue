<script setup lang="ts">
defineProps<{ asset: string }>();
</script>

<template>
  <svg v-if="asset === 'ETH'" viewBox="0 0 16 26" width="16" height="24" aria-hidden="true">
    <path d="m8 0 8 13-8 5-8-5Z" fill="currentColor" />
    <path d="M8 0v18l8-5Z" fill="var(--muted)" />
    <path d="m0 15 8 5 8-5-8 11Z" fill="currentColor" />
  </svg>
  <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true" shape-rendering="crispEdges">
    <path d="M7 2h10v3h4v14h-4v3H7v-3H3V5h4Z" stroke="#72b9c1" stroke-width="2" />
    <path d="M16 8H9v4h6v4H8" stroke="#72b9c1" stroke-width="2" />
  </svg>
</template>
