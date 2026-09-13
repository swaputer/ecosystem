# Swaputer Ecosystem App Registry Worker

This worker stores submitted ecosystem applications in Cloudflare KV and exposes a
small API consumed by the ecosystem frontend.

## Endpoints

- `GET /ecosystem/apps`:
  - Returns published applications as an array.
  - Payload: `{ id, name, category, domain, icon, status, external, path, url }`
- `POST /ecosystem/apps`:
  - Publishes a new application immediately.
  - Body: `{ name, category?, domain, icon?, external?, url?, path? }`
  - Returns `{ status: "approved", id }` on success.

## Local development

```bash
cd ecosystem/cloudflare/ecosystem-apps-worker
npm install
npx wrangler kv namespace create APP_CATALOG
```

1. Copy the returned namespace IDs into `wrangler.toml`.
2. Fill `ALLOWED_ORIGIN` as needed in Wrangler vars.

```bash
npx wrangler dev
```

## Deployment

```bash
npx wrangler deploy
```

After deploy, point the ecosystem frontend to the worker endpoint in `ecosystem/.env.local`:

```bash
VITE_ECOSYSTEM_APPS_CATALOG=https://your-worker.domain/ecosystem/apps
VITE_ECOSYSTEM_APP_SUBMIT=https://your-worker.domain/ecosystem/apps
```

If omitted, the frontend defaults back to `/api/ecosystem/apps` for local development.
