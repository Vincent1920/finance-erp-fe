<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '@/services/api/client'
import { bankAccountService } from '@/services/bank-account.service'
import { accountService } from '@/services/account.service'
import { useAuthStore } from '@/stores/auth.store'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import { getApiErrorMessage } from '@/utils/error'
import { formatCurrency as money } from '@/utils/currency'
import { exportRows } from '@/utils/export'
import SavedFilterBar from '@/components/common/SavedFilterBar.vue'
const route = useRoute(),
  auth = useAuthStore(),
  cash = computed(() => route.path.endsWith('/cash-book')),
  reconcile = computed(() => route.path.endsWith('/reconciliation')),
  title = computed(() =>
    cash.value ? 'Buku Kas' : reconcile.value ? 'Rekonsiliasi Bank' : 'Mutasi Bank',
  )
type Row = Record<string, any>
const today = new Date().toISOString().slice(0, 10),
  from = ref(`${today.slice(0, 8)}01`),
  to = ref(today),
  bank = ref<number | null>(null),
  account = ref<number | null>(null),
  search = ref(''),
  status = ref('all'),
  rows = ref<Row[]>([]),
  book = ref<Row[]>([]),
  suggestions = ref<Row[]>([]),
  summary = ref<Row>({}),
  banks = ref<{ value: number; label: string }[]>([]),
  accounts = ref<{ value: number; label: string }[]>([]),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  open = ref(false),
  match = ref<Row | null>(null),
  journal = ref<number | null>(null)
