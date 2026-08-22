<script setup lang="ts">
import type { Component } from 'vue'
import { Plus, ShoppingCart, BookPlus, WalletCards, PackagePlus } from 'lucide-vue-next'
const actions: { icon: Component; label: string }[] = [
  { icon: Plus, label: 'Penjualan Baru' },
  { icon: ShoppingCart, label: 'Pembelian Baru' },
  { icon: BookPlus, label: 'Jurnal Baru' },
  { icon: WalletCards, label: 'Terima Pembayaran' },
  { icon: PackagePlus, label: 'Penyesuaian Stok' },
]
</script>
<template>
  <section class="panel mt-5 p-4">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Aksi Cepat</p>
    <div class="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <button
        v-for="action in actions"
        :key="action.label"
        class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        <component :is="action.icon" class="h-4 w-4" />
        {{ action.label }}
      </button>
    </div>
  </section>
</template>
