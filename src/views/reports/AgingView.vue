<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { reportService, type AgingReport } from '@/services/report.service'
import { receivableService } from '@/services/receivable.service'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'
import SavedFilterBar from '@/components/common/SavedFilterBar.vue'

const route = useRoute()
const sales = computed(() => route.path.startsWith('/sales'))
const title = computed(() => (sales.value ? 'Piutang Usaha' : 'Umur Utang'))
const today = new Date()
const asOf = ref(
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
)
const report = ref<AgingReport | null>(null),
  search = ref(''),
  selected = ref('all'),
  loading = ref(false),
  error = ref('')
const buckets = [
  { key: 'all', label: 'All / Seluruhnya' },
  { key: 'current', label: 'Belum Jatuh Tempo' },
  { key: '1-30', label: '1–30 Hari' },
  { key: '31-60', label: '31–60 Hari' },
  { key: '61-90', label: '61–90 Hari' },
  { key: '>90', label: '> 90 Hari' },
]
const searched = computed(() =>
  (report.value?.rows ?? []).filter((r) =>
    `${r.invoice_number} ${r.party_code} ${r.party_name}`
      .toLowerCase()
      .includes(search.value.trim().toLowerCase()),
  ),
)
const rows = computed(() =>
  searched.value.filter((r) => selected.value === 'all' || r.aging_bucket === selected.value),
)
const sum = (items: AgingReport['rows']) =>
  items.reduce((n, r) => n + Math.round(Number(r.outstanding_amount) * 100), 0) / 100
const total = computed(() => sum(rows.value))
const amount = (key: string) =>
  sum(searched.value.filter((r) => key === 'all' || r.aging_bucket === key))
const savedFilters = computed(() => ({ as_of_date: asOf.value, bucket: selected.value, search: search.value }))
function applySavedFilters(filters: Record<string, unknown>) {
  asOf.value = String(filters.as_of_date ?? asOf.value)
  selected.value = String(filters.bucket ?? 'all')
  search.value = String(filters.search ?? '')
  load()
}
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  error.value = ''
  report.value = null
  try {
    const data = sales.value
      ? await receivableService.aging(asOf.value)
      : await reportService.payableAging(asOf.value)
    if (current === request) report.value = data
  } catch (e) {
    if (current === request) error.value = getApiErrorMessage(e, 'Laporan gagal dimuat.')
  } finally {
    if (current === request) loading.value = false
  }
}
watch(sales, load)
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Saldo invoice yang sudah diposting pada tanggal laporan. Ringkasan mengikuti pencarian.
        </p>
      </div>
      <div class="flex items-end gap-2">
        <label class="text-sm">
          Per tanggal
          <input v-model="asOf" class="field mt-1" type="date" />
        </label>
        <AppButton :loading="loading" @click="load">Terapkan</AppButton>
      </div>
    </div>
    <input
      v-model="search"
      type="search"
      class="field mb-4 max-w-lg"
      placeholder="Ketik nomor invoice, kode, atau nama mitra..."
      aria-label="Cari invoice atau mitra"
    />
    <SavedFilterBar class="mb-4" :screen-key="sales ? 'aging:receivable' : 'aging:payable'" :filters="savedFilters" @apply="applySavedFilters" />
    <p v-if="error" role="alert" class="mb-4 rounded bg-red-50 p-4 text-red-700">{{ error }}</p>
    <div class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <button
        v-for="b in buckets"
        :key="b.key"
        class="panel p-4 text-left"
        :class="selected === b.key && 'ring-2 ring-blue-500'"
        :aria-pressed="selected === b.key"
        @click="selected = b.key"
      >
        <span class="text-xs text-slate-500">{{ b.label }}</span>
        <b class="mt-2 block">{{ loading ? '…' : formatCurrency(amount(b.key)) }}</b>
      </button>
    </div>
    <section class="panel overflow-hidden">
      <div class="border-b p-4 font-semibold">
        {{ rows.length }} invoice · Total ditampilkan {{ formatCurrency(total) }}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Invoice</th>
              <th class="p-3">Kode Mitra</th>
              <th class="p-3">{{ sales ? 'Pelanggan' : 'Pemasok' }}</th>
              <th class="p-3">Jatuh Tempo</th>
              <th class="p-3 text-right">Nilai Awal</th>
              <th class="p-3 text-right">Pelunasan</th>
              <th class="p-3 text-right">Retur</th>
              <th class="p-3 text-right">Kredit dipakai</th>
              <th class="p-3 text-right">Sisa</th>
              <th class="p-3">Umur</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="loading"><td colspan="10" class="p-12 text-center">Memuat laporan…</td></tr>
            <tr v-for="r in rows" v-else :key="r.id">
              <td class="p-3">
                <RouterLink
                  class="font-semibold text-blue-600"
                  :to="`${sales ? '/sales' : '/purchases'}/invoices/${r.id}`"
                >
                  {{ r.invoice_number }}
                </RouterLink>
              </td>
              <td class="p-3">{{ r.party_code }}</td>
              <td class="p-3">{{ r.party_name }}</td>
              <td class="p-3">{{ String(r.due_date).slice(0, 10) }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(r.original_amount)) }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(r.paid_amount)) }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(r.returned_amount)) }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(r.credit_amount)) }}</td>
              <td class="p-3 text-right font-bold">
                {{ formatCurrency(Number(r.outstanding_amount)) }}
              </td>
              <td class="p-3">{{ buckets.find((b) => b.key === r.aging_bucket)?.label }}</td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td colspan="10" class="p-12 text-center text-slate-500">
                Tidak ada saldo terbuka pada filter ini.
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-slate-50 font-bold">
            <tr>
              <td colspan="8" class="p-3">Total sesuai rincian</td>
              <td class="p-3 text-right">{{ formatCurrency(total) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>
