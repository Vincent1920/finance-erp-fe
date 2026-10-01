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
import { customerService } from '@/services/customer.service'
import { itemService } from '@/services/item.service'
import { salesInvoiceService } from '@/services/sales-invoice.service'
import { taxCodeService } from '@/services/tax-code.service'
import { warehouseService } from '@/services/warehouse.service'
import { useNotificationStore } from '@/stores/notification.store'
import type { CustomerRecord, ItemRecord, TaxCodeRecord, WarehouseRecord } from '@/types/master'
import type { SalesInvoiceLinePayload, SalesInvoicePayload } from '@/types/sales'
import { getApiErrorMessage } from '@/utils/error'
import api from '@/services/api/client'
interface EditLine extends SalesInvoiceLinePayload {
  key: number
  units: Array<{ id: number; label: string }>
}
const route = useRoute(),
  router = useRouter(),
  notifications = useNotificationStore()
const id = computed(() => Number(route.params.id) || null),
  isEdit = computed(() => Boolean(id.value))
const customers = ref<CustomerRecord[]>([]),
  warehouses = ref<WarehouseRecord[]>([]),
  items = ref<ItemRecord[]>([]),
  taxes = ref<TaxCodeRecord[]>([]),
  loading = ref(false),
  saving = ref(false),
  error = ref(''),
  draftRestored = ref(false)
const fieldErrors = reactive({ customer: '', lines: '' })
let key = 1
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const form = reactive({
  invoice_date: today,
  due_date: today,
  customer_id: 0,
  warehouse_id: 0,
  reference: '',
  notes: '',
  currency: 'IDR',
  exchange_rate: 1,
  version: 1,
  lines: [] as EditLine[],
})
const draft = useFormDraft('finance-erp:draft:v2:sales-invoice', () => ({
  invoice_date: form.invoice_date,
  due_date: form.due_date,
  customer_id: form.customer_id,
  warehouse_id: form.warehouse_id,
  reference: form.reference,
  notes: form.notes,
  currency: form.currency,
  exchange_rate: form.exchange_rate,
  lines: form.lines.map(({ key: _, units: __, ...line }) => line),
}))
function createLine(): EditLine {
  return {
    key: key++,
    item_id: 0,
    description: null,
    quantity: 1,
    unit_id: 0,
    unit_price: 0,
    discount: 0,
    discount_percent: 0,
    tax_code_id: null,
    units: [],
  }
}
function addLine() {
  form.lines = [...form.lines, createLine()]
  nextTick(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[aria-label="Pilih item"]')
    inputs[inputs.length - 1]?.focus()
  })
}
const chooseCustomer = () => {
  const value = customers.value.find((x) => x.id === form.customer_id)
  if (value) {
    form.currency = value.currency ?? 'IDR'
    const due = new Date(`${form.invoice_date}T00:00:00Z`)
    due.setUTCDate(due.getUTCDate() + Number(value.payment_term_days ?? 0))
    form.due_date = due.toISOString().slice(0, 10)
    nextTick(() => {
      const itemInputs = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[aria-label="Pilih item"]'),
      )
      itemInputs.find((itemInput) => !itemInput.value)?.focus()
    })
  }
}
const chooseItem = async (line: EditLine) => {
  const item = items.value.find((x) => x.id === line.item_id)
  if (item) {
    line.unit_id = Number(item.unit_id)
    line.unit_price = Number(item.sales_price ?? 0)
    line.description = item.name
    line.units = [{ id: Number(item.unit_id), label: 'Satuan utama' }]
    try {
      const response = await api.get(`/operations/items/${item.id}/units`)
      const salesUnits = response.data.data
        .filter(
          (unit: Record<string, unknown>) => Boolean(unit.is_active) && Boolean(unit.is_sales),
        )
        .map((unit: Record<string, unknown>) => ({
          id: Number(unit.unit_id),
          label: `${String(unit.code)} (× ${String(unit.factor_to_stock)})`,
        }))
      if (salesUnits.length) line.units = salesUnits
    } catch {
      // The main unit keeps item entry usable when optional conversion units cannot be loaded.
    }
    line.unit_id = line.units[0]?.id ?? Number(item.unit_id)
  }
}
const lineDpp = (line: EditLine) => {
  const gross = Number(line.quantity) * Number(line.unit_price),
    discount = Number(line.discount) || (gross * Number(line.discount_percent)) / 100
  return Math.max(0, gross - discount)
}
const lineTax = (line: EditLine) => {
  const tax = taxes.value.find((x) => x.id === line.tax_code_id)
  return (lineDpp(line) * Number(tax?.rate ?? 0)) / 100
}
const lineAmount = (line: EditLine) => lineDpp(line) + lineTax(line)
const dpp = computed(() => form.lines.reduce((sum, line) => sum + lineDpp(line), 0))
const ppn = computed(() => form.lines.reduce((sum, line) => sum + lineTax(line), 0))
const total = computed(() => dpp.value + ppn.value)
const customerOptions = computed(() =>
  customers.value.map((customer) => ({
    value: customer.id,
    label: `${customer.code} · ${customer.name}`,
  })),
)
const itemOptions = computed(() =>
  items.value.map((item) => ({ value: item.id, label: `${item.sku} · ${item.name}` })),
)
const money = (v: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: form.currency,
    maximumFractionDigits: 2,
  }).format(v)
