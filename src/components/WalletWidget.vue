<script setup lang="ts">
import { computed } from 'vue';
import { formatWalletBalance } from '@/lib/walletBalance';

const props = defineProps<{ balance: bigint | null; loading: boolean; network: string }>();
defineEmits<{ open: [] }>();

const balanceText = computed(() => formatWalletBalance(props.balance, props.loading));
</script>

<template>
  <button class="os-wallet-status" type="button" :aria-label="`Wallet, ${balanceText} ETH, ${network}`" @click="$emit('open')">
    <strong><span>{{ balanceText }}</span><small>ETH</small></strong>
  </button>
</template>
