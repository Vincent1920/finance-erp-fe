<script setup lang="ts">
import SearchableSelect from '@/components/common/SearchableSelect'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { Plus, Save, Trash2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCombobox from '@/components/common/AppCombobox.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { useFormDraft } from '@/composables/useFormDraft'
import { itemService } from '@/services/item.service'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { supplierService } from '@/services/supplier.service'
import { taxCodeService } from '@/services/tax-code.service'
import { warehouseService } from '@/services/warehouse.service'
import { useNotificationStore } from '@/stores/notification.store'
import type { ItemRecord, SupplierRecord, TaxCodeRecord, WarehouseRecord } from '@/types/master'
import type { PurchaseInvoiceLinePayload, PurchaseInvoicePayload } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
import api from '@/services/api/client'
interface EditLine extends PurchaseInvoiceLinePayload {
  key: number
  units: Array<{ id: number; label: string }>
}
const route = useRoute(),
  router = useRouter(),
  notify = useNotificationStore(),
  id = computed(() => Number(route.params.id) || null),
  suppliers = ref<SupplierRecord[]>([]),
  warehouses = ref<WarehouseRecord[]>([]),
  items = ref<ItemRecord[]>([]),
  taxes = ref<TaxCodeRecord[]>([]),
  loading = ref(false),
  saving = ref(false),
  error = ref(''),
  draftRestored = ref(false)
const fieldErrors = reactive({ supplierInvoice: '', supplier: '', lines: '' })
let key = 1
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  form = reactive({
    supplier_invoice_number: '',
    invoice_date: today,
    due_date: today,
    supplier_id: 0,
    warehouse_id: 0,
    reference: '',
    notes: '',
    currency: 'IDR',
    exchange_rate: 1,
    version: 1,
    lines: [] as EditLine[],
  })
const draft = useFormDraft('finance-erp:draft:v4:purchase-invoice', () => ({
  supplier_invoice_number: form.supplier_invoice_number,
  invoice_date: form.invoice_date,
  due_date: form.due_date,
  supplier_id: form.supplier_id,
  warehouse_id: form.warehouse_id,
  reference: form.reference,
  notes: form.notes,
  currency: form.currency,
  exchange_rate: form.exchange_rate,
  lines: form.lines.map(({ key: _, units: __, ...line }) => line),
}))
const add = () => {
  form.lines.push({
    key: key++,
    item_id: 0,
    description: null,
    quantity: 1,
    unit_id: 0,
    unit_price: 0,
    discount: 0,
    discount_percent: 0,
    tax_code_id: null,
    withholding_tax_id: null,
    expense_account_id: null,
    units: [],
  })
  nextTick(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[aria-label="Pilih item"]')
    inputs[inputs.length - 1]?.focus()
  })
}
const chooseSupplier = () => {
  const s = suppliers.value.find((x) => x.id === form.supplier_id)
  if (s) {
    form.currency = s.currency ?? 'IDR'
    const d = new Date(`${form.invoice_date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + Number(s.payment_term_days ?? 0))
    form.due_date = d.toISOString().slice(0, 10)
  }
}
const chooseItem = async (line: EditLine) => {
  const i = items.value.find((x) => x.id === line.item_id)
  if (i) {
    if (i.item_type === 'inventory') line.withholding_tax_id = null
    line.unit_id = Number(i.unit_id)
    line.unit_price = Number(i.purchase_price ?? 0)
    line.description = i.name
    line.units = [{ id: Number(i.unit_id), label: 'Satuan utama' }]
    try {
      const response = await api.get(`/operations/items/${i.id}/units`)
      const purchaseUnits = response.data.data
        .filter(
          (unit: Record<string, unknown>) => Boolean(unit.is_active) && Boolean(unit.is_purchase),
        )
        .map((unit: Record<string, unknown>) => ({
          id: Number(unit.unit_id),
          label: `${String(unit.code)} (× ${String(unit.factor_to_stock)})`,
        }))
      if (purchaseUnits.length) line.units = purchaseUnits
    } catch {
      // Satuan utama tetap membuat input transaksi dapat digunakan.
    }
    line.unit_id = line.units[0]?.id ?? Number(i.unit_id)
  }
}
const lineDpp = (line: EditLine) => {
  const gross = Number(line.quantity) * Number(line.unit_price)
  return Math.max(
    0,
    gross - (Number(line.discount) || (gross * Number(line.discount_percent)) / 100),
  )
}
const linePpn = (line: EditLine) =>
  (lineDpp(line) * Number(taxes.value.find((tax) => tax.id === line.tax_code_id)?.rate ?? 0)) / 100
const lineWithholding = (line: EditLine) =>
  (lineDpp(line) *
    Number(taxes.value.find((tax) => tax.id === line.withholding_tax_id)?.rate ?? 0)) /
  100
const amount = (line: EditLine) => lineDpp(line) + linePpn(line) - lineWithholding(line)
const dpp = computed(() =>
  form.lines.reduce((sum, line) => {
    return sum + lineDpp(line)
  }, 0),
)
const ppn = computed(() =>
  form.lines.reduce((sum, line) => {
    return sum + linePpn(line)
  }, 0),
)
const withholdingBase = computed(() =>
  form.lines.reduce((sum, line) => sum + (line.withholding_tax_id ? lineDpp(line) : 0), 0),
)
const withholding = computed(() => form.lines.reduce((sum, line) => sum + lineWithholding(line), 0))
const total = computed(() => form.lines.reduce((sum, line) => sum + amount(line), 0))
const isInventory = (line: EditLine) =>
  items.value.find((item) => item.id === line.item_id)?.item_type === 'inventory'
const supplierOptions = computed(() =>
  suppliers.value.map((supplier) => ({
    value: supplier.id,
    label: `${supplier.code} · ${supplier.name}`,
  })),
)
const itemOptions = computed(() =>
  items.value.map((item) => ({ value: item.id, label: `${item.sku} · ${item.name}` })),
)
const money = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: form.currency,
    maximumFractionDigits: 2,
  }).format(value)
const payload = (): PurchaseInvoicePayload => ({
  supplier_invoice_number: form.supplier_invoice_number,
  invoice_date: form.invoice_date,
  due_date: form.due_date,
  supplier_id: form.supplier_id,
  warehouse_id: form.warehouse_id || null,
  reference: form.reference || null,
  notes: form.notes || null,
  currency: form.currency,
  exchange_rate: form.exchange_rate,
  version: form.version,
  lines: form.lines.map(({ key: _, units: __, ...l }) => l),
})
const load = async () => {
  loading.value = true
  try {
    const [s, w, i, t] = await Promise.all([
      supplierService.all({ is_active: true }),
      warehouseService.all({ is_active: true }),
      itemService.all({ is_active: true }),
      taxCodeService.all({ is_active: true }),
    ])
    suppliers.value = s.data
    warehouses.value = w.data
    items.value = i.data
    taxes.value = t.data
    if (id.value) {
      const x = await purchaseInvoiceService.get(id.value)
      if (x.purchase_order_id || x.goods_receipt_id)
        throw new Error('Invoice hasil PO atau penerimaan tidak dapat diedit langsung.')
      Object.assign(form, {
        supplier_invoice_number: x.supplier_invoice_number,
        invoice_date: x.invoice_date.slice(0, 10),
        due_date: x.due_date.slice(0, 10),
        supplier_id: x.supplier_id,
        warehouse_id: x.warehouse_id ?? 0,
        reference: x.reference ?? '',
        notes: x.notes ?? '',
        currency: x.currency,
        exchange_rate: Number(x.exchange_rate),
        version: x.version,
        lines: (x.lines ?? []).map((l) => ({
          key: key++,
          item_id: l.item_id,
          description: l.description,
          quantity: Number(l.quantity),
          unit_id: l.unit_id,
          unit_price: Number(l.unit_price),
          discount: Number(l.discount),
          discount_percent: Number(l.discount_percent),
          tax_code_id: l.tax_code_id,
          withholding_tax_id: l.withholding_tax_id ?? null,
          expense_account_id: null,
          units: [],
        })),
      })
      await Promise.all(
        form.lines.map(async (line) => {
          const selected = line.unit_id
          await chooseItem(line)
          line.unit_id = selected
        }),
      )
    } else {
      const saved = draft.restore()
      if (saved) {
        Object.assign(form, {
          ...saved,
          lines: (saved.lines ?? []).map((line) => ({ ...line, key: key++, units: [] })),
        })
        await Promise.all(
          form.lines.map(async (line) => {
            const selectedUnit = line.unit_id
            if (line.item_id) await chooseItem(line)
            line.unit_id = selectedUnit
          }),
        )
        draftRestored.value = true
      }
      if (!form.lines.length) add()
      draft.start()
    }
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Form purchase invoice gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const save = async () => {
  error.value = ''
  fieldErrors.supplierInvoice = form.supplier_invoice_number.trim()
    ? ''
    : 'Nomor invoice supplier wajib diisi.'
  fieldErrors.supplier = form.supplier_id ? '' : 'Supplier wajib dipilih.'
  fieldErrors.lines =
    form.lines.length &&
    form.lines.every(
      (line) =>
        line.item_id && line.quantity > 0 && !(isInventory(line) && line.withholding_tax_id),
    )
      ? ''
      : 'Isi item dan qty yang valid. PPh jasa hanya boleh dipilih pada baris jasa/ongkir.'
  if (
    !form.supplier_invoice_number.trim() ||
    !form.supplier_id ||
    !form.lines.length ||
    form.lines.some(
      (l) => !l.item_id || l.quantity <= 0 || (isInventory(l) && l.withholding_tax_id),
    )
  ) {
    error.value = 'Nomor invoice, vendor, dan baris item yang valid wajib diisi.'
    return
  }
  saving.value = true
  try {
    id.value
      ? await purchaseInvoiceService.update(id.value, payload())
      : await purchaseInvoiceService.create(payload())
    if (!id.value) draft.clear()
    notify.push(`Purchase invoice berhasil ${id.value ? 'diperbarui' : 'dibuat'}.`)
    await router.push('/purchases/invoices')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase invoice gagal disimpan.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <h1 class="mb-1 text-2xl font-bold">{{ id ? 'Edit' : 'Buat' }} Purchase Invoice</h1>
    <p class="mb-5 text-sm text-slate-500">
      Tersimpan sebagai Draft; AP dan stok berubah hanya setelah approval dan posting.
    </p>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <p
      v-if="draftRestored"
      class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
    >
      Draft terakhir dipulihkan otomatis. Periksa kembali tanggal, supplier, dan item sebelum
      menyimpan.
    </p>
    <div v-if="loading" class="panel p-8">Memuat...</div>
    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <AppCombobox
          :model-value="form.supplier_id || null"
          :options="supplierOptions"
          label="Vendor"
          empty-label="Pilih vendor"
          placeholder="Ketik kode atau nama vendor…"
          result-label="vendor"
          required
          :error="fieldErrors.supplier"
          @update:model-value="
            (value) => {
              form.supplier_id = Number(value || 0)
              chooseSupplier()
            }
          "
        />
        <label class="form-label">
          Nomor Invoice Supplier
          <input
            v-model="form.supplier_invoice_number"
            required
            class="field mt-1"
            :aria-invalid="Boolean(fieldErrors.supplierInvoice)"
          />
          <small v-if="fieldErrors.supplierInvoice" class="mt-1 block text-red-600">
            {{ fieldErrors.supplierInvoice }}
          </small>
        </label>
        <label class="form-label">
          Tanggal
          <input v-model="form.invoice_date" type="date" required class="field mt-1" />
        </label>
        <label class="form-label">
          Jatuh Tempo
          <input v-model="form.due_date" type="date" required class="field mt-1" />
        </label>
        <label class="form-label">
          Gudang
          <SearchableSelect v-model.number="form.warehouse_id" class="field mt-1">
            <option :value="0">Tanpa gudang</option>
            <option v-for="x in warehouses" :key="x.id" :value="x.id">
              {{ x.code }} · {{ x.name }}
            </option>
          </SearchableSelect>
        </label>
        <label class="form-label">
          Referensi
          <input v-model="form.reference" class="field mt-1" />
        </label>
        <label class="form-label">
          Mata uang
          <input v-model="form.currency" readonly class="field mt-1" />
        </label>
        <label class="form-label">
          Kurs
          <AppNumberInput
            v-model="form.exchange_rate"
            :min="0.00000001"
            :decimals="8"
            class="mt-1"
          />
        </label>
        <label class="form-label md:col-span-2">
          Catatan
          <textarea v-model="form.notes" class="field mt-1" />
        </label>
      </section>
      <section class="panel overflow-hidden">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <b>Baris Invoice</b>
            <p class="mt-1 text-xs text-slate-500">
              Pilih PPh hanya pada baris jasa yang dipotong, misalnya ongkir. Nilai barang tidak
              ikut menjadi dasar PPh.
            </p>
          </div>
          <AppButton variant="secondary" :icon="Plus" @click="add">Tambah</AppButton>
        </header>
        <div class="overflow-x-auto">
          <table class="data-table w-full min-w-[1280px] text-sm">
            <thead>
              <tr>
                <th class="p-3">Item</th>
                <th>Satuan</th>
                <th>Deskripsi</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Diskon</th>
                <th>Diskon %</th>
                <th>PPN</th>
                <th>PPh Potong</th>
                <th class="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in form.lines" :key="l.key" class="border-t">
                <td class="p-2">
                  <AppCombobox
                    :model-value="l.item_id || null"
                    :options="itemOptions"
                    empty-label="Pilih item"
                    placeholder="Ketik kode atau nama item…"
                    result-label="item"
                    class="min-w-64"
                    @update:model-value="
                      (value) => {
                        l.item_id = Number(value || 0)
                        chooseItem(l)
                      }
                    "
                  />
                </td>
                <td>
                  <SearchableSelect v-model.number="l.unit_id" class="field min-w-28" required>
                    <option v-for="unit in l.units" :key="unit.id" :value="unit.id">
                      {{ unit.label }}
                    </option>
                  </SearchableSelect>
                </td>
                <td><input v-model="l.description" class="field" /></td>
                <td>
                  <AppNumberInput v-model="l.quantity" :min="0.1" :decimals="1" class="w-24" />
                </td>
                <td>
                  <AppNumberInput v-model="l.unit_price" :min="0" :decimals="2" class="w-32" />
                </td>
                <td>
                  <AppNumberInput v-model="l.discount" :min="0" :decimals="2" class="w-28" />
                </td>
                <td>
                  <AppNumberInput
                    v-model="l.discount_percent"
                    :min="0"
                    :max="100"
                    :decimals="2"
                    class="w-24"
                  />
                </td>
                <td>
                  <SearchableSelect v-model.number="l.tax_code_id" class="field">
                    <option :value="null">Tanpa PPN</option>
                    <option
                      v-for="x in taxes.filter((tax) => tax.tax_type === 'vat')"
                      :key="x.id"
                      :value="x.id"
                    >
                      {{ x.code }} ({{ x.rate }}%)
                    </option>
                  </SearchableSelect>
                </td>
                <td>
                  <SearchableSelect
                    v-model.number="l.withholding_tax_id"
                    class="field min-w-44"
                    :disabled="!l.item_id || isInventory(l)"
                  >
                    <option :value="null">
                      {{ isInventory(l) ? 'Tidak berlaku untuk barang' : 'Tanpa PPh' }}
                    </option>
                    <option
                      v-for="x in taxes.filter((tax) => tax.tax_type === 'withholding')"
                      :key="x.id"
                      :value="x.id"
                    >
                      {{ x.code }} — {{ x.rate }}%
                    </option>
                  </SearchableSelect>
                </td>
                <td class="text-right font-semibold">{{ amount(l).toLocaleString('id-ID') }}</td>
                <td>
                  <button
                    type="button"
                    class="p-2 text-red-600"
                    @click="form.lines = form.lines.filter((x) => x.key !== l.key)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="fieldErrors.lines" class="border-t px-4 py-2 text-sm text-red-600">
          {{ fieldErrors.lines }}
        </p>
        <footer class="flex justify-end border-t bg-slate-50 p-4">
          <div class="grid min-w-80 grid-cols-[1fr_auto] gap-x-8 gap-y-2 text-right">
            <span class="text-sm text-slate-500">DPP</span>
            <strong>{{ money(dpp) }}</strong>
            <span class="text-sm text-slate-500">PPN</span>
            <strong>{{ money(ppn) }}</strong>
            <span class="text-sm text-slate-500">Dasar PPh (baris terpilih)</span>
            <strong>{{ money(withholdingBase) }}</strong>
            <span class="text-sm text-slate-500">PPh Dipotong</span>
            <strong class="text-red-600">({{ money(withholding) }})</strong>
            <span class="border-t pt-2 text-sm font-semibold uppercase">Estimasi Utang</span>
            <strong class="border-t pt-2 text-xl">{{ money(total) }}</strong>
          </div>
        </footer>
      </section>
      <div class="flex justify-end gap-2">
        <span v-if="draft.savedAt.value && !id" class="mr-auto self-center text-xs text-slate-500">
          Draft tersimpan otomatis
          {{
            draft.savedAt.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }}
        </span>
        <AppButton variant="secondary" @click="router.push('/purchases/invoices')">Batal</AppButton>
        <AppButton type="submit" :icon="Save" :loading="saving">Simpan Draft</AppButton>
      </div>
    </form>
  </div>
</template>
