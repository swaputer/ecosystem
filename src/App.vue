<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from "vue";
import { Power, LockKeyhole, Copy, Check, LoaderCircle, Layers, X, Signal, Wifi, BatteryFull } from "@lucide/vue";
import AppIcon from "@/components/AppIcon.vue";
import SystemWallpaper from "@/components/SystemWallpaper.vue";
import WalletWidget from "@/components/WalletWidget.vue";
import AppWindow from "@/components/AppWindow.vue";
import AppSurface from "@/components/AppSurface.vue";
import AppLibrary from "@/components/AppLibrary.vue";
import AppToast from "@/components/AppToast.vue";
import { useWallet } from "@/composables/useWallet";
import { apps, appForPath, explorerBase, type AppId } from "@/lib/apps";
import { NETWORK } from "@/lib/config";
import { short } from "@/lib/protocol";
import { toast } from "@/composables/useToast";
import { formatWalletBalance } from "@/lib/walletBalance";

const wallet = useWallet();
const mobileQuery = window.matchMedia('(max-width: 760px)');
const mobile = ref(mobileQuery.matches);
const now = ref(new Date());
const time = computed(() => now.value.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }));
const walletBalanceText = computed(() => formatWalletBalance(wallet.balance.value, wallet.balanceLoading.value));
const library = ref(false), accountMenu = ref(false), powerConfirm = ref(false), switcher = ref(false), copied = ref(false);
const active = ref<AppId | null>(null);
const booting = ref(false);
let order = 10;
let bootTimer: ReturnType<typeof setTimeout>;
const windows = reactive(Object.fromEntries(apps.map(app => [app.id, { mounted: false, open: false, minimized: false, order: 10, path: app.path }])) as Record<AppId, { mounted: boolean; open: boolean; minimized: boolean; order: number; path: string }>);
const running = computed(() => apps.filter(app => windows[app.id].open).map(app => app.id));
const initialPath = window.location.hash.slice(1);
const location = window.location;

function focus(id: AppId) { if (active.value !== id) { active.value = id; windows[id].order = ++order; } }
function open(id: AppId, path?: string) {
  const app = apps.find(item => item.id === id);
  if (app?.external) {
    window.open(explorerBase, '_blank', 'noopener,noreferrer');
    library.value = false; switcher.value = false;
    return;
  }
  const state = windows[id]; if (!state) return;
  state.mounted = true; state.open = true; state.minimized = false;
  if (path) state.path = path;
  focus(id); library.value = false; switcher.value = false;
  history.replaceState(null, '', `#${state.path}`);
}
function home() {
  active.value = null; library.value = false; switcher.value = false;
  if (!mobile.value) for (const state of Object.values(windows)) if (state.open) state.minimized = true;
  history.replaceState(null, '', '#/');
}
function hide(id: AppId, close = false) {
  windows[id].minimized = true;
  if (close) { windows[id].open = false; windows[id].mounted = false; }
  if (active.value === id) {
    active.value = mobile.value ? null : apps.filter(app => windows[app.id].open && !windows[app.id].minimized).sort((a, b) => windows[b.id].order - windows[a.id].order)[0]?.id ?? null;
    history.replaceState(null, '', `#${active.value ? windows[active.value].path : '/'}`);
  }
}
function navigated(id: AppId, path: string) { windows[id].path = path; if (active.value === id) history.replaceState(null, '', `#${path}`); }
function hashchange() { const path = location.hash.slice(1); const app = appForPath(path); if (wallet.connected.value && app) open(app.id, path); else if (path === '/') home(); }
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); copied.value = true; setTimeout(() => copied.value = false, 1500); }
  catch { toast.error('Could not copy. Select the address or URL and copy it manually.'); }
}
function shutdown() { wallet.disconnect(); accountMenu.value = false; powerConfirm.value = false; }
function shortcuts(event: KeyboardEvent) {
  if (!wallet.connected.value) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); library.value = !library.value; }
  if (event.key === 'Escape') { accountMenu.value = false; powerConfirm.value = false; switcher.value = false; }
}
function resize(event: MediaQueryListEvent) {
  mobile.value = event.matches;
  if (event.matches) { accountMenu.value = false; powerConfirm.value = false; }
}
watch(wallet.connected, connected => {
  clearTimeout(bootTimer);
  if (connected) {
    booting.value = true;
    bootTimer = setTimeout(() => { booting.value = false; const path = location.hash.slice(1) || initialPath; const app = appForPath(path); if (app) open(app.id, path); }, 650);
  } else {
    booting.value = false; active.value = null; library.value = false; switcher.value = false; accountMenu.value = false; powerConfirm.value = false;
    for (const app of apps) Object.assign(windows[app.id], { mounted: false, open: false, minimized: false, path: app.path });
  }
});
let clock: ReturnType<typeof setInterval>, balanceClock: ReturnType<typeof setInterval>;
onMounted(() => {
  clock = setInterval(() => now.value = new Date(), 1000);
  balanceClock = setInterval(() => { if (wallet.connected.value) void wallet.refreshBalance(); }, 15_000);
  mobileQuery.addEventListener('change', resize); window.addEventListener('keydown', shortcuts); window.addEventListener('hashchange', hashchange);
});
onBeforeUnmount(() => { clearInterval(clock); clearInterval(balanceClock); clearTimeout(bootTimer); mobileQuery.removeEventListener('change', resize); window.removeEventListener('keydown', shortcuts); window.removeEventListener('hashchange', hashchange); });
</script>

