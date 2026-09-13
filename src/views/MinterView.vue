<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Copy, LoaderCircle, LockKeyhole, Plus, X } from "@lucide/vue";
import { useWallet } from "@/composables/useWallet";
import { useChainAction } from "@/composables/useChainAction";
import { toast } from "@/composables/useToast";
import { NETWORK, TRANSACTION_CONFIRMATIONS } from "@/lib/config";
import { tokenAmount } from "@/lib/format";
import { deployMiniContract, friendlyError, mintSRC20, requiresTransactionReview, short, verifyOpenMintSRC20, type TokenSnapshot } from "@/lib/protocol";
import { prepareSRC20 } from "@/lib/src20Factory";
import { explorerURL } from "@/lib/apps";

const route = useRoute();
const router = useRouter();
const wallet = useWallet();
const chainAction = useChainAction();
const requestedContract = typeof route.query.contract === "string" ? route.query.contract : "";
const addressInput = ref(requestedContract);
const contractId = ref<string | null>(null);
const snapshot = ref<TokenSnapshot | null>(null);
const loading = ref(false);
const mintPhase = ref<"idle" | "verifying" | "signing" | "pending" | "confirmed">("idle");
const mintTransactionHash = ref<string | null>(null);
const mintTransactionUrl = computed(() => mintTransactionHash.value ? explorerURL(`/tx/${mintTransactionHash.value}`) : "");
const copied = ref<string | null>(null);

const creatorOpen = ref(false);
const nameInput = ref<HTMLInputElement | null>(null);
const name = ref("");
const symbol = ref("");
const supply = ref("");
const mintAmount = ref("");
const createPhase = ref<"idle" | "compiling" | "signing" | "pending" | "confirmed">("idle");
const createdProgram = ref<string | null>(null);
const submittedHash = ref<string | null>(null);
const submittedTransactionUrl = computed(() => submittedHash.value ? explorerURL(`/tx/${submittedHash.value}`) : "");
let copyTimer: number | undefined;
let loadVersion = 0;
const confirmationLabel = `${TRANSACTION_CONFIRMATIONS} ${TRANSACTION_CONFIRMATIONS === 1 ? "confirmation" : "confirmations"}`;

const createBusy = computed(() => createPhase.value === "compiling" || createPhase.value === "signing" || createPhase.value === "pending");
const mintBusy = computed(() => ["verifying", "signing", "pending"].includes(mintPhase.value));
const progress = computed(() => {
  if (!snapshot.value || snapshot.value.cap <= 0n) return null;
  return Math.min(100, Number(snapshot.value.totalSupply * 10_000n / snapshot.value.cap) / 100);
});
const mintExhausted = computed(() => Boolean(snapshot.value && snapshot.value.cap > 0n && snapshot.value.totalSupply + snapshot.value.mintAmount > snapshot.value.cap));
const nextSupply = computed(() => snapshot.value ? snapshot.value.totalSupply + snapshot.value.mintAmount : 0n);
const mintLabel = computed(() => {
  if (!wallet.address.value) return "Connect wallet";
  if (mintPhase.value === "verifying") return "Verifying contract";
  if (mintPhase.value === "signing") return "Confirm in wallet";
  if (mintPhase.value === "pending") return `Finalizing · ${confirmationLabel}`;
  if (mintPhase.value === "confirmed") return "Minted";
  if (mintExhausted.value) return "Mint complete";
  return snapshot.value ? `Mint ${tokenAmount(snapshot.value.mintAmount, snapshot.value.decimals)} ${snapshot.value.symbol}` : "Load contract";
});
const createLabel = computed(() => {
  if (!wallet.address.value) return "Connect wallet";
  if (createPhase.value === "compiling") return "Compiling package";
  if (createPhase.value === "signing") return "Confirm in wallet";
  if (createPhase.value === "pending") return `Finalizing · ${confirmationLabel}`;
  if (createPhase.value === "confirmed") return "Done";
  return "Create token";
});

function clearContract() {
  ++loadVersion;
  loading.value = false;
  contractId.value = null;
  snapshot.value = null;
  mintPhase.value = "idle";
}

