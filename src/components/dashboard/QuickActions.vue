<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { Plus, ShoppingCart, BookPlus, WalletCards, PackagePlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
const auth = useAuthStore()
const actions = computed<{ icon: Component; label: string; to: string; permission: string }[]>(() => [
  { icon: Plus, label: 'Penjualan Baru', to: '/sales/invoices/new', permission: 'sales-invoices.create' },
  { icon: ShoppingCart, label: 'Pembelian Baru', to: '/purchases/invoices/new', permission: 'purchase-invoices.create' },
  { icon: BookPlus, label: 'Jurnal Baru', to: '/accounting/journals/new', permission: 'journals.create' },
  { icon: WalletCards, label: 'Terima Pembayaran', to: '/sales/settlements', permission: 'receivables.create' },
  { icon: PackagePlus, label: 'Penyesuaian Stok', to: '/inventory/adjustments', permission: 'inventory.update' },
].filter((action) => auth.hasPermission(action.permission)))
</script>
<template>
  <section v-if="actions.length" class="panel mt-5 p-4">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Aksi Cepat</p>
    <div class="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <RouterLink
        v-for="action in actions"
        :key="action.label"
        class="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        :to="action.to"
      >
        <component :is="action.icon" class="h-4 w-4" />
        {{ action.label }}
      </RouterLink>
    </div>
  </section>
</template>
