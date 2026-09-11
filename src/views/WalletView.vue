<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Check, Copy, LoaderCircle, Plus, RefreshCw, Trash2, WalletCards, X } from "@lucide/vue";
import { formatUnits, getAddress, isAddress, parseUnits } from "ethers";
import { useWallet } from "@/composables/useWallet";
import { useChainAction } from "@/composables/useChainAction";
import { toast } from "@/composables/useToast";
import { explorerApi, subscribeExplorer } from "@/lib/explorer";
import { tokenAmount } from "@/lib/format";
import { explorerURL } from "@/lib/apps";
import { friendlyError, readAccountId, readMiniUint, requiresTransactionReview, short, transferSRC20 } from "@/lib/protocol";
import { NETWORK } from "@/lib/config";

interface WalletAsset {
  readonly programId: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly balance: string;
  readonly totalSupply: string;
}

const wallet = useWallet();
const chainAction = useChainAction();
const storageKey = `swaputer.wallet.tokens.${NETWORK.chainId}`;
const legacyStorageKey = `swaputer.wallet.src20.${NETWORK.chainId}`;
const assets = ref<WalletAsset[]>([]);
const importedIds = ref<string[]>(readImported());
const selectedId = ref("");
const loading = ref(importedIds.value.length > 0);
const loadError = ref("");
const recipient = ref("");
const amount = ref("");
const sending = ref(false);
const transactionHash = ref("");
const phase = ref<"idle" | "pending" | "confirmed">("idle");
const copied = ref(false);
const importOpen = ref(false);
const importId = ref("");
const importing = ref(false);
const importError = ref("");
let unsubscribe: (() => void) | undefined;

const selected = computed(() => assets.value.find((item) => item.programId.toLowerCase() === selectedId.value.toLowerCase()) ?? assets.value[0] ?? null);
const empty = computed(() => !loading.value && assets.value.length === 0 && !loadError.value);
const formattedBalance = computed(() => selected.value ? tokenAmount(selected.value.balance, selected.value.decimals, 8) : "0");
const transactionURL = computed(() => transactionHash.value ? explorerURL(`/tx/${transactionHash.value}`) : "");
const canSend = computed(() => Boolean(selected.value && recipient.value.trim() && amount.value.trim() && !sending.value && !chainAction.busy.value));

function readImported(): string[] {
  try {
    const current = localStorage.getItem(storageKey);
    const value = JSON.parse(current ?? localStorage.getItem(legacyStorageKey) ?? "[]") as unknown;
    return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && /^0x[0-9a-fA-F]{64}$/.test(item)).map((item) => item.toLowerCase()))] : [];
  } catch { return []; }
}

function persistImported() {
  localStorage.setItem(storageKey, JSON.stringify(importedIds.value));
  localStorage.removeItem(legacyStorageKey);
}

function tokenMark(item: WalletAsset): string {
  return (item.symbol || item.name || "T").trim().slice(0, 1).toUpperCase();
}

async function resolveAsset(programId: string, accountId: string): Promise<WalletAsset> {
  const [metadata, balance] = await Promise.all([
    explorerApi.token(programId),
    readMiniUint(programId, "balanceOf(bytes32)", ["bytes32"], [accountId])
  ]);
  return {
    programId,
    name: metadata.name || "Swaputer token",
    symbol: metadata.symbol || "Token",
    decimals: metadata.decimals ?? 18,
    balance: balance.toString(),
    totalSupply: metadata.totalSupply || "0"
  };
}

async function load() {
  const address = wallet.address.value;
  const ids = [...new Set(importedIds.value.map((item) => item.toLowerCase()))];
  if (!address || !ids.length) {
    assets.value = [];
    selectedId.value = "";
    loadError.value = "";
    loading.value = false;
    return;
  }
  loading.value = true;
  loadError.value = "";
  try {
    const accountId = await readAccountId(address);
    const settled = await Promise.allSettled(ids.map((programId) => resolveAsset(programId, accountId)));
    if (wallet.address.value !== address) return;
    const next = settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
    assets.value = next;
    if (!next.some((item) => item.programId.toLowerCase() === selectedId.value.toLowerCase())) selectedId.value = next[0]?.programId ?? "";
    if (!next.length) throw settled.find((item): item is PromiseRejectedResult => item.status === "rejected")?.reason ?? new Error("Tokens could not be loaded.");
  } catch (cause) {
    if (wallet.address.value === address) loadError.value = friendlyError(cause);
  } finally {
    if (wallet.address.value === address) loading.value = false;
  }
}

function openImporter() {
  importId.value = "";
  importError.value = "";
  importOpen.value = true;
}

