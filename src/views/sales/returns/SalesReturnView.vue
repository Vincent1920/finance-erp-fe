<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Eye, Plus, RefreshCw } from 'lucide-vue-next'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppEmptyState from '@/components/common/AppEmptyState.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import { salesInvoiceService } from '@/services/sales-invoice.service'
import { salesReturnService, type SalesReturn } from '@/services/sales-return.service'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationStore } from '@/stores/notification.store'
import type { SalesInvoice } from '@/types/sales'
import { getApiErrorMessage } from '@/utils/error'
const auth = useAuthStore(),
  notice = useNotificationStore(),
  rows = ref<SalesReturn[]>([]),
  total = ref(0),
  page = ref(1),
  status = ref(''),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  showCreate = ref(false),
  detail = ref<SalesReturn | null>(null),
  invoice = ref<SalesInvoice | null>(null),
  invoiceId = ref(0),
  form = reactive({
    return_date: new Date().toISOString().slice(0, 10),
    reference: '',
    reason: '',
    qty: {} as Record<number, number>,
    lineReason: {} as Record<number, string>,
  })
const labels = {
  draft: 'Draft',
  pending_approval: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  posted: 'Posted',
  rejected: 'Ditolak',
  reversed: 'Reversed',
  cancelled: 'Dibatalkan',
}
const tone = (s: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  s === 'posted'
    ? 'green'
    : s === 'approved'
      ? 'blue'
      : s === 'pending_approval'
        ? 'amber'
        : s === 'cancelled' || s === 'rejected' || s === 'reversed'
          ? 'red'
          : 'slate'
const money = (v: string | number, c = 'IDR') =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 2,
  }).format(Number(v))
