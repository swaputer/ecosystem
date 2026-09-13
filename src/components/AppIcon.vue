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
      <template v-else-if="app === 'wallet'">
        <rect x="5.8" y="8.2" width="20.4" height="16.2" rx="4.2" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.65"/>
        <path d="M8.4 8.3V7.1c0-1.4 1.2-2.5 2.6-2.2l11 2.2c1.1.2 1.8 1.1 1.8 2.2" stroke="rgba(255,255,255,.72)" stroke-width="1.35" stroke-linecap="round"/>
        <path d="M18.8 13.1h7.3v6.6h-7.3c-1.8 0-3.2-1.5-3.2-3.3s1.4-3.3 3.2-3.3Z" fill="currentColor" fill-opacity=".24" stroke="#fff" stroke-width="1.25"/>
        <circle cx="19.3" cy="16.4" r="1.25" fill="currentColor"/>
      </template>
      <template v-else-if="app === 'browser'">
        <circle cx="16" cy="16" r="10" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-width="1.6"/>
        <path d="m19.4 10.2-2.1 7.1-7.1 2.1 2.1-7.1 7.1-2.1Z" fill="currentColor" fill-opacity=".26" stroke="#fff" stroke-width="1.25" stroke-linejoin="round"/>
        <circle cx="14.8" cy="14.8" r="1.8" fill="currentColor"/>
        <path d="M16 6v2.1M16 23.9V26M6 16h2.1M23.9 16H26" stroke="rgba(255,255,255,.5)" stroke-width="1.15" stroke-linecap="round"/>
      </template>
      <template v-else-if="app === 'studio'">
        <path d="M8.5 10.2h15M8.5 16h15M8.5 21.8h15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10.4 7.2h11.2c2 0 3.6 1.6 3.6 3.6v10.4c0 2-1.6 3.6-3.6 3.6H10.4c-2 0-3.6-1.6-3.6-3.6V10.8c0-2 1.6-3.6 3.6-3.6Z" stroke="currentColor" stroke-opacity=".42" stroke-width="1.45"/>
        <circle cx="11.4" cy="10.2" r="1.35" fill="#fff"/>
        <circle cx="20.6" cy="21.8" r="1.35" fill="#fff"/>
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
