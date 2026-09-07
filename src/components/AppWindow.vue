<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { X, Minus, Maximize2, ChevronLeft } from "@lucide/vue";
import AppIcon from "./AppIcon.vue";
import type { AppId } from "@/lib/apps";
const props = defineProps<{ app: AppId; name: string; active: boolean; order: number; index: number; mobile: boolean }>();
const emit = defineEmits<{ focus: []; close: []; minimize: [] }>();
const preferredWidth: Record<AppId, number> = { mint: 860, market: 900, bridge: 860, terminal: 840, browser: 800 };
const preferredHeight: Record<AppId, number> = { mint: 650, market: 660, bridge: 650, terminal: 620, browser: 620 };
const desktopTop = 48;
const desktopBottom = 112;
const width = ref(Math.max(580, Math.min(preferredWidth[props.app], window.innerWidth - 48)));
const height = ref(Math.max(340, Math.min(preferredHeight[props.app], window.innerHeight - desktopTop - desktopBottom)));
const x = ref((window.innerWidth - width.value) / 2);
// The window is positioned inside .os-desktop, whose origin already starts below the menu bar.
const y = ref(Math.max(0, (window.innerHeight - desktopTop - desktopBottom - height.value) / 2));
const maximized = ref(false);
const frame = ref<HTMLElement>();
function fitViewport() {
  if (window.innerWidth <= 760) return;
  width.value = Math.max(580, Math.min(width.value, window.innerWidth - 48));
  height.value = Math.max(340, Math.min(height.value, window.innerHeight - desktopTop - desktopBottom));
  x.value = (window.innerWidth - width.value) / 2;
  y.value = Math.max(0, (window.innerHeight - desktopTop - desktopBottom - height.value) / 2);
}
onMounted(() => { fitViewport(); window.addEventListener('resize', fitViewport); });
onBeforeUnmount(() => window.removeEventListener('resize', fitViewport));
const style = computed(() => props.mobile || maximized.value ? { zIndex: props.order } : { left: `${x.value}px`, top: `${y.value}px`, width: `${width.value}px`, height: `${height.value}px`, zIndex: props.order });
function start(event: PointerEvent, resize = false) {
  if (props.mobile || maximized.value || event.button !== 0) return;
  if (!resize && (event.target as HTMLElement).closest('button')) return;
  emit('focus');
  const el = event.currentTarget as HTMLElement;
  el.setPointerCapture(event.pointerId);
  const initial = { x: x.value, y: y.value, width: width.value, height: height.value, px: event.clientX, py: event.clientY };
  const move = (e: PointerEvent) => {
    if (resize) {
      width.value = Math.max(580, Math.min(window.innerWidth - x.value - 12, initial.width + e.clientX - initial.px));
      height.value = Math.max(340, Math.min(window.innerHeight - y.value - 120, initial.height + e.clientY - initial.py));
    } else {
      x.value = Math.max(0, Math.min(window.innerWidth - 240, initial.x + e.clientX - initial.px));
      y.value = Math.max(0, Math.min(window.innerHeight - 210, initial.y + e.clientY - initial.py));
    }
  };
  const end = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
function nudge(event: KeyboardEvent) {
  if (!event.altKey || props.mobile) return;
  const delta: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
  const step = delta[event.key]; if (!step) return;
  event.preventDefault(); x.value = Math.max(0, Math.min(window.innerWidth - 240, x.value + step[0])); y.value = Math.max(0, Math.min(window.innerHeight - 210, y.value + step[1]));
}
</script>
<template>
  <section ref="frame" :class="['os-window', `os-window--${app}`, { 'is-active': active, 'is-maximized': maximized }]" :style="style" :aria-label="`${name} app`" @pointerdown="emit('focus')" @focusin="emit('focus')">
    <header class="os-window-titlebar" @pointerdown="start" @dblclick.self="maximized = !maximized" @keydown="nudge" tabindex="0" :aria-label="`${name} window. Alt and arrow keys to move.`">
      <div class="os-window-controls"><button type="button" title="Close" aria-label="Close app" class="control-close" @pointerdown.stop @click.stop="emit('close')"><X /></button><button type="button" title="Minimize" aria-label="Minimize app" class="control-minimize" @pointerdown.stop @click.stop="emit('minimize')"><Minus /></button><button type="button" title="Maximize" aria-label="Toggle maximize" class="control-maximize" @pointerdown.stop @click.stop="maximized = !maximized"><Maximize2 /></button></div>
      <button class="os-mobile-back" aria-label="Home" @click="emit('minimize')"><ChevronLeft :size="20" />Home</button>
      <span class="os-window-name"><AppIcon :app="app" small />{{ name }}</span><span class="os-window-grip" aria-hidden="true"></span>
    </header>
    <div class="os-window-content"><slot /></div>
    <div v-if="!mobile && !maximized" class="os-resize" @pointerdown.stop="start($event, true)" aria-hidden="true"></div>
  </section>
</template>
