type AppVisibility = "approved" | "pending" | "rejected";

interface SubmissionInput {
  id?: string;
  name: string;
  category?: string;
  domain: string;
  icon?: string;
  url?: string;
  path?: string;
  external?: boolean;
}

interface EcosystemApplication {
  id: string;
  name: string;
  category: string;
  domain: string;
  icon?: string;
  status: AppVisibility;
  external: boolean;
  path?: string;
  url?: string;
  createdAt: string;
}

interface CatalogStore {
  apps: EcosystemApplication[];
}

interface KvNamespace {
  get(key: string, type?: "json" | "text"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
}

interface Env {
  APP_CATALOG: KvNamespace;
  ALLOWED_ORIGIN?: string;
}

const STORE_KEY = "apps";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

const CORS_REQUEST_HEADERS = "content-type";
const CORS_METHODS = "GET,POST,OPTIONS";

function corsHeaders(env: Env) {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
    "access-control-allow-methods": CORS_METHODS,
    "access-control-allow-headers": CORS_REQUEST_HEADERS,
  };
}

function json(data: unknown, status = 200, env?: Env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...(env ? corsHeaders(env) : {}),
      ...jsonHeaders,
    },
  });
}

function badRequest(message: string, env: Env) {
  return json({ message }, 400, env);
}

function notFound(env: Env) {
  return json({ message: "Not found" }, 404, env);
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function normalizeInput(data: unknown): SubmissionInput | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const category = typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : "Tools";
  const domain = typeof raw.domain === "string" ? normalizeDomain(raw.domain) : "";
  const icon = typeof raw.icon === "string" && raw.icon.trim() ? raw.icon.trim() : undefined;
  const url = typeof raw.url === "string" && raw.url.trim() ? raw.url.trim() : undefined;
  const path = typeof raw.path === "string" && raw.path.trim() ? raw.path.trim() : undefined;
  const external = typeof raw.external === "boolean" ? raw.external : true;

  if (!name || !domain) return null;
  return { name, category, domain, icon, url, path, external };
}

function newId() {
  return `app-${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}`;
}

function normalizeUrl(origin: string, value: string): string {
  return /^https?:\/\//i.test(value) ? value : `${origin}://${value}`;
}

async function readStore(env: Env): Promise<CatalogStore> {
  const raw = await env.APP_CATALOG.get(STORE_KEY);
  if (!raw) return { apps: [] };

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray((parsed as CatalogStore).apps)) {
        return { apps: (parsed as CatalogStore).apps };
      }
    } catch {
      return { apps: [] };
    }
  }
  return { apps: [] };
}

async function writeStore(env: Env, store: CatalogStore): Promise<void> {
  await env.APP_CATALOG.put(STORE_KEY, JSON.stringify(store));
}

function cleanApp(app: EcosystemApplication): EcosystemApplication {
  return {
    id: app.id,
    name: app.name,
    category: app.category || "Tools",
    domain: normalizeDomain(app.domain),
    icon: app.icon,
    status: app.status,
    external: Boolean(app.external),
    path: app.path,
    url: app.url,
    createdAt: app.createdAt || new Date().toISOString(),
  };
}

function sanitizeForDisplay(app: EcosystemApplication): EcosystemApplication {
  return {
    ...app,
    domain: app.domain,
    createdAt: app.createdAt,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    const normalizedPath = path.replace(/\/+$/, "");
    const route = normalizedPath.startsWith("api/") ? normalizedPath.slice(4) : normalizedPath;

    if (!route || route === "favicon.ico") {
      return json({ message: "Swaputer Ecosystem App Registry" }, 200, env);
    }

    const origin = `${url.protocol}//${url.host}`;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          ...corsHeaders(env),
          "access-control-max-age": "86400",
        },
      });
    }

    if (route === "ecosystem/apps") {
      if (request.method === "GET") {
        const store = await readStore(env);
        const apps = store.apps
          .filter(app => app.status !== "rejected")
          .map(cleanApp)
          .filter(app => app.name && app.domain)
          .map(app => ({
            id: app.id,
            name: app.name,
            category: app.category || "Tools",
            domain: app.domain,
            icon: app.icon,
            status: "approved",
            external: app.external,
            path: app.path,
            url: app.url,
          }));
        return json(apps, 200, env);
      }

      if (request.method === "POST") {
        const contentType = request.headers.get("content-type")?.toLowerCase() || "";
        if (!contentType.includes("application/json")) {
          return badRequest("application/json is required", env);
        }

        const input = normalizeInput(await request.json().catch(() => null));
        if (!input) {
          return badRequest("name and domain are required", env);
        }

        const store = await readStore(env);
        const domain = normalizeDomain(input.domain);
        const duplicate = store.apps.find(item => item.domain === domain);
        if (duplicate) {
          if (duplicate.status === "rejected") {
            return badRequest("This domain has been rejected. Contact support to resubmit.", env);
          }
          return json({ ...sanitizeForDisplay(duplicate), status: "approved" }, 200, env);
        }

        const app: EcosystemApplication = {
          id: input.id || newId(),
          name: input.name,
          category: input.category || "Tools",
          domain,
          icon: input.icon,
          status: "approved",
          external: input.external ?? true,
          path: input.path,
          url: input.url || normalizeUrl("https", domain),
          createdAt: new Date().toISOString(),
        };

        store.apps.push(app);
        await writeStore(env, { apps: store.apps });
        return json({ status: "approved", id: app.id }, 201, env);
      }

      return json({ message: "Method Not Allowed" }, 405, env);
    }

    return notFound(env);
  },
};
