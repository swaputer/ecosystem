import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("ecosystem submissions publish immediately without an admin review surface", () => {
  const app = source("../src/App.vue");
  const catalog = source("../src/lib/apps.ts");
  const worker = source("../cloudflare/ecosystem-apps-worker/src/index.ts");

  assert.match(app, /Published successfully\. Your application is now listed\./);
  assert.match(app, /Publishing…[\s\S]*Publish app/);
  assert.doesNotMatch(app, /Application Review|Admin token|Submit for review|loadAdminCatalog/);

  assert.doesNotMatch(catalog, /AdminEcosystemApp|loadAdminCatalog|setApplicationStatus|x-admin-token/);
  assert.doesNotMatch(catalog, /status:\s*"pending"/);

  assert.match(worker, /status:\s*"approved"/);
  assert.match(worker, /filter\(app => app\.status !== "rejected"\)/);
  assert.doesNotMatch(worker, /ecosystem\/admin\/apps|x-admin-token|request\.method === "PATCH"/);
});
