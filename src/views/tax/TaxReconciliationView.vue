<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CheckCircle2, FileCheck2, FileUp, LockKeyhole, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import { formatCurrency as money } from '@/utils/currency'
import { exportRows } from '@/utils/export'
import { getApiErrorMessage } from '@/utils/error'
import { useAuthStore } from '@/stores/auth.store'
import {
  taxReconciliationService,
  type TaxComparisonRow,
  type TaxReconciliationData,
  type TaxReportRowInput,
  type TaxScope,
  type TaxType,
} from '@/services/tax-reconciliation.service'

const auth = useAuthStore()
const now = new Date()
const period = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const scope = ref<TaxScope>('all')
const tab = ref<'summary' | 'detail' | 'import-result' | 'equalization' | 'accounts' | 'guide'>('summary')
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const data = ref<TaxReconciliationData | null>(null)
const search = ref('')
const statusFilter = ref('all')
const typeFilter = ref('all')
const importOpen = ref(false)
const importMode = ref<'spt' | 'internal'>('spt')
const importFileName = ref('data-spt.csv')
const importRevision = ref(0)
const importNotes = ref('')
const importText = ref('')
const resolving = ref<TaxComparisonRow | null>(null)
const resolutionCode = ref('timing')
const resolutionNote = ref('')
const linking = ref<TaxComparisonRow | null>(null)
const linkNumber = ref('')
const linkDate = ref('')
const linkNotes = ref('')

const typeLabels: Record<TaxType, string> = {
  ppn_output: 'PPN Keluaran',
  ppn_input: 'PPN Masukan',
  pph: 'PPh lama (perlu klasifikasi)',
  pph21_employee: 'PPh 21 Pegawai',
  pph21_non_employee: 'PPh 21 Nonpegawai',
  pph23: 'PPh 23',
  pph42: 'PPh 4(2)',
}
const groupLabels: Record<Exclude<TaxScope, 'all'>, { title: string; description: string; document: string }> = {
  pph21: { title: 'PPh 21', description: 'Pegawai dan nonpegawai', document: 'Bukti potong BP21/BPA1' },
  ppn: { title: 'PPN', description: 'PPN keluaran dan masukan', document: 'Faktur pajak' },
  unification: { title: 'PPh Unifikasi', description: 'PPh 23 dan PPh 4(2)', document: 'Bukti potong unifikasi' },
}
const statusLabels: Record<string, string> = {
  matched: 'Sesuai',
  system_only: 'Hanya di Finora',
  reported_only: 'Hanya di SPT',
  amount_mismatch: 'Nilai berbeda',
  identity_mismatch: 'Identitas berbeda',
}
const resolutionLabels: Record<string, string> = {
  pending: 'Belum ditangani',
  timing: 'Perbedaan waktu/masa',
  non_taxable: 'Bukan objek/tidak dipungut',
  return_or_cancel: 'Retur atau pembatalan',
  data_correction: 'Koreksi data Finora',
  spt_correction: 'Perlu pembetulan SPT',
  accepted_difference: 'Selisih dapat diterima',
}

