# Swaputer Ecosystem

A clean ecosystem directory for Swaputer protocol applications. It gives users one place to open Explore, Minter, Wallet, Studio and Terminal without presenting the product as a simulated operating system.

## Applications

- **Explore** opens the protocol explorer in a separate browser tab.
- **Minter** verifies a public-mint SRC20 contract, displays its supply and mint progress, and mints to the connected wallet. Create SRC20 deploys a new token using the public mint template.
- **Wallet** starts empty, imports indexed Swaputer token contracts by ID, reads their protocol balances, and sends supported tokens to an EVM wallet address.
- **Studio** opens the standalone online Studio.
- **Terminal** combines Ecosystem's read-only browser verifier adapter with published Swaputer verification modules for `inspect`, `decode-receipt`, `help`, `version` and `clear` commands.

The Terminal uses transaction inspection from the published `@swaputer-labs/cli@0.1.2` package and receipt decoding from `@swaputer-labs/receipt-codec@0.1.2`. Its adapter additionally rechecks the receipt, transaction envelope, canonical block, finalized head and the active one-confirmation policy before displaying `Verified`. Because CLI 0.1.2 does not publish a browser export and its root barrel also loads Node-only deployment helpers, Ecosystem imports the exact browser-safe inspection modules through a documented internal adapter. See [Browser CLI adapter provenance](docs/browser-cli-adapter.md). No repacked package or sibling repository is required.

The included release is Base Sepolia. Connecting a wallet does not sign or send a transaction. Transaction actions request confirmation in the wallet. Account or network changes require reconnection.

Ecosystem serializes protocol writes so two applications cannot reuse the same action nonce. A write is shown as confirmed when its one-confirmation Base receipt succeeds; protocol execution is atomic, so an SVM failure reverts the outer transaction. If a wallet or RPC cannot obtain that receipt, Ecosystem preserves the full transaction hash for Explore reconciliation and blocks further writes until the page is reloaded.

Use an injected EVM browser wallet on desktop, or open the site in an EVM wallet's built-in mobile browser. Ordinary mobile Safari/Chrome without an injected wallet cannot connect in this version; WalletConnect is not integrated. Disconnect clears the local session; it does not revoke the wallet's site permission.

## Development

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4175`. The development server forwards `/api` to the indexer at `http://127.0.0.1:8080`. Configure `.env.local` using the settings in `.env.example`:

| Setting | Purpose |
| --- | --- |
| `VITE_SVM_API_URL` | Indexer HTTP/WebSocket base, normally `/api` |
| `INDEXER_PROXY_URL` | Development proxy destination |
| `VITE_PROTOCOL_EXPLORER_URL` | Protocol explorer for contract, address and transaction links |
| `VITE_DOCS_URL` | Documentation site URL |
| `VITE_STUDIO_URL` | Standalone Studio URL |
| `VITE_RPC_URL` | Optional read-only RPC endpoint |

Contract addresses and release scope are pinned in `config/base-sepolia.json`. The app uses the published `@swaputer-labs/tinysol` compiler and includes the matching contract sources. No sibling repository or submodule is required to install or build it.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test
```

Browser tests use a simulated wallet and never submit real transactions. On macOS they use the installed Google Chrome. Package identity tests compile both bundled contract sources and compare their hashes against the release manifest.

## Deployment

```sh
npm run build
```

Serve `dist/` with HTTPS and proxy `/api/` to the indexer, including WebSocket upgrades. Set `VITE_PROTOCOL_EXPLORER_URL`, `VITE_DOCS_URL` and `VITE_STUDIO_URL` before building. Hash links such as `/#/minter?contract=0x...` preserve the destination.

A standalone Docker build is also provided:

```sh
docker build --pull --build-arg VITE_PROTOCOL_EXPLORER_URL=https://YOUR_EXPLORER_HOST --build-arg VITE_DOCS_URL=https://YOUR_DOCS_HOST --build-arg VITE_STUDIO_URL=https://YOUR_STUDIO_HOST -t swaputer-ecosystem .
docker run --rm -p 127.0.0.1:4175:8080 -e INDEXER_ORIGIN=http://YOUR_INDEXER_HOST:8080 swaputer-ecosystem
```
