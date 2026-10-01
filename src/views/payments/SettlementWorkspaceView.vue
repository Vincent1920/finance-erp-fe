<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { Plus, RefreshCw, Trash2, Undo2 } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import api from '@/services/api/client'
import { accountService } from '@/services/account.service'
import { bankAccountService } from '@/services/bank-account.service'
import { salesInvoiceService } from '@/services/sales-invoice.service'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/utils/error'
import type { SalesInvoice } from '@/types/sales'
import type { PurchaseInvoice } from '@/types/purchase'

type PaymentRow = {
  id: number; payment_number: string; payment_date: string; invoice_id: number
  invoice_number: string; party_code: string; party_name: string; reference: string | null
  currency: string; allocated_amount: string | number; status: 'posted' | 'reversed' | 'cancelled'
  cash_account_code: string; cash_account_name: string; bank_name: string | null; account_number: string | null
}
type OpenInvoice = {
  id: number; invoice_number: string; party_id: number; party_name: string; currency: string
  outstanding_amount: string | number; status: string
}

const route = useRoute(), auth = useAuthStore()
const sales = computed(() => route.path.startsWith('/sales'))
const title = computed(() => sales.value ? 'Pelunasan Invoice Penjualan' : 'Pelunasan Invoice Pembelian')
const permission = computed(() => sales.value ? 'customer-payments' : 'supplier-payments')
const endpoint = computed(() => `/operations/${sales.value ? 'receivable' : 'payable'}-settlements`)
const invoiceBase = computed(() => sales.value ? '/sales/invoices' : '/purchases/invoices')
const today = () => {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
const firstDay = () => `${today().slice(0, 8)}01`
const rows = ref<PaymentRow[]>([]), invoices = ref<OpenInvoice[]>([])
const accounts = ref<{ value: number; label: string }[]>([])
const banks = ref<Array<{ id: number; gl_account_id: number; currency: string; label: string }>>([])
const loading = ref(false), formLoading = ref(false), busy = ref(false), error = ref(''), open = ref(false)
const search = ref(''), status = ref(''), dateFrom = ref(firstDay()), dateTo = ref(today())
const partyId = ref<number | null>(null), paymentDate = ref(today())
const allocationAmounts = ref<Record<number, number>>({})
const accountId = ref<number | null>(null), bankId = ref<number | null>(null), reference = ref('')
const partyOptions = computed(() => Array.from(new Map(invoices.value.map((item) => [item.party_id, item.party_name])))
  .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)))
const partyInvoices = computed(() => invoices.value.filter((item) => item.party_id === partyId.value))
const selectedAllocations = computed(() => partyInvoices.value
  .filter((item) => Object.prototype.hasOwnProperty.call(allocationAmounts.value, item.id))
  .map((item) => ({ invoice_id: item.id, amount: Number(allocationAmounts.value[item.id] ?? 0), invoice: item })))
const totalAmount = computed(() => selectedAllocations.value.reduce((sum, item) => sum + item.amount, 0))
const settlementCurrency = computed(() => selectedAllocations.value[0]?.invoice.currency ?? '')
const money = (value: string | number, currency = 'IDR') => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(Number(value))

async function load() {
  loading.value = true; error.value = ''
  try {
    const response = await api.get(endpoint.value, { params: {
      date_from: dateFrom.value || undefined, date_to: dateTo.value || undefined,
      status: status.value || undefined, search: search.value || undefined,
    } })
    rows.value = response.data.data
  } catch (e) { error.value = getApiErrorMessage(e, 'Daftar pelunasan gagal dimuat.') }
  finally { loading.value = false }
}

