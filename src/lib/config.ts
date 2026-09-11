import activeRelease from "../../config/base-sepolia.json";
import type { Hex, SwaputerDeployment } from "@swaputer-cli/types";

interface UniswapV4Release {
  readonly universalRouter: string;
  readonly poolFee: number;
  readonly tickSpacing: number;
}

const candidateRelease = activeRelease as typeof activeRelease & {
  readonly upstream?: { readonly uniswapV4?: UniswapV4Release };
};

const configuredConfirmations = Number(activeRelease.indexer.confirmations);
if (!Number.isSafeInteger(configuredConfirmations) || configuredConfirmations < 1) {
  throw new Error("The active release must require at least one transaction confirmation.");
}
export const TRANSACTION_CONFIRMATIONS = configuredConfirmations;

const value = (name: string): string => String(import.meta.env[name] ?? "").trim();
const pinned = (name: string, expected: string): string => {
  const configured = value(name);
  if (configured && configured.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${name} does not match ${activeRelease.release.name}.`);
  }
  return expected;
};
export const NETWORK = Object.freeze({
  chainId: Number(pinned("VITE_CHAIN_ID", String(activeRelease.network.chainId))),
  get chainIdHex() { return `0x${this.chainId.toString(16)}`; },
  chainName: pinned("VITE_CHAIN_NAME", activeRelease.network.name),
  displayName: pinned("VITE_CHAIN_NAME", activeRelease.network.name),
  rpcUrl: value("VITE_RPC_URL") || "https://base-sepolia-rpc.publicnode.com",
  explorerUrl: pinned("VITE_EXPLORER_URL", activeRelease.network.explorerUrl),
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
});

export const CLI_DEPLOYMENT: SwaputerDeployment = Object.freeze({
  schemaVersion: "swaputer-cli-deployment/1",
  id: "base-sepolia",
  releaseName: activeRelease.release.name,
  protocolVersion: activeRelease.release.protocolVersion,
  chainId: BigInt(activeRelease.network.chainId),
  networkName: activeRelease.network.name,
  kernel: activeRelease.core.kernel.toLowerCase() as Hex,
  kernelRuntimeCodeHash: activeRelease.runtimeCodeHashes.kernel.toLowerCase() as Hex,
  worldId: activeRelease.core.worldId.toLowerCase() as Hex,
  sourceManifest: "config/base-sepolia.json",
  sourceManifestHash: activeRelease.integrity.manifestHash.toLowerCase() as Hex
});

const worldId = pinned("VITE_SWAPVM_WORLD_ID", activeRelease.core.worldId);
const kernel = pinned("VITE_SWAPVM_KERNEL_ADDRESS", activeRelease.core.kernel);
const router = pinned("VITE_SWAPVM_ROUTER_ADDRESS", activeRelease.core.router);
const hook = pinned("VITE_SWAPVM_HOOK_ADDRESS", activeRelease.core.hook);
const gasToken = pinned("VITE_SWAPVM_GAS_TOKEN_ADDRESS", activeRelease.core.gasToken);
const uniswapV4 = candidateRelease.upstream?.uniswapV4;
const universalRouter = uniswapV4
  ? pinned("VITE_UNISWAP_UNIVERSAL_ROUTER_ADDRESS", uniswapV4.universalRouter)
  : "";
const vmInputWei = BigInt(pinned("VITE_SWAPVM_VM_INPUT_WEI", activeRelease.parameters.vmInputWei));
const sqrtPriceLimitX96 = BigInt(pinned("VITE_SWAPVM_SQRT_PRICE_LIMIT_X96", activeRelease.parameters.sqrtPriceLimitX96));

export const SWAPVM = Object.freeze({
  protocolVersion: pinned("VITE_SWAPVM_PROTOCOL_VERSION", activeRelease.release.protocolVersion),
  worldId,
  kernel,
  router,
  hook,
  gasToken,
  universalRouter,
  poolFee: uniswapV4?.poolFee ?? 0,
  tickSpacing: uniswapV4?.tickSpacing ?? 0,
  defaultSRC20: pinned("VITE_SWAPVM_SRC20_ID", activeRelease.programs.defaultSrc20.programId),
  openMintSRC20CodeHash: pinned("VITE_SWAPVM_OPEN_MINT_SRC20_CODE_HASH", activeRelease.programs.openMintSrc20CodeHash),
  vmInputWei,
  sqrtPriceLimitX96,
  minNetTokenOut: BigInt(pinned("VITE_SWAPVM_MIN_NET_TOKEN_OUT", activeRelease.parameters.minNetTokenOut)),
  enabled:
    /^0x[0-9a-fA-F]{64}$/.test(worldId)
    && /^0x[0-9a-fA-F]{40}$/.test(kernel)
    && /^0x[0-9a-fA-F]{40}$/.test(router)
    && /^0x[0-9a-fA-F]{40}$/.test(hook)
    && /^0x[0-9a-fA-F]{40}$/.test(gasToken)
    && /^0x[0-9a-fA-F]{64}$/.test(activeRelease.programs.openMintSrc20CodeHash),
  directEnabled:
    /^0x[0-9a-fA-F]{40}$/.test(universalRouter)
    && Number.isInteger(uniswapV4?.poolFee)
    && Number.isInteger(uniswapV4?.tickSpacing)
});

export const KERNEL_ABI = [
  "event Events(bytes32 indexed worldId, uint64 indexed executionHeight, bytes payload)",
  "function eoaAccountId(address account) view returns (bytes32)",
  "function creatorNonce(bytes32 worldId, bytes32 creator) view returns (uint64)",
  "function contractAccountId(bytes32 worldId,bytes32 creator,uint64 creationNonce,bytes32 codeHash) pure returns (bytes32)",
  "function nonces(bytes32 worldId, bytes32 actor) view returns (uint64)",
  "function programCodeHash(bytes32 worldId,bytes32 target) view returns (bytes32)",
  "function staticCall(bytes32 worldId, bytes32 target, bytes input, uint32 byteLimit) view returns (bytes output, uint32 bytesUsed)"
] as const;

export const ROUTER_ABI = [
  "function buyVMExactInput(bytes32 worldId, uint160 sqrtPriceLimitX96, (uint8 op, bytes32 worldId, address actor, bytes32 targetOrCodeHash, bytes payload, uint32 byteGasLimit, uint128 minNetTokenOut, uint64 nonce, uint64 deadline, address recipient, address authorizedExecutor, bytes signature) envelope) payable returns (int256 delta)"
] as const;

export const HOOK_ABI = [
  "function protocolFeeBps() view returns (uint16)",
  "function feeController() view returns (address)",
  "function protocolFee(uint256 grossNativeAmount) view returns (uint256)",
  "function netNativeAfterFee(uint256 grossNativeAmount) view returns (uint256)",
  "function feeAdmin() view returns (address)",
  "function accruedProtocolFees() view returns (uint256)",
  "function boundPoolId() view returns (bytes32)",
  "function poolBound() view returns (bool)"
] as const;
