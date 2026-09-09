import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CanonicalVerificationError,
  MINIMUM_INSPECTION_CONFIRMATIONS,
  verifyCanonicalFinality
} from "../src/lib/canonicalFinality.ts";

const HASH = `0x${"a".repeat(64)}`;
const BLOCK_HASH = `0x${"b".repeat(64)}`;
const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";

function transport(overrides = {}) {
  return {
    async request(_rpcUrl, method, params) {
      if (method === "eth_getTransactionReceipt") return {
        blockHash: BLOCK_HASH,
        blockNumber: "0x2",
        contractAddress: null,
        from: FROM,
        status: "0x1",
        to: TO,
        transactionHash: HASH,
        transactionIndex: "0x1",
        ...overrides.receipt
      };
      if (method === "eth_getTransactionByHash") return {
        blockHash: BLOCK_HASH,
        blockNumber: "0x2",
        chainId: "0x14a34",
        from: FROM,
        hash: HASH,
        nonce: "0x7",
        to: TO,
        transactionIndex: "0x1",
        ...overrides.transaction
      };
      if (method === "eth_getBlockByNumber") {
        if (params[0] === "0x2") return { number: "0x2", hash: overrides.containingHash ?? BLOCK_HASH };
        if (params[0] === "finalized") return { number: overrides.finalizedNumber ?? "0x10", hash: `0x${"c".repeat(64)}` };
        if (params[0] === "latest") return { number: overrides.latestNumber ?? "0x20", hash: `0x${"d".repeat(64)}` };
      }
      throw new Error(`unexpected method ${method}`);
    }
  };
}

function verify(overrides = {}) {
  return verifyCanonicalFinality({
    transactionHash: HASH,
    blockNumber: 2n,
    blockHash: BLOCK_HASH,
    transactionIndex: 1n,
    chainId: 84532n,
    rpcUrl: "https://rpc.invalid",
    transport: transport(overrides)
  });
}

test("accepts only a canonical, finalized transaction with the confirmation floor", async () => {
  const result = await verify({ finalizedNumber: "0x8", latestNumber: "0xd" });
  assert.equal(result.confirmations, MINIMUM_INSPECTION_CONFIRMATIONS);
  assert.equal(result.finalizedBlockNumber, 8n);
});

test("rejects orphaned blocks, stale envelopes, and contradictory heads", async () => {
  for (const overrides of [
    { containingHash: `0x${"e".repeat(64)}` },
    { transaction: { blockHash: `0x${"f".repeat(64)}` } },
    { transaction: { chainId: "0x1" } },
    { receipt: { status: "0x0" } },
    { finalizedNumber: "0x11", latestNumber: "0x10" }
  ]) {
    await assert.rejects(() => verify(overrides), error =>
      error instanceof CanonicalVerificationError && error.code === "TRANSACTION_NOT_CANONICAL");
  }
});

test("rejects an unfinalized transaction and eleven confirmations", async () => {
  await assert.rejects(() => verify({ finalizedNumber: "0x1" }), error =>
    error instanceof CanonicalVerificationError && error.code === "TRANSACTION_NOT_FINALIZED");
  await assert.rejects(() => verify({ finalizedNumber: "0x8", latestNumber: "0xc" }), error =>
    error instanceof CanonicalVerificationError
      && error.code === "TRANSACTION_NOT_FINALIZED"
      && error.details.confirmations === "11");
});