async function loadFormOptions() {
  const service = sales.value ? salesInvoiceService : purchaseInvoiceService
  const [posted, partial, accountResult, bankResult] = await Promise.all([
    service.list({ limit: 100, status: 'posted' }), service.list({ limit: 100, status: 'partially_paid' }),
    accountService.all({ limit: 200, is_posting: true, is_active: true }),
    bankAccountService.all({ limit: 200, is_active: true }),
  ])
  const source = [...posted.data, ...partial.data] as Array<SalesInvoice | PurchaseInvoice>
  invoices.value = source.filter((item, index) => source.findIndex((other) => other.id === item.id) === index).map((item) => ({
    id: Number(item.id), invoice_number: String(item.invoice_number),
    party_id: Number('customer_id' in item ? item.customer_id : item.supplier_id),
    party_name: 'customer_name' in item ? item.customer_name : item.supplier_name, currency: String(item.currency),
    outstanding_amount: item.outstanding_amount, status: String(item.status),
  }))
  accounts.value = accountResult.data.map((item) => ({ value: item.id, label: `${item.code} — ${item.name}` }))
  banks.value = bankResult.data.map((item) => ({ id: item.id, gl_account_id: Number(item.gl_account_id),
    currency: item.currency, label: `${item.bank_name} — ${item.account_number}` }))
}

