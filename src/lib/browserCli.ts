import { InspectionError, InspectionErrorCode, isInspectionError } from "@swaputer-cli/errors";
import { inspectTransaction } from "@swaputer-cli/inspect";
import { jsonStringify } from "@swaputer-cli/json";
import cliPackage from "@swaputer-cli/package";
import { HttpRpcTransport, type RpcTransport } from "@swaputer-cli/rpc";
import type { Hex, SwaputerDeployment } from "@swaputer-cli/types";
import { decodeVMReceipt, isVMReceiptError } from "@swaputer-labs/receipt-codec";
import { CanonicalVerificationError, verifyCanonicalFinality } from "./canonicalFinality";

export const BROWSER_ADAPTER_VERSION = "0.1.0";
export const VERIFIER_PACKAGE_VERSION = cliPackage.version;

export const BROWSER_HELP: readonly string[] = Object.freeze([
  "Swaputer Terminal — read-only transaction verification",
  "",
  "Commands:",
  "  inspect <transaction-hash> [--json]",
  "  decode-receipt <0x-payload> [--json]",
  "  clear",
  "  version",
  "  help"
]);

export interface BrowserCommandOptions {
  readonly deployment: SwaputerDeployment;
  readonly rpcUrl: string;
  readonly transport?: RpcTransport;
}

export interface BrowserCommandResult {
  readonly clear?: boolean;
  readonly lines: readonly string[];
}

function usage(details: Readonly<Record<string, string>> = {}): never {
  throw new InspectionError(InspectionErrorCode.CLI_USAGE, details);
}

function jsonFlag(arguments_: readonly string[]): boolean {
  if (arguments_.length === 0) return false;
  if (arguments_.length === 1 && arguments_[0] === "--json") return true;
  return usage();
}

export async function executeBrowserCommand(input: string, options?: BrowserCommandOptions): Promise<BrowserCommandResult> {
  const [command, ...arguments_] = input.trim().split(/\s+/).filter(Boolean);
  if (!command) return { lines: [] };
  if (command === "help" || command === "--help") {
    if (arguments_.length) usage();
    return { lines: BROWSER_HELP };
  }
  if (command === "version" || command === "--version") {
    if (arguments_.length) usage();
    return { lines: [
      `Swaputer browser verifier ${BROWSER_ADAPTER_VERSION}`,
      `Verifier API: @swaputer-labs/cli ${VERIFIER_PACKAGE_VERSION}`
    ] };
  }
  if (command === "clear") {
    if (arguments_.length) usage();
    return { clear: true, lines: [] };
  }
  if (command === "decode-receipt") {
    const [payload, ...flags] = arguments_;
    if (!payload || !/^0x(?:[0-9a-fA-F]{2})*$/.test(payload)) {
      throw new InspectionError(InspectionErrorCode.INVALID_RECEIPT_PAYLOAD);
    }
    const json = jsonFlag(flags);
    try {
      const receipt = decodeVMReceipt(payload as Hex);
      return {
        lines: [json
          ? jsonStringify(receipt)
          : `Valid VMReceiptV1: records=${receipt.recordCount} bytes=${receipt.worldExecution.executedBytes} burned=${receipt.worldExecution.tokenBurned}`]
      };
    } catch (error) {
      if (isVMReceiptError(error)) {
        throw new InspectionError(InspectionErrorCode.INVALID_RECEIPT_PAYLOAD, { receiptError: error.code }, error);
      }
      throw error;
    }
  }
  if (command === "inspect") {
    const [transactionHash, ...flags] = arguments_;
    if (!transactionHash) usage({ missing: "transaction-hash" });
    const json = jsonFlag(flags);
    if (!options) usage({ missing: "browser-options" });
    const transport = options.transport ?? new HttpRpcTransport();
    const result = await inspectTransaction(transactionHash, {
      deployment: options.deployment,
      rpcUrl: options.rpcUrl,
      rpcEnvironment: "browser",
      transport
    });
    const finality = await verifyCanonicalFinality({
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      blockHash: result.blockHash,
      transactionIndex: result.transactionIndex,
      chainId: result.deployment.chainId,
      rpcUrl: options.rpcUrl,
      transport
    });
    const verified = Object.freeze({ ...result, ...finality });
    if (json) return { lines: [jsonStringify(verified)] };
    const lines = [
      `Verified Swaputer transaction ${verified.transactionHash}`,
      `Network: ${verified.deployment.networkName} (${verified.deployment.chainId})`,
      `Release: ${verified.deployment.releaseName}`,
      `Block: ${verified.blockNumber}`,
      `Finality: finalized at ${verified.finalizedBlockNumber} (${verified.confirmations} confirmations observed)`
    ];
    for (const [index, execution] of verified.executions.entries()) {
      const summary = execution.receipt.worldExecution;
      lines.push(`Execution ${index + 1}: height=${execution.executionHeight} actor=${summary.actor} target=${summary.rootTarget} bytes=${summary.executedBytes} burned=${summary.tokenBurned}`);
    }
    return { lines };
  }
  return usage({ command });
}

export function browserErrorLines(error: unknown): readonly string[] {
  if (error instanceof CanonicalVerificationError) {
    const details = Object.keys(error.details).length ? ` ${jsonStringify(error.details)}` : "";
    return [`error: ${error.code}${details}`];
  }
  if (isInspectionError(error)) {
    const details = Object.keys(error.details).length ? ` ${jsonStringify(error.details)}` : "";
    return [`error: ${error.code}${details}`];
  }
  return ["error: INTERNAL_ERROR"];
}
