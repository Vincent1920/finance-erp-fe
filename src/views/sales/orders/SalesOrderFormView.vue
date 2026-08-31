<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Save, Trash2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { customerService } from '@/services/customer.service'
import { itemService } from '@/services/item.service'
import { salesOrderService } from '@/services/sales-order.service'
import { taxCodeService } from '@/services/tax-code.service'
import { warehouseService } from '@/services/warehouse.service'
import { useNotificationStore } from '@/stores/notification.store'
import type { CustomerRecord, ItemRecord, TaxCodeRecord, WarehouseRecord } from '@/types/master'
import type { SalesOrderLinePayload, SalesOrderPayload } from '@/types/sales'
import { getApiErrorMessage } from '@/utils/error'

interface EditableLine extends SalesOrderLinePayload { key: number }
const route = useRoute()
const router = useRouter()
const notifications = useNotificationStore()
const id = computed(() => Number(route.params.id) || null)
const isEdit = computed(() => Boolean(id.value))
const customers = ref<CustomerRecord[]>([])
const warehouses = ref<WarehouseRecord[]>([])
const items = ref<ItemRecord[]>([])
const taxes = ref<TaxCodeRecord[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
let nextKey = 1

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  order_date: today, customer_id: 0, warehouse_id: 0, payment_term_days: 0,
  expected_date: '', reference: '', currency: 'IDR', exchange_rate: 1,
  notes: '', version: 1, lines: [] as EditableLine[],
})
const addLine = () => form.lines.push({
  key: nextKey++, item_id: 0, description: null, quantity: 1, unit_id: 0,
  unit_price: 0, discount_amount: 0, discount_percent: 0, tax_code_id: null,
})
const selectCustomer = () => {
  const customer = customers.value.find((entry) => entry.id === form.customer_id)
  if (!customer) return
  form.currency = customer.currency ?? 'IDR'
  form.payment_term_days = Number(customer.payment_term_days ?? 0)
}
const selectItem = (line: EditableLine) => {
  const item = items.value.find((entry) => entry.id === line.item_id)
  if (!item) return
  line.unit_id = item.unit_id
  line.unit_price = Number(item.sales_price)
  line.description = item.name
}
const taxRate = (line: EditableLine) => Number(taxes.value.find((tax) => tax.id === line.tax_code_id)?.rate ?? 0)
const lineAmount = (line: EditableLine) => {
  const gross = Number(line.quantity) * Number(line.unit_price)
  const discount = gross * Number(line.discount_percent) / 100
  const subtotal = Math.max(0, gross - discount)
  return subtotal + subtotal * taxRate(line) / 100
}
const total = computed(() => form.lines.reduce((sum, line) => sum + lineAmount(line), 0))
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: form.currency, maximumFractionDigits: 0 }).format(value)

