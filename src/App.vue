<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { ArrowUpRight, Check, Copy, LoaderCircle, Power, Search, X } from "@lucide/vue";
import AppIcon from "@/components/AppIcon.vue";
import AppSurface from "@/components/AppSurface.vue";
import AppToast from "@/components/AppToast.vue";
import { useWallet } from "@/composables/useWallet";
import { useChainAction } from "@/composables/useChainAction";
import { apps, appForPath, docsBase, explorerBase, explorerURL, studioBase, type AppId } from "@/lib/apps";
import { NETWORK } from "@/lib/config";
import { short } from "@/lib/protocol";
import { toast } from "@/composables/useToast";
import { formatWalletBalance } from "@/lib/walletBalance";

const wallet = useWallet();
const chainAction = useChainAction();
const recoveryUrl = computed(() => chainAction.unresolvedHash.value ? explorerURL(`/tx/${chainAction.unresolvedHash.value}`) : "");
const walletBalanceText = computed(() => formatWalletBalance(wallet.balance.value, wallet.balanceLoading.value));
const copied = ref(false);
const query = ref("");
const category = ref("All");
const active = ref<AppId | null>(null);
const activePath = ref("");
const categories = ["All", "Wallet", "Mint", "Explore", "Developer", "Tools"];
const initialPath = window.location.hash.slice(1);

const visibleApps = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return apps.filter(app => {
    const categoryMatch = category.value === "All" || app.category === category.value;
    const queryMatch = !needle || `${app.name} ${app.label} ${app.category}`.toLowerCase().includes(needle);
    return categoryMatch && queryMatch;
  });
});
const activeApp = computed(() => apps.find(app => app.id === active.value) ?? null);

function externalURL(id: AppId) {
  if (id === "studio") return studioBase;
  return explorerBase;
}
function openApp(id: AppId, path?: string) {
  const app = apps.find(item => item.id === id);
  if (!app) return;
  if (app.external) {
    window.open(externalURL(id), "_blank", "noopener,noreferrer");
    return;
  }
  active.value = id;
  activePath.value = path || app.path;
  history.replaceState(null, "", `#${activePath.value}`);
}
function closeApp() {
  active.value = null;
  activePath.value = "";
  history.replaceState(null, "", "#/");
}
function navigated(path: string) {
  activePath.value = path;
  history.replaceState(null, "", `#${path}`);
}
function hashchange() {
  const path = window.location.hash.slice(1);
  const app = appForPath(path);
  if (app) openApp(app.id, path);
  else if (path === "/") closeApp();
}
async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = true;
    setTimeout(() => copied.value = false, 1500);
  } catch {
    toast.error("Could not copy. Select the address and copy it manually.");
  }
}
function disconnect() {
  wallet.disconnect();
  closeApp();
}

let balanceClock: ReturnType<typeof setInterval>;
watch(wallet.connected, connected => {
  if (connected) void wallet.refreshBalance();
});
onMounted(() => {
  balanceClock = setInterval(() => { if (wallet.connected.value) void wallet.refreshBalance(); }, 15_000);
  window.addEventListener("hashchange", hashchange);
  const app = appForPath(window.location.hash.slice(1) || initialPath);
  if (app) openApp(app.id, window.location.hash.slice(1) || initialPath);
});
onBeforeUnmount(() => {
  clearInterval(balanceClock);
  window.removeEventListener("hashchange", hashchange);
});
</script>

<template>
  <div class="ecosystem">
    <header class="ecosystem-header">
      <a class="ecosystem-brand" href="#/" @click.prevent="closeApp">
        <img src="/swaputer-mark.png" alt="" />
        <span>Swaputer</span>
      </a>
      <nav class="ecosystem-nav" aria-label="Primary navigation">
        <a class="active" href="#/">Ecosystem</a>
        <a :href="explorerBase" target="_blank" rel="noreferrer">Explore</a>
        <a :href="docsBase" target="_blank" rel="noreferrer">Docs</a>
        <a :href="studioBase" target="_blank" rel="noreferrer">Studio</a>
      </nav>
      <div class="ecosystem-actions">
        <div v-if="wallet.connected.value" class="ecosystem-account">
          <button type="button" @click="copy(wallet.address.value!)">
            <Check v-if="copied" :size="15" />
            <Copy v-else :size="15" />
            <span>{{ short(wallet.address.value!, 7, 5) }}</span>
          </button>
          <span class="ecosystem-balance">{{ walletBalanceText }} ETH</span>
          <button type="button" class="ecosystem-icon-button" aria-label="Disconnect wallet" @click="disconnect">
            <Power :size="16" />
          </button>
        </div>
        <button v-else class="ecosystem-connect" type="button" :disabled="wallet.connecting.value" @click="wallet.connect">
          <LoaderCircle v-if="wallet.connecting.value" class="spin" :size="17" />
          <span>{{ wallet.connecting.value ? "Connecting" : "Connect Wallet" }}</span>
        </button>
      </div>
    </header>

    <main class="ecosystem-main">
      <a v-if="chainAction.unresolvedHash.value" class="ecosystem-recovery" :href="recoveryUrl" target="_blank" rel="noreferrer">
        Confirmation unknown. Verify the submitted transaction in Explore before retrying.
      </a>

      <section class="ecosystem-hero" aria-labelledby="ecosystem-title">
        <div class="ecosystem-glyph" aria-hidden="true">
          <i v-for="index in 5" :key="index"></i>
        </div>
        <h1 id="ecosystem-title">Swaputer Ecosystem</h1>
        <p>Protocol apps for exploring, minting, building, and managing on Swaputer.</p>
      </section>

      <section class="ecosystem-directory" aria-label="Swaputer apps">
        <div class="ecosystem-toolbar">
          <div class="ecosystem-filters" aria-label="App categories">
            <button
              v-for="item in categories"
              :key="item"
              type="button"
              :class="{ active: category === item }"
              @click="category = item"
            >
              {{ item }}
            </button>
          </div>
          <label class="ecosystem-search">
            <Search :size="18" />
            <input v-model="query" type="search" placeholder="Search" autocomplete="off" />
          </label>
        </div>

        <div class="ecosystem-app-list">
          <button
            v-for="app in visibleApps"
            :key="app.id"
            type="button"
            class="ecosystem-app-row"
            @click="openApp(app.id)"
          >
            <AppIcon :app="app.id" small />
            <span class="ecosystem-app-copy">
              <strong>{{ app.name }}</strong>
              <small>{{ app.label }}</small>
            </span>
            <span class="ecosystem-chip">{{ app.category }}</span>
            <ArrowUpRight :size="20" />
          </button>
          <p v-if="!visibleApps.length" class="ecosystem-empty">No apps found.</p>
        </div>
      </section>

      <section v-if="activeApp" class="ecosystem-app-panel" :aria-label="`${activeApp.name} app`">
        <header>
          <div>
            <AppIcon :app="activeApp.id" small />
            <span>
              <strong>{{ activeApp.name }}</strong>
              <small>{{ activeApp.label }}</small>
            </span>
          </div>
          <button type="button" aria-label="Close app" @click="closeApp"><X :size="18" /></button>
        </header>
        <div class="ecosystem-app-body">
          <AppSurface :key="`${activeApp.id}-${wallet.session.value}`" :app="activeApp.id" :path="activePath" @navigate="navigated" />
        </div>
      </section>

      <p v-if="wallet.error.value" class="ecosystem-wallet-error" role="alert">{{ wallet.error.value }}</p>
    </main>
    <AppToast />
  </div>
</template>
