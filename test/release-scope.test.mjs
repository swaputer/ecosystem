import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveOfficialFeatureScope } from "../src/lib/releaseScope.ts";

const registry = readFileSync(new URL("../src/lib/apps.ts", import.meta.url), "utf8");

test("official environments expose Market and sETH at first launch", () => {
  for (const environment of ["local", "testnet", "mainnet", "production"]) {
    const scope = resolveOfficialFeatureScope(environment);
    assert.equal(scope.market, true);
    assert.equal(scope.seth, true);
  }
});

test("unknown environments fail closed for transaction-bearing applications", () => {
  assert.deepEqual(resolveOfficialFeatureScope(""), {
    explorer: true,
    studio: true,
    openMintMinter: true,
    market: false,
    seth: false
  });
});

test("the shared desktop and mobile app registry respects the release gates", () => {
  assert.match(registry, /enabled: OFFICIAL_FEATURES\.market/);
  assert.match(registry, /enabled: OFFICIAL_FEATURES\.seth/);
  assert.match(registry, /filter\(app => app.enabled\)/);
});