const date = (v: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(`${v.slice(0, 10)}T00:00:00`),
  )
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const r = await salesReturnService.list({
      page: page.value,
      limit: 20,
      status: status.value || undefined,
    })
    rows.value = r.data
    total.value = r.meta.total
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Retur gagal dimuat.')
  } finally {
    loading.value = false
  }
}
const loadInvoice = async () => {
  if (!invoiceId.value) return
  busy.value = true
  try {
    invoice.value = await salesInvoiceService.get(invoiceId.value)
    form.qty = {}
    form.lineReason = {}
  } catch (e) {
    notice.push(getApiErrorMessage(e, 'Invoice tidak ditemukan.'), 'error')
  } finally {
    busy.value = false
  }
}
const create = async () => {
  const lines = (invoice.value?.lines ?? [])
    .map((x) => ({
      sales_invoice_line_id: x.id,
      quantity: Number(form.qty[x.id] ?? 0),
      reason: form.lineReason[x.id] || null,
    }))
    .filter((x) => x.quantity > 0)
  if (!invoice.value || !lines.length || form.reason.trim().length < 3)
    return notice.push('Invoice, alasan, dan minimal satu kuantitas retur wajib diisi.', 'error')
  busy.value = true
  try {
    await salesReturnService.create({
      return_date: form.return_date,
      sales_invoice_id: invoice.value.id,
      reference: form.reference || null,
      reason: form.reason,
      lines,
    })
    notice.push('Retur penjualan berhasil dibuat.')
    showCreate.value = false
    invoice.value = null
    await load()
  } catch (e) {
    notice.push(getApiErrorMessage(e, 'Retur gagal dibuat.'), 'error')
  } finally {
    busy.value = false
  }
}
const action = async (
  row: SalesReturn,
  kind: 'submit' | 'approve' | 'reject' | 'post' | 'cancel' | 'reverse',
) => {
  busy.value = true
  try {
    if (kind === 'cancel' || kind === 'reject' || kind === 'reverse') {
      const reason = window.prompt(`Alasan ${kind}:`)?.trim()
      if (!reason || reason.length < 3) return
      if (kind === 'reverse') {
        await salesReturnService.reverse(row.id, new Date().toISOString().slice(0, 10), reason)
      } else {
        await salesReturnService[kind](row.id, reason)
      }
    } else await salesReturnService[kind](row.id)
    notice.push('Status retur berhasil diperbarui.')
    await load()
  } catch (e) {
    notice.push(getApiErrorMessage(e, 'Tindakan retur gagal.'), 'error')
  } finally {
    busy.value = false
  }
}
const openDetail = async (id: number) => {
  busy.value = true
  try {
    detail.value = await salesReturnService.get(id)
  } finally {
    busy.value = false
  }
}
const changeFilter = () => {
  page.value = 1
  void load()
}
const changePage = (value: number) => {
  page.value = value
  void load()
}
onMounted(load)
</script>
<template>
  <div>
    <AppBreadcrumb />
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Retur Penjualan</h1>
        <p class="text-sm text-slate-500">
          Retur berbasis sales invoice posted dengan kontrol kuantitas dan posting stok/jurnal.
        </p>
      </div>
      <AppButton
        v-if="auth.hasPermission('sales-returns.create')"
        :icon="Plus"
        @click="showCreate = true"
      >
        Buat Retur
      </AppButton>
    </div>
    <section class="panel overflow-hidden">
      <div class="flex justify-between border-b p-4">
        <select
          v-model="status"
          class="field max-w-56"
          @change="changeFilter"
        >
          <option value="">Semua status</option>
          <option v-for="(value, key) in labels" :key="key" :value="key">{{ value }}</option>
        </select>
        <AppButton variant="secondary" :icon="RefreshCw" :loading="loading" @click="load">
          Muat ulang
        </AppButton>
      </div>
      <p v-if="error" class="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3">Nomor/Tanggal</th>
              <th class="p-3">Invoice</th>
              <th class="p-3">Pelanggan</th>
              <th class="p-3 text-right">Total</th>
              <th class="p-3">Status</th>
              <th class="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr v-for="i in 5" :key="i">
              <td colspan="6" class="p-4">
                <div class="h-5 animate-pulse rounded bg-slate-100" />
              </td>
            </tr>
          </tbody>
          <tbody v-else class="divide-y">
            <tr v-for="row in rows" :key="row.id">
              <td class="p-3">
                <b class="font-mono text-blue-700">{{ row.return_number }}</b>
                <small class="block">{{ date(row.return_date) }}</small>
              </td>
              <td class="p-3">{{ row.invoice_number }}</td>
              <td class="p-3">{{ row.customer_code }} · {{ row.customer_name }}</td>
              <td class="p-3 text-right font-semibold">
                {{ money(row.grand_total, row.currency) }}
              </td>
              <td class="p-3">
                <AppBadge :tone="tone(row.status)">{{ labels[row.status] }}</AppBadge>
              </td>
              <td class="p-3">
                <div class="flex flex-wrap gap-1">
                  <button class="rounded p-2 hover:bg-slate-100" @click="openDetail(row.id)">
                    <Eye class="h-4 w-4" />
                  </button>
                  <AppButton
                    v-if="row.status === 'draft' && auth.hasPermission('sales-returns.submit')"
                    variant="secondary"
                    :disabled="busy"
                    @click="action(row, 'submit')"
                  >
                    Ajukan
                  </AppButton>
                  <AppButton
                    v-if="
                      row.status === 'pending_approval' &&
                      auth.hasPermission('sales-returns.approve')
                    "
                    :disabled="busy"
                    @click="action(row, 'approve')"
                  >
                    Setujui
                  </AppButton>
                  <AppButton
                    v-if="
                      row.status === 'pending_approval' &&
                      auth.hasPermission('sales-returns.reject')
                    "
                    variant="danger"
                    :disabled="busy"
                    @click="action(row, 'reject')"
                  >
                    Tolak
                  </AppButton>
                  <AppButton
                    v-if="row.status === 'approved' && auth.hasPermission('sales-returns.post')"
                    :disabled="busy"
                    @click="action(row, 'post')"
                  >
                    Posting
                  </AppButton>
                  <AppButton
                    v-if="
                      ['draft', 'rejected'].includes(row.status) &&
                      auth.hasPermission('sales-returns.cancel')
                    "
                    variant="danger"
                    :disabled="busy"
                    @click="action(row, 'cancel')"
                  >
                    Batal
                  </AppButton>
                  <AppButton
                    v-if="row.status === 'posted' && auth.hasPermission('sales-returns.reverse')"
                    variant="danger"
                    :disabled="busy"
                    @click="action(row, 'reverse')"
                  >
                    Reverse
                  </AppButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppEmptyState
        v-if="!loading && !rows.length && !error"
        title="Belum ada retur penjualan"
        description="Buat retur dari sales invoice yang sudah diposting."
      />
      <div class="border-t p-4">
        <AppPagination
          :page="page"
          :total="total"
          :per-page="20"
          @change="changePage"
        />
      </div>
    </section>
    <AppModal
      :open="showCreate"
      title="Buat Retur Penjualan"
      size="xl"
      :close-disabled="busy"
      @close="showCreate = false"
    >
      <div class="grid gap-4 md:grid-cols-3">
        <label class="form-label">
          ID Sales Invoice
          <div class="mt-1 flex gap-2">
            <input v-model.number="invoiceId" type="number" min="1" class="field" />
            <AppButton variant="secondary" :loading="busy" @click="loadInvoice">Muat</AppButton>
          </div>
        </label>
        <label class="form-label">
          Tanggal Retur
          <input v-model="form.return_date" type="date" class="field mt-1" />
        </label>
        <label class="form-label">
          Referensi
          <input v-model="form.reference" class="field mt-1" />
        </label>
      </div>
      <div v-if="invoice" class="mt-4">
        <p class="mb-3 font-semibold">{{ invoice.invoice_number }} · {{ invoice.customer_name }}</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="p-2 text-left">Item</th>
                <th class="p-2 text-right">Qty Invoice</th>
                <th class="p-2 text-right">Sudah Retur</th>
                <th class="p-2 text-right">Qty Retur</th>
                <th class="p-2">Alasan Baris</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="line in invoice.lines" :key="line.id">
                <td class="p-2">{{ line.item_code }} · {{ line.item_name }}</td>
                <td class="p-2 text-right">{{ line.quantity }}</td>
                <td class="p-2 text-right">{{ (line as any).returned_quantity ?? 0 }}</td>
                <td class="p-2">
                  <input
                    v-model.number="form.qty[line.id]"
                    type="number"
                    min="0"
                    :max="Number(line.quantity) - Number((line as any).returned_quantity ?? 0)"
                    step="0.0001"
                    class="field ml-auto w-28 text-right"
                  />
                </td>
                <td class="p-2"><input v-model="form.lineReason[line.id]" class="field" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <label class="form-label mt-4 block">
        Alasan Retur
        <textarea v-model="form.reason" class="field mt-1 min-h-20" />
      </label>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy" @click="showCreate = false">
          Batal
        </AppButton>
        <AppButton :loading="busy" @click="create">Simpan Draft</AppButton>
      </template>
    </AppModal>
    <AppModal
      :open="detail !== null"
      title="Detail Retur Penjualan"
      size="lg"
      @close="detail = null"
    >
      <template v-if="detail">
        <div class="mb-4 flex justify-between">
          <div>
            <b>{{ detail.return_number }}</b>
            <p class="text-sm text-slate-500">
              {{ detail.invoice_number }} · {{ detail.customer_name }}
            </p>
          </div>
          <AppBadge :tone="tone(detail.status)">{{ labels[detail.status] }}</AppBadge>
        </div>
        <p class="mb-4 text-sm">{{ detail.reason }}</p>
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-2 text-left">Item</th>
              <th class="p-2 text-right">Qty</th>
              <th class="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in detail.lines" :key="line.id">
              <td class="p-2">{{ line.item_code }} · {{ line.item_name }}</td>
              <td class="p-2 text-right">{{ line.quantity }} {{ line.unit_code }}</td>
              <td class="p-2 text-right">{{ money(line.subtotal, detail.currency) }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </AppModal>
  </div>
</template>