const shownRows = computed(() =>
  (data.value?.rows ?? []).filter((row) => {
    const needle = search.value.toLowerCase()
    return (
      (statusFilter.value === 'all' || row.status === statusFilter.value) &&
      (typeFilter.value === 'all' || row.tax_type === typeFilter.value) &&
      `${row.document_number} ${row.counterparty_name} ${row.counterparty_tax_number} ${row.tax_code}`
        .toLowerCase()
        .includes(needle)
    )
  }),
)
const netDifference = computed(() =>
  Object.values(data.value?.totals ?? {}).reduce((sum, item) => sum + Number(item.tax_difference), 0),
)
const importedTotals = computed(() => ({
  documents: data.value?.imported_rows.length ?? 0,
  dpp: (data.value?.imported_rows ?? []).reduce((sum, row) => sum + Number(row.dpp), 0),
  tax: (data.value?.imported_rows ?? []).reduce((sum, row) => sum + Number(row.tax_amount), 0),
}))

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await taxReconciliationService.get(period.value, scope.value)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Rekonsiliasi pajak gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function delimiterFor(line: string) {
  const counts = [',', ';', '\t'].map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
  return counts.sort((a, b) => b.count - a.count)[0]!.delimiter
}
function parseLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1 }
      else quoted = !quoted
    } else if (char === delimiter && !quoted) { values.push(current.trim()); current = '' }
    else current += char
  }
  values.push(current.trim())
  return values
}
function amount(value: string) {
  let normalized = value.trim().replace(/[^0-9,.-]/g, '')
  if (normalized.includes(',') && normalized.includes('.')) normalized = normalized.replaceAll('.', '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) normalized = normalized.replaceAll('.', '')
  else normalized = normalized.replace(',', '.')
  const result = Number(normalized)
  if (!Number.isFinite(result)) throw new Error(`Nilai angka tidak valid: ${value}`)
  return result
}
function normalizeType(value: string): TaxType {
  const key = value.trim().toLowerCase().replace(/[ -]/g, '_')
  if (['ppn_keluaran', 'ppn_output', 'keluaran'].includes(key)) return 'ppn_output'
  if (['ppn_masukan', 'ppn_input', 'masukan'].includes(key)) return 'ppn_input'
  if (['pph_21_pegawai', 'pph21_pegawai', 'pph21_employee'].includes(key)) return 'pph21_employee'
  if (['pph_21_nonpegawai', 'pph21_nonpegawai', 'pph21_non_employee'].includes(key)) return 'pph21_non_employee'
  if (['pph_23', 'pph23'].includes(key)) return 'pph23'
  if (['pph_4(2)', 'pph_4_2', 'pph42', 'pph_final'].includes(key)) return 'pph42'
  if (['pph', 'withholding'].includes(key)) return 'pph'
  throw new Error(`Jenis pajak tidak dikenal: ${value}`)
}
function parseImport(): TaxReportRowInput[] {
  const lines = importText.value.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error('File harus berisi header dan minimal satu baris data.')
  const delimiter = delimiterFor(lines[0]!)
  const headers = parseLine(lines[0]!, delimiter).map((header) => header.toLowerCase().trim())
  const aliases: Record<string, string[]> = {
    tax_type: ['jenis_pajak', 'tax_type'], document_number: ['nomor_dokumen', 'document_number'],
    document_date: ['tanggal', 'document_date'], counterparty_tax_number: ['npwp', 'counterparty_tax_number'],
    counterparty_name: ['nama_lawan_transaksi', 'counterparty_name'], tax_code: ['kode_pajak', 'tax_code'],
    dpp: ['dpp'], tax_amount: ['pajak', 'tax_amount'], description: ['keterangan', 'description'],
  }
  const index = (key: string, required = true) => {
    const found = aliases[key]!.map((name) => headers.indexOf(name)).find((position) => position >= 0) ?? -1
    if (required && found < 0) throw new Error(`Kolom ${aliases[key]![0]} tidak ditemukan.`)
    return found
  }
  const positions = Object.fromEntries(Object.keys(aliases).map((key) => [key, index(key, !['counterparty_tax_number','counterparty_name','tax_code','description'].includes(key))]))
  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseLine(line, delimiter)
    const get = (key: string) => positions[key] >= 0 ? (cells[positions[key]] ?? '') : ''
    const date = get('document_date').split('/').reverse().join('-')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Tanggal baris ${rowIndex + 2} tidak valid.`)
    return {
      tax_type: normalizeType(get('tax_type')),
      document_number: get('document_number'), document_date: date,
      counterparty_tax_number: get('counterparty_tax_number') || null,
      counterparty_name: get('counterparty_name') || null, tax_code: get('tax_code') || null,
      dpp: amount(get('dpp')), tax_amount: amount(get('tax_amount')),
      description: get('description') || null,
    }
  })
}
async function readFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importFileName.value = file.name
  importText.value = await file.text()
}
function downloadTemplate() {
  const examples: Record<TaxScope, string> = {
    all: 'PPN_KELUARAN,0100000000000000,2026-09-01,0012345678901234,PT Contoh,PPN-OUT,10000000,1100000,Faktur pajak',
    ppn: 'PPN_KELUARAN,0100000000000000,2026-09-01,0012345678901234,PT Contoh,PPN-OUT,10000000,1100000,Faktur pajak',
    pph21: 'PPH21_PEGAWAI,BP21-2026-0001,2026-09-30,0012345678901234,Budi Santoso,21-100-01,12000000,600000,Bukti potong pegawai',
    unification: 'PPH23,BPU-2026-0001,2026-09-20,0012345678901234,PT Jasa Contoh,24-104-18,10000000,200000,Bukti potong unifikasi',
  }
  const content = `jenis_pajak,nomor_dokumen,tanggal,npwp,nama_lawan_transaksi,kode_pajak,dpp,pajak,keterangan\n${examples[scope.value]}\n`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'template-rekonsiliasi-pajak.csv'; anchor.click(); URL.revokeObjectURL(url)
}
async function importReport() {
  busy.value = true
  error.value = ''
  try {
    const rows = parseImport()
    const payload = { period: period.value, revision: importRevision.value, source_file: importFileName.value, notes: importNotes.value, rows }
    if (importMode.value === 'internal') await taxReconciliationService.importInternal(payload)
    else await taxReconciliationService.importReport(payload)
    importOpen.value = false
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, e instanceof Error ? e.message : 'Impor data SPT gagal.') }
  finally { busy.value = false }
}
function openImport(mode: 'spt' | 'internal') {
  importMode.value = mode
  importText.value = ''
  importFileName.value = mode === 'spt' ? 'data-coretax.csv' : 'data-internal.csv'
  importOpen.value = true
}
function openLink(row: TaxComparisonRow) {
  linking.value = row
  linkNumber.value = row.document_number || ''
  linkDate.value = row.document_date
  linkNotes.value = ''
}
async function saveLink() {
  if (!linking.value) return
  busy.value = true
  try {
    await taxReconciliationService.linkDocument({ source_key: linking.value.source_key, tax_document_number: linkNumber.value, tax_document_date: linkDate.value || null, notes: linkNotes.value })
    linking.value = null
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Nomor dokumen pajak gagal disimpan.') }
  finally { busy.value = false }
}
function openResolution(row: TaxComparisonRow) {
  resolving.value = row
  resolutionCode.value = row.resolution_code === 'pending' ? 'timing' : row.resolution_code
  resolutionNote.value = row.resolution_note
}
async function saveResolution() {
  if (!resolving.value) return
  busy.value = true
  try {
    await taxReconciliationService.resolve({ period: period.value, match_key: resolving.value.match_key, resolution_code: resolutionCode.value, note: resolutionNote.value })
    resolving.value = null
    await load()
  } catch (e) { error.value = getApiErrorMessage(e, 'Penyelesaian selisih gagal disimpan.') }
  finally { busy.value = false }
}
async function setStatus(status: 'reviewed' | 'locked') {
  busy.value = true
  try { await taxReconciliationService.setStatus(period.value, status); await load() }
  catch (e) { error.value = getApiErrorMessage(e, 'Status masa pajak gagal diperbarui.') }
  finally { busy.value = false }
}
function exportComparison() {
  exportRows(`rekonsiliasi-pajak-${period.value}`, [
    ['tax_type','Jenis'],['document_number','Dokumen'],['document_date','Tanggal'],['counterparty_name','Lawan Transaksi'],
    ['counterparty_tax_number','NPWP'],['status','Status'],['system_dpp','DPP Finora'],['reported_dpp','DPP SPT'],
    ['dpp_difference','Selisih DPP'],['system_tax','Pajak Finora'],['reported_tax','Pajak SPT'],['tax_difference','Selisih Pajak'],
    ['resolution_code','Penyelesaian'],['resolution_note','Catatan'],
  ], shownRows.value)
}
onMounted(load)
</script>

<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Pusat Rekonsiliasi Pajak</h1>
        <p class="mt-1 text-sm text-slate-500">Jodohkan faktur pajak dan bukti potong Finora dengan data SPT/Coretax per jenis administrasi pajak.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="exportComparison">Ekspor hasil</AppButton>
        <AppButton v-if="auth.hasPermission('tax-reconciliation.import') && data?.period.status !== 'locked'" variant="secondary" @click="openImport('internal')">Impor data internal</AppButton>
        <AppButton v-if="auth.hasPermission('tax-reconciliation.import') && data?.period.status !== 'locked'" :icon="FileUp" @click="openImport('spt')">Impor SPT/Coretax</AppButton>
      </div>
    </header>
    <p v-if="error" class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
    <section class="panel mb-5 flex flex-wrap items-end gap-3 p-4">
      <label class="form-label">Masa Pajak<input v-model="period" type="month" class="field mt-1 w-44" /></label>
      <label class="form-label">Kelompok kerja<select v-model="scope" class="field mt-1 w-56"><option value="all">Semua kelompok</option><option value="pph21">PPh 21</option><option value="ppn">PPN</option><option value="unification">PPh Unifikasi 23 & 4(2)</option></select></label>
      <AppButton :icon="RefreshCw" :loading="loading" @click="load">Muat</AppButton>
      <div class="ml-auto flex items-center gap-2 text-sm">
        <span class="rounded-full px-3 py-1 font-semibold" :class="data?.period.status === 'locked' ? 'bg-slate-200' : data?.period.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ data?.period.status === 'locked' ? 'Dikunci' : data?.period.status === 'reviewed' ? 'Sudah direview' : 'Terbuka' }}</span>
        <span v-if="data?.period.source_file" class="text-slate-500">{{ data.period.source_file }} · revisi {{ data.period.revision }}</span>
      </div>
    </section>

    <div v-if="data" class="space-y-5">
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="panel p-4"><span class="text-sm text-slate-500">Kesiapan pelaporan</span><b class="mt-1 block text-2xl text-blue-700">{{ data.summary.readiness }}%</b></div>
        <div class="panel p-4"><span class="text-sm text-slate-500">Dokumen sesuai</span><b class="mt-1 block text-2xl text-emerald-600">{{ data.summary.matched }}</b></div>
        <div class="panel p-4"><span class="text-sm text-slate-500">Sudah dijelaskan</span><b class="mt-1 block text-2xl">{{ data.summary.resolved }}</b></div>
        <div class="panel p-4"><span class="text-sm text-slate-500">Perlu tindakan</span><b class="mt-1 block text-2xl text-amber-600">{{ data.summary.exceptions }}</b></div>
        <div class="panel p-4"><span class="text-sm text-slate-500">Selisih pajak bersih</span><b class="mt-1 block text-xl" :class="Math.abs(netDifference) > 1 ? 'text-red-600' : 'text-emerald-600'">{{ money(netDifference) }}</b></div>
      </section>

      <nav class="flex flex-wrap gap-5 border-b text-sm font-semibold">
        <button v-for="item in [['summary','Ringkasan'],['detail','Daftar Selisih'],['import-result','Hasil Impor SPT'],['equalization','Equalisasi'],['accounts','Akun Pajak'],['guide','Panduan']]" :key="item[0]" class="border-b-2 px-1 py-3" :class="tab === item[0] ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'" @click="tab = item[0] as typeof tab">{{ item[1] }}</button>
      </nav>

      <section v-if="tab === 'summary'" class="grid gap-4 lg:grid-cols-3">
        <article v-for="group in (['pph21','ppn','unification'] as const)" :key="group" class="panel p-5" :class="scope !== 'all' && scope !== group ? 'opacity-50' : ''">
          <div class="flex items-start justify-between gap-3"><div><h2 class="font-semibold">{{ groupLabels[group].title }}</h2><p class="mt-1 text-xs text-slate-500">{{ groupLabels[group].description }}</p></div><span class="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{{ groupLabels[group].document }}</span></div>
          <dl class="mt-4 grid grid-cols-2 gap-2 text-sm"><dt class="text-slate-500">DPP Finora</dt><dd class="text-right font-semibold">{{ money(data.groups[group].system_dpp) }}</dd><dt class="text-slate-500">DPP SPT</dt><dd class="text-right">{{ money(data.groups[group].reported_dpp) }}</dd><dt class="text-slate-500">Pajak Finora</dt><dd class="text-right font-semibold">{{ money(data.groups[group].system_tax) }}</dd><dt class="text-slate-500">Pajak SPT</dt><dd class="text-right">{{ money(data.groups[group].reported_tax) }}</dd><dt class="border-t pt-2 font-semibold">Selisih pajak</dt><dd class="border-t pt-2 text-right font-bold" :class="Math.abs(data.groups[group].tax_difference) > 1 ? 'text-red-600' : 'text-emerald-600'">{{ money(data.groups[group].tax_difference) }}</dd></dl>
        </article>
        <article class="panel p-5 lg:col-span-3">
          <h2 class="font-semibold">Checklist penutupan masa</h2>
          <div class="mt-4 grid gap-3 md:grid-cols-3"><div class="rounded-lg border p-3"><CheckCircle2 class="mb-2 h-5 w-5 text-emerald-600"/>Transaksi posted sudah ditarik otomatis</div><div class="rounded-lg border p-3"><FileCheck2 class="mb-2 h-5 w-5 text-blue-600"/>Data SPT tersimpan per revisi</div><div class="rounded-lg border p-3"><TriangleAlert class="mb-2 h-5 w-5 text-amber-600"/>{{ data.summary.exceptions }} selisih masih membutuhkan tindakan</div></div>
          <p v-if="scope !== 'all'" class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Review dan penguncian dilakukan dari pilihan Semua kelompok agar tidak ada kelompok pajak yang terlewat.</p>
          <div v-if="data.period.status !== 'locked' && scope === 'all'" class="mt-4 flex justify-end gap-2"><AppButton v-if="auth.hasPermission('tax-reconciliation.lock')" variant="secondary" :disabled="busy" @click="setStatus('reviewed')">Tandai sudah direview</AppButton><AppButton v-if="auth.hasPermission('tax-reconciliation.lock') && data.summary.total > 0 && data.summary.exceptions === 0" :icon="LockKeyhole" :disabled="busy" @click="setStatus('locked')">Kunci masa pajak</AppButton></div>
        </article>
      </section>

      <section v-else-if="tab === 'detail'" class="panel overflow-hidden">
        <div class="flex flex-wrap gap-3 border-b p-4"><input v-model="search" type="search" class="field max-w-sm" placeholder="Ketik nomor bukti/faktur, NPWP, atau nama…"/><select v-model="typeFilter" class="field w-56"><option value="all">Semua jenis</option><option v-for="(label,key) in typeLabels" :key="key" :value="key">{{ label }}</option></select><select v-model="statusFilter" class="field w-48"><option value="all">Semua status</option><option v-for="(label,key) in statusLabels" :key="key" :value="key">{{ label }}</option></select></div>
        <div class="overflow-x-auto"><table class="w-full min-w-[1550px] text-left text-sm"><thead><tr><th class="p-3">Status</th><th class="p-3">Jenis</th><th class="p-3">Bukti/Faktur Pajak</th><th class="p-3">Referensi Finora</th><th class="p-3">Lawan Transaksi</th><th class="p-3">NPWP/NIK</th><th class="p-3 text-right">DPP Finora</th><th class="p-3 text-right">DPP SPT</th><th class="p-3 text-right">Pajak Finora</th><th class="p-3 text-right">Pajak SPT</th><th class="p-3 text-right">Selisih</th><th class="p-3">Aksi</th></tr></thead><tbody><tr v-for="row in shownRows" :key="row.match_key" class="border-t"><td class="p-3"><span class="rounded-full px-2 py-1 text-xs font-semibold" :class="row.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">{{ statusLabels[row.status] }}</span><small v-if="row.match_method" class="mt-1 block text-slate-500">{{ row.match_method === 'document_number' ? 'Cocok via nomor dokumen' : 'Cocok via NPWP & nilai' }}</small></td><td class="p-3">{{ typeLabels[row.tax_type] }}</td><td class="p-3"><b>{{ row.document_number || 'Belum dilengkapi' }}</b><small class="block text-slate-500">{{ row.document_date }}</small></td><td class="p-3">{{ row.source_document_number || '—' }}</td><td class="p-3">{{ row.counterparty_name || '—' }}</td><td class="p-3">{{ row.counterparty_tax_number || '—' }}</td><td class="p-3 text-right">{{ money(row.system_dpp) }}</td><td class="p-3 text-right">{{ money(row.reported_dpp) }}</td><td class="p-3 text-right">{{ money(row.system_tax) }}</td><td class="p-3 text-right">{{ money(row.reported_tax) }}</td><td class="p-3 text-right font-semibold" :class="Math.abs(row.tax_difference) > 1 ? 'text-red-600' : 'text-emerald-600'">{{ money(row.tax_difference) }}</td><td class="p-3"><div class="flex gap-2"><AppButton v-if="row.source_key && data.period.status !== 'locked'" variant="secondary" @click="openLink(row)">Nomor pajak</AppButton><AppButton v-if="row.status !== 'matched' && data.period.status !== 'locked'" variant="secondary" @click="openResolution(row)">Tindak lanjut</AppButton></div></td></tr><tr v-if="!shownRows.length"><td colspan="12" class="p-8 text-center text-slate-500">Tidak ada dokumen pada filter ini.</td></tr></tbody></table></div>
      </section>

      <section v-else-if="tab === 'import-result'" class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div class="panel p-4"><span class="text-sm text-slate-500">File SPT/Coretax</span><b class="mt-1 block break-all">{{ data.period.source_file || 'Belum ada file diimpor' }}</b></div>
          <div class="panel p-4"><span class="text-sm text-slate-500">Revisi SPT</span><b class="mt-1 block text-xl">{{ data.period.revision }}</b><small class="text-slate-500">{{ data.period.imported_at ? new Date(data.period.imported_at).toLocaleString('id-ID') : '—' }}</small></div>
          <div class="panel p-4"><span class="text-sm text-slate-500">Dokumen terimpor</span><b class="mt-1 block text-2xl text-blue-700">{{ importedTotals.documents }}</b></div>
          <div class="panel p-4"><span class="text-sm text-slate-500">Total DPP · Pajak</span><b class="mt-1 block">{{ money(importedTotals.dpp) }}</b><small class="font-semibold text-slate-600">{{ money(importedTotals.tax) }}</small></div>
        </div>
        <div class="panel overflow-hidden">
          <div class="border-b p-4"><h2 class="font-semibold">Rincian file SPT yang terakhir diimpor</h2><p class="mt-1 text-sm text-slate-500">Data asli hasil impor. Status pencocokannya tersedia pada tab Daftar Selisih.</p></div>
          <div class="overflow-x-auto"><table class="w-full min-w-[1200px] text-left text-sm"><thead><tr><th class="p-3">Kelompok</th><th class="p-3">Jenis</th><th class="p-3">Nomor faktur/bukti potong</th><th class="p-3">Tanggal</th><th class="p-3">NPWP/NIK</th><th class="p-3">Nama</th><th class="p-3">Kode objek</th><th class="p-3 text-right">DPP</th><th class="p-3 text-right">Pajak</th><th class="p-3">Keterangan</th></tr></thead><tbody><tr v-for="row in data.imported_rows" :key="row.source_key" class="border-t"><td class="p-3">{{ groupLabels[row.tax_group].title }}</td><td class="p-3">{{ typeLabels[row.tax_type] }}</td><td class="p-3 font-semibold">{{ row.document_number }}</td><td class="p-3">{{ row.document_date }}</td><td class="p-3">{{ row.counterparty_tax_number || '—' }}</td><td class="p-3">{{ row.counterparty_name || '—' }}</td><td class="p-3">{{ row.tax_code || '—' }}</td><td class="p-3 text-right">{{ money(row.dpp) }}</td><td class="p-3 text-right font-semibold">{{ money(row.tax_amount) }}</td><td class="p-3 text-slate-500">{{ row.description || '—' }}</td></tr><tr v-if="!data.imported_rows.length"><td colspan="10" class="p-10 text-center text-slate-500">Belum ada data SPT/Coretax untuk masa dan kelompok ini.</td></tr></tbody></table></div>
        </div>
      </section>

      <section v-else-if="tab === 'equalization'" class="space-y-4"><article v-for="group in (['pph21','ppn','unification'] as const)" :key="group" v-show="scope === 'all' || scope === group" class="panel overflow-x-auto"><div class="border-b p-4"><h2 class="font-semibold">{{ groupLabels[group].title }}</h2><p class="text-sm text-slate-500">{{ groupLabels[group].document }} · {{ groupLabels[group].description }}</p></div><table class="w-full text-left text-sm"><thead><tr><th class="p-3">Pengujian</th><th class="p-3 text-right">Nilai Finora</th><th class="p-3 text-right">Nilai SPT</th><th class="p-3 text-right">Selisih</th><th class="p-3">Interpretasi</th></tr></thead><tbody><tr v-for="row in data.equalizations.filter((item) => item.group === group)" :key="row.key" class="border-t"><td class="p-3 font-medium">{{ row.label }}</td><td class="p-3 text-right">{{ money(row.book_amount) }}</td><td class="p-3 text-right">{{ money(row.tax_amount) }}</td><td class="p-3 text-right font-semibold" :class="Math.abs(row.difference) > 1 ? 'text-amber-600' : 'text-emerald-600'">{{ money(row.difference) }}</td><td class="p-3 text-slate-500">{{ Math.abs(row.difference) <= 1 ? 'Sesuai' : 'Periksa nomor bukti/faktur, beda masa, pembatalan, atau transaksi belum dilaporkan.' }}</td></tr></tbody></table></article></section>

      <section v-else-if="tab === 'accounts'" class="panel p-5"><h2 class="font-semibold">Mutasi akun kontrol pajak pada masa ini</h2><p class="mb-4 mt-1 text-sm text-slate-500">Saldo debit ditampilkan positif dan saldo kredit negatif.</p><table class="w-full text-left text-sm"><thead><tr><th class="p-3">Nomor akun</th><th class="p-3">Nama akun</th><th class="p-3 text-right">Mutasi bersih</th></tr></thead><tbody><tr v-for="account in data.tax_accounts" :key="account.code" class="border-t"><td class="p-3 font-mono">{{ account.code }}</td><td class="p-3">{{ account.name }}</td><td class="p-3 text-right font-semibold">{{ money(account.balance) }}</td></tr><tr v-if="!data.tax_accounts.length"><td colspan="3" class="p-8 text-center text-slate-500">Belum ada mutasi akun pajak.</td></tr></tbody></table></section>

      <section v-else class="grid gap-4 md:grid-cols-2"><article class="panel p-5"><h2 class="font-semibold">Cara kerja paling ringkas</h2><ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600"><li>Posting invoice, retur, dan jurnal. PPN serta PPh invoice akan ditarik otomatis.</li><li>Untuk PPh 21, impor rekap payroll/honorarium sebagai data internal.</li><li>Lengkapi nomor faktur atau bukti potong pada transaksi yang belum memilikinya.</li><li>Impor daftar faktur/bukti potong dari Coretax.</li><li>Kerjakan hanya baris yang masuk daftar selisih, lalu review dan kunci masa.</li></ol></article><article class="panel p-5"><h2 class="font-semibold">Aturan penjodohan</h2><p class="mt-3 text-sm text-slate-600">Prioritas pertama adalah nomor faktur pajak atau nomor bukti potong. Jika nomor belum tersedia, sistem mencoba NPWP/NIK, DPP, dan nilai pajak. Hasil cadangan ini tetap diberi penanda agar mudah direview.</p><p class="mt-3 text-sm text-slate-600">PPh 21 dipisahkan menjadi pegawai dan nonpegawai. PPh 23 serta PPh 4(2) berada dalam kelompok SPT PPh Unifikasi.</p></article></section>
    </div>

    <AppModal :open="importOpen" :title="importMode === 'spt' ? 'Impor faktur/bukti potong Coretax' : 'Impor data pembanding internal'" size="lg" :close-disabled="busy" @close="importOpen = false">
      <form id="tax-import" class="space-y-4" @submit.prevent="importReport"><p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{{ importMode === 'spt' ? `Impor mengganti snapshot SPT/Coretax masa ${period}. Transaksi Finora tidak diubah.` : `Gunakan untuk payroll atau honorarium PPh 21 yang belum tercatat sebagai invoice. Impor mengganti data internal masa ${period}.` }}</p><div class="grid gap-3 sm:grid-cols-2"><label v-if="importMode === 'spt'" class="form-label">Revisi SPT<input v-model.number="importRevision" type="number" min="0" class="field mt-1"/></label><label class="form-label">File CSV<input type="file" accept=".csv,text/csv" class="field mt-1" @change="readFile"/></label></div><label class="form-label">Catatan<textarea v-model="importNotes" class="field mt-1" placeholder="Sumber data dan catatan pemeriksaan"/></label><label class="form-label">Data CSV<textarea v-model="importText" class="field mt-1 min-h-52 font-mono text-xs" placeholder="Tempel isi CSV atau pilih file…" required/></label><button type="button" class="text-sm font-semibold text-blue-700" @click="downloadTemplate">Unduh template sesuai kelompok</button></form><template #footer><AppButton form="tax-import" type="submit" :loading="busy">Validasi dan impor</AppButton></template>
    </AppModal>
    <AppModal :open="!!resolving" title="Tindak lanjut selisih" :close-disabled="busy" @close="resolving = null"><form id="tax-resolution" class="space-y-4" @submit.prevent="saveResolution"><p><b>{{ resolving?.document_number }}</b> · {{ resolving?.counterparty_name }}</p><label class="form-label">Penyelesaian<select v-model="resolutionCode" class="field mt-1"><option v-for="(label,key) in resolutionLabels" v-show="key !== 'pending'" :key="key" :value="key">{{ label }}</option></select></label><label class="form-label">Penjelasan<textarea v-model="resolutionNote" class="field mt-1 min-h-28" placeholder="Tuliskan penyebab, tindakan, dan referensi bukti…" required/></label></form><template #footer><AppButton form="tax-resolution" type="submit" :loading="busy">Simpan penyelesaian</AppButton></template></AppModal>
    <AppModal :open="!!linking" title="Lengkapi faktur atau bukti potong" :close-disabled="busy" @close="linking = null"><form id="tax-link" class="space-y-4" @submit.prevent="saveLink"><p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Referensi Finora: <b>{{ linking?.source_document_number }}</b>. Nomor ini dipakai untuk penjodohan utama dengan Coretax.</p><label class="form-label">Nomor faktur/bukti potong<input v-model="linkNumber" class="field mt-1" required/></label><label class="form-label">Tanggal dokumen pajak<input v-model="linkDate" type="date" class="field mt-1"/></label><label class="form-label">Catatan<textarea v-model="linkNotes" class="field mt-1" placeholder="Opsional"/></label></form><template #footer><AppButton form="tax-link" type="submit" :loading="busy">Simpan nomor dokumen</AppButton></template></AppModal>
  </div>
</template>
