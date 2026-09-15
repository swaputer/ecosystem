<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ArrowUpRight, CircleDashed, Search, Send, X } from "@lucide/vue";
import AppIcon from "@/components/AppIcon.vue";
import AppSurface from "@/components/AppSurface.vue";
import AppToast from "@/components/AppToast.vue";
import { useWallet } from "@/composables/useWallet";
import { useChainAction } from "@/composables/useChainAction";
import {
  appForPath,
  canonicalUrl,
  docsBase,
  explorerBase,
  explorerURL,
  loadCatalogApps,
  submitApplication,
  type AppId,
  type EcosystemApp,
  studioBase,
} from "@/lib/apps";

const wallet = useWallet();
const chainAction = useChainAction();
const recoveryUrl = computed(() => chainAction.unresolvedHash.value ? explorerURL(`/tx/${chainAction.unresolvedHash.value}`) : "");
const query = ref("");
const category = ref("All");
const submitOpen = ref(false);
const submitting = ref(false);
const submitError = ref("");
const submitMessage = ref("");
const avatarFailed = ref<Record<string, true>>({});
const submitName = ref("");
const submitDomain = ref("");
const submitCategory = ref("");
const submitIcon = ref("");
const loadingApps = ref(true);
const apps = ref<EcosystemApp[]>([]);
const active = ref<string | null>(null);
const activePath = ref("");
const headerScrolled = ref(false);
const routePath = ref(window.location.hash.slice(1) || "/");

const categories = computed(() => {
  const set = new Set(["All"]);
  for (const app of apps.value) set.add(app.category || "Tools");
  return [...set];
});

const visibleApps = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return apps.value.filter(app => {
    const categoryMatch = category.value === "All" || app.category === category.value;
    const queryMatch = !needle || `${app.name} ${app.domain} ${app.description || ""} ${app.category}`.toLowerCase().includes(needle);
    return categoryMatch && queryMatch;
  });
});

const activeApp = computed<EcosystemApp & { appId: AppId } | null>(() => {
  const target = apps.value.find(app => app.id === active.value);
  if (!target?.appId || target.external) return null;
  return target as EcosystemApp & { appId: AppId };
});

function appUrl(app: EcosystemApp): string {
  return canonicalUrl(app);
}

