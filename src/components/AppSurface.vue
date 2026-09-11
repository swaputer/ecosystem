<script setup lang="ts">
import { computed, onBeforeUnmount, provide, reactive, watch } from "vue";
import { createRouter, createMemoryHistory, routerKey, routeLocationKey, routerViewLocationKey, RouterView, START_LOCATION } from "vue-router";
import { explorerURL, type AppId } from "@/lib/apps";
const props = defineProps<{ app: AppId; path: string }>();
const emit = defineEmits<{ navigate: [path: string] }>();
const router = createRouter({ history: createMemoryHistory(), routes: [
  { path: "/minter", component: () => import("@/views/MinterView.vue") },
  { path: "/wallet", component: () => import("@/views/WalletView.vue") },
  { path: "/terminal", component: () => import("@/views/TerminalView.vue") },
  { path: "/:pathMatch(.*)*", component: { template: '<p>Application not found.</p>' } }
] });
// Each desktop app owns its navigation and preserves its state while mounted.
const route = {} as typeof START_LOCATION;
for (const key in START_LOCATION) Object.defineProperty(route, key, { enumerable: true, get: () => router.currentRoute.value[key as keyof typeof START_LOCATION] });
provide(routerKey, router);
provide(routeLocationKey, reactive(route));
provide(routerViewLocationKey, router.currentRoute);
const removeGuard = router.beforeEach(to => {
  if (/^\/(contract|address|tx)\//.test(to.path)) { window.open(explorerURL(to.fullPath), "_blank", "noopener,noreferrer"); return false; }
  return true;
});
const removeAfter = router.afterEach((to, _from, failure) => { if (!failure) emit("navigate", to.fullPath); });
watch(() => props.path, path => { if (router.currentRoute.value.fullPath !== path) void router.replace(path); }, { immediate: true });
const ready = computed(() => router.currentRoute.value.matched.length > 0);
onBeforeUnmount(() => { removeGuard(); removeAfter(); router.options.history.destroy(); });
</script>
<template><RouterView v-if="ready" v-slot="{ Component, route: current }"><component :is="Component" :key="current.path" /></RouterView></template>