const form = reactive({
  request_key: '',
  bank_account_id: 0,
  number: '',
  date_from: from.value,
  date_to: to.value,
  opening_balance: 0,
  closing_balance: 0,
  lines: [{ date: today, description: '', reference: '', debit: 0, credit: 0, balance: 0 }],
})
const shown = computed(() =>
  rows.value.filter(
    (r) =>
      Object.values(r).join(' ').toLowerCase().includes(search.value.toLowerCase()) &&
      (cash.value || status.value === 'all' || r.reconciliation_status === status.value),
  ),
)
const candidates = computed(() =>
  book.value
    .filter(
      (r) =>
        Number(r.matched_amount) === 0 &&
        Math.round((Number(r.debit) - Number(r.credit)) * 100) ===
          Math.round(Number(match.value?.movement) * 100),
    )
    .map((r) => ({
      value: Number(r.id),
      label: `${String(r.date).slice(0, 10)} — ${r.number} — ${r.description ?? ''}`,
    })),
)
const columns = computed(() =>
  cash.value
    ? [
        ['date', 'Tanggal'],
        ['number', 'Jurnal'],
        ['description', 'Keterangan'],
        ['reference', 'Referensi'],
        ['debit', 'Masuk'],
        ['credit', 'Keluar'],
        ['balance', 'Saldo'],
      ]
    : [
        ['transaction_date', 'Tanggal'],
        ['statement_number', 'Rekening Koran'],
        ['description', 'Keterangan'],
        ['reference', 'Referensi'],
        ['debit', 'Debit Bank'],
        ['credit', 'Kredit Bank'],
        ['movement', 'Perubahan Saldo'],
        ['balance', 'Saldo Bank'],
        ['reconciliation_status', 'Status'],
      ],
)
const savedFilters = computed(() => ({ date_from: from.value, date_to: to.value, bank_account_id: bank.value, account_id: account.value, status: status.value }))
function applySavedFilters(filters: Record<string, unknown>) {
  from.value = String(filters.date_from ?? from.value)
  to.value = String(filters.date_to ?? to.value)
  bank.value = filters.bank_account_id ? Number(filters.bank_account_id) : null
  account.value = filters.account_id ? Number(filters.account_id) : null
  status.value = String(filters.status ?? 'all')
  load()
}
async function load() {
  if (!bank.value && (!cash.value || !account.value)) {
    rows.value = []
    book.value = []
    summary.value = {}
    return
  }
  loading.value = true
  error.value = ''
  try {
    const params = {
      date_from: from.value,
      date_to: to.value,
      bank_account_id: bank.value ?? undefined,
      account_id: account.value ?? undefined,
    }
    if (cash.value || reconcile.value) {
      const d = (await api.get('/operations/cash-book', { params })).data.data
      book.value = d.rows
      summary.value = d.summary
    }
    if (cash.value) rows.value = book.value
    else rows.value = (await api.get('/operations/bank-statements', { params })).data.data
    if (reconcile.value) suggestions.value = (await api.get('/operations/bank-match-suggestions', { params })).data.data
  } catch (e) {
    rows.value = []
    book.value = []
    summary.value = {}
    error.value = getApiErrorMessage(e, 'Data perbankan gagal dimuat.')
  } finally {
    loading.value = false
  }
}
function suggestionFor(row: Row) {
  return suggestions.value.find((suggestion) => Number(suggestion.statement_line_id) === Number(row.id))
}
async function acceptSuggestion(row: Row) {
  const suggestion = suggestionFor(row)
  if (!suggestion) return
  match.value = row
  journal.value = Number(suggestion.journal_line_id)
  await confirmMatch()
}
function show() {
  form.request_key = crypto.randomUUID()
  form.bank_account_id = bank.value ?? 0
  form.date_from = from.value
  form.date_to = to.value
  open.value = true
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/operations/bank-statements', form)
    open.value = false
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Rekening koran gagal disimpan.')
  } finally {
    busy.value = false
  }
}
async function confirmMatch() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/operations/bank-match', {
      request_key: crypto.randomUUID(),
      statement_line_id: match.value!.id,
      journal_line_id: journal.value,
    })
    match.value = null
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pencocokan gagal.')
  } finally {
    busy.value = false
  }
}
async function unmatch(r: Row) {
  busy.value = true
  try {
    await api.post('/operations/bank-unmatch', {
      request_key: crypto.randomUUID(),
      statement_line_id: r.id,
    })
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pembatalan pencocokan gagal.')
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  try {
    const [b, a] = await Promise.all([
      bankAccountService.all({ limit: 200, is_active: true }),
      accountService.all({ limit: 200, is_active: true, is_posting: true }),
    ])
    banks.value = b.data.map((r) => ({
      value: r.id,
      label: `${r.bank_name} — ${r.account_number} (${r.currency})`,
    }))
    accounts.value = a.data.map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))
    bank.value = b.data[0]?.id ?? null
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pilihan rekening gagal dimuat.')
  }
})
watch(
  () => route.path,
  () => {
    open.value = false
    match.value = null
    load()
  },
)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex flex-wrap justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          Filter tanggal dan rekening. Pencocokan memeriksa nominal, arah transaksi, dan akun yang
          sama.
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton
          variant="secondary"
          :disabled="loading || !shown.length"
          @click="exportRows(title, columns, shown)"
        >
          Ekspor CSV
        </AppButton>
        <AppButton v-if="!cash && auth.hasPermission('bank-statements.create')" @click="show">
          Catat rekening koran
        </AppButton>
      </div>
    </header>
    <nav class="mb-4 flex flex-wrap gap-4 text-sm text-blue-600">
      <RouterLink to="/banking/statements">Mutasi Bank</RouterLink>
      <RouterLink to="/banking/reconciliation">Rekonsiliasi</RouterLink>
      <RouterLink to="/banking/cash-book">Buku Kas</RouterLink>
      <RouterLink to="/system/data-import">Impor rekening koran</RouterLink>
    </nav>
    <section class="panel p-5">
      <SavedFilterBar class="mb-4" :screen-key="`banking:${String(route.name ?? route.path)}`" :filters="savedFilters" @apply="applySavedFilters" />
      <form class="mb-5 flex flex-wrap items-end gap-3" @submit.prevent="load">
        <label>
          Dari
          <input v-model="from" type="date" class="field" required />
        </label>
        <label>
          Sampai
          <input v-model="to" type="date" class="field" required />
        </label>
        <AppSelect
          v-model="bank"
          label="Rekening bank"
          :options="banks"
          value-type="number"
          empty-label="Pilih rekening"
        />
        <AppSelect
          v-if="cash && !bank"
          v-model="account"
          label="Akun kas"
          :options="accounts"
          value-type="number"
        />
        <AppButton type="submit" :loading="loading">Terapkan</AppButton>
      </form>
      <p v-if="error && !open && !match" class="mb-4 text-red-600">{{ error }}</p>
      <div v-if="cash" class="mb-4 grid gap-3 sm:grid-cols-4">
        <div
          v-for="(label, key) in {
            opening: 'Saldo awal',
            inflow: 'Kas masuk',
            outflow: 'Kas keluar',
            closing: 'Saldo akhir',
          }"
          :key="key"
          class="rounded bg-slate-50 p-3"
        >
          {{ label }}
          <b class="block">{{ money(Number(summary[key] ?? 0)) }}</b>
        </div>
      </div>
      <div class="mb-4 flex gap-3">
        <input
          v-model="search"
          type="search"
          class="field max-w-lg"
          placeholder="Ketik keterangan, referensi, atau nomor…"
        />
        <select v-if="!cash" v-model="status" class="field w-auto">
          <option value="all">Semua status</option>
          <option value="unmatched">Belum cocok</option>
          <option value="matched">Sudah cocok</option>
        </select>
      </div>
      <p v-if="reconcile" class="mb-4 text-sm text-slate-500">
        {{ rows.filter((r) => r.reconciliation_status === 'unmatched').length }} mutasi bank belum
        cocok · {{ book.filter((r) => Number(r.matched_amount) === 0).length }} baris buku belum
        cocok. Selisih saldo akhir perlu diperiksa per rekening koran.
      </p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c[0]" class="p-3 whitespace-nowrap">{{ c[1] }}</th>
              <th v-if="reconcile" class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in shown" :key="r.id" class="border-t">
              <td v-for="c in columns" :key="c[0]" class="p-3">
                {{ c[0]?.includes('date') ? String(r[c[0]]).slice(0, 10) : r[c[0]!] }}
              </td>
              <td v-if="reconcile && auth.hasPermission('bank-reconciliations.update')" class="p-3">
                <div v-if="r.reconciliation_status === 'unmatched' && suggestionFor(r)" class="mb-2 text-xs text-emerald-700">
                  Saran {{ suggestionFor(r)?.confidence === 'high' ? 'kuat' : 'perlu tinjau' }}: {{ suggestionFor(r)?.journal_number }}
                </div>
                <AppButton
                  v-if="r.reconciliation_status === 'unmatched' && suggestionFor(r)"
                  class="mr-2"
                  :disabled="busy"
                  @click="acceptSuggestion(r)"
                >Terima saran</AppButton>
                <AppButton
                  v-if="r.reconciliation_status === 'unmatched'"
                  variant="secondary"
                  @click="
                    ($event) => {
                      match = r
                      journal = null
                    }
                  "
                >
                  Cocokkan
                </AppButton>
                <AppButton
                  v-else-if="r.reconciliation_status === 'matched'"
                  variant="secondary"
                  :disabled="busy"
                  @click="unmatch(r)"
                >
                  Lepas cocok
                </AppButton>
              </td>
            </tr>
            <tr v-if="!shown.length">
              <td :colspan="columns.length + 1" class="p-8 text-center">
                {{
                  loading
                    ? 'Memuat…'
                    : 'Pilih rekening dan rentang tanggal atau catat rekening koran.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <AppModal
      :open="open"
      title="Catat rekening koran"
      size="xl"
      :close-disabled="busy"
      @close="open = false"
    >
      <form id="statement-form" class="space-y-4" @submit.prevent="save">
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <AppSelect
          v-model="form.bank_account_id"
          label="Rekening"
          :options="banks"
          value-type="number"
          required
        />
        <label class="block">
          Nomor rekening koran
          <input v-model="form.number" class="field" required />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label>
            Dari
            <input v-model="form.date_from" type="date" class="field" required />
          </label>
          <label>
            Sampai
            <input v-model="form.date_to" type="date" class="field" required />
          </label>
          <label>
            Saldo awal
            <AppNumberInput v-model="form.opening_balance" :decimals="2" required />
          </label>
          <label>
            Saldo akhir
            <AppNumberInput v-model="form.closing_balance" :decimals="2" required />
          </label>
        </div>
        <p class="text-xs text-slate-500">
          Masukkan debit/kredit sesuai rekening koran. Sistem memeriksa urutan saldo; saldo baris
          terakhir harus sama dengan saldo akhir.
        </p>
        <div
          v-for="(l, i) in form.lines"
          :key="i"
          class="grid grid-cols-2 gap-2 rounded border p-3"
        >
          <input v-model="l.date" type="date" class="field" required aria-label="Tanggal" />
          <input v-model="l.description" class="field" placeholder="Keterangan" required />
          <AppNumberInput v-model="l.debit" :min="0" :decimals="2" placeholder="Debit" aria-label="Debit" />
          <AppNumberInput v-model="l.credit" :min="0" :decimals="2" placeholder="Kredit" aria-label="Kredit" />
          <AppNumberInput v-model="l.balance" :decimals="2" placeholder="Saldo" aria-label="Saldo" />
          <input v-model="l.reference" class="field" placeholder="Referensi" />
          <button
            v-if="form.lines.length > 1"
            type="button"
            class="text-sm text-red-600"
            @click="form.lines.splice(i, 1)"
          >
            Hapus baris
          </button>
        </div>
        <AppButton
          variant="secondary"
          @click="
            form.lines.push({
              date: today,
              description: '',
              reference: '',
              debit: 0,
              credit: 0,
              balance: 0,
            })
          "
        >
          Tambah baris
        </AppButton>
      </form>
      <template #footer>
        <AppButton type="submit" form="statement-form" :loading="busy">
          Simpan rekening koran
        </AppButton>
      </template>
    </AppModal>
    <AppModal
      :open="!!match"
      title="Cocokkan mutasi bank"
      :close-disabled="busy"
      @close="match = null"
    >
      <form id="match-form" class="space-y-4" @submit.prevent="confirmMatch">
        <p>{{ match?.description }} · {{ money(Number(match?.movement ?? 0)) }}</p>
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <AppSelect
          v-model="journal"
          label="Jurnal dengan nilai dan arah yang sama"
          :options="candidates"
          value-type="number"
          required
        />
        <p v-if="!candidates.length" class="text-sm text-slate-500">
          Tidak ada kandidat. Periksa rentang tanggal atau catat biaya bank/bunga melalui jurnal
          terlebih dahulu.
        </p>
      </form>
      <template #footer>
        <AppButton type="submit" form="match-form" :loading="busy" :disabled="!journal">
          Konfirmasi pencocokan
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