async function importToken() {
  const candidate = importId.value.trim().toLowerCase();
  if (!/^0x[0-9a-fA-F]{64}$/.test(candidate)) {
    importError.value = "Enter a valid 32-byte token contract ID.";
    return;
  }
  if (importedIds.value.some((item) => item.toLowerCase() === candidate)) {
    importError.value = "This token is already in your wallet.";
    return;
  }
  const address = wallet.address.value;
  if (!address) {
    importError.value = "Reconnect your wallet and try again.";
    return;
  }
  importing.value = true;
  importError.value = "";
  try {
    const accountId = await readAccountId(address);
    const asset = await resolveAsset(candidate, accountId);
    importedIds.value = [...importedIds.value, candidate];
    persistImported();
    assets.value = [...assets.value, asset];
    selectedId.value = candidate;
    importOpen.value = false;
    toast.success("Token imported.");
  } catch (cause) {
    const message = friendlyError(cause);
    importError.value = message.includes("SRC20_NOT_FOUND") || /not found/i.test(message)
      ? "This contract is not a supported Swaputer token."
      : message;
  } finally { importing.value = false; }
}

function removeImported(programId: string) {
  importedIds.value = importedIds.value.filter((item) => item.toLowerCase() !== programId.toLowerCase());
  persistImported();
  assets.value = assets.value.filter((item) => item.programId.toLowerCase() !== programId.toLowerCase());
  if (selectedId.value.toLowerCase() === programId.toLowerCase()) selectedId.value = assets.value[0]?.programId ?? "";
  if (!assets.value.length) importOpen.value = false;
}

function useMaximum() {
  if (selected.value) amount.value = formatUnits(selected.value.balance, selected.value.decimals);
}

async function copyProgram() {
  if (!selected.value) return;
  try {
    await navigator.clipboard.writeText(selected.value.programId);
    copied.value = true;
    setTimeout(() => copied.value = false, 1400);
  } catch { toast.error("Could not copy the token contract ID."); }
}

async function sendToken() {
  const token = selected.value, signer = wallet.signer.value, actor = wallet.address.value;
  if (!token || !signer || !actor || sending.value) return;
  let release: (() => void) | null = null;
  let keepChainLock = false;
  try {
    if (!isAddress(recipient.value.trim())) throw new Error("Enter a valid recipient wallet address.");
    const units = parseUnits(amount.value.trim(), token.decimals);
    if (units <= 0n) throw new Error("Enter an amount greater than zero.");
    if (units > BigInt(token.balance)) throw new Error(`You do not have enough ${token.symbol || "tokens"}.`);
    release = chainAction.acquire();
    if (!release) throw new Error("Another wallet transaction is already in progress.");
    sending.value = true;
    phase.value = "idle";
    transactionHash.value = "";
    await transferSRC20(signer, actor, token.programId, getAddress(recipient.value.trim()), units, (hash) => {
      transactionHash.value = hash;
      phase.value = "pending";
    });
    phase.value = "confirmed";
    amount.value = "";
    recipient.value = "";
    toast.success(`${token.symbol || "Token"} sent.`);
    await load();
  } catch (cause) {
    if (requiresTransactionReview(cause)) {
      keepChainLock = true;
      chainAction.hold(cause.transactionHash);
      transactionHash.value = cause.transactionHash;
    }
    toast.error(friendlyError(cause));
  } finally {
    if (!keepChainLock) release?.();
    sending.value = false;
  }
}

