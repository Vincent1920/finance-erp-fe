<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Download, RefreshCw } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { reportService } from '@/services/report.service'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'

type Cell = string | number | boolean | null | undefined
interface Column {
  key: string
  label: string
  money?: boolean
}
const route = useRoute(),
  today = new Date().toISOString().slice(0, 10)
const dateFrom = ref(`${today.slice(0, 4)}-01-01`),
  dateTo = ref(today)
const loading = ref(false),
  error = ref(''),
  columns = ref<Column[]>([]),
  rows = ref<Record<string, Cell>[]>([]),
  summary = ref('')
const kind = computed(() => String(route.meta.report)),
  title = computed(() => String(route.meta.title))

async function load() {
  loading.value = true
  error.value = ''
  summary.value = ''
  try {
    if (kind.value === 'general-ledger') {
      const x = await reportService.generalLedger(dateFrom.value, dateTo.value)
      columns.value = [
        { key: 'journal_date', label: 'Tanggal' },
        { key: 'account', label: 'Akun' },
        { key: 'journal_number', label: 'Jurnal' },
        { key: 'description', label: 'Keterangan' },
        { key: 'debit', label: 'Debit', money: true },
        { key: 'credit', label: 'Kredit', money: true },
        { key: 'running_balance', label: 'Saldo', money: true },
      ]
      rows.value = x.data.map((r) => ({
        ...r,
        journal_date: new Date(r.journal_date).toLocaleDateString('id-ID'),
        account: `${r.account_code} · ${r.account_name}`,
      }))
    } else if (kind.value === 'trial-balance') {
      const x = await reportService.trialBalance(dateFrom.value, dateTo.value)
      columns.value = [
        { key: 'account', label: 'Akun' },
        { key: 'openingDebit', label: 'Awal Debit', money: true },
        { key: 'openingCredit', label: 'Awal Kredit', money: true },
        { key: 'periodDebit', label: 'Mutasi Debit', money: true },
        { key: 'periodCredit', label: 'Mutasi Kredit', money: true },
        { key: 'endingDebit', label: 'Akhir Debit', money: true },
        { key: 'endingCredit', label: 'Akhir Kredit', money: true },
      ]
      rows.value = x.accounts.map((r) => ({ ...r, account: `${r.code} · ${r.name}` }))
      summary.value = `Total debit ${formatCurrency(Number(x.totals.endingDebit))} · Total kredit ${formatCurrency(Number(x.totals.endingCredit))} · Selisih ${formatCurrency(Number(x.difference))} · ${x.balanced ? 'SEIMBANG' : 'TIDAK SEIMBANG'}`
    } else if (kind.value === 'subledger') {
      const x = await reportService.subledger(dateTo.value)
      columns.value = [
        { key: 'type', label: 'Subledger' },
        { key: 'generalLedger', label: 'Saldo GL', money: true },
        { key: 'subledger', label: 'Saldo Subledger', money: true },
        { key: 'difference', label: 'Selisih', money: true },
        { key: 'status', label: 'Status' },
      ]
      rows.value = x.map((r) => ({
        ...r,
        type: r.type.toUpperCase(),
        status: r.balanced ? 'Cocok' : 'Selisih',
      }))
    } else {
      const x = await reportService.budgetVsActual(dateFrom.value, dateTo.value)
      columns.value = [
        { key: 'account', label: 'Akun' },
        { key: 'budget', label: 'Anggaran', money: true },
        { key: 'actual', label: 'Aktual', money: true },
        { key: 'variance', label: 'Variance', money: true },
        { key: 'variance_percentage', label: 'Variance %' },
      ]
      rows.value = (x ?? []).map((r) => ({
        ...r,
        account: `${r.account_code} · ${r.account_name}`,
      }))
    }
  } catch (e) {
    rows.value = []
    error.value = getApiErrorMessage(e, 'Laporan gagal dimuat dari server.')
  } finally {
    loading.value = false
  }
}

function exportCsv() {
  const csv = [
    columns.value.map((c) => c.label),
    ...rows.value.map((r) => columns.value.map((c) => String(r[c.key] ?? ''))),
  ]
    .map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${kind.value}-${dateTo.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
watch(kind, load)
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Data berasal dari transaksi dan jurnal production database.
        </p>
      </div>
      <AppButton :icon="Download" variant="secondary" :disabled="!rows.length" @click="exportCsv">
        Export CSV
      </AppButton>
    </div>
    <section class="panel p-5">
      <div class="mb-5 flex flex-wrap items-end gap-3">
        <label v-if="kind !== 'subledger'" class="text-sm">
          Dari
          <input v-model="dateFrom" type="date" class="field mt-1 block" />
        </label>
        <label class="text-sm">
          {{ kind === 'subledger' ? 'Per tanggal' : 'Sampai' }}
          <input v-model="dateTo" type="date" class="field mt-1 block" />
        </label>
        <AppButton :icon="RefreshCw" :loading="loading" @click="load">Muat</AppButton>
      </div>
      <div v-if="error" class="rounded bg-red-50 p-4 text-red-700">{{ error }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                class="px-3 py-3"
                :class="column.money && 'text-right'"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="(row, index) in rows" :key="index">
              <td
                v-for="column in columns"
                :key="column.key"
                class="px-3 py-3"
                :class="column.money && 'text-right tabular-nums'"
              >
                {{ column.money ? formatCurrency(Number(row[column.key] ?? 0)) : row[column.key] }}
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td :colspan="columns.length" class="py-12 text-center text-slate-400">
                Tidak ada data pada filter ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="summary" class="mt-4 rounded bg-slate-50 p-3 text-sm font-semibold">{{ summary }}</p>
    </section>
  </div>
</template>
