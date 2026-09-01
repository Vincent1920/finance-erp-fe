<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Save, Trash2 } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { itemService } from '@/services/item.service'
import { purchaseOrderService } from '@/services/purchase-order.service'
import { supplierService } from '@/services/supplier.service'
import { taxCodeService } from '@/services/tax-code.service'
import { warehouseService } from '@/services/warehouse.service'
import { useNotificationStore } from '@/stores/notification.store'
import type { ItemRecord, SupplierRecord, TaxCodeRecord, WarehouseRecord } from '@/types/master'
import type { PurchaseOrderLinePayload, PurchaseOrderPayload } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
interface EditLine extends PurchaseOrderLinePayload {
  key: number
}
const route = useRoute(),
  router = useRouter(),
  notice = useNotificationStore(),
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
    order_date: today,
    supplier_id: 0,
    warehouse_id: 0,
    payment_term_days: 0,
    expected_date: '',
    supplier_reference: '',
    currency: 'IDR',
    exchange_rate: 1,
    notes: '',
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
    discount_amount: 0,
    discount_percent: 0,
    tax_code_id: null,
  })
const chooseSupplier = () => {
  const s = suppliers.value.find((x) => x.id === form.supplier_id)
  if (s) {
    form.currency = s.currency ?? 'IDR'
    form.payment_term_days = Number(s.payment_term_days ?? 0)
  }
}
const chooseItem = (l: EditLine) => {
  const i = items.value.find((x) => x.id === l.item_id)
  if (i) {
    l.unit_id = i.unit_id
    l.unit_price = Number(i.purchase_price)
    l.description = i.name
  }
}
const amount = (l: EditLine) => {
    const gross = l.quantity * l.unit_price,
      discount = l.discount_amount || (gross * l.discount_percent) / 100,
      net = Math.max(0, gross - discount),
      tax = Number(taxes.value.find((x) => x.id === l.tax_code_id)?.rate ?? 0)
    return net * (1 + tax / 100)
  },
  total = computed(() => form.lines.reduce((s, l) => s + amount(l), 0)),
  money = (v: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: form.currency,
      maximumFractionDigits: 2,
    }).format(v)
