<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/services/api/client'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { accountService } from '@/services/account.service'
import type { PurchaseInvoice, PurchaseInvoiceLine } from '@/types/purchase'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppModal from '@/components/common/AppModal.vue'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/utils/error'
import { formatCurrency } from '@/utils/currency'
const auth = useAuthStore(),
  rows = ref<Record<string, unknown>[]>([]),
  invoices = ref<PurchaseInvoice[]>([]),
  accounts = ref<{ value: number; label: string }[]>([]),
  lines = ref<Array<PurchaseInvoiceLine & { return_quantity: number }>>([])
const search = ref(''),
  open = ref(false),
  loading = ref(false),
  busy = ref(false),
  error = ref('')
const form = reactive({
  request_key: '',
  invoice_id: 0,
  date: new Date().toISOString().slice(0, 10),
  reference: '',
  reason: '',
  return_stock: true,
  adjustment_account_id: 0,
})
const shown = computed(() =>
  rows.value.filter((r) =>
    Object.values(r).join(' ').toLowerCase().includes(search.value.toLowerCase()),
  ),
)
async function load() {
  loading.value = true
  try {
    rows.value = (await api.get('/operations/purchase-returns')).data.data
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Retur gagal dimuat.')
  } finally {
    loading.value = false
  }
}
async function show() {
  form.request_key = crypto.randomUUID()
  open.value = true
  error.value = ''
  try {
    const first = await purchaseInvoiceService.list({ limit: 100, page: 1 })
    const all = [...first.data]
    for (let p = 2; p <= first.meta.totalPages; p++)
      all.push(...(await purchaseInvoiceService.list({ limit: 100, page: p })).data)
    invoices.value = all.filter((r) => ['posted', 'partially_paid', 'paid'].includes(r.status))
    accounts.value = (
      await accountService.all({ limit: 200, is_active: true, is_posting: true })
    ).data.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pilihan gagal dimuat.')
  }
}
async function selectInvoice(value: string | number | null) {
  form.invoice_id = Number(value)
  lines.value = []
  if (!form.invoice_id) return
  try {
    lines.value = ((await purchaseInvoiceService.get(form.invoice_id)).lines ?? []).map((l) => ({
      ...l,
      return_quantity: 0,
    }))
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Invoice gagal dimuat.')
  }
}
async function save() {
  if (!lines.value.some((l) => l.return_quantity > 0)) {
    error.value = 'Isi kuantitas minimal satu baris.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await api.post('/operations/purchase-returns', {
      ...form,
      adjustment_account_id: form.adjustment_account_id || undefined,
      lines: lines.value
        .filter((l) => l.return_quantity > 0)
        .map((l) => ({ invoice_line_id: l.id, quantity: l.return_quantity })),
    })
    open.value = false
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Retur gagal diposting.')
  } finally {
    busy.value = false
  }
}
async function reverseReturn(row: Record<string, unknown>) {
  const reason = window.prompt('Alasan pembalikan retur pembelian:')?.trim()
  if (!reason) return
  busy.value = true
  error.value = ''
  try {
    await api.post(`/operations/purchase-returns/${row.id}/reverse`, { request_key: crypto.randomUUID(), date: form.date, reason })
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Pembalikan retur gagal.') } finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-6 flex justify-between">
      <div>
        <h1 class="text-2xl font-bold">Retur Pembelian</h1>
        <p class="mt-1 text-sm text-slate-500">
          Retur terkait invoice, pembalikan pajak, dan jurnal otomatis.
        </p>
      </div>
      <AppButton
        v-if="
          auth.hasPermission('purchase-returns.create') &&
          auth.hasPermission('purchase-returns.post')
        "
        @click="show"
      >
        Buat retur
      </AppButton>
    </header>
    <section class="panel p-5">
      <input
        v-model="search"
        class="field mb-4 max-w-lg"
        type="search"
        placeholder="Ketik nomor retur, invoice, atau pemasok…"
      />
      <p v-if="error && !open" class="text-red-600">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr>
              <th class="p-3">Nomor</th>
              <th class="p-3">Tanggal</th>
              <th class="p-3">Invoice</th>
              <th class="p-3">Pemasok</th>
              <th class="p-3">Jenis</th>
              <th class="p-3 text-right">Nilai</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in shown" :key="Number(r.id)" class="border-t">
              <td class="p-3">{{ r.return_number }}</td>
              <td class="p-3">{{ String(r.return_date).slice(0, 10) }}</td>
              <td class="p-3">{{ r.invoice_number }}</td>
              <td class="p-3">{{ r.supplier_name }}</td>
              <td class="p-3">{{ r.return_stock ? 'Barang kembali' : 'Pengurangan harga' }}</td>
              <td class="p-3 text-right">{{ formatCurrency(Number(r.base_grand_total)) }}</td>
              <td class="p-3">{{ r.status }}</td>
              <td class="p-3"><AppButton v-if="r.status === 'posted' && auth.hasPermission('purchase-returns.reverse')" variant="secondary" :disabled="busy" @click="reverseReturn(r)">Balikkan</AppButton></td>
            </tr>
            <tr v-if="!shown.length">
              <td colspan="8" class="p-8 text-center">
                {{ loading ? 'Memuat…' : 'Belum ada retur.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <AppModal
      :open="open"
      title="Retur / Pengurangan Harga Pembelian"
      size="xl"
      :close-disabled="busy"
      @close="open = false"
    >
      <form id="purchase-return" class="space-y-4" @submit.prevent="save">
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <AppSelect
          :model-value="form.invoice_id"
          :options="
            invoices.map((i) => ({
              value: i.id,
              label: `${i.invoice_number} — ${i.supplier_name}`,
            }))
          "
          label="Invoice asal"
          required
          value-type="number"
          @update:model-value="selectInvoice"
        />
        <label class="block">
          Tanggal
          <input v-model="form.date" type="date" class="field" required />
        </label>
        <label class="flex gap-2">
          <input v-model="form.return_stock" type="checkbox" />
          Barang dikembalikan ke pemasok (kurangi stok)
        </label>
        <p class="text-xs text-slate-500">
          Jika barang tetap di gudang, nonaktifkan pilihan ini dan pilih akun potongan pembelian.
          Retur invoice yang sudah dibayar membentuk saldo debit pemasok untuk
          ditagih/dikompensasikan.
        </p>
        <AppSelect
          v-model="form.adjustment_account_id"
          :options="accounts"
          label="Akun potongan / selisih nilai retur"
          value-type="number"
          :required="!form.return_stock"
        />
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Barang</th>
                <th>QTY invoice</th>
                <th>QTY dikreditkan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in lines" :key="l.id">
                <td class="p-2">{{ l.item_code }}</td>
                <td class="p-2">{{ l.item_name }}</td>
                <td class="p-2">{{ l.quantity }} {{ l.unit_code }}</td>
                <td class="p-2">
                  <input
                    v-model.number="l.return_quantity"
                    class="field w-28"
                    type="number"
                    min="0"
                    :max="Number(l.quantity)"
                    step="0.1"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <label class="block">
          Alasan
          <input v-model="form.reason" class="field" minlength="3" maxlength="255" required />
        </label>
        <label class="block">
          Referensi
          <input v-model="form.reference" class="field" maxlength="100" />
        </label>
      </form>
      <template #footer>
        <AppButton type="submit" form="purchase-return" :loading="busy">
          Simpan &amp; posting
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
