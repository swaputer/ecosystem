import { readonly, ref } from "vue";

// A single Swaputer actor nonce backs every VM write. Keep one process-wide
// lock so closing one App cannot start a second action while the first App's
// wallet request or transaction receipt is still pending.
const busy = ref(false);
const unresolvedHash = ref<string | null>(null);
let owner = 0;

export function useChainAction() {
  function acquire(): (() => void) | null {
    if (busy.value) return null;
    const token = ++owner;
    busy.value = true;
    unresolvedHash.value = null;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (token === owner) busy.value = false;
    };
  }

  function hold(transactionHash: string) {
    unresolvedHash.value = transactionHash;
    busy.value = true;
  }

  return { busy: readonly(busy), unresolvedHash: readonly(unresolvedHash), acquire, hold };
}
