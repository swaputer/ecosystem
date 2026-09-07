<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from "vue";
import { Search, X } from "@lucide/vue";
import { apps, type AppId } from "@/lib/apps";
import AppIcon from "./AppIcon.vue";
const emit = defineEmits<{ open: [id: AppId]; close: [] }>();
const query = ref('');
const search = ref<HTMLInputElement>();
const results = computed(() => apps.filter(app => app.name.toLowerCase().includes(query.value.toLowerCase().trim())));
const previous = document.activeElement as HTMLElement | null;
onMounted(async () => { await nextTick(); search.value?.focus(); });
onBeforeUnmount(() => previous?.focus());
async function resetSearch() {
  query.value = '';
  await nextTick(); search.value?.focus();
}
function trap(e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const targets = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button,input')].filter(el => !el.hasAttribute('disabled'));
  if (e.shiftKey && document.activeElement === targets[0]) { e.preventDefault(); targets.at(-1)?.focus(); }
  else if (!e.shiftKey && document.activeElement === targets.at(-1)) { e.preventDefault(); targets[0]?.focus(); }
}
</script>
<template>
  <div class="os-library-backdrop" @click.self="emit('close')">
    <section class="os-library" role="dialog" aria-modal="true" aria-labelledby="library-title" @keydown.esc.stop="emit('close')" @keydown="trap">
      <header><h1 id="library-title">Applications</h1><button aria-label="Close applications" class="os-quiet-button" @click="emit('close')"><X :size="20" /></button></header>
      <label class="os-library-search"><Search :size="20" /><input ref="search" v-model="query" placeholder="Search applications" aria-label="Search applications" /><kbd>esc</kbd></label>
      <div class="os-library-apps"><button v-for="app in results" :key="app.id" class="os-library-app" @click="emit('open', app.id)"><AppIcon :app="app.id" /><strong>{{ app.name }}</strong></button></div>
      <p v-if="!results.length" class="os-library-empty">No applications match “{{ query }}”. <button @click="resetSearch">Show all apps</button></p>
      <footer>{{ apps.length }} apps installed <span>Built for Swaputer</span></footer>
    </section>
  </div>
</template>