function openApp(app: EcosystemApp, path?: string) {
  if (!app) return;
  if (app.external || !app.appId) {
    closeApp();
    const link = appUrl(app);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    return;
  }
  active.value = app.id;
  const nextPath = path || app.path || "/";
  activePath.value = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  routePath.value = activePath.value;
  history.replaceState(null, "", `#${activePath.value}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeApp() {
  active.value = null;
  activePath.value = "";
  routePath.value = "/";
  history.replaceState(null, "", "#/");
}

function navigated(path: string) {
  activePath.value = path;
  routePath.value = path;
  history.replaceState(null, "", `#${path}`);
}

function closeSubmitModal() {
  submitOpen.value = false;
  submitError.value = "";
  submitMessage.value = "";
}

function setAvatarFailed(id: string) {
  if (avatarFailed.value[id]) return;
  avatarFailed.value = { ...avatarFailed.value, [id]: true };
}

function shouldShowIcon(app: EcosystemApp): boolean {
  return !!app.icon && !avatarFailed.value[app.id];
}

function syncRoute() {
  const nextPath = window.location.hash.slice(1) || "/";
  routePath.value = nextPath;

  const app = appForPath(nextPath);
  if (app && app.appId) {
    openApp(app, nextPath);
    return;
  }

  closeApp();
}

function fallbackDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^(https?:\/\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

async function loadApps() {
  loadingApps.value = true;
  try {
    apps.value = await loadCatalogApps();
  } finally {
    loadingApps.value = false;
  }
}

async function publishApplication() {
  const name = submitName.value.trim();
  const domain = submitDomain.value.trim();
  const categoryValue = submitCategory.value.trim() || "Tools";
  const icon = submitIcon.value.trim();

  if (!name) {
    submitError.value = "Please enter an application name.";
    return;
  }
  if (!domain) {
    submitError.value = "Please enter a domain or full URL.";
    return;
  }
  if (!submitCategory.value.trim()) submitCategory.value = "Tools";

  submitting.value = true;
  submitError.value = "";
  submitMessage.value = "";
  try {
    await submitApplication({
      id: `submit-${Date.now()}`,
      name,
      domain,
      category: categoryValue,
      external: true,
      url: fallbackDomain(domain),
      icon: icon || undefined,
      path: undefined,
    });
    await loadApps();
    submitMessage.value = "Published successfully. Your application is now listed.";
    submitName.value = "";
    submitDomain.value = "";
    submitCategory.value = "";
    submitIcon.value = "";
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : "Failed to submit. Please try again.";
  } finally {
    submitting.value = false;
  }
}

function updateHeaderScroll() {
  headerScrolled.value = window.scrollY > 4;
}

let balanceClock: ReturnType<typeof setInterval>;
watch(wallet.connected, connected => {
  if (connected) void wallet.refreshBalance();
});

onMounted(() => {
  void loadApps();
  balanceClock = setInterval(() => { if (wallet.connected.value) void wallet.refreshBalance(); }, 15_000);
  updateHeaderScroll();
  window.addEventListener("scroll", updateHeaderScroll, { passive: true });
  window.addEventListener("hashchange", syncRoute);
  syncRoute();
});

onBeforeUnmount(() => {
  clearInterval(balanceClock);
  window.removeEventListener("scroll", updateHeaderScroll);
  window.removeEventListener("hashchange", syncRoute);
});
</script>

<template>
  <div class="ecosystem">
    <header class="ecosystem-header" :class="{ 'ecosystem-header--scrolled': headerScrolled }">
      <a class="ecosystem-brand" href="#/" @click.prevent="closeApp">
        <img src="/swaputer-mark.png" alt="" />
        <span>Swaputer</span>
      </a>
      <nav class="ecosystem-nav" aria-label="Primary navigation">
        <a :class="{ active: !activeApp }" href="#/" @click.prevent="closeApp">Ecosystem</a>
        <a :href="explorerBase" target="_blank" rel="noreferrer">Explore</a>
        <a :href="docsBase" target="_blank" rel="noreferrer">Docs</a>
        <a :href="studioBase" target="_blank" rel="noreferrer">Studio</a>
      </nav>
      <div class="ecosystem-actions">
        <button type="button" class="ecosystem-submit-trigger" @click="submitOpen = true">Submit app</button>
      </div>
    </header>

    <main class="ecosystem-main" :class="{ 'ecosystem-main--app': activeApp }">
      <a v-if="chainAction.unresolvedHash.value" class="ecosystem-recovery" :href="recoveryUrl" target="_blank" rel="noreferrer">
        Confirmation unknown. Verify the submitted transaction in Explore before retrying.
      </a>

      <template v-if="!activeApp">
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
            <p v-if="loadingApps" class="ecosystem-empty">Loading applications…</p>
            <button
              v-for="app in visibleApps"
              :key="app.id"
              type="button"
              class="ecosystem-app-row"
              @click="openApp(app)"
            >
              <span class="ecosystem-app-avatar">
                <img v-if="shouldShowIcon(app)" :src="app.icon" :alt="`${app.name} avatar`" @error="() => setAvatarFailed(app.id)" />
                <AppIcon v-else-if="app.appId" :app="app.appId" small />
                <i v-else>{{ app.name.slice(0, 1).toUpperCase() }}</i>
              </span>
              <span class="ecosystem-app-copy">
                <strong>{{ app.name }}</strong>
                <small>{{ app.external ? app.domain : app.description }}</small>
              </span>
              <span class="ecosystem-chip">{{ app.category }}</span>
              <ArrowUpRight :size="20" />
            </button>
            <p v-if="!visibleApps.length" class="ecosystem-empty">No apps found.</p>
          </div>
        </section>
      </template>

      <section v-else class="ecosystem-app-page" :aria-label="`${activeApp.name} app`">
        <div class="ecosystem-app-body">
          <AppSurface :key="`${activeApp.id}-${wallet.session.value}`" :app="activeApp.appId" :path="activePath" @navigate="navigated" />
        </div>
      </section>

      <p v-if="wallet.error.value" class="ecosystem-wallet-error" role="alert">{{ wallet.error.value }}</p>
    </main>

    <div v-if="submitOpen" class="ecosystem-submit-backdrop" @click.self="closeSubmitModal">
      <form class="ecosystem-submit-form" @submit.prevent="publishApplication">
        <header>
          <div>
            <p>APPLICATIONS</p>
            <h2>Submit an application</h2>
          </div>
          <button type="button" aria-label="Close submit dialog" @click="closeSubmitModal"><X :size="18" /></button>
        </header>
        <label><span>App name</span><input v-model.trim="submitName" placeholder="Your app name" autocomplete="off" /></label>
        <label><span>Domain or URL</span><input v-model.trim="submitDomain" placeholder="example.com" autocomplete="off" /></label>
        <label><span>Category</span><input v-model.trim="submitCategory" placeholder="Tools" autocomplete="off" /></label>
        <label><span>Avatar URL (optional)</span><input v-model.trim="submitIcon" placeholder="https://.../logo.png" autocomplete="off" /></label>
        <p v-if="submitError" class="ecosystem-submit-error" role="alert">{{ submitError }}</p>
        <p v-if="submitMessage" class="ecosystem-submit-success">{{ submitMessage }}</p>
        <button type="submit" :disabled="submitting">
          <CircleDashed v-if="submitting" :size="14" class="spin" />
          <Send v-else :size="14" />
          {{ submitting ? "Publishing…" : "Publish app" }}
        </button>
      </form>
    </div>
    <AppToast />
  </div>
</template>