async function loadContract() {
  if (mintBusy.value) return;
  clearContract();
  const version = loadVersion;
  const target = addressInput.value.trim();
  loading.value = true;
  try {
    const verified = await verifyOpenMintSRC20(target);
    if (version !== loadVersion) return;
    snapshot.value = verified;
    contractId.value = target;
    await router.replace({ query: { ...route.query, contract: target } });
  } catch (cause) {
    if (version !== loadVersion) return;
    snapshot.value = null;
    contractId.value = null;
    toast.error(friendlyError(cause));
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

async function mint() {
  if (mintBusy.value || loading.value || chainAction.busy.value) return;
  if (!wallet.address.value || !wallet.signer.value) {
    await wallet.connect();
    return;
  }
  if (!snapshot.value || !contractId.value) {
    return;
  }
  const target = contractId.value;
  const version = loadVersion;
  const release = chainAction.acquire();
  if (!release) { toast.error("Another wallet transaction is already in progress."); return; }
  mintTransactionHash.value = null;
  mintPhase.value = "verifying";
  try {
    // Recheck the pinned package and read ABI directly onchain before signing.
    snapshot.value = await verifyOpenMintSRC20(target);
    if (snapshot.value.totalSupply + snapshot.value.mintAmount > snapshot.value.cap) {
      mintPhase.value = "idle";
      return;
    }
    mintPhase.value = "signing";
    await mintSRC20(wallet.signer.value, wallet.address.value, target, (hash) => { mintTransactionHash.value = hash; mintPhase.value = "pending"; });
    mintPhase.value = "confirmed";
    toast.success("SRC20 minted.");
  } catch (cause) {
    if (requiresTransactionReview(cause)) { chainAction.hold(cause.transactionHash); mintTransactionHash.value = cause.transactionHash; mintPhase.value = "pending"; }
    else mintPhase.value = "idle";
    toast.error(friendlyError(cause));
    if (!requiresTransactionReview(cause)) release();
    return;
  }
  release();
  // A read failure must not misreport a confirmed mint as a failed transaction.
  try {
    const refreshed = await verifyOpenMintSRC20(target);
    if (version === loadVersion) snapshot.value = refreshed;
  } catch {
    if (version === loadVersion) toast.error("Mint confirmed. Reload the contract to refresh its supply.");
  }
}

async function copy(value: string) {
  await navigator.clipboard?.writeText(value);
  copied.value = value;
  if (copyTimer) window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => { copied.value = null; }, 1_500);
}

function openCreator() {
  if (createPhase.value === "confirmed") {
    createPhase.value = "idle";
    createdProgram.value = null;
    submittedHash.value = null;
    name.value = "";
    symbol.value = "";
    supply.value = "";
    mintAmount.value = "";
  }
  creatorOpen.value = true;
  void nextTick(() => nameInput.value?.focus());
}

function closeCreator() {
  if (!createBusy.value) creatorOpen.value = false;
}

async function createToken() {
  if (createBusy.value || chainAction.busy.value) return;
  if (!wallet.address.value || !wallet.signer.value) {
    await wallet.connect();
    return;
  }
  const release = chainAction.acquire();
  if (!release) { toast.error("Another wallet transaction is already in progress."); return; }
  createPhase.value = "compiling";
  createdProgram.value = null;
  submittedHash.value = null;
  let keepChainLock = false;
  try {
    const prepared = await prepareSRC20({ name: name.value, symbol: symbol.value, cap: supply.value, mintAmount: mintAmount.value });
    createPhase.value = "signing";
    const deployment = await deployMiniContract(
      wallet.signer.value,
      wallet.address.value,
      prepared.build.packageBytes,
      prepared.constructorArgs,
      24_000,
      (hash) => { submittedHash.value = hash; createPhase.value = "pending"; }
    );
    createdProgram.value = deployment.confirmedProgramId;
    createPhase.value = "confirmed";
    if (deployment.confirmedProgramId) toast.success("SRC20 created.");
    else {
      keepChainLock = true;
      chainAction.hold(deployment.receipt.hash);
      toast.success("Deployment confirmed. Verify its address in Explore before retrying.");
    }
  } catch (cause) {
    if (requiresTransactionReview(cause)) {
      keepChainLock = true;
      chainAction.hold(cause.transactionHash);
      submittedHash.value = cause.transactionHash;
      createPhase.value = "pending";
    } else {
      createPhase.value = "idle";
    }
    toast.error(friendlyError(cause));
  } finally {
    if (!keepChainLock) release();
  }
}

async function submitCreator() {
  if (createPhase.value === "confirmed") {
    closeCreator();
    if (createdProgram.value) {
      addressInput.value = createdProgram.value;
      await loadContract();
    }
    return;
  }
  await createToken();
}

function onKeydown(event: KeyboardEvent) {
  if (creatorOpen.value && event.key === "Escape") closeCreator();
}

watch(creatorOpen, (open) => { document.body.style.overflow = open ? "hidden" : ""; });
watch(addressInput, clearContract, { flush: "sync" });
onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  if (requestedContract) void loadContract();
});
onBeforeUnmount(() => {
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onKeydown);
  ++loadVersion;
  if (copyTimer) window.clearTimeout(copyTimer);
});
</script>

