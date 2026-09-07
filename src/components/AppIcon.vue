<script setup lang="ts">
defineProps<{ app: string; small?: boolean }>();
</script>

<template>
  <span :class="['os-icon', `os-icon--${app}`, { 'os-icon--small': small }]" aria-hidden="true">
    <img v-if="app === 'computer'" class="os-icon-brand-mark" src="/swaputer-mark.png" alt="" />
    <svg v-else viewBox="0 0 32 32" fill="none">
      <template v-if="app === 'mint'">
        <circle cx="15" cy="17" r="9" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="15" cy="17" r="6.2" stroke="rgba(255,255,255,.42)" stroke-width="1"/>
        <path d="M15 12.7v8.6M12.3 14.6c.6-.9 1.5-1.3 2.8-1.3 1.6 0 2.6.7 2.6 1.8 0 2.7-5.4 1.1-5.4 3.7 0 1.1 1.1 1.9 2.8 1.9 1.4 0 2.4-.5 3-1.4" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>
        <circle cx="23" cy="8.5" r="3.6" fill="#fff" fill-opacity=".94"/>
        <path d="M23 6.8v3.4M21.3 8.5h3.4" stroke="#5b3316" stroke-width="1.15" stroke-linecap="round"/>
      </template>
      <template v-else-if="app === 'market'">
        <path d="M7 24.5h18" stroke="rgba(255,255,255,.3)" stroke-width="1.2" stroke-linecap="round"/>
        <rect x="7.2" y="17" width="3.2" height="6.2" rx="1.4" fill="currentColor" fill-opacity=".65"/>
        <rect x="12.1" y="13.8" width="3.2" height="9.4" rx="1.4" fill="currentColor" fill-opacity=".78"/>
        <rect x="17" y="10.2" width="3.2" height="13" rx="1.4" fill="currentColor" fill-opacity=".9"/>
        <rect x="21.9" y="6.8" width="3.2" height="16.4" rx="1.4" fill="currentColor"/>
        <path d="m7.8 13.4 5-3.4 4.7 1.2 7-5.1" stroke="#fff" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="24.5" cy="6.1" r="1.55" fill="#fff"/>
      </template>
      <template v-else-if="app === 'bridge'">
        <rect x="5.5" y="7.2" width="7.2" height="17.6" rx="3.6" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.7"/>
        <rect x="19.3" y="7.2" width="7.2" height="17.6" rx="3.6" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.7"/>
        <circle cx="9.1" cy="11" r="1.35" fill="#fff"/>
        <circle cx="22.9" cy="21" r="1.35" fill="#fff"/>
        <path d="M9.2 11c7.7 0 6 10 13.6 10M20.4 18.7l2.5 2.3-2.5 2.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22.8 11c-3.6 0-5.3 2.2-6.7 4.5" stroke="rgba(255,255,255,.52)" stroke-width="1.35" stroke-linecap="round"/>
      </template>
      <template v-else-if="app === 'terminal'">
        <path d="m7.5 9.4 6.4 6.6-6.4 6.6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 22.4h7.3" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="23.8" cy="8.2" r="1.2" fill="currentColor" fill-opacity=".8"/>
      </template>
      <template v-else-if="app === 'browser'">
        <circle cx="16" cy="16" r="10" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="1.6"/>
        <path d="m19.4 10.2-2.1 7.1-7.1 2.1 2.1-7.1 7.1-2.1Z" fill="currentColor" fill-opacity=".26" stroke="#fff" stroke-width="1.25" stroke-linejoin="round"/>
        <circle cx="14.8" cy="14.8" r="1.8" fill="currentColor"/>
        <path d="M16 6v2.1M16 23.9V26M6 16h2.1M23.9 16H26" stroke="rgba(255,255,255,.5)" stroke-width="1.15" stroke-linecap="round"/>
      </template>
      <template v-else>
        <rect x="5.5" y="5.5" width="9" height="9" rx="3" fill="currentColor"/>
        <rect x="17.5" y="5.5" width="9" height="9" rx="3" fill="#fff" fill-opacity=".74"/>
        <rect x="5.5" y="17.5" width="9" height="9" rx="3" fill="#fff" fill-opacity=".46"/>
        <rect x="17.5" y="17.5" width="9" height="9" rx="3" fill="currentColor" fill-opacity=".86"/>
        <circle cx="16" cy="16" r="2" fill="#1a1019" stroke="rgba(255,255,255,.28)" stroke-width=".8"/>
      </template>
    </svg>
  </span>
</template>
