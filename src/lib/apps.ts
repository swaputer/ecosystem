export type AppId = "mint" | "wallet" | "terminal" | "browser" | "studio";
export const apps = [
  { id: "browser" as AppId, name: "Explore", label: "explore.swaputer.xyz", category: "Explore", path: "", external: true },
  { id: "mint" as AppId, name: "Minter", label: "minter.swaputer.xyz", category: "Mint", path: "/minter", external: false },
  { id: "wallet" as AppId, name: "Wallet", label: "wallet.swaputer.xyz", category: "Wallet", path: "/wallet", external: false },
  { id: "studio" as AppId, name: "Studio", label: "studio.swaputer.xyz", category: "Developer", path: "", external: true },
  { id: "terminal" as AppId, name: "Terminal", label: "terminal.swaputer.xyz", category: "Tools", path: "/terminal", external: false }
];
export function appForPath(path: string) {
  return apps.find(app => !app.external && path.split(/[?#]/)[0] === app.path);
}
export const explorerBase = String(import.meta.env.VITE_PROTOCOL_EXPLORER_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
export const studioBase = String(import.meta.env.VITE_STUDIO_URL || "http://127.0.0.1:4176").replace(/\/$/, "");
export const docsBase = String(import.meta.env.VITE_DOCS_URL || "http://127.0.0.1:4177").replace(/\/$/, "");
export function explorerURL(path: string) { return new URL(path, explorerBase).href; }
