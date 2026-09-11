import "@fontsource-variable/inter";
import { Buffer } from "buffer";
import { createApp } from "vue";
import { RouterLink } from "vue-router";
import App from "./App.vue";
import "./styles.css";
import "./theme-dark.css";
import "./desktop.css";
import "./application-polish.css";
import "./wallet.css";
import "./ecosystem.css";

(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
createApp(App).component("RouterLink", RouterLink).mount("#app");
