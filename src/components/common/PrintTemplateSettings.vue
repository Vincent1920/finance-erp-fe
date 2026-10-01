<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/services/api/client'
import AppButton from './AppButton.vue'
import { defaultPrintTemplate, printSample } from '@/utils/print-document'
import { formatCurrency } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'
import { useNotificationStore } from '@/stores/notification.store'
const form = reactive({ ...defaultPrintTemplate }),
  company = ref<Record<string, unknown> | null>(null),
  busy = ref(false),
  error = ref(''),
  notify = useNotificationStore()
const documentType = ref<'sales_invoice' | 'purchase_invoice' | 'sales_order' | 'purchase_order'>('sales_invoice')
const documentTypes = [
  { value: 'sales_invoice', label: 'Invoice Penjualan' },
  { value: 'purchase_invoice', label: 'Invoice Pembelian' },
  { value: 'sales_order', label: 'Sales Order' },
  { value: 'purchase_order', label: 'Purchase Order' },
] as const
const activeDocument = computed(() => documentTypes.find((item) => item.value === documentType.value)!)
const columnOptions = [
  { value: 'code', label: 'Kode' }, { value: 'name', label: 'Nama Barang/Jasa', required: true },
  { value: 'quantity', label: 'QTY' }, { value: 'unit', label: 'Satuan' },
  { value: 'price', label: 'Harga' }, { value: 'discount', label: 'Diskon' },
  { value: 'tax', label: 'Pajak' }, { value: 'subtotal', label: 'Subtotal' },
]
const activeColumns = computed(() => (form.columns ?? []).map((value) => columnOptions.find((item) => item.value === value)!).filter(Boolean))
const previewTitle = computed(() => form.headerTitle || activeDocument.value.label)
const previewNumber = computed(() => ({
  sales_invoice: 'SI-2026-09-000001', purchase_invoice: 'PI-2026-09-000001',
  sales_order: 'SO-2026-09-000001', purchase_order: 'PO-2026-09-000001',
})[documentType.value])
const partnerLabel = computed(() => documentType.value.startsWith('purchase') ? 'Pemasok' : 'Pelanggan')
async function loadTemplate() {
  error.value = ''
  try {
    const d = (await api.get('/operations/print-template', { params: { document_type: documentType.value } })).data.data
    Object.assign(form, defaultPrintTemplate, d.template ?? {})
    company.value = d.company
  } catch (e) { error.value = getApiErrorMessage(e, 'Pengaturan cetak gagal dimuat.') }
}
async function save() {
  busy.value = true
  try {
    await api.put('/operations/print-template', { documentType: documentType.value, ...form })
    notify.push('Pengaturan cetak tersimpan.')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pengaturan gagal disimpan.')
  } finally {
    busy.value = false
  }
}
function toggleColumn(value: string, enabled: boolean) {
  if (value === 'name') return
  if (enabled) {
    if (!form.columns.includes(value)) form.columns.push(value)
  } else form.columns = form.columns.filter((column) => column !== value)
}
function moveColumn(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= form.columns.length) return
  const columns = [...form.columns]
  ;[columns[index], columns[target]] = [columns[target], columns[index]]
  form.columns = columns
}
async function choosePaymentQr(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    error.value = 'QR pembayaran harus berupa PNG, JPG, atau WebP.'; return
  }
  if (file.size > 300_000) { error.value = 'Ukuran QR pembayaran maksimal 300 KB.'; return }
  form.paymentQr = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file)
  })
  input.value = ''
}
onMounted(loadTemplate)
</script>
<template>
  <section class="panel mb-5 p-5">
    <h2 class="mb-2 text-lg font-bold">Desain Dokumen Cetak</h2>
    <p class="mb-4 text-sm text-slate-500">Atur setiap jenis dokumen secara terpisah. Rekomendasi: A4, font 10–11 pt, warna merek, nomor halaman, informasi pembayaran, dan tanda tangan.</p>
    <div class="mb-5 flex flex-wrap gap-2"><button v-for="type in documentTypes" :key="type.value" type="button" class="rounded-lg px-3 py-2 text-sm font-semibold" :class="documentType === type.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'" @click="documentType = type.value; loadTemplate()">{{ type.label }}</button></div>
    <p v-if="error" class="text-red-600">{{ error }}</p>
    <div class="grid gap-5 lg:grid-cols-2">
      <form class="space-y-3" @submit.prevent="save">
        <label class="block">Gaya template
          <select v-model="form.templateStyle" class="field">
            <option value="modern">Modern — berwarna dan tegas</option>
            <option value="classic">Klasik — formal dan terpusat</option>
            <option value="compact">Ringkas — hemat ruang</option>
          </select>
        </label>
        <label class="block">
          Judul dokumen
          <input v-model="form.headerTitle" class="field" maxlength="100" placeholder="Kosongkan untuk judul bawaan" />
        </label>
        <label class="block">
          Warna utama
          <input v-model="form.accentColor" type="color" class="h-11 w-full rounded border p-1" />
        </label>
        <label class="block">
          Ukuran font (pt)
          <input
            v-model.number="form.fontSize"
            type="number"
            min="8"
            max="18"
            step="1"
            class="field"
            required
          />
        </label>
        <label class="block">
          Kertas
          <select v-model="form.pageSize" class="field">
            <option>A4</option>
            <option>A5</option>
            <option>Letter</option>
          </select>
        </label>
        <label class="block">
          Orientasi
          <select v-model="form.orientation" class="field">
            <option value="portrait">Potret</option>
            <option value="landscape">Lanskap</option>
          </select>
        </label>
        <label class="block">Margin halaman (mm)<input v-model.number="form.marginMm" type="number" min="5" max="30" class="field" required /></label>
        <label class="block">Watermark
          <select v-model="form.watermark" class="field"><option value="">Tanpa watermark</option><option value="DRAFT">Draft</option><option value="LUNAS">Lunas</option><option value="DIBATALKAN">Dibatalkan</option></select>
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label>Label mitra<input v-model="form.partnerLabel" class="field" maxlength="50" :placeholder="partnerLabel" /></label>
          <label>Label jumlah akhir<input v-model="form.totalLabel" class="field" maxlength="50" placeholder="Total Tagihan" /></label>
        </div>
        <fieldset class="rounded-xl border p-3">
          <legend class="px-1 font-semibold">Kolom rincian</legend>
          <p class="mb-3 text-xs text-slate-500">Pilih kolom yang dicetak, lalu atur urutannya.</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label v-for="column in columnOptions" :key="column.value" class="flex items-center gap-2">
              <input type="checkbox" :checked="form.columns.includes(column.value)" :disabled="column.required" @change="toggleColumn(column.value, ($event.target as HTMLInputElement).checked)" />
              {{ column.label }} <span v-if="column.required" class="text-xs text-slate-400">wajib</span>
            </label>
          </div>
          <ol class="mt-3 space-y-1">
            <li v-for="(column, index) in activeColumns" :key="column.value" class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>{{ index + 1 }}. {{ column.label }}</span>
              <span class="flex gap-1"><button type="button" class="rounded border px-2 disabled:opacity-30" :disabled="index === 0" :aria-label="`Naikkan ${column.label}`" @click="moveColumn(index, -1)">↑</button><button type="button" class="rounded border px-2 disabled:opacity-30" :disabled="index === activeColumns.length - 1" :aria-label="`Turunkan ${column.label}`" @click="moveColumn(index, 1)">↓</button></span>
            </li>
          </ol>
        </fieldset>
        <label class="flex gap-2">
          <input v-model="form.showCompany" type="checkbox" />
          Identitas perusahaan
        </label>
        <label class="flex gap-2">
          <input v-model="form.showReference" type="checkbox" />
          Referensi
        </label>
        <label class="flex gap-2">
          <input v-model="form.showNotes" type="checkbox" />
          Catatan
        </label>
        <label class="flex gap-2">
          <input v-model="form.showTax" type="checkbox" />
          Rincian pajak
        </label>
        <label class="flex gap-2">
          <input v-model="form.showSignature" type="checkbox" />
          Kolom tanda tangan
        </label>
        <label class="flex gap-2"><input v-model="form.showPageNumber" type="checkbox" /> Nomor halaman</label>
        <label class="flex gap-2"><input v-model="form.showPaymentInfo" type="checkbox" /> Informasi pembayaran</label>
        <div v-if="form.showPaymentInfo" class="space-y-3 rounded-xl border p-3">
          <label class="block">Rekening / petunjuk pembayaran<textarea v-model="form.paymentInfo" class="field" maxlength="500" placeholder="Contoh: Bank BCA 123456789 a.n. Perusahaan" /></label>
          <div class="flex items-center gap-3">
            <img v-if="form.paymentQr" :src="form.paymentQr" alt="QR pembayaran" class="h-20 w-20 rounded border object-contain" />
            <label class="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">Pilih QR pembayaran<input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" @change="choosePaymentQr" /></label>
            <button v-if="form.paymentQr" type="button" class="text-sm text-red-600" @click="form.paymentQr = ''">Hapus</button>
          </div>
          <p class="text-xs text-slate-400">Gunakan gambar QRIS atau QR rekening, maksimal 300 KB.</p>
        </div>
        <label class="block">Syarat pembayaran<textarea v-model="form.paymentTerms" class="field" maxlength="500" placeholder="Contoh: Pembayaran 30 hari setelah tanggal invoice" /></label>
        <fieldset v-if="form.showSignature" class="rounded-xl border p-3"><legend class="px-1 font-semibold">Label tanda tangan</legend><div class="grid gap-2 sm:grid-cols-3"><input v-for="(_, index) in form.signatureLabels" :key="index" v-model="form.signatureLabels[index]" class="field" maxlength="50" required /></div></fieldset>
        <label class="block">
          Catatan kaki
          <textarea v-model="form.footer" class="field" maxlength="500" />
        </label>
        <AppButton type="submit" :loading="busy">Simpan desain cetak</AppButton>
      </form>
      <div class="overflow-auto rounded-xl border bg-slate-100 p-4" aria-label="Pratinjau dokumen cetak">
        <article
          class="relative mx-auto min-h-[600px] max-w-[720px] bg-white p-8 text-slate-800 shadow-sm"
          :class="{ 'text-center': form.templateStyle === 'classic', 'leading-tight': form.templateStyle === 'compact' }"
          :style="{ fontSize: `${form.templateStyle === 'compact' ? Math.max(8, form.fontSize - 1) : form.fontSize}pt` }"
        >
          <header class="mb-6 border-b-[3px] pb-4" :style="{ borderColor: form.accentColor }">
            <template v-if="form.showCompany">
              <div class="flex items-start gap-3">
                <img v-if="company?.logo" :src="String(company.logo)" alt="Logo perusahaan" class="h-16 w-16 object-contain" />
                <div><h3 class="text-lg font-bold">{{ company?.legal_name || company?.name || 'Nama Perusahaan' }}</h3>
                <p class="text-xs text-slate-500">{{ company?.address || 'Alamat perusahaan' }}</p>
                <p class="text-xs text-slate-500">{{ company?.phone || 'Nomor telepon' }} · {{ company?.email || 'Email' }}</p>
                <p class="text-xs text-slate-500">NPWP {{ company?.tax_number || '—' }}</p></div>
              </div>
            </template>
            <h2 class="mt-3 text-2xl font-bold" :style="{ color: form.accentColor }">{{ previewTitle }}</h2>
            <b>{{ previewNumber }}</b>
          </header>
          <div v-if="form.watermark" class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -rotate-12 text-6xl font-black text-slate-300/30">{{ form.watermark }}</div>
          <div class="grid gap-1 text-sm sm:grid-cols-2">
            <p><span class="text-slate-500">{{ form.partnerLabel || partnerLabel }}:</span> {{ documentType.startsWith('purchase') ? 'PT Pemasok Contoh' : printSample.customer_name }}</p>
            <p><span class="text-slate-500">Tanggal:</span> {{ printSample.invoice_date }}</p>
            <p v-if="form.showReference"><span class="text-slate-500">Referensi:</span> {{ printSample.reference }}</p>
            <p><span class="text-slate-500">Jatuh tempo:</span> {{ printSample.due_date }}</p>
          </div>
          <div class="mt-6 overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-100 text-left"><tr><th v-for="column in activeColumns.filter((item) => form.showTax || item.value !== 'tax')" :key="column.value" class="p-2" :class="{ 'text-right': ['quantity','price','discount','tax','subtotal'].includes(column.value) }">{{ column.label }}</th></tr></thead>
              <tbody><tr v-for="line in printSample.lines" :key="line.item_code" class="border-b"><td v-for="column in activeColumns.filter((item) => form.showTax || item.value !== 'tax')" :key="column.value" class="p-2" :class="{ 'text-right': ['quantity','price','discount','tax','subtotal'].includes(column.value) }"><template v-if="column.value === 'code'">{{ line.item_code }}</template><template v-else-if="column.value === 'name'">{{ line.item_name }}</template><template v-else-if="column.value === 'quantity'">{{ line.quantity }}</template><template v-else-if="column.value === 'unit'">{{ line.unit_code }}</template><template v-else-if="column.value === 'price'">{{ formatCurrency(Number(line.unit_price)) }}</template><template v-else-if="column.value === 'discount'">{{ formatCurrency(Number(line.discount_amount ?? 0)) }}</template><template v-else-if="column.value === 'tax'">{{ formatCurrency(Number(line.tax_amount)) }}</template><template v-else>{{ formatCurrency(Number(line.subtotal)) }}</template></td></tr></tbody>
            </table>
          </div>
          <dl class="ml-auto mt-5 w-full max-w-xs space-y-2 text-sm">
            <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ formatCurrency(Number(printSample.subtotal)) }}</dd></div>
            <div v-if="form.showTax" class="flex justify-between"><dt>PPN / Pajak</dt><dd>{{ formatCurrency(Number(printSample.tax)) }}</dd></div>
            <div class="flex justify-between border-t pt-2 text-base font-bold" :style="{ color: form.accentColor }"><dt>{{ form.totalLabel || 'Total Tagihan' }}</dt><dd>{{ formatCurrency(Number(printSample.grand_total)) }}</dd></div>
          </dl>
          <div v-if="form.paymentTerms" class="mt-5 border-l-4 bg-slate-50 p-3 text-sm" :style="{ borderColor: form.accentColor }"><b>Syarat Pembayaran</b><p class="whitespace-pre-wrap">{{ form.paymentTerms }}</p></div>
          <div v-if="form.showPaymentInfo && (form.paymentInfo || form.paymentQr)" class="mt-5 flex justify-between gap-3 border-l-4 bg-slate-50 p-3 text-left text-sm" :style="{ borderColor: form.accentColor }"><div><b>Informasi Pembayaran</b><p class="whitespace-pre-wrap">{{ form.paymentInfo }}</p></div><img v-if="form.paymentQr" :src="form.paymentQr" alt="QR pembayaran" class="h-20 w-20 object-contain" /></div>
          <p v-if="form.showNotes" class="mt-5 text-sm text-slate-600">{{ printSample.notes }}</p>
          <div v-if="form.showSignature" class="mt-16 grid grid-cols-3 gap-6 text-center text-xs"><span v-for="label in form.signatureLabels" :key="label" class="border-b pb-10">{{ label }}</span></div>
          <footer class="mt-8 border-t pt-3 text-xs text-slate-500">{{ form.footer }}<span v-if="form.showPageNumber" class="float-right">Halaman 1 / 1</span></footer>
        </article>
      </div>
    </div>
  </section>
</template>
