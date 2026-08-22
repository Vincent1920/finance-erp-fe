<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Search, FileText, Users, Package, BookOpen } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { transactions } from '@/data/dummy/transactions'
const q = ref('')
const results = computed(() =>
  q.value.length < 2
    ? []
    : transactions
        .filter((x) =>
          `${x.number} ${x.party} ${x.type}`.toLowerCase().includes(q.value.toLowerCase()),
        )
        .slice(0, 10),
)
const focus = () => document.querySelector<HTMLInputElement>('#global-search')?.focus()
onMounted(() => {
  addEventListener('open-global-search', focus)
  focus()
})
onUnmounted(() => removeEventListener('open-global-search', focus))
const icons = [FileText, Users, Package, BookOpen]
</script>
<template>
  <div class="mx-auto max-w-3xl">
    <AppBreadcrumb />
    <h1 class="text-2xl font-bold">Pencarian Global</h1>
    <p class="mt-1 text-sm text-slate-500">
      Cari akun, kontak, barang, invoice, jurnal, dan pembayaran.
    </p>
    <section class="panel mt-6 overflow-hidden">
      <label class="flex items-center gap-3 border-b p-5">
        <Search class="h-5 w-5 text-slate-400" />
        <input
          id="global-search"
          v-model="q"
          class="w-full text-base"
          placeholder="Ketik minimal 2 karakter..."
        />
        <kbd class="rounded border bg-slate-50 px-2 py-1 text-xs text-slate-400">Ctrl K</kbd>
      </label>
      <div v-if="results.length" class="divide-y">
        <button
          v-for="(r, i) in results"
          :key="r.id"
          class="flex w-full items-center gap-4 p-4 text-left hover:bg-slate-50"
        >
          <span class="rounded-lg bg-blue-50 p-2 text-blue-600">
            <component :is="icons[i % icons.length]" class="h-5 w-5" />
          </span>
          <span>
            <b class="block text-sm">{{ r.number }} · {{ r.party }}</b>
            <small class="text-slate-400">{{ r.type }}</small>
          </span>
        </button>
      </div>
      <div v-else class="p-12 text-center text-sm text-slate-400">
        {{
          q.length < 2
            ? 'Mulai ketik untuk mencari seluruh data perusahaan.'
            : 'Tidak ada hasil yang cocok.'
        }}
      </div>
    </section>
  </div>
</template>