const payload = (): PurchaseOrderPayload => ({
  order_date: form.order_date,
  supplier_id: form.supplier_id,
  warehouse_id: form.warehouse_id,
  buyer_id: null,
  payment_term_days: form.payment_term_days,
  expected_date: form.expected_date || null,
  supplier_reference: form.supplier_reference.trim() || null,
  currency: form.currency,
  exchange_rate: form.exchange_rate,
  notes: form.notes.trim() || null,
  version: id.value ? form.version : undefined,
  lines: form.lines.map(({ key: _, ...l }) => ({
    ...l,
    description: l.description?.trim() || null,
  })),
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
      const o = await purchaseOrderService.get(id.value)
      if (o.status !== 'draft') throw new Error('Hanya Draft yang dapat diedit.')
      Object.assign(form, {
        order_date: o.order_date.slice(0, 10),
        supplier_id: o.supplier_id,
        warehouse_id: o.warehouse_id,
        payment_term_days: o.payment_term_days,
        expected_date: o.expected_date?.slice(0, 10) ?? '',
        supplier_reference: o.supplier_reference ?? '',
        currency: o.currency,
        exchange_rate: Number(o.exchange_rate),
        notes: o.notes ?? '',
        version: o.version,
      })
      form.lines = (o.lines ?? []).map((l) => ({
        key: key++,
        item_id: l.item_id,
        description: l.description,
        quantity: Number(l.quantity),
        unit_id: l.unit_id,
        unit_price: Number(l.unit_price),
        discount_amount: Number(l.discount_amount),
        discount_percent: Number(l.discount_percent),
        tax_code_id: l.tax_code_id,
      }))
    } else add()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Form purchase order gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const save = async () => {
  if (
    !form.supplier_id ||
    !form.warehouse_id ||
    !form.lines.length ||
    form.lines.some((l) => !l.item_id || l.quantity <= 0 || l.unit_price < 0)
  ) {
    error.value = 'Pemasok, gudang, dan baris item valid wajib diisi.'
    return
  }
  saving.value = true
  try {
    if (id.value) await purchaseOrderService.update(id.value, payload())
    else await purchaseOrderService.create(payload())
    notice.push('Purchase order berhasil disimpan.')
    await router.push('/purchases/orders')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase order gagal disimpan.')
    notice.push(error.value, 'error')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6">
      <h1 class="text-2xl font-bold">{{ id ? 'Edit' : 'Buat' }} Purchase Order</h1>
      <p class="text-sm text-slate-500">Draft purchase order belum mengubah stok atau jurnal.</p>
    </div>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div v-if="loading" class="panel space-y-3 p-5">
      <div v-for="i in 6" :key="i" class="h-10 animate-pulse rounded bg-slate-100" />
    </div>
    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label class="form-label">
          Tanggal
          <input v-model="form.order_date" required type="date" class="field mt-1" />
        </label>
        <label class="form-label">
          Pemasok
          <select
            v-model.number="form.supplier_id"
            required
            class="field mt-1"
            @change="chooseSupplier"
          >
            <option :value="0">Pilih pemasok</option>
            <option v-for="x in suppliers" :key="x.id" :value="x.id">
              {{ x.code }} · {{ x.name }}
            </option>
          </select>
        </label>
        <label class="form-label">
          Gudang
          <select v-model.number="form.warehouse_id" required class="field mt-1">
            <option :value="0">Pilih gudang</option>
            <option v-for="x in warehouses" :key="x.id" :value="x.id">
              {{ x.code }} · {{ x.name }}
            </option>
          </select>
        </label>
        <label class="form-label">
          Rencana Terima
          <input v-model="form.expected_date" type="date" class="field mt-1" />
        </label>
        <label class="form-label">
          Termin (hari)
          <input v-model.number="form.payment_term_days" type="number" min="0" class="field mt-1" />
        </label>
        <label class="form-label">
          Referensi Pemasok
          <input v-model="form.supplier_reference" class="field mt-1" />
        </label>
        <label class="form-label">
          Mata Uang
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
        <label class="form-label md:col-span-2 xl:col-span-4">
          Catatan
          <textarea v-model="form.notes" class="field mt-1" />
        </label>
      </section>
      <section class="panel overflow-hidden">
        <header class="flex justify-between border-b p-4">
          <h2 class="font-semibold">Baris Pesanan</h2>
          <AppButton variant="secondary" :icon="Plus" @click="add">Tambah Baris</AppButton>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1050px] text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="p-3 text-left">Item</th>
                <th class="p-3">Deskripsi</th>
                <th class="p-3">Qty</th>
                <th class="p-3">Harga</th>
                <th class="p-3">Diskon</th>
                <th class="p-3">Diskon %</th>
                <th class="p-3">Pajak</th>
                <th class="p-3 text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="l in form.lines" :key="l.key">
                <td class="p-2">
                  <select
                    v-model.number="l.item_id"
                    required
                    class="field min-w-52"
                    @change="chooseItem(l)"
                  >
                    <option :value="0">Pilih item</option>
                    <option v-for="x in items" :key="x.id" :value="x.id">
                      {{ x.sku }} · {{ x.name }}
                    </option>
                  </select>
                </td>
                <td class="p-2"><input v-model="l.description" class="field min-w-40" /></td>
                <td class="p-2">
                  <input
                    v-model.number="l.quantity"
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    class="field w-24"
                  />
                </td>
                <td class="p-2">
                  <input
                    v-model.number="l.unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    class="field w-32"
                  />
                </td>
                <td class="p-2">
                  <input
                    v-model.number="l.discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    class="field w-28"
                  />
                </td>
                <td class="p-2">
                  <input
                    v-model.number="l.discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.0001"
                    class="field w-24"
                  />
                </td>
                <td class="p-2">
                  <select v-model.number="l.tax_code_id" class="field min-w-32">
                    <option :value="null">Tanpa pajak</option>
                    <option v-for="x in taxes" :key="x.id" :value="x.id">
                      {{ x.code }} ({{ x.rate }}%)
                    </option>
                  </select>
                </td>
                <td class="p-2 text-right font-semibold">{{ money(amount(l)) }}</td>
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
        <footer class="flex justify-end border-t bg-slate-50 p-4">
          <div class="text-right">
            <small>Total estimasi</small>
            <p class="text-xl font-bold">{{ money(total) }}</p>
          </div>
        </footer>
      </section>
      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" @click="router.push('/purchases/orders')">Batal</AppButton>
        <AppButton type="submit" :icon="Save" :loading="saving">Simpan Draft</AppButton>
      </div>
    </form>
  </div>
</template>