const loadOptions = async () => {
  const [customerRows, warehouseRows, itemRows, taxRows] = await Promise.all([
    customerService.list({ page: 1, limit: 200, is_active: true }),
    warehouseService.list({ page: 1, limit: 200, is_active: true }),
    itemService.list({ page: 1, limit: 200, is_active: true }),
    taxCodeService.list({ page: 1, limit: 200, is_active: true }),
  ])
  customers.value = customerRows.data
  warehouses.value = warehouseRows.data
  items.value = itemRows.data
  taxes.value = taxRows.data
}
const loadOrder = async () => {
  if (!id.value) { addLine(); return }
  const order = await salesOrderService.get(id.value)
  if (order.status !== 'draft') throw new Error('Hanya sales order Draft yang dapat diedit.')
  Object.assign(form, {
    order_date: order.order_date.slice(0, 10), customer_id: order.customer_id,
    warehouse_id: order.warehouse_id, payment_term_days: order.payment_term_days,
    expected_date: order.expected_date?.slice(0, 10) ?? '', reference: order.reference ?? '',
    currency: order.currency, exchange_rate: Number(order.exchange_rate), notes: order.notes ?? '',
    version: order.version,
  })
  form.lines = (order.lines ?? []).map((line) => ({
    key: nextKey++, item_id: line.item_id, description: line.description,
    quantity: Number(line.quantity), unit_id: line.unit_id, unit_price: Number(line.unit_price),
    discount_amount: Number(line.discount_amount), discount_percent: Number(line.discount_percent),
    tax_code_id: line.tax_code_id,
  }))
}
const validate = () => {
  if (!form.order_date || !form.customer_id || !form.warehouse_id) return 'Tanggal, pelanggan, dan gudang wajib diisi.'
  if (!form.lines.length) return 'Sales order minimal memiliki satu baris.'
  if (form.lines.some((line) => !line.item_id || line.quantity <= 0 || line.unit_price < 0)) return 'Item, kuantitas, dan harga setiap baris harus valid.'
  return ''
}
const payload = (): SalesOrderPayload => ({
  order_date: form.order_date, customer_id: form.customer_id, warehouse_id: form.warehouse_id,
  sales_person_id: null, payment_term_days: form.payment_term_days,
  expected_date: form.expected_date || null, reference: form.reference.trim() || null,
  currency: form.currency, exchange_rate: form.exchange_rate, notes: form.notes.trim() || null,
  version: isEdit.value ? form.version : undefined,
  lines: form.lines.map(({ key: _key, ...line }) => ({ ...line, description: line.description?.trim() || null })),
})
const save = async () => {
  errorMessage.value = validate()
  if (errorMessage.value) return
  isSaving.value = true
  try {
    if (id.value) await salesOrderService.update(id.value, payload())
    else await salesOrderService.create(payload())
    notifications.push(`Sales order berhasil ${id.value ? 'diperbarui' : 'dibuat'}.`)
    await router.push('/sales/orders')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, 'Sales order gagal disimpan.')
    notifications.push(errorMessage.value, 'error')
  } finally { isSaving.value = false }
}
onMounted(async () => {
  isLoading.value = true
  try { await loadOptions(); await loadOrder() }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'Form sales order gagal dimuat.') }
  finally { isLoading.value = false }
})
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6"><h1 class="text-2xl font-bold">{{ isEdit ? 'Edit' : 'Buat' }} Sales Order</h1><p class="mt-1 text-sm text-slate-500">Sales order disimpan sebagai Draft dan belum memengaruhi jurnal atau stok.</p></div>
    <div v-if="errorMessage" class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{{ errorMessage }}</div>
    <div v-if="isLoading" class="panel space-y-3 p-5"><div v-for="i in 6" :key="i" class="h-10 animate-pulse rounded bg-slate-100" /></div>
    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label class="text-sm"><span class="mb-1.5 block font-medium">Tanggal *</span><input v-model="form.order_date" type="date" class="field" required /></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Pelanggan *</span><select v-model.number="form.customer_id" class="field" required @change="selectCustomer"><option :value="0">Pilih pelanggan...</option><option v-for="row in customers" :key="row.id" :value="row.id">{{ row.code }} — {{ row.name }}</option></select></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Gudang *</span><select v-model.number="form.warehouse_id" class="field" required><option :value="0">Pilih gudang...</option><option v-for="row in warehouses" :key="row.id" :value="row.id">{{ row.code }} — {{ row.name }}</option></select></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Rencana kirim</span><input v-model="form.expected_date" type="date" class="field" /></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Termin (hari)</span><input v-model.number="form.payment_term_days" type="number" min="0" max="3650" class="field" /></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Referensi</span><input v-model="form.reference" class="field" maxlength="100" /></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Mata uang</span><input v-model="form.currency" class="field" maxlength="3" readonly /></label>
        <label class="text-sm"><span class="mb-1.5 block font-medium">Kurs</span><input v-model.number="form.exchange_rate" type="number" min="0.00000001" step="0.00000001" class="field" /></label>
        <label class="text-sm md:col-span-2 xl:col-span-4"><span class="mb-1.5 block font-medium">Catatan</span><textarea v-model="form.notes" class="field" rows="2" maxlength="5000" /></label>
      </section>
      <section class="panel overflow-hidden">
        <header class="flex items-center justify-between border-b p-4"><div><h2 class="font-semibold">Baris pesanan</h2><p class="text-xs text-slate-500">Tambahkan barang atau jasa yang dipesan.</p></div><AppButton variant="secondary" :icon="Plus" @click="addLine">Tambah baris</AppButton></header>
        <div class="overflow-x-auto"><table class="w-full min-w-[1100px] text-left text-sm"><thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-3 py-3">Item</th><th class="px-3 py-3">Deskripsi</th><th class="px-3 py-3">Qty</th><th class="px-3 py-3">Harga</th><th class="px-3 py-3">Diskon %</th><th class="px-3 py-3">Pajak</th><th class="px-3 py-3 text-right">Total</th><th class="w-14"></th></tr></thead>
          <tbody class="divide-y"><tr v-for="line in form.lines" :key="line.key"><td class="p-2"><select v-model.number="line.item_id" class="field min-w-52" required @change="selectItem(line)"><option :value="0">Pilih item...</option><option v-for="item in items" :key="item.id" :value="item.id">{{ item.sku }} — {{ item.name }}</option></select></td><td class="p-2"><input v-model="line.description" class="field min-w-48" maxlength="255" /></td><td class="p-2"><input v-model.number="line.quantity" type="number" min="0.0001" step="0.0001" class="field w-28" /></td><td class="p-2"><input v-model.number="line.unit_price" type="number" min="0" step="0.01" class="field w-36" /></td><td class="p-2"><input v-model.number="line.discount_percent" type="number" min="0" max="100" step="0.01" class="field w-28" /></td><td class="p-2"><select v-model.number="line.tax_code_id" class="field w-36"><option :value="null">Tanpa pajak</option><option v-for="tax in taxes" :key="tax.id" :value="tax.id">{{ tax.code }} ({{ tax.rate }}%)</option></select></td><td class="p-2 text-right font-semibold">{{ money(lineAmount(line)) }}</td><td class="p-2"><button type="button" class="rounded p-2 text-red-600 hover:bg-red-50" title="Hapus baris" @click="form.lines = form.lines.filter((entry) => entry.key !== line.key)"><Trash2 class="h-4 w-4" /></button></td></tr></tbody>
        </table></div>
        <div v-if="!form.lines.length" class="p-6 text-center text-sm text-slate-500">Belum ada baris pesanan.</div>
        <footer class="flex justify-end border-t bg-slate-50 p-4"><div class="text-right"><p class="text-xs uppercase text-slate-500">Estimasi total</p><p class="text-xl font-bold">{{ money(total) }}</p></div></footer>
      </section>
      <div class="flex justify-end gap-2"><AppButton variant="secondary" :disabled="isSaving" @click="router.push('/sales/orders')">Batal</AppButton><AppButton type="submit" :icon="Save" :loading="isSaving">Simpan Draft</AppButton></div>
    </form>
  </div>
</template>
