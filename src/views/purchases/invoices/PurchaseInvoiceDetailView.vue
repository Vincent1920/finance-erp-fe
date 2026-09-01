<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Ban, Check, FileCheck, RotateCcw, Send, XCircle } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { purchaseInvoiceService } from '@/services/purchase-invoice.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type { PurchaseInvoice, PurchaseInvoiceStatus } from '@/types/purchase'
import { getApiErrorMessage } from '@/utils/error'
const id = Number(useRoute().params.id),
  router = useRouter(),
  auth = useAuthStore(),
  notify = useNotificationStore(),
  invoice = ref<PurchaseInvoice | null>(null),
  loading = ref(true),
  busy = ref(false),
  error = ref(''),
  modal = ref<'reject' | 'cancel' | 'reverse' | null>(null),
  reason = ref(''),
  date = ref(new Date().toISOString().slice(0, 10))
const labels: Record<PurchaseInvoiceStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  posted: 'Posted',
  partially_paid: 'Dibayar Sebagian',
  paid: 'Lunas',
  reversed: 'Reversed',
  cancelled: 'Dibatalkan',
}
const money = (v: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: invoice.value?.currency ?? 'IDR',
  }).format(Number(v))
const load = async () => {
  loading.value = true
  try {
    invoice.value = await purchaseInvoiceService.get(id)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Purchase invoice gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const run = async (fn: () => Promise<unknown>, message: string) => {
  busy.value = true
  try {
    await fn()
    notify.push(message)
    modal.value = null
    reason.value = ''
    await load()
  } catch (e) {
    notify.push(getApiErrorMessage(e, 'Tindakan gagal.'), 'error')
  } finally {
    busy.value = false
  }
}
const processReason = () => {
  if (reason.value.trim().length < 3) return
  if (modal.value === 'reject')
    return run(() => purchaseInvoiceService.reject(id, reason.value), 'Invoice ditolak.')
  if (modal.value === 'cancel')
    return run(() => purchaseInvoiceService.cancel(id, reason.value), 'Invoice dibatalkan.')
  return run(
    () => purchaseInvoiceService.reverse(id, date.value, reason.value),
    'Invoice direversal.',
  )
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <p v-if="error" class="mb-4 rounded bg-red-50 p-3">{{ error }}</p>
    <div v-if="loading" class="panel p-8">Memuat...</div>
    <template v-else-if="invoice">
      <header class="mb-5 flex flex-wrap justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">{{ invoice.invoice_number }}</h1>
          <p class="text-sm text-slate-500">
            Supplier invoice {{ invoice.supplier_invoice_number }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton
            v-if="
              ['draft', 'rejected'].includes(invoice.status) &&
              !invoice.purchase_order_id &&
              !invoice.goods_receipt_id &&
              auth.hasPermission('purchase-invoices.update')
            "
            variant="secondary"
            @click="router.push(`/purchases/invoices/${id}/edit`)"
          >
            Edit
          </AppButton>
          <AppButton
            v-if="
              ['draft', 'rejected'].includes(invoice.status) &&
              auth.hasPermission('purchase-invoices.submit')
            "
            :icon="Send"
            @click="run(() => purchaseInvoiceService.submit(id), 'Invoice diajukan.')"
          >
            Ajukan
          </AppButton>
          <AppButton
            v-if="
              invoice.status === 'pending_approval' &&
              auth.hasPermission('purchase-invoices.approve')
            "
            :icon="Check"
            @click="run(() => purchaseInvoiceService.approve(id), 'Invoice disetujui.')"
          >
            Setujui
          </AppButton>
          <AppButton
            v-if="
              invoice.status === 'pending_approval' &&
              auth.hasPermission('purchase-invoices.reject')
            "
            variant="danger"
            :icon="XCircle"
            @click="modal = 'reject'"
          >
            Tolak
          </AppButton>
          <AppButton
            v-if="invoice.status === 'approved' && auth.hasPermission('purchase-invoices.post')"
            :icon="FileCheck"
            @click="run(() => purchaseInvoiceService.post(id), 'Invoice diposting.')"
          >
            Posting
          </AppButton>
          <AppButton
            v-if="
              ['draft', 'rejected'].includes(invoice.status) &&
              !invoice.purchase_order_id &&
              !invoice.goods_receipt_id &&
              auth.hasPermission('purchase-invoices.cancel')
            "
            variant="danger"
            :icon="Ban"
            @click="modal = 'cancel'"
          >
            Batalkan
          </AppButton>
          <AppButton
            v-if="
              invoice.status === 'posted' &&
              Number(invoice.paid_amount) === 0 &&
              auth.hasPermission('purchase-invoices.reverse')
            "
            variant="danger"
            :icon="RotateCcw"
            @click="modal = 'reverse'"
          >
            Reverse
          </AppButton>
        </div>
      </header>
      <section class="panel mb-5 p-5">
        <div class="flex justify-between">
          <div>
            <b>{{ invoice.supplier_code }} · {{ invoice.supplier_name }}</b>
            <p>{{ invoice.invoice_date.slice(0, 10) }} — {{ invoice.due_date.slice(0, 10) }}</p>
          </div>
          <AppBadge tone="blue">{{ labels[invoice.status] }}</AppBadge>
        </div>
        <dl class="mt-5 grid gap-4 sm:grid-cols-4">
          <div>
            <dt>Total</dt>
            <dd class="font-bold">{{ money(invoice.grand_total) }}</dd>
          </div>
          <div>
            <dt>Dibayar</dt>
            <dd>{{ money(invoice.paid_amount) }}</dd>
          </div>
          <div>
            <dt>Outstanding</dt>
            <dd class="font-bold text-blue-700">{{ money(invoice.outstanding_amount) }}</dd>
          </div>
          <div>
            <dt>Jurnal</dt>
            <dd>{{ invoice.journal_id ? `#${invoice.journal_id}` : 'Belum diposting' }}</dd>
          </div>
        </dl>
      </section>
      <section class="panel overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left">Item</th>
              <th>Qty</th>
              <th>Harga</th>
              <th>Diskon</th>
              <th>Pajak</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in invoice.lines" :key="l.id" class="border-t">
              <td class="p-3">
                <b>{{ l.item_code }} · {{ l.item_name }}</b>
                <small class="block">{{ l.description }}</small>
              </td>
              <td class="text-right">{{ l.quantity }} {{ l.unit_code }}</td>
              <td class="text-right">{{ money(l.unit_price) }}</td>
              <td class="text-right">{{ money(l.discount) }}</td>
              <td class="text-right">{{ money(l.tax_amount) }}</td>
              <td class="text-right font-semibold">{{ money(l.subtotal) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
    <AppModal
      :open="modal !== null"
      :title="
        modal === 'reverse'
          ? 'Reverse Purchase Invoice'
          : modal === 'reject'
            ? 'Tolak Purchase Invoice'
            : 'Batalkan Purchase Invoice'
      "
      @close="modal = null"
    >
      <label v-if="modal === 'reverse'">
        Tanggal
        <input v-model="date" type="date" class="field mt-1" />
      </label>
      <label class="mt-3 block">
        Alasan
        <textarea v-model="reason" class="field mt-1" />
      </label>
      <template #footer>
        <AppButton variant="secondary" @click="modal = null">Kembali</AppButton>
        <AppButton variant="danger" :loading="busy" @click="processReason">Proses</AppButton>
      </template>
    </AppModal>
  </div>
</template>
