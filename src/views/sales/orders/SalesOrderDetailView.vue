<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Ban, Check, FileText, Pencil, Printer } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { salesOrderService } from '@/services/sales-order.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type { SalesOrder, SalesOrderLine, SalesOrderStatus } from '@/types/sales'
import { getApiErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationStore()
const id = Number(route.params.id)
const order = ref<SalesOrder | null>(null)
const isLoading = ref(true)
const isBusy = ref(false)
const errorMessage = ref('')
const showCancel = ref(false)
const showConversion = ref(false)
const cancellationReason = ref('')
const invoiceDate = ref(new Date().toISOString().slice(0, 10))
const invoiceQuantities = reactive<Record<number, number>>({})

const labels: Record<SalesOrderStatus, string> = {
  draft: 'Draft', confirmed: 'Dikonfirmasi', partially_invoiced: 'Ditagih Sebagian',
  invoiced: 'Selesai Ditagih', cancelled: 'Dibatalkan',
}
const tones: Record<SalesOrderStatus, 'green' | 'amber' | 'red' | 'blue' | 'slate'> = {
  draft: 'slate', confirmed: 'blue', partially_invoiced: 'amber', invoiced: 'green', cancelled: 'red',
}
const money = (value: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: order.value?.currency ?? 'IDR', maximumFractionDigits: 2,
}).format(Number(value))
const date = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
  : '-'
const remaining = (line: SalesOrderLine) => Math.max(0, Number(line.quantity) - Number(line.invoiced_quantity))
const conversionLines = computed(() => (order.value?.lines ?? []).filter((line) => remaining(line) > 0))

const load = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try { order.value = await salesOrderService.get(id) }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'Sales order gagal dimuat.') }
  finally { isLoading.value = false }
}
const run = async (action: () => Promise<unknown>, success: string) => {
  isBusy.value = true
  try { await action(); notifications.push(success); await load() }
  catch (error) { notifications.push(getApiErrorMessage(error, 'Tindakan gagal diproses.'), 'error') }
  finally { isBusy.value = false }
}
const confirmOrder = () => run(() => salesOrderService.confirm(id), 'Sales order berhasil dikonfirmasi.')
const cancelOrder = async () => {
  if (cancellationReason.value.trim().length < 3) return notifications.push('Alasan pembatalan minimal 3 karakter.', 'error')
  await run(() => salesOrderService.cancel(id, cancellationReason.value), 'Sales order berhasil dibatalkan.')
  showCancel.value = false
}
const openConversion = () => {
  for (const line of conversionLines.value) invoiceQuantities[line.id] = remaining(line)
  showConversion.value = true
}
const convert = async () => {
  const lines = conversionLines.value
    .map((line) => ({ sales_order_line_id: line.id, quantity: Number(invoiceQuantities[line.id] ?? 0) }))
    .filter((line) => line.quantity > 0)
  if (!lines.length) return notifications.push('Pilih minimal satu kuantitas untuk ditagihkan.', 'error')
  if (lines.some((line) => line.quantity > remaining(conversionLines.value.find((item) => item.id === line.sales_order_line_id)!))) {
    return notifications.push('Kuantitas invoice melebihi sisa sales order.', 'error')
  }
  await run(async () => {
    const result = await salesOrderService.convertToInvoice(id, { invoice_date: invoiceDate.value, lines })
    notifications.push(`Invoice ${result.invoiceNumber} berhasil dibuat.`)
  }, 'Status sales order berhasil diperbarui.')
  showConversion.value = false
}
const printOrder = () => window.print()

onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <div v-if="errorMessage" class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{{ errorMessage }}</div>
    <div v-if="isLoading" class="panel space-y-3 p-5"><div v-for="i in 7" :key="i" class="h-9 animate-pulse rounded bg-slate-100" /></div>
    <template v-else-if="order">
      <header class="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div><h1 class="text-2xl font-bold">{{ order.order_number }}</h1><p class="mt-1 text-sm text-slate-500">Sales Order · {{ order.customer_name }}</p></div>
        <div class="flex flex-wrap gap-2">
          <AppButton v-if="auth.hasPermission('sales-orders.print')" variant="secondary" :icon="Printer" @click="printOrder">Cetak</AppButton>
          <AppButton v-if="order.status === 'draft' && auth.hasPermission('sales-orders.update')" variant="secondary" :icon="Pencil" @click="router.push(`/sales/orders/${id}/edit`)">Edit</AppButton>
          <AppButton v-if="order.status === 'draft' && auth.hasPermission('sales-orders.confirm')" :icon="Check" :loading="isBusy" @click="confirmOrder">Konfirmasi</AppButton>
          <AppButton v-if="['confirmed', 'partially_invoiced'].includes(order.status) && auth.hasPermission('sales-invoices.create')" :icon="FileText" @click="openConversion">Buat Invoice</AppButton>
          <AppButton v-if="['draft', 'confirmed'].includes(order.status) && auth.hasPermission('sales-orders.cancel')" variant="danger" :icon="Ban" @click="showCancel = true">Batalkan</AppButton>
        </div>
      </header>

      <section class="panel mb-5 p-5">
        <div class="mb-5 flex items-center justify-between"><h2 class="text-lg font-semibold">{{ order.order_number }}</h2><AppBadge :tone="tones[order.status]">{{ labels[order.status] }}</AppBadge></div>
        <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt class="text-slate-500">Pelanggan</dt><dd class="font-semibold">{{ order.customer_code }} · {{ order.customer_name }}</dd></div>
          <div><dt class="text-slate-500">Gudang</dt><dd class="font-semibold">{{ order.warehouse_code }} · {{ order.warehouse_name }}</dd></div>
          <div><dt class="text-slate-500">Tanggal Order</dt><dd class="font-semibold">{{ date(order.order_date) }}</dd></div>
          <div><dt class="text-slate-500">Estimasi Kirim</dt><dd class="font-semibold">{{ date(order.expected_date) }}</dd></div>
          <div><dt class="text-slate-500">Referensi</dt><dd>{{ order.reference || '-' }}</dd></div>
          <div><dt class="text-slate-500">Termin</dt><dd>{{ order.payment_term_days }} hari</dd></div>
          <div><dt class="text-slate-500">Mata Uang</dt><dd>{{ order.currency }} · {{ order.exchange_rate }}</dd></div>
          <div><dt class="text-slate-500">Pemenuhan</dt><dd class="capitalize">{{ order.fulfillment_status.replaceAll('_', ' ') }}</dd></div>
        </dl>
        <p v-if="order.notes" class="mt-5 whitespace-pre-wrap border-t pt-4 text-sm text-slate-600">{{ order.notes }}</p>
        <p v-if="order.cancellation_reason" class="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">Alasan pembatalan: {{ order.cancellation_reason }}</p>
      </section>

      <section class="panel overflow-hidden">
        <div class="overflow-x-auto"><table class="w-full text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-4 py-3">Item</th><th class="px-4 py-3 text-right">Qty</th><th class="px-4 py-3 text-right">Sudah Ditagih</th><th class="px-4 py-3">Satuan</th><th class="px-4 py-3 text-right">Harga</th><th class="px-4 py-3 text-right">Diskon</th><th class="px-4 py-3 text-right">Pajak</th><th class="px-4 py-3 text-right">Subtotal</th></tr></thead>
          <tbody class="divide-y"><tr v-for="line in order.lines" :key="line.id"><td class="px-4 py-3"><b>{{ line.item_code }} · {{ line.item_name }}</b><small v-if="line.description" class="block text-slate-500">{{ line.description }}</small></td><td class="px-4 py-3 text-right">{{ line.quantity }}</td><td class="px-4 py-3 text-right">{{ line.invoiced_quantity }}</td><td class="px-4 py-3">{{ line.unit_code }}</td><td class="px-4 py-3 text-right">{{ money(line.unit_price) }}</td><td class="px-4 py-3 text-right">{{ money(line.discount_amount) }}</td><td class="px-4 py-3 text-right">{{ money(line.tax_amount) }}</td><td class="px-4 py-3 text-right font-semibold">{{ money(line.subtotal) }}</td></tr></tbody>
        </table></div>
        <footer class="flex justify-end border-t bg-slate-50 p-5"><dl class="w-full max-w-sm space-y-2 text-sm"><div class="flex justify-between"><dt>Subtotal</dt><dd>{{ money(order.subtotal) }}</dd></div><div class="flex justify-between"><dt>Diskon</dt><dd>{{ money(order.discount) }}</dd></div><div class="flex justify-between"><dt>Pajak</dt><dd>{{ money(order.tax) }}</dd></div><div class="flex justify-between border-t pt-2 text-lg font-bold"><dt>Total</dt><dd>{{ money(order.grand_total) }}</dd></div></dl></footer>
      </section>
    </template>

    <AppModal :open="showCancel" title="Batalkan Sales Order" :close-disabled="isBusy" @close="showCancel = false">
      <label class="form-label">Alasan pembatalan<textarea v-model="cancellationReason" class="field mt-1 min-h-24" maxlength="1000" placeholder="Jelaskan alasan pembatalan..." /></label>
      <template #footer><AppButton variant="secondary" :disabled="isBusy" @click="showCancel = false">Kembali</AppButton><AppButton variant="danger" :loading="isBusy" @click="cancelOrder">Batalkan Order</AppButton></template>
    </AppModal>

    <AppModal :open="showConversion" title="Buat Sales Invoice" size="lg" :close-disabled="isBusy" @close="showConversion = false">
      <label class="form-label block max-w-xs">Tanggal Invoice<input v-model="invoiceDate" type="date" class="field mt-1" /></label>
      <div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-slate-50"><tr><th class="p-3">Item</th><th class="p-3 text-right">Sisa</th><th class="p-3 text-right">Ditagihkan</th></tr></thead><tbody class="divide-y"><tr v-for="line in conversionLines" :key="line.id"><td class="p-3">{{ line.item_code }} · {{ line.item_name }}</td><td class="p-3 text-right">{{ remaining(line) }}</td><td class="p-3"><input v-model.number="invoiceQuantities[line.id]" type="number" min="0" :max="remaining(line)" step="0.0001" class="field ml-auto max-w-36 text-right" /></td></tr></tbody></table></div>
      <template #footer><AppButton variant="secondary" :disabled="isBusy" @click="showConversion = false">Batal</AppButton><AppButton :loading="isBusy" @click="convert">Buat Draft Invoice</AppButton></template>
    </AppModal>
  </div>
</template>
