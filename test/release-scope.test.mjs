import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveOfficialFeatureScope } from "../src/lib/releaseScope.ts";

const registry = readFileSync(new URL("../src/lib/apps.ts", import.meta.url), "utf8");

test("Base Sepolia and local releases preserve the existing application routes", () => {
  for (const environment of ["local", "testnet"]) {
    const scope = resolveOfficialFeatureScope(environment);
    assert.equal(scope.market, true);
    assert.equal(scope.seth, true);
    assert.equal(scope.auction, false);
  }
});

test("mainnet and unknown environments fail closed to the Stage 7M interface scope", () => {
  for (const environment of ["mainnet", "production", ""]) {
    assert.deepEqual(resolveOfficialFeatureScope(environment), {
      explorer: true,
      studio: true,
      openMintMinter: true,
      market: false,
      seth: false,
      auction: false
    });
  }
});

test("the shared desktop and mobile app registry respects the release gates", () => {
  assert.match(registry, /enabled: OFFICIAL_FEATURES\.market/);
  assert.match(registry, /enabled: OFFICIAL_FEATURES\.seth/);
  assert.match(registry, /filter\(app => app.enabled\)/);
});