const payload = (): SalesInvoicePayload => ({
  invoice_date: form.invoice_date,
  due_date: form.due_date,
  customer_id: form.customer_id,
  warehouse_id: form.warehouse_id || null,
  reference: form.reference || null,
  notes: form.notes || null,
  currency: form.currency,
  exchange_rate: Number(form.exchange_rate),
  version: form.version,
  lines: form.lines.map(({ key: _, units: __, ...line }) => line),
})
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [c, w, i, t] = await Promise.all([
      customerService.all({ is_active: true }),
      warehouseService.all({ is_active: true }),
      itemService.all({ is_active: true }),
      taxCodeService.all({ is_active: true }),
    ])
    customers.value = c.data
    warehouses.value = w.data
    items.value = i.data
    taxes.value = t.data
    if (id.value) {
      const invoice = await salesInvoiceService.get(id.value)
      if (invoice.sales_order_id)
        throw new Error('Invoice hasil sales order tidak dapat diedit langsung.')
      Object.assign(form, {
        invoice_date: invoice.invoice_date.slice(0, 10),
        due_date: invoice.due_date.slice(0, 10),
        customer_id: invoice.customer_id,
        warehouse_id: invoice.warehouse_id ?? 0,
        reference: invoice.reference ?? '',
        notes: invoice.notes ?? '',
        currency: invoice.currency,
        exchange_rate: Number(invoice.exchange_rate),
        version: invoice.version,
        lines: (invoice.lines ?? []).map((line) => ({
          key: key++,
          item_id: line.item_id,
          description: line.description,
          quantity: Number(line.quantity),
          unit_id: line.unit_id,
          unit_price: Number(line.unit_price),
          discount: Number(line.discount),
          discount_percent: Number(line.discount_percent),
          tax_code_id: line.tax_code_id,
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
      if (!form.lines.length) addLine()
      draft.start()
    }
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Form sales invoice gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const save = async () => {
  error.value = ''
  fieldErrors.customer = form.customer_id ? '' : 'Pelanggan wajib dipilih.'
  fieldErrors.lines =
    form.lines.length && form.lines.every((x) => x.item_id && x.quantity > 0)
      ? ''
      : 'Isi minimal satu item dengan qty lebih dari 0.'
  if (
    !form.customer_id ||
    !form.lines.length ||
    form.lines.some((x) => !x.item_id || x.quantity <= 0)
  ) {
    error.value = 'Pelanggan dan minimal satu baris item valid wajib diisi.'
    return
  }
  if (form.lines.some((x) => x.discount > 0 && x.discount_percent > 0)) {
    error.value = 'Gunakan diskon nominal atau persentase pada setiap baris.'
    return
  }
  saving.value = true
  try {
    if (id.value) await salesInvoiceService.update(id.value, payload())
    else await salesInvoiceService.create(payload())
    if (!id.value) draft.clear()
    notifications.push(`Sales invoice berhasil ${id.value ? 'diperbarui' : 'dibuat'}.`)
    await router.push('/sales/invoices')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Sales invoice gagal disimpan.')
    notifications.push(error.value, 'error')
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
      <h1 class="text-2xl font-bold">{{ isEdit ? 'Edit' : 'Buat' }} Sales Invoice</h1>
      <p class="mt-1 text-sm text-slate-500">
        Invoice baru tersimpan sebagai Draft; jurnal dan stok berubah hanya setelah approval dan
        posting.
      </p>
    </div>
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <p
      v-if="draftRestored"
      class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"
    >
      Draft terakhir dipulihkan otomatis. Periksa kembali tanggal, pelanggan, dan item sebelum
      menyimpan.
    </p>
    <div v-if="loading" class="panel space-y-3 p-5">
      <div v-for="i in 6" :key="i" class="h-10 animate-pulse rounded bg-slate-100" />
    </div>
    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="panel grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label class="form-label">
          Tanggal Invoice
          <input v-model="form.invoice_date" required type="date" class="field mt-1" />
        </label>
        <label class="form-label">
          Jatuh Tempo
          <input v-model="form.due_date" required type="date" class="field mt-1" />
        </label>
        <AppCombobox
          :model-value="form.customer_id || null"
          :options="customerOptions"
          label="Pelanggan"
          empty-label="Pilih pelanggan"
          placeholder="Ketik kode atau nama pelanggan…"
          result-label="pelanggan"
          autofocus
          required
          :error="fieldErrors.customer"
          @update:model-value="
            (value) => {
              form.customer_id = Number(value || 0)
              chooseCustomer()
            }
          "
        />
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
          <input v-model="form.reference" class="field mt-1" maxlength="100" />
        </label>
        <label class="form-label">
          Mata Uang
          <input v-model="form.currency" class="field mt-1 uppercase" maxlength="3" readonly />
        </label>
        <label class="form-label">
          Kurs
          <AppNumberInput
            v-model="form.exchange_rate"
            required
            :min="0.00000001"
            :decimals="8"
            class="mt-1"
          />
        </label>
        <label class="form-label md:col-span-2 xl:col-span-1">
          Catatan
          <textarea v-model="form.notes" class="field mt-1 min-h-10" />
        </label>
      </section>
      <section class="panel overflow-hidden">
        <header class="flex items-center justify-between border-b p-4">
          <h2 class="font-semibold">Baris Invoice</h2>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            @click="addLine"
          >
            <Plus class="h-4 w-4" />
            Tambah Baris
          </button>
        </header>
        <div class="overflow-x-auto">
          <table class="data-table w-full min-w-[1050px] text-left text-sm">
            <thead>
              <tr>
                <th class="p-3">Item</th>
                <th class="p-3">Satuan</th>
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
              <tr v-for="line in form.lines" :key="line.key">
                <td class="p-2">
                  <AppCombobox
                    :model-value="line.item_id || null"
                    :options="itemOptions"
                    empty-label="Pilih item"
                    placeholder="Ketik kode atau nama item…"
                    result-label="item"
                    class="min-w-64"
                    @update:model-value="
                      (value) => {
                        line.item_id = Number(value || 0)
                        chooseItem(line)
                      }
                    "
                  />
                </td>
                <td class="p-2">
                  <SearchableSelect v-model.number="line.unit_id" class="field min-w-28" required>
                    <option v-for="unit in line.units" :key="unit.id" :value="unit.id">
                      {{ unit.label }}
                    </option>
                  </SearchableSelect>
                </td>
                <td class="p-2"><input v-model="line.description" class="field min-w-40" /></td>
                <td class="p-2">
                  <AppNumberInput
                    v-model="line.quantity"
                    required
                    :min="0.1"
                    :decimals="1"
                    class="w-24"
                  />
                </td>
                <td class="p-2">
                  <AppNumberInput
                    v-model="line.unit_price"
                    required
                    :min="0"
                    :decimals="2"
                    class="w-32"
                  />
                </td>
                <td class="p-2">
                  <AppNumberInput v-model="line.discount" :min="0" :decimals="2" class="w-28" />
                </td>
                <td class="p-2">
                  <AppNumberInput
                    v-model="line.discount_percent"
                    :min="0"
                    :max="100"
                    :decimals="2"
                    class="w-24"
                  />
                </td>
                <td class="p-2">
                  <SearchableSelect v-model.number="line.tax_code_id" class="field min-w-32">
                    <option :value="null">Tanpa pajak</option>
                    <option v-for="x in taxes" :key="x.id" :value="x.id">
                      {{ x.code }} ({{ x.rate }}%)
                    </option>
                  </SearchableSelect>
                </td>
                <td class="p-2 text-right font-semibold">{{ money(lineAmount(line)) }}</td>
                <td class="p-2">
                  <button
                    type="button"
                    class="rounded p-2 text-red-600 hover:bg-red-50"
                    @click="form.lines = form.lines.filter((x) => x.key !== line.key)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!form.lines.length" class="p-6 text-center text-sm text-slate-500">
          Belum ada baris invoice.
        </div>
        <p v-if="fieldErrors.lines" class="border-t px-4 py-2 text-sm text-red-600">
          {{ fieldErrors.lines }}
        </p>
        <footer class="flex justify-end border-t bg-slate-50 p-4">
          <div class="grid min-w-72 grid-cols-[1fr_auto] gap-x-8 gap-y-2 text-right">
            <span class="text-sm text-slate-500">DPP</span>
            <strong>{{ money(dpp) }}</strong>
            <span class="text-sm text-slate-500">PPN</span>
            <strong>{{ money(ppn) }}</strong>
            <span class="border-t pt-2 text-sm font-semibold uppercase">Estimasi Total</span>
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
        <AppButton variant="secondary" :disabled="saving" @click="router.push('/sales/invoices')">
          Batal
        </AppButton>
        <AppButton type="submit" :icon="Save" :loading="saving">Simpan Draft</AppButton>
      </div>
    </form>
  </div>
</template>
