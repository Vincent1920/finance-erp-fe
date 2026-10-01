<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import { exportRows } from '@/utils/export'
import AppSelect from '@/components/common/AppSelect.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { reportService, type LedgerRow, type TrialBalanceReport } from '@/services/report.service'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'
const today = new Date().toLocaleDateString('en-CA')
const from = ref(`${new Date().getFullYear()}-01-01`),
  to = ref(/^\d{4}-/.test(today) ? today : new Date().toISOString().slice(0, 10))
const account = ref<number | null>(null),
  search = ref(''),
  rows = ref<LedgerRow[]>([]),
  balances = ref<TrialBalanceReport['accounts']>([])
const page = ref(1),
  total = ref(0),
  loading = ref(false),
  exporting = ref(false),
  error = ref('')
const applied = ref({
  from: from.value,
  to: to.value,
  account: undefined as number | undefined,
  search: '',
})
const selected = computed(() => balances.value.find((a) => a.id === applied.value.account))
const options = computed(() =>
  balances.value.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
)
const balance = (value: number) => `${formatCurrency(Math.abs(value))} ${value < 0 ? 'K' : 'D'}`
async function load(reset = true) {
  if (loading.value) return
  if (reset && (!from.value || !to.value || from.value > to.value)) {
    error.value = 'Rentang tanggal tidak valid.'
    return
  }
  if (reset) {
    page.value = 1
    applied.value = {
      from: from.value,
      to: to.value,
      account: account.value ?? undefined,
      search: search.value.trim(),
    }
  }
  loading.value = true
  error.value = ''
  try {
    const f = applied.value
    const result = await reportService.generalLedger(f.from, f.to, {
      account_id: f.account,
      reference: f.search || undefined,
      page: page.value,
      limit: 50,
    })
    rows.value = result.data
    total.value = result.meta.total
    if (reset) balances.value = (await reportService.trialBalance(f.from, f.to)).accounts
  } catch (e) {
    rows.value = []
    total.value = 0
    error.value = getApiErrorMessage(e, 'Buku besar gagal dimuat.')
  } finally {
    loading.value = false
  }
}
async function exportCsv() {
  exporting.value = true
  try {
    const f = applied.value
    const query = { account_id: f.account, reference: f.search || undefined, limit: 200 }
    const first = await reportService.generalLedger(f.from, f.to, { ...query, page: 1 })
    const all = [...first.data]
    for (let p = 2; p <= first.meta.totalPages; p++)
      all.push(...(await reportService.generalLedger(f.from, f.to, { ...query, page: p })).data)
    exportRows(
      'buku-besar-' + f.from + '-' + f.to,
      [
        ['journal_date', 'Tanggal'],
        ['account_code', 'Nomor Akun'],
        ['account_name', 'Nama COA'],
        ['journal_number', 'Nomor Jurnal'],
        ['reference', 'Referensi'],
        ['description', 'Keterangan'],
        ['debit', 'Debit'],
        ['credit', 'Kredit'],
        ['running_balance', 'Saldo (D positif / K negatif)'],
      ],
      all.map((r) => ({ ...r, journal_date: String(r.journal_date).slice(0, 10) })),
    )
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Ekspor gagal.')
  } finally {
    exporting.value = false
  }
}
onMounted(() => load())
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Buku Besar</h1>
        <p class="mt-1 text-sm text-slate-500">
          Jurnal posted · Saldo debit (D) dan kredit (K) per akun.
        </p>
      </div>
      <AppButton
        variant="secondary"
        :loading="exporting"
        :disabled="loading || !total"
        @click="exportCsv"
      >
        Ekspor seluruh hasil CSV
      </AppButton>
    </div>
    <section class="panel p-5">
      <form class="mb-5 flex flex-wrap items-end gap-3" @submit.prevent="load()">
        <label class="text-sm">
          Dari
          <input v-model="from" type="date" class="field mt-1" required />
        </label>
        <label class="text-sm">
          Sampai
          <input v-model="to" type="date" class="field mt-1" required />
        </label>
        <AppSelect
          :model-value="account"
          class="min-w-64"
          label="Akun"
          :options="options"
          value-type="number"
          @update:model-value="account = $event === null ? null : Number($event)"
        />
        <label class="text-sm">
          Cari
          <input
            v-model="search"
            type="search"
            class="field mt-1"
            placeholder="Akun, jurnal, referensi…"
          />
        </label>
        <AppButton type="submit" :loading="loading">Terapkan</AppButton>
      </form>
      <div v-if="selected" class="mb-5 grid gap-3 sm:grid-cols-4">
        <div class="rounded bg-slate-50 p-3">
          Saldo awal
          <b class="block">
            {{ balance(Number(selected.openingDebit) - Number(selected.openingCredit)) }}
          </b>
        </div>
        <div class="rounded bg-slate-50 p-3">
          Debit periode
          <b class="block">{{ formatCurrency(Number(selected.periodDebit)) }}</b>
        </div>
        <div class="rounded bg-slate-50 p-3">
          Kredit periode
          <b class="block">{{ formatCurrency(Number(selected.periodCredit)) }}</b>
        </div>
        <div class="rounded bg-blue-50 p-3">
          Saldo akhir
          <b class="block">
            {{ balance(Number(selected.endingDebit) - Number(selected.endingCredit)) }}
          </b>
        </div>
      </div>
      <p v-if="applied.search && selected" class="mb-3 text-xs text-slate-500">
        Ringkasan dan saldo berjalan mencakup seluruh mutasi akun pada periode; pencarian hanya
        menyaring baris.
      </p>
      <p v-if="error" role="alert" class="mb-3 rounded bg-red-50 p-3 text-red-700">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Nomor Akun</th>
              <th class="p-3">Nama COA</th>
              <th class="p-3">Jurnal</th>
              <th class="p-3">Keterangan / Referensi</th>
              <th class="p-3 text-right">Debit</th>
              <th class="p-3 text-right">Kredit</th>
              <th class="p-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-if="loading"><td colspan="8" class="p-8 text-center">Memuat…</td></tr>
            <tr v-for="r in rows" v-else :key="r.id">
              <td class="p-3 whitespace-nowrap">{{ String(r.journal_date).slice(0, 10) }}</td>
              <td class="p-3 font-mono">{{ r.account_code }}</td>
              <td class="p-3">{{ r.account_name }}</td>
              <td class="p-3">
                <RouterLink class="text-blue-600" :to="`/accounting/journals/${r.journal_id}`">
                  {{ r.journal_number }}
                </RouterLink>
              </td>
              <td class="p-3">
                {{ r.description }}
                <small class="block text-slate-500">{{ r.reference }}</small>
              </td>
              <td class="p-3 text-right tabular-nums">{{ formatCurrency(Number(r.debit)) }}</td>
              <td class="p-3 text-right tabular-nums">{{ formatCurrency(Number(r.credit)) }}</td>
              <td class="p-3 text-right tabular-nums whitespace-nowrap">
                {{ balance(Number(r.running_balance)) }}
              </td>
            </tr>
            <tr v-if="!loading && !rows.length">
              <td colspan="8" class="p-8 text-center text-slate-500">
                Tidak ada mutasi pada filter ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4">
        <AppPagination
          :page="page"
          :total="total"
          :per-page="50"
          @change="
            ($event) => {
              page = $event
              load(false)
            }
          "
        />
      </div>
    </section>
  </div>
</template>
