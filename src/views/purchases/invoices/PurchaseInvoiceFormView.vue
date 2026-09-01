<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Save, Trash2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { itemService } from '@/services/item.service'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { supplierService } from '@/services/supplier.service'
import { taxCodeService } from '@/services/tax-code.service'
import { warehouseService } from '@/services/warehouse.service'
import { useNotificationStore } from '@/stores/notification.store'
import type { ItemRecord, SupplierRecord, TaxCodeRecord, WarehouseRecord } from '@/types/master'
import type { PurchaseInvoiceLinePayload, PurchaseInvoicePayload } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
interface EditLine extends PurchaseInvoiceLinePayload {
  key: number
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
  error = ref('')
let key = 1
const today = new Date().toISOString().slice(0, 10),
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
const add = () =>
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
    expense_account_id: null,
  })
const chooseSupplier = () => {
  const s = suppliers.value.find((x) => x.id === form.supplier_id)
  if (s) {
    form.currency = s.currency ?? 'IDR'
    const d = new Date(`${form.invoice_date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + Number(s.payment_term_days ?? 0))
    form.due_date = d.toISOString().slice(0, 10)
  }
}
const chooseItem = (line: EditLine) => {
  const i = items.value.find((x) => x.id === line.item_id)
  if (i) {
    line.unit_id = Number(i.unit_id)
    line.unit_price = Number(i.purchase_price ?? 0)
    line.description = i.name
  }
}
const amount = (l: EditLine) => {
  const gross = l.quantity * l.unit_price,
    d = l.discount || (gross * l.discount_percent) / 100,
    t = taxes.value.find((x) => x.id === l.tax_code_id)
  return Math.max(0, gross - d) * (1 + Number(t?.rate ?? 0) / 100)
}
const total = computed(() => form.lines.reduce((s, l) => s + amount(l), 0))
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
  lines: form.lines.map(({ key: _, ...l }) => l),
})
const load = async () => {
  loading.value = true
  try {
    const [s, w, i, t] = await Promise.all([
      supplierService.list({ limit: 100, is_active: true }),
      warehouseService.list({ limit: 100, is_active: true }),
      itemService.list({ limit: 100, is_active: true }),
      taxCodeService.list({ limit: 100, is_active: true }),
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
          expense_account_id: null,
        })),
      })
    } else add()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Form purchase invoice gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const save = async () => {
  if (
    !form.supplier_invoice_number.trim() ||
    !form.supplier_id ||
    !form.lines.length ||
    form.lines.some((l) => !l.item_id || l.quantity <= 0)
  ) {
    error.value = 'Nomor invoice supplier, supplier, dan baris item valid wajib diisi.'
    return
  }
  saving.value = true
  try {
    id.value
      ? await purchaseInvoiceService.update(id.value, payload())
      : await purchaseInvoiceService.create(payload())
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
    <div v-if="loading" class="panel p-8">Memuat...</div>
    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label class="form-label">
          Nomor Invoice Supplier
          <input v-model="form.supplier_invoice_number" required class="field mt-1" />
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
          Supplier
          <select
            v-model.number="form.supplier_id"
            required
            class="field mt-1"
            @change="chooseSupplier"
          >
            <option :value="0">Pilih supplier</option>
            <option v-for="x in suppliers" :key="x.id" :value="x.id">
              {{ x.code }} · {{ x.name }}
            </option>
          </select>
        </label>
        <label class="form-label">
          Gudang
          <select v-model.number="form.warehouse_id" class="field mt-1">
            <option :value="0">Tanpa gudang</option>
            <option v-for="x in warehouses" :key="x.id" :value="x.id">
              {{ x.code }} · {{ x.name }}
            </option>
          </select>
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
          <input
            v-model.number="form.exchange_rate"
            type="number"
            min="0.00000001"
            step="0.00000001"
            class="field mt-1"
          />
        </label>
        <label class="form-label md:col-span-2">
          Catatan
          <textarea v-model="form.notes" class="field mt-1" />
        </label>
      </section>
      <section class="panel overflow-hidden">
        <header class="flex justify-between border-b p-4">
          <b>Baris Invoice</b>
          <AppButton variant="secondary" :icon="Plus" @click="add">Tambah</AppButton>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1000px] text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="p-3">Item</th>
                <th>Deskripsi</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Diskon</th>
                <th>Diskon %</th>
                <th>Pajak</th>
                <th class="text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in form.lines" :key="l.key" class="border-t">
                <td class="p-2">
                  <select v-model.number="l.item_id" class="field min-w-48" @change="chooseItem(l)">
                    <option :value="0">Pilih item</option>
                    <option v-for="x in items" :key="x.id" :value="x.id">
                      {{ x.sku }} · {{ x.name }}
                    </option>
                  </select>
                </td>
                <td><input v-model="l.description" class="field" /></td>
                <td>
                  <input
                    v-model.number="l.quantity"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    class="field w-24"
                  />
                </td>
                <td>
                  <input
                    v-model.number="l.unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    class="field w-32"
                  />
                </td>
                <td>
                  <input v-model.number="l.discount" type="number" min="0" class="field w-28" />
                </td>
                <td>
                  <input
                    v-model.number="l.discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    class="field w-24"
                  />
                </td>
                <td>
                  <select v-model.number="l.tax_code_id" class="field">
                    <option :value="null">Tanpa pajak</option>
                    <option v-for="x in taxes" :key="x.id" :value="x.id">{{ x.code }}</option>
                  </select>
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
        <footer class="border-t p-4 text-right text-xl font-bold">
          Total {{ total.toLocaleString('id-ID') }}
        </footer>
      </section>
      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" @click="router.push('/purchases/invoices')">Batal</AppButton>
        <AppButton type="submit" :icon="Save" :loading="saving">Simpan Draft</AppButton>
      </div>
    </form>
  </div>
</template>
