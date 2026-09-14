export type AppId = "mint" | "wallet" | "browser" | "studio";

export type AppVisibility = "approved";

export interface EcosystemApp {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly category: string;
  readonly icon?: string;
  readonly status: AppVisibility;
  readonly external: boolean;
  readonly path?: string;
  readonly url?: string;
  readonly appId?: AppId;
}

const builtinApps: ReadonlyArray<EcosystemApp> = [
  { id: "browser", name: "Explore", domain: "explore.swaputer.com", category: "Explore", status: "approved", external: true },
  { id: "mint", name: "Factory", domain: "factory.swaputer.com", category: "Tools", path: "/factory", external: false, appId: "mint", status: "approved" },
  { id: "wallet", name: "Wallet", domain: "wallet.swaputer.com", category: "Wallet", path: "/wallet", external: false, appId: "wallet", status: "approved" },
  { id: "studio", name: "Studio", domain: "studio.swaputer.com", category: "Developer", status: "approved", external: true, appId: "studio" }
];

export const apps: ReadonlyArray<EcosystemApp> = builtinApps;

const rawCatalogURL = String(import.meta.env.VITE_ECOSYSTEM_APPS_CATALOG || "/api/ecosystem/apps").replace(/\/$/, "");
const rawSubmitURL = String(import.meta.env.VITE_ECOSYSTEM_APP_SUBMIT || rawCatalogURL).replace(/\/$/, "");

export const explorerBase = String(import.meta.env.VITE_PROTOCOL_EXPLORER_URL
  || (import.meta.env.DEV ? "http://127.0.0.1:4174" : "https://explore.swaputer.com")).replace(/\/$/, "");
export const studioBase = String(import.meta.env.VITE_STUDIO_URL
  || (import.meta.env.DEV ? "http://127.0.0.1:4176" : "https://studio.swaputer.com")).replace(/\/$/, "");
export const docsBase = String(import.meta.env.VITE_DOCS_URL
  || (import.meta.env.DEV ? "http://127.0.0.1:4177" : "https://docs.swaputer.com")).replace(/\/$/, "");

export const catalogURL = rawCatalogURL;
export const submitURL = rawSubmitURL;

export function explorerURL(path = ""): string {
  const route = path.startsWith("/") ? path : `/${path}`;
  return `${explorerBase}${route}`;
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function isBuiltinId(id: string): id is AppId {
  return id === "mint" || id === "wallet" || id === "browser" || id === "studio";
}

function normalizeApp(data: unknown): EcosystemApp | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "";
  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  const domain = normalizeDomain(typeof raw.domain === "string" ? raw.domain : (typeof raw.label === "string" ? raw.label : ""));
  if (!id || !name) return null;

  const status: AppVisibility = "approved";
  const external = typeof raw.external === "boolean" ? raw.external : !isBuiltinId(id);
  const website =
    typeof raw.url === "string" && raw.url.trim()
      ? raw.url.trim()
      : typeof raw.domain === "string" && raw.domain.trim()
        ? raw.domain.trim()
        : "";
  const path = typeof raw.path === "string" ? raw.path.trim() : undefined;
  const appId = isBuiltinId(id) ? id : undefined;
  const icon = typeof raw.icon === "string" ? raw.icon.trim() : undefined;

  return {
    id,
    name,
    domain: domain || normalizeDomain(website),
    category: category || "Tools",
    icon: icon || undefined,
    status,
    external,
    path,
    url: website,
    appId,
  };
}

export async function loadCatalogApps(): Promise<Array<EcosystemApp>> {
  const seeded = new Map<string, EcosystemApp>();

  const seed = async () => {
    for (const item of builtinApps) seeded.set(item.id, item);
  };

  try {
    const response = await fetch(catalogURL, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      await seed();
      return [...builtinApps];
    }

    const raw = await response.json().catch(() => null);
    const list = Array.isArray(raw) ? raw : Array.isArray((raw as { apps?: unknown[] })?.apps) ? (raw as { apps?: unknown[] }).apps : [];

    if (Array.isArray(list)) {
      for (const item of list) {
        const normalized = normalizeApp(item);
        if (!normalized) continue;
        if (!normalized.domain || !normalized.name) continue;
        seeded.set(normalized.id, normalized);
      }
    }

    await seed();
    return [...seeded.values()];
  } catch {
    await seed();
    return [...builtinApps];
  }
}

export async function submitApplication(payload: Omit<EcosystemApp, "status" | "appId">): Promise<void> {
  const response = await fetch(submitURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message.trim() || "Failed to submit application.");
  }
}

export function appForPath(path: string): EcosystemApp | undefined {
  const clean = path.split(/[?#]/)[0];
  for (const app of builtinApps) {
    if (!app.external && app.path === clean) return app;
  }
  return undefined;
}

export function canonicalUrl(app: EcosystemApp): string {
  if (app.id === "browser") return explorerBase;
  if (app.id === "studio") return studioBase;

  if (!app.external) {
    return app.url && app.url.trim() ? app.url.trim() : explorerBase;
  }

  if (app.url && /^https?:\/\//i.test(app.url.trim())) return app.url.trim();
  return `https://${normalizeDomain(app.url || app.domain || app.id)}${app.path || ""}`;
}
