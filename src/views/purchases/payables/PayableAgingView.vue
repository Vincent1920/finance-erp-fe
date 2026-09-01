<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { reportService, type AgingReport } from '@/services/report.service'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'

const asOfDate = ref(new Date().toISOString().slice(0, 10))
const report = ref<AgingReport | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const buckets = computed(() => [
  ['Belum jatuh tempo', report.value?.buckets.current ?? 0],
  ['1–30 hari', report.value?.buckets['1-30'] ?? 0],
  ['31–60 hari', report.value?.buckets['31-60'] ?? 0],
  ['61–90 hari', report.value?.buckets['61-90'] ?? 0],
  ['> 90 hari', report.value?.buckets['>90'] ?? 0],
])

const fetchReport = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    report.value = await reportService.payableAging(asOfDate.value)
  } catch (error) {
    report.value = null
    errorMessage.value = getApiErrorMessage(error, 'Data umur utang gagal dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchReport)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Umur Utang</h1>
        <p class="mt-1 text-sm text-slate-500">Invoice pemasok yang masih memiliki saldo terutang.</p>
      </div>
      <div class="flex items-end gap-2">
        <label class="text-sm text-slate-600">Per tanggal
          <input v-model="asOfDate" type="date" class="field mt-1 block w-auto" />
        </label>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="isLoading" @click="fetchReport">Terapkan</AppButton>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
      <button class="ml-2 font-semibold underline" @click="fetchReport">Coba lagi</button>
    </div>
    <template v-else>
      <div class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div v-for="bucket in buckets" :key="bucket[0]" class="panel p-4">
          <p class="text-xs font-semibold uppercase text-slate-500">{{ bucket[0] }}</p>
          <p class="mt-2 font-bold tabular-nums">{{ formatCurrency(Number(bucket[1])) }}</p>
        </div>
      </div>
      <section class="panel overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th class="px-4 py-3">Invoice</th><th class="px-4 py-3">Pemasok</th><th class="px-4 py-3">Jatuh tempo</th><th class="px-4 py-3">Umur</th><th class="px-4 py-3 text-right">Outstanding</th></tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="row in report?.rows ?? []" :key="row.id">
                <td class="px-4 py-3 font-semibold">{{ row.invoice_number }}</td>
                <td class="px-4 py-3"><span class="block">{{ row.party_name }}</span><span class="text-xs text-slate-400">{{ row.party_code }}</span></td>
                <td class="px-4 py-3">{{ new Date(row.due_date).toLocaleDateString('id-ID') }}</td>
                <td class="px-4 py-3">{{ row.days_overdue > 0 ? `${row.days_overdue} hari` : 'Lancar' }}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">{{ formatCurrency(Number(row.outstanding_amount)) }}</td>
              </tr>
              <tr v-if="!isLoading && !report?.rows.length"><td colspan="5" class="px-4 py-12 text-center text-slate-400">Tidak ada utang terbuka pada tanggal ini.</td></tr>
            </tbody>
            <tfoot v-if="report?.rows.length" class="bg-slate-50 font-bold"><tr><td colspan="4" class="px-4 py-3">Total</td><td class="px-4 py-3 text-right tabular-nums">{{ formatCurrency(Number(report.total)) }}</td></tr></tfoot>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
