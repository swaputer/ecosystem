export const MINIMUM_INSPECTION_CONFIRMATIONS = 12n;

const HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;

type CanonicalVerificationErrorCode = "TRANSACTION_NOT_CANONICAL" | "TRANSACTION_NOT_FINALIZED";

export class CanonicalVerificationError extends Error {
  readonly code: CanonicalVerificationErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(code: CanonicalVerificationErrorCode, details: Readonly<Record<string, string>> = {}) {
    super(code);
    this.name = "CanonicalVerificationError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export interface ReadonlyRpcTransport {
  request<T>(rpcUrl: string, method: string, params: readonly unknown[]): Promise<T>;
}

interface CanonicalBlock { readonly hash: string; readonly number: string }
interface CanonicalReceipt {
  readonly blockHash: string;
  readonly blockNumber: string;
  readonly contractAddress: string | null;
  readonly from: string;
  readonly status: string;
  readonly to: string | null;
  readonly transactionHash: string;
  readonly transactionIndex: string;
}
interface CanonicalTransaction {
  readonly blockHash: string | null;
  readonly blockNumber: string | null;
  readonly chainId: string;
  readonly from: string;
  readonly hash: string;
  readonly nonce: string;
  readonly to: string | null;
  readonly transactionIndex: string | null;
}

export interface CanonicalFinalityResult {
  readonly confirmations: bigint;
  readonly finalizedBlockHash: string;
  readonly finalizedBlockNumber: bigint;
}

function rejectCanonical(field: string): never {
  throw new CanonicalVerificationError("TRANSACTION_NOT_CANONICAL", { field });
}

function quantity(value: string, field: string): bigint {
  if (!QUANTITY.test(value)) rejectCanonical(field);
  return BigInt(value);
}

function block(value: CanonicalBlock | null, field: string): { readonly number: bigint; readonly hash: string } {
  if (value === null || typeof value !== "object" || !HASH.test(value.hash)) rejectCanonical(field);
  return Object.freeze({ number: quantity(value.number, `${field}.number`), hash: value.hash.toLowerCase() });
}

export async function verifyCanonicalFinality(options: {
  readonly blockHash: string;
  readonly blockNumber: bigint;
  readonly chainId: bigint;
  readonly rpcUrl: string;
  readonly transactionHash: string;
  readonly transactionIndex: bigint;
  readonly transport: ReadonlyRpcTransport;
}): Promise<CanonicalFinalityResult> {
  const { blockHash, blockNumber, chainId, rpcUrl, transactionHash, transactionIndex, transport } = options;
  const [receipt, transaction, containingValue, finalizedValue, latestValue] = await Promise.all([
    transport.request<CanonicalReceipt | null>(rpcUrl, "eth_getTransactionReceipt", [transactionHash]),
    transport.request<CanonicalTransaction | null>(rpcUrl, "eth_getTransactionByHash", [transactionHash]),
    transport.request<CanonicalBlock | null>(rpcUrl, "eth_getBlockByNumber", [`0x${blockNumber.toString(16)}`, false]),
    transport.request<CanonicalBlock | null>(rpcUrl, "eth_getBlockByNumber", ["finalized", false]),
    transport.request<CanonicalBlock | null>(rpcUrl, "eth_getBlockByNumber", ["latest", false])
  ]);
  const containing = block(containingValue, "containingBlock");
  const finalized = block(finalizedValue, "finalizedBlock");
  const latest = block(latestValue, "latestBlock");
  const normalizedHash = transactionHash.toLowerCase();
  const normalizedBlockHash = blockHash.toLowerCase();
  if (receipt === null || transaction === null
    || receipt.status !== "0x1"
    || !HASH.test(receipt.transactionHash) || receipt.transactionHash.toLowerCase() !== normalizedHash
    || !HASH.test(receipt.blockHash) || receipt.blockHash.toLowerCase() !== normalizedBlockHash
    || quantity(receipt.blockNumber, "receipt.blockNumber") !== blockNumber
    || quantity(receipt.transactionIndex, "receipt.transactionIndex") !== transactionIndex
    || !ADDRESS.test(receipt.from)
    || (receipt.to !== null && !ADDRESS.test(receipt.to))
    || (receipt.contractAddress !== null && !ADDRESS.test(receipt.contractAddress))
    || !HASH.test(transaction.hash) || transaction.hash.toLowerCase() !== normalizedHash
    || transaction.blockHash === null || !HASH.test(transaction.blockHash) || transaction.blockHash.toLowerCase() !== normalizedBlockHash
    || transaction.blockNumber === null || quantity(transaction.blockNumber, "transaction.blockNumber") !== blockNumber
    || transaction.transactionIndex === null || quantity(transaction.transactionIndex, "transaction.transactionIndex") !== transactionIndex
    || quantity(transaction.chainId, "transaction.chainId") !== chainId
    || !ADDRESS.test(transaction.from) || transaction.from.toLowerCase() !== receipt.from.toLowerCase()
    || (transaction.to !== null && !ADDRESS.test(transaction.to))
    || (transaction.to?.toLowerCase() ?? null) !== (receipt.to?.toLowerCase() ?? null)
    || quantity(transaction.nonce, "transaction.nonce") < 0n
    || (transaction.to === null) !== (receipt.contractAddress !== null)
    || containing.number !== blockNumber || containing.hash !== normalizedBlockHash
    || latest.number < containing.number || finalized.number > latest.number) rejectCanonical("transactionLink");
  if (finalized.number < blockNumber
    || (finalized.number === blockNumber && finalized.hash !== normalizedBlockHash)) {
    throw new CanonicalVerificationError("TRANSACTION_NOT_FINALIZED", {
      blockNumber: blockNumber.toString(),
      finalizedBlockNumber: finalized.number.toString()
    });
  }
  const confirmations = latest.number - blockNumber + 1n;
  if (confirmations < MINIMUM_INSPECTION_CONFIRMATIONS) {
    throw new CanonicalVerificationError("TRANSACTION_NOT_FINALIZED", {
      confirmations: confirmations.toString(),
      requiredConfirmations: MINIMUM_INSPECTION_CONFIRMATIONS.toString()
    });
  }
  return Object.freeze({ confirmations, finalizedBlockNumber: finalized.number, finalizedBlockHash: finalized.hash });
}