onMounted(() => {
  void load();
  unsubscribe = subscribeExplorer(() => void load());
});
onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
  <main :class="['wallet-app', { 'wallet-app--empty': empty }]">
    <aside class="wallet-sidebar" aria-label="Wallet tokens">
      <header class="wallet-sidebar-toolbar">
        <span class="wallet-sidebar-glyph" aria-hidden="true"><WalletCards :size="20" /></span>
        <div>
          <button type="button" aria-label="Refresh token balances" :disabled="loading" @click="load"><RefreshCw :class="{ spin: loading }" :size="16" /></button>
          <button type="button" aria-label="Import token" @click="openImporter"><Plus :size="18" /></button>
        </div>
      </header>

      <div v-if="loading && !assets.length" class="wallet-sidebar-state"><LoaderCircle class="spin" :size="21" /><span>Loading tokens…</span></div>
      <div v-else-if="loadError && !assets.length" class="wallet-sidebar-state wallet-sidebar-state--error"><strong>Balances are unavailable.</strong><small>{{ loadError }}</small><button type="button" @click="load">Try again</button></div>
      <div v-else-if="assets.length" class="wallet-token-list">
        <button v-for="item in assets" :key="item.programId" type="button" :class="{ selected: selected?.programId === item.programId }" @click="selectedId = item.programId">
          <span class="wallet-token-mark">{{ tokenMark(item) }}</span>
          <span class="wallet-token-copy"><strong>{{ item.symbol || 'Token' }}</strong><small>{{ item.name || 'Swaputer token' }}</small></span>
          <span class="wallet-token-balance"><strong>{{ tokenAmount(item.balance, item.decimals, 6) }}</strong><small>{{ item.symbol || 'Token' }}</small></span>
        </button>
      </div>
      <button v-if="assets.length" type="button" class="wallet-sidebar-import" @click="openImporter"><Plus :size="18" /><span>Import token</span></button>
      <template v-else>
        <button type="button" class="wallet-sidebar-empty-action" aria-label="Import token" @click="openImporter"><Plus :size="21" /></button>
      </template>
    </aside>

    <section class="wallet-detail">
      <template v-if="selected">
        <header class="wallet-token-hero">
          <span class="wallet-token-mark wallet-token-mark--large">{{ tokenMark(selected) }}</span>
          <p>{{ selected.name || 'Swaputer token' }}</p>
          <h2>{{ formattedBalance }} <span>{{ selected.symbol || 'Token' }}</span></h2>
          <div class="wallet-program-pill">
            <a :href="explorerURL(`/contract/${selected.programId}`)" target="_blank" rel="noreferrer"><code>{{ short(selected.programId, 10, 8) }}</code></a>
            <button type="button" :aria-label="copied ? 'Contract ID copied' : 'Copy token contract ID'" @click="copyProgram"><Check v-if="copied" :size="15" /><Copy v-else :size="15" /></button>
          </div>
        </header>

        <form class="wallet-send-card" @submit.prevent="sendToken">
          <h3>Send {{ selected.symbol || 'token' }}</h3>
          <label>
            <span>Recipient</span>
            <input v-model.trim="recipient" inputmode="text" autocomplete="off" spellcheck="false" placeholder="0x wallet address" aria-label="Recipient wallet address" />
          </label>
          <label>
            <span>Amount</span>
            <div class="wallet-amount-field">
              <input v-model.trim="amount" inputmode="decimal" autocomplete="off" placeholder="0.0" aria-label="Token amount" />
              <button type="button" @click="useMaximum">Max</button>
              <strong>{{ selected.symbol || 'Token' }}</strong>
            </div>
          </label>
          <button class="wallet-send-action" type="submit" :disabled="!canSend">
            <LoaderCircle v-if="sending" class="spin" :size="17" />
            {{ sending ? (phase === 'pending' ? 'Confirming…' : 'Waiting for wallet…') : 'Continue' }}
          </button>
          <a v-if="transactionHash" class="wallet-transaction" :href="transactionURL" target="_blank" rel="noreferrer"><Check v-if="phase === 'confirmed'" :size="14" /><LoaderCircle v-else class="spin" :size="14" />{{ phase === 'confirmed' ? 'Transfer confirmed' : 'Transfer submitted' }} · View in Explore</a>
        </form>
      </template>

      <div v-else-if="empty" class="wallet-empty-state">
        <img src="/wallet-empty.png" alt="" aria-hidden="true" />
        <h2>Your wallet is ready</h2>
        <p>Import a token to view its balance and send it.</p>
        <button type="button" @click="openImporter"><Plus :size="23" />Import token</button>
        <span>Tokens are stored in Swaputer.</span>
      </div>

      <div v-else-if="loadError" class="wallet-detail-error">
        <WalletCards :size="34" />
        <h2>Wallet unavailable</h2>
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
    </section>

    <div v-if="importOpen" class="wallet-import-backdrop" @click.self="importOpen = false">
      <form class="wallet-import" role="dialog" aria-modal="true" aria-labelledby="wallet-import-title" @submit.prevent="importToken">
        <header>
          <div><p>WALLET</p><h2 id="wallet-import-title">Import token</h2></div>
          <button type="button" aria-label="Close token importer" @click="importOpen = false"><X :size="18" /></button>
        </header>
        <p>Paste a Swaputer token contract ID. Swaputer will verify the token and load its details.</p>
        <label><span>Token contract ID</span><input v-model.trim="importId" autocomplete="off" spellcheck="false" placeholder="0x…" autofocus /></label>
        <p v-if="importError" class="wallet-import-error" role="alert">{{ importError }}</p>
        <button class="wallet-import-action" type="submit" :disabled="importing"><LoaderCircle v-if="importing" class="spin" :size="16" /><Plus v-else :size="16" />{{ importing ? 'Checking token…' : 'Import token' }}</button>
        <section v-if="importedIds.length">
          <h3>Imported tokens</h3>
          <div v-for="programId in importedIds" :key="programId"><code>{{ short(programId, 12, 10) }}</code><button type="button" :aria-label="`Remove ${short(programId, 8, 6)}`" @click="removeImported(programId)"><Trash2 :size="14" />Remove</button></div>
        </section>
      </form>
    </div>
  </main>
</template>