<template>
  <main class="page minter-page">
    <header class="minter-heading">
      <div><nav aria-label="Breadcrumb"><a href="#/">Ecosystem</a><ChevronRight :size="14" /><strong>Factory</strong></nav><h1>Factory</h1><p>Create and mint tokens on Swaputer.</p></div>
    </header>

    <section class="minter-shell">
      <div class="factory-entry">
        <button class="factory-create-choice" type="button" :disabled="mintBusy || chainAction.busy.value" @click="openCreator">
          <span><Plus :size="22" /></span><span><strong>Create token</strong><small>Deploy a new token contract on Swaputer.</small></span><ArrowRight :size="19" />
        </button>
        <form class="contract-loader" @submit.prevent="loadContract">
          <label for="mint-contract">Address</label>
          <div><input id="mint-contract" v-model="addressInput" :disabled="mintBusy" autocomplete="off" autocapitalize="off" :spellcheck="false" placeholder="0x…" aria-describedby="mint-contract-help" /><button type="submit" :disabled="mintBusy || loading || !addressInput.trim()"><LoaderCircle v-if="loading" class="spin" :size="17" />{{ loading ? 'Loading…' : 'Load token' }}</button></div>
          <p id="mint-contract-help">Load an existing token for public minting.</p>
        </form>
      </div>

      <div class="minter-stage">
        <section v-if="snapshot && contractId" class="minter-workspace">
          <div class="token-facts">
            <header><div><span>Token information</span><h2>{{ snapshot.name }}</h2><p>{{ snapshot.symbol }}</p></div><a :href="explorerURL(`/contract/${contractId}`)" target="_blank" rel="noreferrer" aria-label="Open token in Explore"><ArrowUpRight :size="18" /></a></header>
            <div class="contract-row"><span>Address</span><code>{{ short(contractId, 18, 14) }}</code><button type="button" aria-label="Copy address" @click="copy(contractId)"><Check v-if="copied === contractId" :size="14" /><Copy v-else :size="14" /></button></div>
            <dl>
              <div><dt>Decimals</dt><dd>{{ snapshot.decimals }}</dd></div>
              <div><dt>Mint amount</dt><dd>{{ tokenAmount(snapshot.mintAmount, snapshot.decimals) }} {{ snapshot.symbol }}</dd></div>
              <div><dt>Total supply</dt><dd>{{ tokenAmount(snapshot.totalSupply, snapshot.decimals) }} {{ snapshot.symbol }}</dd></div>
              <div><dt>Maximum supply</dt><dd>{{ tokenAmount(snapshot.cap, snapshot.decimals) }} {{ snapshot.symbol }}</dd></div>
            </dl>
            <div v-if="progress !== null" class="supply-progress">
              <div class="supply-progress-label"><span>Supply progress</span><strong>{{ progress.toFixed(2) }}%</strong></div>
              <div class="supply-progress-track" role="progressbar" aria-label="Mint progress" :aria-valuenow="progress" :aria-valuemin="0" :aria-valuemax="100"><div :style="{ width: `${progress}%` }" /></div>
            </div>
          </div>

          <aside class="mint-ticket">
            <header><h2>Mint {{ snapshot.symbol }}</h2><p>Review the result before signing.</p></header>
            <dl>
              <div><dt>You receive</dt><dd>{{ tokenAmount(snapshot.mintAmount, snapshot.decimals) }} {{ snapshot.symbol }}</dd></div>
              <div><dt>Updated supply</dt><dd>{{ tokenAmount(nextSupply, snapshot.decimals) }} {{ snapshot.symbol }}</dd></div>
              <div><dt>Maximum supply</dt><dd>{{ tokenAmount(snapshot.cap, snapshot.decimals) }} {{ snapshot.symbol }}</dd></div>
            </dl>
            <button class="mint-action" type="button" :disabled="loading || mintPhase === 'verifying' || mintPhase === 'signing' || mintPhase === 'pending' || mintExhausted || chainAction.busy.value" @click="mint">
              <LoaderCircle v-if="loading || mintPhase === 'verifying' || mintPhase === 'signing' || mintPhase === 'pending'" class="spin" :size="16" />
              <Check v-else-if="mintPhase === 'confirmed'" :size="16" />
              {{ mintLabel }}
            </button>
            <a v-if="mintTransactionHash" class="mint-transaction" :class="{ 'mint-transaction--confirmed': mintPhase === 'confirmed' }" :href="mintTransactionUrl" target="_blank" rel="noreferrer"><Check v-if="mintPhase === 'confirmed'" :size="16" /><LoaderCircle v-else class="spin" :size="16" /><span><strong>{{ mintPhase === 'pending' ? 'Mint submitted' : 'Mint confirmed' }}</strong><small>{{ short(mintTransactionHash, 10, 8) }} · View in Explore</small></span><ArrowUpRight :size="16" /></a>
            <p>{{ NETWORK.displayName }} · Contract is verified again before signing.</p>
          </aside>
        </section>

        <section v-else-if="loading" class="minter-empty minter-empty--loading" aria-live="polite">
          <LoaderCircle class="spin" :size="22" /><div><h2>Verifying contract</h2><p>Checking the immutable package identity and public mint ABI.</p></div>
        </section>
      </div>
    </section>
  </main>

  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="creatorOpen" class="token-modal-backdrop" @mousedown.self="closeCreator">
        <form class="token-modal" role="dialog" aria-modal="true" aria-labelledby="create-src20-title" @submit.prevent="submitCreator">
          <header><h2 id="create-src20-title">Create token</h2><button type="button" aria-label="Close token creator" :disabled="createBusy" @click="closeCreator"><X :size="18" /></button></header>
          <p class="token-modal-intro">Set the token details and minting limits.</p>
          <div class="token-modal-fields">
            <label><span>Name</span><input ref="nameInput" v-model="name" required maxlength="31" autocomplete="off" placeholder="My Token" /></label>
            <label><span>Symbol</span><input v-model="symbol" required maxlength="12" autocomplete="off" placeholder="MTK" /></label>
            <label><span>Maximum supply</span><input v-model="supply" required inputmode="decimal" autocomplete="off" placeholder="100000000" /></label>
            <label><span>Amount per mint</span><input v-model="mintAmount" required inputmode="decimal" autocomplete="off" placeholder="1000" /></label>
          </div>
          <div class="token-modal-decimals"><span>Decimals</span><strong>18</strong><LockKeyhole :size="14" /></div>
          <p v-if="createdProgram" class="token-modal-result" role="status"><Check :size="14" /><span>Created</span><code>{{ short(createdProgram, 12, 10) }}</code><button type="button" aria-label="Copy created contract" @click="copy(createdProgram)"><Copy :size="13" /></button></p>
          <a v-else-if="submittedHash" class="token-modal-result token-modal-result--pending" role="status" :href="submittedTransactionUrl" target="_blank" rel="noreferrer"><Check v-if="createPhase === 'confirmed'" :size="14" /><LoaderCircle v-else class="spin" :size="14" /><span>{{ createPhase === 'confirmed' ? 'Confirmed · open in Explore' : `Finalizing · ${confirmationLabel}` }}</span><code>{{ short(submittedHash, 10, 8) }}</code></a>
          <div class="token-modal-actions">
            <button class="token-modal-cancel" type="button" :disabled="createBusy" @click="closeCreator">Cancel</button>
            <button class="token-modal-submit" type="submit" :disabled="createBusy || chainAction.busy.value"><LoaderCircle v-if="createBusy" class="spin" :size="15" /><Check v-else-if="createPhase === 'confirmed'" :size="15" /><Plus v-else :size="15" />{{ createLabel }}</button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped src="./MinterView.v2.css"></style>
