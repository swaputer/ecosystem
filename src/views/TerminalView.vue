<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { BROWSER_HELP, browserErrorLines, executeBrowserCommand } from "@swaputer-labs/cli/browser";
import { CLI_DEPLOYMENT, NETWORK } from "@/lib/config";

interface TerminalEntry {
  readonly command: string;
  lines: readonly string[];
  error?: boolean;
  pending?: boolean;
}

const entries = ref<TerminalEntry[]>([{ command: "help", lines: BROWSER_HELP }]);
const input = ref("");
const inputElement = ref<HTMLInputElement>();
const scrollElement = ref<HTMLElement>();
const busy = ref(false);
const commands: string[] = [];
let commandIndex = 0;

async function settleFocus() {
  await nextTick();
  if (scrollElement.value) scrollElement.value.scrollTop = scrollElement.value.scrollHeight;
  inputElement.value?.focus();
}

async function run() {
  const command = input.value.trim();
  if (!command || busy.value) return;
  commands.push(command);
  commandIndex = commands.length;
  input.value = "";
  const entry: TerminalEntry = { command, lines: [], pending: true };
  entries.value.push(entry);
  busy.value = true;
  await settleFocus();
  try {
    const result = await executeBrowserCommand(command, { deployment: CLI_DEPLOYMENT, rpcUrl: NETWORK.rpcUrl });
    if (result.clear) entries.value = [];
    else entry.lines = result.lines;
  } catch (error) {
    entry.lines = browserErrorLines(error);
    entry.error = true;
  } finally {
    entry.pending = false;
    busy.value = false;
    await settleFocus();
  }
}

function history(event: KeyboardEvent) {
  if (event.key === "l" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    entries.value = [];
    void settleFocus();
    return;
  }
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  if (event.key === "ArrowUp") commandIndex = Math.max(0, commandIndex - 1);
  else commandIndex = Math.min(commands.length, commandIndex + 1);
  input.value = commands[commandIndex] ?? "";
  void nextTick(() => inputElement.value?.setSelectionRange(input.value.length, input.value.length));
}

onMounted(() => void settleFocus());
</script>

<template>
  <section class="terminal-app" aria-label="Swaputer command terminal" @click="inputElement?.focus()">
    <div ref="scrollElement" class="terminal-scroll" role="log" aria-live="polite">
      <div v-for="(entry, index) in entries" :key="index" class="terminal-entry">
        <div class="terminal-command"><span>swaputer&gt;</span> {{ entry.command }}</div>
        <div v-for="(line, lineIndex) in entry.lines" :key="lineIndex" :class="['terminal-line', { 'is-error': entry.error }]">{{ line || '\u00a0' }}</div>
        <div v-if="entry.pending" class="terminal-line terminal-working">Verifying on {{ NETWORK.displayName }}…</div>
      </div>
      <form class="terminal-prompt" @submit.prevent="run">
        <label for="terminal-command">swaputer&gt;</label>
        <input id="terminal-command" ref="inputElement" v-model="input" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false" :disabled="busy" @keydown="history" />
      </form>
    </div>
  </section>
</template>
