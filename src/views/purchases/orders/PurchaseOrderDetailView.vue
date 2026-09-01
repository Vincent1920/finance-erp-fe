<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Ban, Check, Pencil, Printer } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { purchaseOrderService } from '@/services/purchase-order.service'
import { goodsReceiptService } from '@/services/goods-receipt.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
const id = Number(useRoute().params.id),
  router = useRouter(),
  auth = useAuthStore(),
  notice = useNotificationStore(),
  order = ref<PurchaseOrder | null>(null),
  loading = ref(true),
  busy = ref(false),
  error = ref(''),
  showCancel = ref(false),
  reason = ref(''),
  showReceipt = ref(false),
  receiptDate = ref(new Date().toISOString().slice(0, 10)),
  deliveryNumber = ref(''),
  receiptQuantities = ref<Record<number, number>>({})
const labels: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Dikonfirmasi',
  partially_received: 'Diterima Sebagian',
  partially_billed: 'Ditagih Sebagian',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}
const tone = (s: PurchaseOrderStatus): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  s === 'completed'
    ? 'green'
    : s === 'confirmed'
      ? 'blue'
      : s.startsWith('partially')
        ? 'amber'
        : s === 'cancelled'
          ? 'red'
          : 'slate'
const money = (v: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: order.value?.currency ?? 'IDR',
    maximumFractionDigits: 2,
  }).format(Number(v))
const date = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(`${v.slice(0, 10)}T00:00:00`),
      )
    : '-'
