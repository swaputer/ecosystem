# Browser CLI adapter provenance

Swaputer Ecosystem consumes `@swaputer-labs/cli` from the public npm registry. It does not use or publish a repacked CLI archive.

The dependencies are fetched from the public npm registry and pinned by these Subresource Integrity values in `package-lock.json`:

| Package | Registry artifact | Integrity |
| --- | --- | --- |
| `@swaputer-labs/cli@0.1.2` | `https://registry.npmjs.org/@swaputer-labs/cli/-/cli-0.1.2.tgz` | `sha512-hJMFw1Grimy2cLLpaITFOP5AJlHeGt4ZmMfQYk6Anblmq7iQyccNkfVcWXRFHmJjE+mTZHRLxzInheEjx7wosw==` |
| `@swaputer-labs/receipt-codec@0.1.2` | `https://registry.npmjs.org/@swaputer-labs/receipt-codec/-/receipt-codec-0.1.2.tgz` | `sha512-UP5KJsdtAU1AcBBWeLgCDUtPemIE1TujqszbuDnBojGSmis9Rsu9m2jFGlzAy/64G/stNs3xQLsI/VQE7BY1RA==` |

The npm metadata points to `swaputer/tooling` (`tooling/cli` and `tooling/receipt-codec`) but does not publish a `gitHead`, so the registry artifact and lockfile integrity are the reproducible provenance for this build.

CLI 0.1.2 exposes its Node.js API from the package root, but it does not expose `./browser`; importing the root in a browser also evaluates Node-only deployment helpers. Ecosystem therefore aliases only these immutable files from the exact installed package:

- `dist/src/errors.js`
- `dist/src/inspect.js`
- `dist/src/json.js`
- `dist/src/rpc.js`
- `dist/src/types.js`
- `package.json` (package identity only)

`src/lib/browserCli.ts` is identified separately as `Swaputer browser verifier 0.1.0`. It supplies the browser command grammar and output formatting for `help`, `version`, `inspect`, `decode-receipt` and `clear`; it does not claim to execute the published CLI binary. Transaction and receipt decoding remain implemented by the exact published modules. Before displaying `Verified`, `src/lib/canonicalFinality.ts` independently re-fetches and links the receipt, transaction envelope and containing block, requires the finalized head to include that block, and enforces the active one-confirmation policy. The adapter deliberately provides no signing or transaction-submission command.

Ecosystem does not reuse the package's Node binary or its binary version string. The Terminal's `version` command reports the internal adapter identity and the verifier module package identity on separate lines.

Remove these aliases and import the public browser export after a later CLI release provides equivalent canonical-finality guarantees. Unit, browser and production-build checks must pass before making that change.
