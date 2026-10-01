<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api/client'
import { accountService } from '@/services/account.service'
import { useAuthStore } from '@/stores/auth.store'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import { formatCurrency as money } from '@/utils/currency'
import { getApiErrorMessage } from '@/utils/error'
import { exportRows } from '@/utils/export'
const auth = useAuthStore(),
  route = useRoute(),
  today = new Date().toISOString().slice(0, 10),
  asOf = ref(today),
  search = ref(''),
  open = ref(false),
  busy = ref(false),
  error = ref(''),
  rows = ref<Record<string, any>[]>([]),
  accounts = ref<{ value: number; label: string }[]>([])
const form = reactive({
  request_key: '',
  code: '',
  name: '',
  date: today,
  in_service_date: today,
  cost: 0,
  salvage_value: 0,
  life_months: 48,
  asset_account_id: 0,
  accumulated_account_id: 0,
  expense_account_id: 0,
  counterpart_account_id: 0,
  already_recorded: false,
  location: '',
  serial_number: '',
  reference: '',
})
const dep = ref<Record<string, any> | null>(null),
  depDate = ref(today),
  depKey = ref('')
const isDepreciation = computed(() => route.path.endsWith('/depreciation')),
  sortKey = ref('asset_code'),
  sortDirection = ref<'asc' | 'desc'>('asc')
