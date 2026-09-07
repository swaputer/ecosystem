import { OFFICIAL_FEATURES } from "./config";

export type AppId = "mint" | "market" | "bridge" | "terminal" | "browser";
export const apps = [
  { id: "mint" as AppId, name: "Mint", path: "/minter", external: false, enabled: true },
  { id: "market" as AppId, name: "Market", path: "/market", external: false, enabled: OFFICIAL_FEATURES.market },
  { id: "bridge" as AppId, name: "Bridge", path: "/bridge", external: false, enabled: OFFICIAL_FEATURES.seth },
  { id: "terminal" as AppId, name: "Terminal", path: "/terminal", external: false, enabled: true },
  { id: "browser" as AppId, name: "Explore", path: "", external: true, enabled: true }
].filter(app => app.enabled);
export function appForPath(path: string) {
  return apps.find(app => !app.external && (path.split(/[?#]/)[0] === app.path || (app.id === "market" && path.startsWith("/market/"))));
}
export const explorerBase = String(import.meta.env.VITE_PROTOCOL_EXPLORER_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
export function explorerURL(path: string) { return new URL(path, explorerBase).href; }
