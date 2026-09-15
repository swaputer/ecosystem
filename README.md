# Swaputer Ecosystem

A clean ecosystem directory for Swaputer protocol applications. It gives users one place to open Explore, Factory, Wallet, and Studio without presenting the product as a simulated operating system.

## Applications

- **Explore** opens the protocol explorer in a separate browser tab.
- **Factory** verifies a public-mint SRC20 contract, displays its supply and mint progress, and mints to the connected wallet. Create SRC20 deploys a new token using the public mint template.
- **Wallet** starts empty, imports indexed Swaputer token addresses, reads their protocol balances, and sends supported tokens to an EVM wallet address.
- **Studio** opens the standalone online Studio.

The included release is Ethereum Mainnet. Connecting a wallet does not sign or send a transaction. The Hook's one-way `live()` state controls pool trading only and is not used as a global client-side gate for ecosystem actions. The onchain route remains authoritative for each transaction. Account or network changes require reconnection.

Ecosystem serializes protocol writes so two applications cannot reuse the same action nonce. The Ethereum mainnet release uses one confirmation; protocol execution is atomic, so an SVM failure reverts the outer transaction. If a wallet or RPC cannot obtain that receipt, Ecosystem preserves the full transaction hash for Explore reconciliation and blocks further writes until the page is reloaded.

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
| `VITE_ECOSYSTEM_APPS_CATALOG` | Cloudflare-hosted ecosystem app catalog endpoint (default `/api/ecosystem/apps`) |
| `VITE_ECOSYSTEM_APP_SUBMIT` | Submission endpoint for apps published directly to the catalog (default same as catalog) |
| `VITE_PROTOCOL_EXPLORER_URL` | Protocol explorer for contract, address and transaction links |
| `VITE_DOCS_URL` | Documentation site URL |
| `VITE_STUDIO_URL` | Standalone Studio URL |
| `VITE_RPC_URL` | Optional read-only RPC endpoint |

Contract addresses and release scope are pinned in `config/ethereum-mainnet.json`. The app uses the published `@swaputer-labs/tinysol` compiler and includes the matching contract sources. No sibling repository or submodule is required to install or build it.

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

Serve `dist/` with HTTPS and proxy `/api/` to the indexer, including WebSocket upgrades. Set `VITE_PROTOCOL_EXPLORER_URL`, `VITE_DOCS_URL` and `VITE_STUDIO_URL` before building. Hash links such as `/#/factory?contract=0x...` preserve the destination.

A standalone Docker build is also provided:

```sh
docker build --pull --build-arg VITE_PROTOCOL_EXPLORER_URL=https://YOUR_EXPLORER_HOST --build-arg VITE_DOCS_URL=https://YOUR_DOCS_HOST --build-arg VITE_STUDIO_URL=https://YOUR_STUDIO_HOST -t swaputer-ecosystem .
docker run --rm -p 127.0.0.1:4175:8080 -e INDEXER_ORIGIN=http://YOUR_INDEXER_HOST:8080 swaputer-ecosystem
```

## Applications registry

Ecosystem applications are loaded from a Cloudflare Worker API. Valid submissions are published immediately without a manual review step.
Legacy rejected records remain hidden; legacy pending records are treated as published.

The worker implementation is in `ecosystem/cloudflare/ecosystem-apps-worker` and supports:

- `GET /ecosystem/apps` (public application list)
- `POST /ecosystem/apps` (publish an application)

Set `VITE_ECOSYSTEM_APPS_CATALOG` and `VITE_ECOSYSTEM_APP_SUBMIT` to the deployed endpoint.