<template>
  <div :class="['computer', { 'is-mobile': mobile, 'has-active-app': active && !library && !switcher }]">
    <SystemWallpaper />
    <main v-if="!wallet.connected.value || booting" class="os-standby">
      <div class="os-standby-status" aria-hidden="true"><time>{{ time }}</time><span class="os-standby-island"></span><span><Signal :size="15" /><Wifi :size="15" /><BatteryFull :size="17" /></span></div>
      <header class="os-standby-brand"><img src="/swaputer-mark.png" alt="" /><span>Swaputer</span></header>
      <section class="os-power-area" aria-labelledby="standby-title">
        <div class="os-boot-avatar" aria-hidden="true"><img src="/swaputer-mark.png" alt="" /></div>
        <h1 id="standby-title">Swaputer</h1>
        <p class="os-power-message">{{ booting ? 'Preparing your desktop…' : wallet.connecting.value ? 'Approve the connection request to continue' : 'Connect wallet to continue' }}</p>
        <button class="os-power" :disabled="wallet.connecting.value || booting" aria-label="Power on and connect wallet" @click="wallet.connect"><LoaderCircle v-if="wallet.connecting.value || booting" class="spin" :size="20" /><Power v-else :size="20" /><span>{{ booting ? 'Starting…' : wallet.connecting.value ? 'Waiting…' : 'Power on' }}</span></button>
        <p v-if="wallet.error.value" class="os-connection-error" role="alert">{{ wallet.error.value }}<button v-if="!wallet.connecting.value" @click="copy(location.href)">{{ copied ? 'Copied' : 'Copy app link' }}</button></p>
      </section>
      <footer class="os-standby-footer"><span><i></i>{{ NETWORK.displayName }}</span><span><LockKeyhole :size="12" />Connecting never sends a transaction</span></footer>
      <span class="os-standby-home-indicator" aria-hidden="true"></span>
    </main>
    <template v-else>
      <header class="os-menubar">
        <div class="os-menu-left"><div class="os-brand"><img src="/swaputer-mark.png" alt="" /><b>Swaputer</b></div></div>
        <div class="os-menu-right"><WalletWidget v-if="!mobile" :balance="wallet.balance.value" :loading="wallet.balanceLoading.value" :network="NETWORK.displayName" @open="accountMenu = !accountMenu; wallet.refreshBalance()" /><time>{{ time }}</time><span class="os-status-icons" aria-hidden="true"><Signal :size="15" /><Wifi :size="15" /><BatteryFull :size="17" /></span><button v-if="!mobile" class="os-power-control" type="button" aria-label="Power off" @click="powerConfirm = true; accountMenu = false"><Power :size="15" /></button></div>
      </header>
      <div v-if="accountMenu" class="os-menu-dismiss" @click="accountMenu = false"></div>
      <aside v-if="accountMenu && !mobile" class="os-wallet-panel" role="dialog" aria-label="Wallet details">
        <header class="os-wallet-panel-header">
          <span class="os-wallet-connected"><i></i>{{ NETWORK.displayName }}</span>
          <button type="button" aria-label="Close wallet details" @click="accountMenu = false"><X :size="16" /></button>
        </header>
        <div class="os-wallet-panel-body">
          <section class="os-wallet-panel-identity">
            <span><small>ACCOUNT</small><code>{{ short(wallet.address.value!, 12, 8) }}</code></span>
            <button type="button" :aria-label="copied ? 'Address copied' : 'Copy wallet address'" @click="copy(wallet.address.value!)"><Check v-if="copied" :size="16" /><Copy v-else :size="16" /></button>
          </section>
          <section class="os-wallet-panel-balance">
            <small>ETH BALANCE</small>
            <strong><span>{{ walletBalanceText }}</span><em>ETH</em></strong>
          </section>
        </div>
        <footer>
          <button type="button" class="os-wallet-disconnect" @click="shutdown"><Power :size="15" />Disconnect</button>
        </footer>
      </aside>
      <main class="os-desktop" :inert="library || switcher || undefined">
        <div class="os-home-content" :class="{ 'mobile-hidden': mobile && active }">
          <div class="os-desktop-icons"><button v-for="app in apps" :key="app.id" class="os-desktop-app" @click="open(app.id)" @keydown.enter.prevent="open(app.id)" @keydown.space.prevent="open(app.id)"><AppIcon :app="app.id" /><span>{{ app.name }}</span></button><button class="os-desktop-app os-library-desktop-icon" @click="library = true" @keydown.enter.prevent="library = true"><AppIcon app="applications" /><span>Applications</span></button></div>
        </div>
        <template v-for="(app, index) in apps" :key="app.id"><AppWindow v-if="windows[app.id].mounted" v-show="windows[app.id].open && !windows[app.id].minimized && (!mobile || active === app.id)" :app="app.id" :name="app.name" :index="index" :order="windows[app.id].order" :active="active === app.id" :mobile="mobile" @focus="focus(app.id)" @close="hide(app.id, true)" @minimize="hide(app.id)"><AppSurface :key="wallet.session.value" :app="app.id" :path="windows[app.id].path" @navigate="navigated(app.id, $event)" /></AppWindow></template>
      </main>
      <nav v-if="!mobile" class="os-dock" aria-label="Application dock"><button v-for="app in apps" :key="app.id" :aria-label="`Open ${app.name}`" :class="{ 'dock-active': active === app.id }" @click="open(app.id)"><AppIcon :app="app.id" /><span class="os-dock-tooltip">{{ app.name }}</span><i v-if="windows[app.id].open"></i></button><button aria-label="Applications" :class="{ 'dock-active': library }" @click="library = !library"><AppIcon app="applications" /><span class="os-dock-tooltip">Applications</span></button></nav>
      <button v-if="mobile && active && !library && !switcher" class="os-mobile-switcher" aria-label="Running apps" @click="switcher = true"><Layers :size="17" /></button>
      <button v-if="mobile" class="os-home-indicator" aria-label="Go to home screen" @click="home"><span></span></button>
      <AppLibrary v-if="library" @open="open" @close="library = false" />
      <div v-if="switcher" class="os-switcher" role="dialog" aria-modal="true" aria-label="Running apps"><header><h2>Running apps</h2><button class="os-quiet-button" aria-label="Close running apps" @click="switcher = false"><X :size="20" /></button></header><div v-for="id in running" :key="id"><button @click="open(id)"><AppIcon :app="id" /><strong>{{ apps.find(app => app.id === id)?.name }}</strong><small>Tap to return</small></button><button :aria-label="`Close ${id}`" @click="hide(id, true)"><X :size="18" /></button></div><p v-if="!running.length">No apps running. Find your apps in Applications.</p></div>
      <div v-if="powerConfirm" class="os-power-confirm-backdrop" @click.self="powerConfirm = false">
        <section class="os-power-confirm" role="alertdialog" aria-modal="true" aria-labelledby="power-confirm-title">
          <AppIcon app="computer" />
          <h2 id="power-confirm-title">Shut down Swaputer?</h2>
          <p>Your open App sessions will close.</p>
          <footer><button type="button" @click="powerConfirm = false">Cancel</button><button type="button" class="os-confirm-power" @click="shutdown"><Power :size="15" />Power off</button></footer>
        </section>
      </div>
    </template>
    <AppToast />
  </div>
</template>