const load = async () => {
  loading.value = true
  try {
    order.value = await purchaseOrderService.get(id)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase order gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const run = async (fn: () => Promise<unknown>, msg: string) => {
  busy.value = true
  try {
    await fn()
    notice.push(msg)
    await load()
  } catch (e) {
    notice.push(getApiErrorMessage(e, 'Tindakan gagal.'), 'error')
  } finally {
    busy.value = false
  }
}
const cancel = async () => {
  if (reason.value.trim().length < 3) return notice.push('Alasan minimal 3 karakter.', 'error')
  await run(() => purchaseOrderService.cancel(id, reason.value), 'Purchase order dibatalkan.')
  showCancel.value = false
}
const printOrder = () => window.print()
const openReceipt = () => {
  receiptQuantities.value = Object.fromEntries(
    (order.value?.lines ?? []).map((line) => [
      line.id,
      Math.max(0, Number(line.quantity) - Number(line.received_quantity)),
    ]),
  )
  showReceipt.value = true
}
const createReceipt = async () => {
  const lines = (order.value?.lines ?? [])
    .map((line) => ({
      purchase_order_line_id: line.id,
      quantity: Number(receiptQuantities.value[line.id] ?? 0),
    }))
    .filter((line) => line.quantity > 0)
  if (!lines.length) return notice.push('Pilih minimal satu kuantitas penerimaan.', 'error')
  busy.value = true
  try {
    const created = await goodsReceiptService.create({
      receipt_date: receiptDate.value,
      purchase_order_id: id,
      supplier_delivery_number: deliveryNumber.value.trim() || null,
      reference: null,
      notes: null,
      lines,
    })
    await goodsReceiptService.post(created.id)
    notice.push(`Penerimaan ${created.receiptNumber} berhasil dibuat dan diposting.`)
    showReceipt.value = false
    await load()
  } catch (e) {
    notice.push(getApiErrorMessage(e, 'Penerimaan barang gagal diproses.'), 'error')
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <div v-if="loading" class="panel space-y-3 p-5">
      <div v-for="i in 7" :key="i" class="h-9 animate-pulse rounded bg-slate-100" />
    </div>
    <template v-else-if="order">
      <header class="mb-6 flex flex-wrap justify-between gap-4 print:hidden">
        <div>
          <h1 class="text-2xl font-bold">{{ order.order_number }}</h1>
          <p class="text-sm text-slate-500">{{ order.supplier_name }}</p>
        </div>
        <div class="flex gap-2">
          <AppButton
            v-if="auth.hasPermission('purchase-orders.print')"
            variant="secondary"
            :icon="Printer"
            @click="printOrder"
          >
            Cetak
          </AppButton>
          <AppButton
            v-if="order.status === 'draft' && auth.hasPermission('purchase-orders.update')"
            variant="secondary"
            :icon="Pencil"
            @click="router.push(`/purchases/orders/${id}/edit`)"
          >
            Edit
          </AppButton>
          <AppButton
            v-if="order.status === 'draft' && auth.hasPermission('purchase-orders.confirm')"
            :icon="Check"
            :loading="busy"
            @click="run(() => purchaseOrderService.confirm(id), 'Purchase order dikonfirmasi.')"
          >
            Konfirmasi
          </AppButton>
          <AppButton
            v-if="
              ['confirmed', 'partially_received', 'partially_billed'].includes(order.status) &&
              order.receipt_status !== 'received' &&
              auth.hasPermission('goods-receipts.create') &&
              auth.hasPermission('goods-receipts.post')
            "
            @click="openReceipt"
          >
            Terima Barang
          </AppButton>
          <AppButton
            v-if="
              ['draft', 'confirmed'].includes(order.status) &&
              auth.hasPermission('purchase-orders.cancel')
            "
            variant="danger"
            :icon="Ban"
            @click="showCancel = true"
          >
            Batalkan
          </AppButton>
        </div>
      </header>
      <section class="panel mb-5 p-5">
        <div class="mb-5 flex justify-between">
          <div>
            <h2 class="font-semibold">{{ order.order_number }}</h2>
            <p class="text-sm text-slate-500">{{ date(order.order_date) }}</p>
          </div>
          <AppBadge :tone="tone(order.status)">{{ labels[order.status] }}</AppBadge>
        </div>
        <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt class="text-slate-500">Pemasok</dt>
            <dd class="font-semibold">{{ order.supplier_code }} · {{ order.supplier_name }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Gudang</dt>
            <dd>{{ order.warehouse_code }} · {{ order.warehouse_name }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Rencana Terima</dt>
            <dd>{{ date(order.expected_date) }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Referensi Pemasok</dt>
            <dd>{{ order.supplier_reference || '-' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Status Penerimaan</dt>
            <dd class="capitalize">{{ order.receipt_status.replaceAll('_', ' ') }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Status Tagihan</dt>
            <dd class="capitalize">{{ order.billing_status.replaceAll('_', ' ') }}</dd>
          </div>
          <div>
            <dt class="text-slate-500">Termin</dt>
            <dd>{{ order.payment_term_days }} hari</dd>
          </div>
          <div>
            <dt class="text-slate-500">Mata Uang/Kurs</dt>
            <dd>{{ order.currency }} · {{ order.exchange_rate }}</dd>
          </div>
        </dl>
        <p v-if="order.notes" class="mt-4 border-t pt-4 text-sm">{{ order.notes }}</p>
        <p v-if="order.cancellation_reason" class="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {{ order.cancellation_reason }}
        </p>
      </section>
      <section class="panel overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="p-3 text-left">Item</th>
                <th class="p-3 text-right">Qty</th>
                <th class="p-3 text-right">Diterima</th>
                <th class="p-3 text-right">Ditagih</th>
                <th class="p-3 text-right">Harga</th>
                <th class="p-3 text-right">Pajak</th>
                <th class="p-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="l in order.lines" :key="l.id">
                <td class="p-3">
                  <b>{{ l.item_code }} · {{ l.item_name }}</b>
                  <small v-if="l.description" class="block text-slate-500">
                    {{ l.description }}
                  </small>
                </td>
                <td class="p-3 text-right">{{ l.quantity }} {{ l.unit_code }}</td>
                <td class="p-3 text-right">{{ l.received_quantity }}</td>
                <td class="p-3 text-right">{{ l.billed_quantity }}</td>
                <td class="p-3 text-right">{{ money(l.unit_price) }}</td>
                <td class="p-3 text-right">{{ money(l.tax_amount) }}</td>
                <td class="p-3 text-right font-semibold">{{ money(l.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="flex justify-end border-t bg-slate-50 p-5">
          <dl class="w-full max-w-sm space-y-2">
            <div class="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{{ money(order.subtotal) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Diskon</dt>
              <dd>{{ money(order.discount) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt>Pajak</dt>
              <dd>{{ money(order.tax) }}</dd>
            </div>
            <div class="flex justify-between border-t pt-2 text-lg font-bold">
              <dt>Total</dt>
              <dd>{{ money(order.grand_total) }}</dd>
            </div>
          </dl>
        </footer>
      </section>
    </template>
    <AppModal
      :open="showReceipt"
      title="Terima Barang dari Purchase Order"
      size="lg"
      :close-disabled="busy"
      @close="showReceipt = false"
    >
      <div class="grid gap-4 md:grid-cols-2">
        <label class="form-label">
          Tanggal Penerimaan
          <input v-model="receiptDate" type="date" class="field mt-1" />
        </label>
        <label class="form-label">
          Nomor Surat Jalan
          <input v-model="deliveryNumber" class="field mt-1" maxlength="100" />
        </label>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left">Item</th>
              <th class="p-3 text-right">Sisa</th>
              <th class="p-3 text-right">Diterima</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="line in order?.lines ?? []" :key="line.id">
              <td class="p-3">{{ line.item_code }} · {{ line.item_name }}</td>
              <td class="p-3 text-right">
                {{ Number(line.quantity) - Number(line.received_quantity) }}
              </td>
              <td class="p-3">
                <input
                  v-model.number="receiptQuantities[line.id]"
                  type="number"
                  min="0"
                  :max="Number(line.quantity) - Number(line.received_quantity)"
                  step="0.0001"
                  class="field ml-auto w-32 text-right"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
        Penerimaan langsung diposting; stok dan jurnal GRNI berubah dalam satu transaksi.
      </p>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy" @click="showReceipt = false">
          Batal
        </AppButton>
        <AppButton :loading="busy" @click="createReceipt">Simpan & Posting</AppButton>
      </template>
    </AppModal>
    <AppModal
      :open="showCancel"
      title="Batalkan Purchase Order"
      :close-disabled="busy"
      @close="showCancel = false"
    >
      <label class="form-label">
        Alasan
        <textarea v-model="reason" class="field mt-1 min-h-24" />
      </label>
      <template #footer>
        <AppButton variant="secondary" @click="showCancel = false">Kembali</AppButton>
        <AppButton variant="danger" :loading="busy" @click="cancel">Batalkan</AppButton>
      </template>
    </AppModal>
  </div>
</template>
