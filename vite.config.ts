import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [vue()],
    resolve: { alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "buffer": fileURLToPath(new URL("./node_modules/buffer/index.js", import.meta.url)),
      "node:crypto": fileURLToPath(new URL("./src/lib/nodeCryptoShim.ts", import.meta.url)),
      "node:fs/promises": fileURLToPath(new URL("./src/lib/nodeFsPromisesShim.ts", import.meta.url)),
      "node:path": fileURLToPath(new URL("./src/lib/nodePathShim.ts", import.meta.url))
    } },
    server: {
      host: "127.0.0.1", port: 4175, strictPort: true,
      proxy: { "/api": { target: env.INDEXER_PROXY_URL || "http://127.0.0.1:8080", changeOrigin: true, ws: true, rewrite: path => path.replace(/^\/api/, "") } }
    },
    preview: { host: "127.0.0.1", port: 4175, strictPort: true }
  };
});