const shown = computed(() => {
  const filtered = rows.value.filter((r) =>
    `${r.asset_code} ${r.asset_name} ${r.location} ${r.serial_number}`
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  )
  return filtered.sort((a, b) => {
    const left = a[sortKey.value], right = b[sortKey.value]
    const result = typeof left === 'number' || !Number.isNaN(Number(left))
      ? Number(left) - Number(right) : String(left ?? '').localeCompare(String(right ?? ''), 'id')
    return sortDirection.value === 'asc' ? result : -result
  })
})
const totals = computed(() =>
  shown.value.reduce(
    (s, r) => ({
      cost: s.cost + Number(r.purchase_cost),
      depreciation: s.depreciation + Number(r.posted_depreciation),
      book: s.book + Number(r.book_value),
    }),
    { cost: 0, depreciation: 0, book: 0 },
  ),
)
const columns = computed(() => isDepreciation.value ? [
  ['asset_code', 'Kode Aset'], ['asset_name', 'Nama Aset'], ['latest_depreciation_date', 'Terakhir Disusutkan'],
  ['next_depreciation_date', 'Periode Berikutnya'], ['monthly_depreciation', 'Penyusutan / Bulan'],
  ['posted_depreciation', 'Akumulasi Tercatat'], ['unposted_depreciation', 'Belum Diposting'],
  ['book_value', 'Nilai Buku'], ['projected_book_value', 'Nilai Buku Seharusnya'], ['status', 'Status'],
] : [
  ['asset_code', 'Kode Aset'], ['asset_name', 'Nama Aset'], ['purchase_date', 'Tanggal Perolehan'],
  ['in_service_date', 'Mulai Digunakan'], ['location', 'Lokasi'], ['serial_number', 'Nomor Seri'],
  ['purchase_cost', 'Harga Perolehan'], ['salvage_value', 'Nilai Residu'], ['useful_life_months', 'Umur (Bulan)'],
  ['book_value', 'Nilai Buku'], ['status', 'Status'],
])
const moneyColumns = new Set(['purchase_cost','salvage_value','monthly_depreciation','posted_depreciation','unposted_depreciation','book_value','projected_book_value'])
const statusLabel: Record<string, string> = { active: 'Aktif', fully_depreciated: 'Disusutkan Penuh', disposed: 'Dilepas', inactive: 'Tidak Aktif', draft: 'Draft' }
function display(row: Record<string, any>, key: string) {
  if (moneyColumns.has(key)) return money(Number(row[key] ?? 0))
  if (key === 'status') return statusLabel[row[key]] ?? row[key]
  if (['purchase_date','in_service_date','latest_depreciation_date','next_depreciation_date'].includes(key))
    return row[key] ? String(row[key]).slice(0, 10) : '—'
  return row[key] || '—'
}
function sort(key: string) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDirection.value = 'asc' }
}
async function load() {
  error.value = ''
  try {
    rows.value = (
      await api.get('/operations/assets', { params: { as_of_date: asOf.value } })
    ).data.data
  } catch (e) {
    rows.value = []
    error.value = getApiErrorMessage(e, 'Aset gagal dimuat.')
  }
}
function show() {
  form.request_key = crypto.randomUUID()
  open.value = true
}
function showDep(row: Record<string, any>) {
  dep.value = row
  depKey.value = crypto.randomUUID()
  depDate.value = new Date(
    Date.UTC(Number(asOf.value.slice(0, 4)), Number(asOf.value.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10)
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/operations/assets', {
      ...form,
      counterpart_account_id: form.already_recorded ? undefined : form.counterpart_account_id,
    })
    open.value = false
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Aset gagal disimpan.')
  } finally {
    busy.value = false
  }
}
async function depreciate() {
  busy.value = true
  error.value = ''
  try {
    await api.post('/operations/depreciation', {
      request_key: depKey.value,
      asset_id: dep.value!.id,
      date: depDate.value,
    })
    dep.value = null
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Penyusutan gagal.')
  } finally {
    busy.value = false
  }
}
async function reverseDepreciation(row: Record<string, any>) {
  const reason = window.prompt('Alasan pembalikan penyusutan terakhir:')?.trim()
  if (!reason || !row.latest_depreciation_id) return
  busy.value = true
  try { await api.post(`/operations/depreciation/${row.latest_depreciation_id}/reverse`, { request_key: crypto.randomUUID(), date: today, reason }); await load() }
  catch (e) { error.value = getApiErrorMessage(e, 'Pembalikan penyusutan gagal.') } finally { busy.value = false }
}
async function reverseAsset(row: Record<string, any>) {
  const reason = window.prompt('Alasan pembalikan perolehan aset:')?.trim()
  if (!reason) return
  busy.value = true
  try { await api.post(`/operations/assets/${row.id}/reverse`, { request_key: crypto.randomUUID(), date: today, reason }); await load() }
  catch (e) { error.value = getApiErrorMessage(e, 'Pembalikan aset gagal.') } finally { busy.value = false }
}
onMounted(async () => {
  await load()
  try {
    accounts.value = (
      await accountService.all({ limit: 200, is_active: true, is_posting: true })
    ).data.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Akun gagal dimuat.')
  }
})
</script>
<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-6 flex justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ isDepreciation ? 'Penyusutan Aset' : 'Daftar Aset Tetap' }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ isDepreciation ? 'Hitung kewajiban penyusutan per periode, posting jurnal otomatis, dan pantau selisih yang belum dibukukan.' : 'Data induk aset, nilai perolehan, umur manfaat, lokasi, serta nilai buku pada tanggal pilihan.' }}
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton variant="secondary" @click="exportRows(isDepreciation ? 'penyusutan-aset' : 'aset-tetap', columns, shown)">
          Ekspor CSV
        </AppButton>
        <AppButton
          v-if="!isDepreciation &&
            auth.hasPermission('fixed-assets.create') && auth.hasPermission('fixed-assets.post')
          "
          @click="show"
        >
          Tambah aset
        </AppButton>
      </div>
    </header>
    <nav class="mb-5 flex gap-2 border-b" aria-label="Area aset tetap">
      <RouterLink to="/assets/fixed-assets" class="border-b-2 px-4 py-2 text-sm font-semibold" :class="!isDepreciation ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'">Informasi Aset Tetap</RouterLink>
      <RouterLink to="/assets/depreciation" class="border-b-2 px-4 py-2 text-sm font-semibold" :class="isDepreciation ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'">Penyusutan Aset</RouterLink>
    </nav>
    <div class="mb-4 flex gap-3">
      <input
        v-model="search"
        type="search"
        class="field max-w-md"
        placeholder="Ketik kode, nama, lokasi, nomor seri…"
      />
      <input v-model="asOf" type="date" class="field w-auto" />
      <AppButton @click="load">Terapkan</AppButton>
    </div>
    <p v-if="error && !open && !dep" class="mb-4 text-red-600">{{ error }}</p>
    <div class="mb-5 grid gap-3 sm:grid-cols-3">
      <div class="panel p-4">
        Harga Perolehan
        <b class="block text-xl">{{ money(totals.cost) }}</b>
      </div>
      <div class="panel p-4">
        Akumulasi Penyusutan Posted
        <b class="block text-xl">{{ money(totals.depreciation) }}</b>
      </div>
      <div class="panel p-4">
        Nilai Buku
        <b class="block text-xl text-blue-700">{{ money(totals.book) }}</b>
      </div>
    </div>
    <section class="panel overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr>
            <th v-for="c in columns" :key="c[0]" class="sticky top-0 cursor-pointer whitespace-nowrap bg-slate-50 p-3" @click="sort(c[0]!)">{{ c[1] }} <span v-if="sortKey === c[0]">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span></th>
            <th class="p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id" class="border-t">
            <td v-for="c in columns" :key="c[0]" class="p-3">
              {{ display(r, c[0]!) }}
            </td>
            <td class="p-3">
              <AppButton
                v-if="isDepreciation && r.status === 'active' && auth.hasPermission('depreciation.post')"
                variant="secondary"
                @click="showDep(r)"
              >
                Susutkan
              </AppButton>
              <AppButton v-if="isDepreciation && r.latest_depreciation_id && auth.hasPermission('depreciation.reverse')" class="ml-2" variant="secondary" :disabled="busy" @click="reverseDepreciation(r)">Balik penyusutan</AppButton>
              <AppButton v-if="!isDepreciation && Number(r.posted_depreciation) === 0 && ['active','fully_depreciated'].includes(r.status) && auth.hasPermission('fixed-assets.reverse')" variant="secondary" :disabled="busy" @click="reverseAsset(r)">Balik aset</AppButton>
            </td>
          </tr>
          <tr v-if="!shown.length">
            <td :colspan="columns.length + 1" class="p-8 text-center text-slate-500">
              Tidak ada aset pada filter ini.
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <p class="mt-3 text-xs text-slate-500">
      Proyeksi memakai satu bulan penuh sejak bulan mulai digunakan. Nilai buku berdasarkan jurnal
      posted; nilai pasar dan nilai kini ekonomis memerlukan penilaian terpisah.
    </p>
    <AppModal
      :open="open"
      title="Catat aset tetap"
      size="lg"
      :close-disabled="busy"
      @close="open = false"
    >
      <form id="asset-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
        <p v-if="error" class="text-red-600 sm:col-span-2">{{ error }}</p>
        <label>
          Kode
          <input v-model="form.code" class="field" maxlength="50" required />
        </label>
        <label>
          Nama
          <input v-model="form.name" class="field" minlength="2" maxlength="191" required />
        </label>
        <label>
          Tanggal perolehan
          <input v-model="form.date" type="date" class="field" required />
        </label>
        <label>
          Mulai digunakan
          <input v-model="form.in_service_date" type="date" class="field" required />
        </label>
        <label>
          Harga perolehan (IDR)
          <AppNumberInput v-model="form.cost" :min="0.01" :decimals="2" required />
        </label>
        <label>
          Nilai residu
          <AppNumberInput v-model="form.salvage_value" :min="0" :max="form.cost" :decimals="2" required />
        </label>
        <label>
          Umur manfaat (bulan)
          <input
            v-model.number="form.life_months"
            type="number"
            min="1"
            max="1200"
            step="1"
            class="field"
            required
          />
        </label>
        <label>
          Lokasi
          <input v-model="form.location" class="field" />
        </label>
        <label>
          Nomor seri
          <input v-model="form.serial_number" class="field" />
        </label>
        <label>
          Referensi invoice/jurnal
          <input v-model="form.reference" class="field" />
        </label>
        <AppSelect
          v-model="form.asset_account_id"
          label="Akun aset"
          :options="accounts"
          value-type="number"
          required
        />
        <AppSelect
          v-model="form.accumulated_account_id"
          label="Akumulasi penyusutan"
          :options="accounts"
          value-type="number"
          required
        />
        <AppSelect
          v-model="form.expense_account_id"
          label="Beban penyusutan"
          :options="accounts"
          value-type="number"
          required
        />
        <AppSelect
          v-if="!form.already_recorded"
          v-model="form.counterpart_account_id"
          label="Akun lawan perolehan"
          :options="accounts"
          value-type="number"
          required
        />
        <label class="flex gap-2 sm:col-span-2">
          <input v-model="form.already_recorded" type="checkbox" />
          Perolehan sudah dijurnal lewat invoice/jurnal lain (hanya daftarkan aset; tanpa jurnal
          perolehan baru)
        </label>
      </form>
      <template #footer>
        <AppButton form="asset-form" type="submit" :loading="busy">Simpan aset</AppButton>
      </template>
    </AppModal>
    <AppModal
      :open="!!dep"
      title="Posting penyusutan bulanan"
      :close-disabled="busy"
      @close="dep = null"
    >
      <form id="dep-form" class="space-y-4" @submit.prevent="depreciate">
        <p>{{ dep?.asset_code }} — {{ dep?.asset_name }}</p>
        <p class="text-sm text-slate-500">
          Posting berurutan per bulan mulai bulan digunakan. Sistem mencegah posting ganda dan
          membatasi penyusutan hingga nilai residu.
        </p>
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <label>
          Akhir bulan
          <input v-model="depDate" type="date" class="field" required />
        </label>
      </form>
      <template #footer>
        <AppButton form="dep-form" type="submit" :loading="busy">Posting penyusutan</AppButton>
      </template>
    </AppModal>
  </div>
</template>