async function showCreate() {
  error.value = ''; partyId.value = null; allocationAmounts.value = {}; accountId.value = null
  bankId.value = null; reference.value = ''; paymentDate.value = today(); open.value = true
  formLoading.value = true
  try { await loadFormOptions() }
  catch (e) { error.value = getApiErrorMessage(e, 'Pilihan invoice dan akun gagal dimuat.') }
  finally { formLoading.value = false }
}
function selectParty(value: string | number | null) {
  partyId.value = value === null ? null : Number(value)
  allocationAmounts.value = {}
  bankId.value = null; accountId.value = null
}
function toggleInvoice(invoice: OpenInvoice, checked: boolean) {
  error.value = ''
  const next = { ...allocationAmounts.value }
  if (!checked) delete next[invoice.id]
  else {
    const currency = settlementCurrency.value
    if (currency && currency !== invoice.currency) {
      error.value = 'Invoice dengan mata uang berbeda harus dilunasi pada transaksi terpisah.'
      return
    }
    next[invoice.id] = Number(invoice.outstanding_amount)
  }
  allocationAmounts.value = next
  bankId.value = null; accountId.value = null
}
async function save() {
  if (!partyId.value) { error.value = `Pilih ${sales.value ? 'pelanggan' : 'pemasok'} terlebih dahulu.`; return }
  if (!selectedAllocations.value.length) { error.value = 'Pilih minimal satu invoice yang akan dilunasi.'; return }
  if (selectedAllocations.value.some((item) => item.amount <= 0 || item.amount > Number(item.invoice.outstanding_amount))) {
    error.value = 'Jumlah setiap invoice harus lebih dari nol dan tidak boleh melebihi sisanya.'; return
  }
  if (!accountId.value) { error.value = 'Pilih rekening bank atau akun kas yang digunakan.'; return }
  busy.value = true; error.value = ''
  try {
    await api.post(endpoint.value, { request_key: crypto.randomUUID(),
      allocations: selectedAllocations.value.map(({ invoice_id, amount }) => ({ invoice_id, amount })),
      date: paymentDate.value, cash_account_id: accountId.value,
      bank_account_id: bankId.value ?? undefined, reference: reference.value })
    open.value = false
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Pelunasan gagal disimpan.') }
  finally { busy.value = false }
}
async function reverse(row: PaymentRow) {
  const reason = window.prompt(`Alasan membalikkan ${row.payment_number}:`)?.trim()
  if (!reason) return
  busy.value = true
  try {
    await api.post(`${endpoint.value}/${row.id}/reverse`, { request_key: crypto.randomUUID(), date: today(), reason })
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Pelunasan gagal dibalikkan.') }
  finally { busy.value = false }
}
async function remove(row: PaymentRow) {
  if (!window.confirm(`Hapus ${row.payment_number} dari daftar pelunasan? Jejak jurnal dan audit tetap disimpan.`)) return
  busy.value = true
  try { await api.delete(`${endpoint.value}/${row.id}`); await load() }
  catch (e) { error.value = getApiErrorMessage(e, 'Pelunasan gagal dihapus.') }
  finally { busy.value = false }
}
watch(sales, load)
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="text-2xl font-bold">{{ title }}</h1><p class="mt-1 text-sm text-slate-500">Catat, cari, balikkan, dan hapus pelunasan dari satu halaman.</p></div>
      <AppButton v-if="auth.hasPermission(`${permission}.create`) && auth.hasPermission(`${permission}.post`)" :icon="Plus" @click="showCreate">Tambah Pelunasan</AppButton>
    </div>
    <section class="panel overflow-hidden">
      <div class="grid gap-3 border-b p-4 md:grid-cols-5">
        <input v-model="search" class="field md:col-span-2" placeholder="Ketik nomor pelunasan, invoice, atau mitra..." @keyup.enter="load" />
        <input v-model="dateFrom" class="field" type="date" />
        <input v-model="dateTo" class="field" type="date" />
        <div class="flex gap-2"><select v-model="status" class="field"><option value="">Semua status</option><option value="posted">Posted</option><option value="reversed">Dibalikkan</option></select><AppButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="load">Cari</AppButton></div>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm">
        <thead class="bg-slate-50"><tr><th class="p-3">Nomor Pelunasan</th><th class="p-3">Tanggal</th><th class="p-3">Invoice</th><th class="p-3">{{ sales ? 'Pelanggan' : 'Pemasok' }}</th><th class="p-3">Kas / Bank</th><th class="p-3">Referensi</th><th class="p-3 text-right">Jumlah</th><th class="p-3">Status</th><th class="p-3">Aksi</th></tr></thead>
        <tbody class="divide-y">
          <tr v-if="loading"><td colspan="9" class="p-10 text-center">Memuat pelunasan…</td></tr>
          <tr v-for="row in rows" v-else :key="row.id">
            <td class="p-3 font-semibold">{{ row.payment_number }}</td><td class="p-3">{{ String(row.payment_date).slice(0, 10) }}</td>
            <td class="p-3"><RouterLink class="font-semibold text-blue-600" :to="`${invoiceBase}/${row.invoice_id}`">{{ row.invoice_number }}</RouterLink></td>
            <td class="p-3"><b>{{ row.party_name }}</b><small class="block text-slate-500">{{ row.party_code }}</small></td>
            <td class="p-3"><b>{{ row.cash_account_code }}</b> — {{ row.cash_account_name }}<small v-if="row.bank_name" class="block text-slate-500">{{ row.bank_name }} · {{ row.account_number }}</small></td>
            <td class="p-3">{{ row.reference || '—' }}</td><td class="p-3 text-right font-semibold">{{ money(row.allocated_amount, row.currency) }}</td>
            <td class="p-3"><span class="rounded-full px-2 py-1 text-xs font-semibold" :class="row.status === 'posted' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">{{ row.status === 'posted' ? 'Posted' : 'Dibalikkan' }}</span></td>
            <td class="p-3"><div class="flex gap-1"><AppButton v-if="row.status === 'posted' && auth.hasPermission(`${permission}.reverse`)" variant="secondary" :icon="Undo2" :disabled="busy" @click="reverse(row)">Balikkan</AppButton><AppButton v-if="row.status !== 'posted' && auth.hasPermission(`${permission}.delete`)" variant="danger" :icon="Trash2" :disabled="busy" @click="remove(row)">Hapus</AppButton></div></td>
          </tr>
          <tr v-if="!loading && !rows.length"><td colspan="9" class="p-10 text-center text-slate-500">Belum ada pelunasan pada filter ini.</td></tr>
        </tbody>
      </table></div>
    </section>
    <AppModal :open="open" :title="sales ? 'Tambah Pelunasan Penjualan' : 'Tambah Pelunasan Pembelian'" :close-disabled="busy" @close="open = false">
      <form id="workspace-payment-form" class="space-y-4" @submit.prevent="save">
        <p v-if="formLoading" class="rounded bg-blue-50 p-3 text-sm text-blue-700">Memuat invoice dan rekening…</p>
        <p v-if="error" class="rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
        <AppSelect :model-value="partyId" :label="sales ? 'Pelanggan' : 'Pemasok'" :options="partyOptions" value-type="number" required :empty-label="sales ? 'Pilih pelanggan terlebih dahulu' : 'Pilih pemasok terlebih dahulu'" @update:model-value="selectParty" />
        <div v-if="partyId" class="rounded-lg border border-slate-200">
          <div class="border-b bg-slate-50 px-3 py-2 text-sm font-semibold">Pilih satu atau beberapa invoice</div>
          <div class="max-h-64 overflow-auto">
            <table class="w-full text-left text-sm">
              <thead><tr><th class="p-2">Pilih</th><th class="p-2">Invoice</th><th class="p-2">Mata Uang</th><th class="p-2 text-right">Sisa</th><th class="p-2 text-right">Dialokasikan</th></tr></thead>
              <tbody class="divide-y">
                <tr v-for="invoice in partyInvoices" :key="invoice.id">
                  <td class="p-2"><input type="checkbox" :checked="Object.prototype.hasOwnProperty.call(allocationAmounts, invoice.id)" :aria-label="`Pilih ${invoice.invoice_number}`" @change="toggleInvoice(invoice, ($event.target as HTMLInputElement).checked)" /></td>
                  <td class="p-2 font-semibold">{{ invoice.invoice_number }}</td>
                  <td class="p-2">{{ invoice.currency }}</td>
                  <td class="p-2 text-right">{{ money(invoice.outstanding_amount, invoice.currency) }}</td>
                  <td class="p-2 text-right"><AppNumberInput v-if="Object.prototype.hasOwnProperty.call(allocationAmounts, invoice.id)" v-model="allocationAmounts[invoice.id]" class="ml-auto max-w-40" :decimals="2" :min="0.01" :max="Number(invoice.outstanding_amount)" :aria-label="`Jumlah ${invoice.invoice_number}`" /></td>
                </tr>
                <tr v-if="!partyInvoices.length"><td colspan="5" class="p-4 text-center text-slate-500">Tidak ada invoice terbuka.</td></tr>
              </tbody>
            </table>
          </div>
          <div class="flex justify-between border-t bg-blue-50 px-3 py-2 text-sm"><span>{{ selectedAllocations.length }} invoice dipilih</span><b>Total {{ settlementCurrency ? money(totalAmount, settlementCurrency) : '—' }}</b></div>
        </div>
        <label class="block text-sm"><span class="mb-1.5 block font-medium">Tanggal pelunasan</span><input v-model="paymentDate" class="field" type="date" required /></label>
        <AppSelect :model-value="bankId" label="Rekening bank (opsional)" :options="banks.filter(b => !settlementCurrency || b.currency === settlementCurrency).map(b => ({ value: b.id, label: b.label }))" value-type="number" empty-label="Kas / akun lain" :disabled="!selectedAllocations.length" @update:model-value="value => { bankId = value === null ? null : Number(value); accountId = banks.find(b => b.id === bankId)?.gl_account_id ?? null }" />
        <AppSelect :model-value="accountId" label="Akun kas/bank" :options="accounts" value-type="number" required :disabled="!!bankId" @update:model-value="accountId = Number($event)" />
        <label class="block text-sm"><span class="mb-1.5 block font-medium">Referensi</span><input v-model="reference" class="field" maxlength="100" /></label>
      </form>
      <template #footer><AppButton type="submit" form="workspace-payment-form" :loading="busy" :disabled="formLoading">Simpan &amp; Posting</AppButton></template>
    </AppModal>
  </div>
</template>
