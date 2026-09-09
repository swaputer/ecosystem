import { computed, ref, shallowRef } from "vue";
import { BrowserProvider, type Signer } from "ethers";
import { NETWORK } from "@/lib/config";
import { friendlyError } from "@/lib/protocol";

const address = ref<string | null>(null);
const provider = shallowRef<BrowserProvider | null>(null);
const signer = shallowRef<Signer | null>(null);
const balance = ref<bigint | null>(null);
const balanceLoading = ref(false);
const connecting = ref(false);
const error = ref("");
const session = ref(0);
let source: EthereumProvider | undefined;
let attempt = 0;

function disconnect() {
  ++attempt;
  source?.removeListener?.("accountsChanged", changed);
  source?.removeListener?.("chainChanged", changed);
  source = undefined;
  address.value = null;
  signer.value = null;
  provider.value = null;
  balance.value = null;
  balanceLoading.value = false;
  connecting.value = false;
  session.value++;
}
function changed() {
  disconnect();
  error.value = "Your wallet account or network changed. Power on to reconnect.";
}
async function refreshBalance() {
  const currentProvider = provider.value;
  const currentAddress = address.value;
  if (!currentProvider || !currentAddress || balanceLoading.value) return;
  balanceLoading.value = true;
  try {
    const next = await currentProvider.getBalance(currentAddress);
    if (provider.value === currentProvider && address.value === currentAddress) balance.value = next;
  } catch {
    if (provider.value === currentProvider && address.value === currentAddress) balance.value = null;
  } finally {
    if (provider.value === currentProvider && address.value === currentAddress) balanceLoading.value = false;
  }
}
async function connect() {
  if (connecting.value) return;
  const version = ++attempt;
  error.value = "";
  connecting.value = true;
  try {
    const injected = window.ethereum;
    if (!injected) throw new Error("Open computer in your wallet’s mobile browser, or enable a browser wallet to power on.");
    await injected.request({ method: "eth_requestAccounts" });
    const chain = await injected.request({ method: "eth_chainId" });
    if (BigInt(String(chain)) !== BigInt(NETWORK.chainId)) {
      try { await injected.request({ method: "wallet_switchEthereumChain", params: [{ chainId: NETWORK.chainIdHex }] }); }
      catch (cause) {
        if ((cause as { code?: number }).code !== 4902) throw cause;
        await injected.request({ method: "wallet_addEthereumChain", params: [{ chainId: NETWORK.chainIdHex, chainName: NETWORK.chainName, nativeCurrency: NETWORK.nativeCurrency, rpcUrls: [NETWORK.rpcUrl], blockExplorerUrls: [NETWORK.explorerUrl] }] });
        await injected.request({ method: "wallet_switchEthereumChain", params: [{ chainId: NETWORK.chainIdHex }] });
      }
    }
    if (BigInt(String(await injected.request({ method: "eth_chainId" }))) !== BigInt(NETWORK.chainId)) throw new Error(`Switch your wallet to ${NETWORK.displayName} to continue.`);
    const browserProvider = new BrowserProvider(injected);
    const walletSigner = await browserProvider.getSigner();
    const walletAddress = await walletSigner.getAddress();
    if (version !== attempt) return;
    source = injected;
    source.on?.("accountsChanged", changed);
    source.on?.("chainChanged", changed);
    provider.value = browserProvider;
    signer.value = walletSigner;
    address.value = walletAddress;
    session.value++;
    void refreshBalance();
  } catch (cause) {
    if (version === attempt) error.value = (cause as { code?: number }).code === 4001 ? "Connection cancelled. Power on whenever you’re ready." : friendlyError(cause);
  } finally { if (version === attempt) connecting.value = false; }
}
export function useWallet() {
  return { address, provider, signer, balance, balanceLoading, connecting, error, session, connected: computed(() => Boolean(address.value)), connect, disconnect, refreshBalance };
}
