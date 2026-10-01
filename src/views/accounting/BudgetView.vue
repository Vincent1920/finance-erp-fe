<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/services/api/client'
import { accountService } from '@/services/account.service'
import { costCenterService } from '@/services/cost-center.service'
import { projectService } from '@/services/project.service'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppNumberInput from '@/components/common/AppNumberInput.vue'
import { useAuthStore } from '@/stores/auth.store'
import { getApiErrorMessage } from '@/utils/error'
import { formatCurrency as money } from '@/utils/currency'
import { exportRows } from '@/utils/export'
type Row = Record<string, any>
type PlanLine = {
  account_id: number
  cost_center_id: number | null
  project_id: number | null
  annual: number
  amounts: number[]
}
const auth = useAuthStore(),
  budgets = ref<Row[]>([]),
  selected = ref<number | null>(null),
  detail = ref<{ header: Row; rows: Row[]; unbudgeted: Row[] } | null>(null),
  asOf = ref(new Date().toISOString().slice(0, 10)),
  search = ref(''),
  scenario = ref(0),
  open = ref(false),
  busy = ref(false),
  error = ref(''),
  accounts = ref<{ value: number; label: string }[]>([]),
  centers = ref<{ value: number; label: string }[]>([]),
  projects = ref<{ value: number; label: string }[]>([])
const form = reactive({
  request_key: '',
  name: '',
  year: new Date().getFullYear(),
  notes: '',
  lines: [] as PlanLine[],
})
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const analysis = computed<Row[]>(() => {
  if (!detail.value) return []
  const year = Number(detail.value.header.fiscal_year),
    currentYear = Number(asOf.value.slice(0, 4)),
    month = currentYear < year ? 0 : currentYear > year ? 13 : Number(asOf.value.slice(5, 7)),
    day = Number(asOf.value.slice(8, 10)),
    days = new Date(year, month, 0).getDate()
  const grouped = new Map<string, Row>()
  for (const line of detail.value.rows) {
    const key = `${line.account_id}:${line.dimension_key}`
    if (!grouped.has(key))
      grouped.set(key, {
        key,
        code: line.account_code,
        name: line.account_name,
        dimension: [
          line.cost_center_name || 'Tanpa pusat biaya',
          line.project_name || 'Tanpa proyek',
        ].join(' / '),
        income: ['revenue', 'other_income'].includes(line.account_type),
        budget: 0,
        ytdBudget: 0,
        actual: 0,
        future: 0,
      })
    const r = grouped.get(key)!,
      amount = Number(line.amount),
      fraction = line.month < month ? 1 : line.month === month ? day / days : 0
    r.budget += amount
    r.ytdBudget += amount * fraction
    r.actual += Number(line.actual)
    r.future += amount * (1 - fraction)
  }
  return [...grouped.values()]
    .map((r): Row => {
      const forecast = r.actual + r.future * (1 + scenario.value / 100),
        variance = r.income ? forecast - r.budget : r.budget - forecast
      return {
        ...r,
        forecast,
        variance,
        remaining: r.budget - r.actual,
        utilization: r.budget ? (r.actual / r.budget) * 100 : null,
        status: variance < 0 ? 'Perlu perhatian' : 'Sesuai rencana',
      }
    })
    .filter((r) =>
      `${r.code} ${r.name} ${r.dimension}`.toLowerCase().includes(search.value.toLowerCase()),
    )
})
const kpis = computed(() =>
  analysis.value.reduce(
    (s, r) => ({
      budget: s.budget + (r.income ? 1 : -1) * r.budget,
      actual: s.actual + (r.income ? 1 : -1) * r.actual,
      forecast: s.forecast + (r.income ? 1 : -1) * r.forecast,
      alerts: s.alerts + (r.variance < 0 ? 1 : 0),
    }),
    { budget: 0, actual: 0, forecast: 0, alerts: 0 },
  ),
)
const columns = [
  ['code', 'Kode Akun'],
  ['name', 'Nama'],
  ['dimension', 'Dimensi'],
  ['budget', 'Anggaran Tahun'],
  ['ytdBudget', 'Anggaran s.d. Tanggal'],
  ['actual', 'Aktual'],
  ['remaining', 'Sisa'],
  ['forecast', 'Proyeksi Akhir Tahun'],
  ['variance', 'Selisih Menguntungkan'],
  ['status', 'Status'],
]
async function load() {
  error.value = ''
  try {
    budgets.value = (await api.get('/operations/budgets')).data.data
    if (!selected.value)
      selected.value =
        Number(budgets.value.find((b) => b.status === 'approved')?.id ?? budgets.value[0]?.id) ||
        null
    await loadDetail()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Anggaran gagal dimuat.')
  }
}
async function loadDetail() {
  if (!selected.value) {
    detail.value = null
    return
  }
  try {
    detail.value = (
      await api.get(`/operations/budgets/${selected.value}`, { params: { as_of_date: asOf.value } })
    ).data.data
  } catch (e) {
    detail.value = null
    error.value = getApiErrorMessage(e, 'Analisis gagal dimuat.')
  }
}
function add() {
  form.lines.push({
    account_id: 0,
    cost_center_id: null,
    project_id: null,
    annual: 0,
    amounts: Array(12).fill(0),
  })
}
function distribute(line: PlanLine) {
  const cents = Math.round(line.annual * 100),
    base = Math.floor(cents / 12)
  line.amounts = Array.from(
    { length: 12 },
    (_, i) => (base + (i < cents - base * 12 ? 1 : 0)) / 100,
  )
}
function show(copy = false) {
  form.request_key = crypto.randomUUID()
  form.name = copy ? `${detail.value?.header.name ?? ''} — revisi` : ''
  form.year = Number(detail.value?.header.fiscal_year ?? new Date().getFullYear())
  form.lines = []
  if (copy && detail.value) {
    const map = new Map<string, PlanLine>()
    for (const r of detail.value.rows) {
      const k = `${r.account_id}:${r.dimension_key}`
      if (!map.has(k))
        map.set(k, {
          account_id: r.account_id,
          cost_center_id: r.cost_center_id,
          project_id: r.project_id,
          annual: 0,
          amounts: Array(12).fill(0),
        })
      map.get(k)!.amounts[r.month - 1] = Number(r.amount)
    }
    form.lines = [...map.values()]
  } else add()
  open.value = true
}
async function save() {
  busy.value = true
  error.value = ''
  try {
    const result = (
      await api.post('/operations/budgets', {
        ...form,
        lines: form.lines.map(({ annual, ...l }) => l),
      })
    ).data.data
    selected.value = result.id
    open.value = false
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Anggaran gagal disimpan.')
  } finally {
    busy.value = false
  }
}
async function approve() {
  busy.value = true
  try {
    await api.post('/operations/budget-approve', {
      id: selected.value,
      request_key: crypto.randomUUID(),
    })
    await load()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Persetujuan gagal.')
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  await load()
  try {
    const [a, c, p] = await Promise.all([
      accountService.all({ limit: 200, is_active: true, is_posting: true }),
      costCenterService.all({ limit: 200, is_active: true }),
      projectService.all({ limit: 200 }),
    ])
    accounts.value = a.data
      .filter((r) =>
        ['revenue', 'other_income', 'expense', 'cogs', 'other_expense'].includes(r.account_type),
      )
      .map((r) => ({ value: r.id, label: `${r.code} — ${r.name}` }))
    centers.value = c.data.map((r) => ({ value: r.id, label: r.name }))
    projects.value = p.data.map((r) => ({ value: r.id, label: r.name }))
  } catch (e) {
    error.value = getApiErrorMessage(e, 'Pilihan gagal dimuat.')
  }
})
</script>
<template>
  <div>
    <AppBreadcrumb />
    <header class="mb-5 flex flex-wrap justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Anggaran &amp; Kendali Kinerja</h1>
        <p class="mt-1 text-sm text-slate-500">
          Rencana bulanan, versi anggaran, realisasi jurnal, dan simulasi akhir tahun.
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton
          variant="secondary"
          :disabled="!analysis.length"
          @click="exportRows('anggaran-vs-aktual', columns, analysis)"
        >
          Ekspor analisis
        </AppButton>
        <AppButton v-if="auth.hasPermission('budgets.create')" @click="show()">
          Buat anggaran
        </AppButton>
      </div>
    </header>
    <section class="panel mb-5 p-5">
      <div class="flex flex-wrap items-end gap-3">
        <AppSelect
          v-model="selected"
          label="Versi anggaran"
          :options="
            budgets.map((b) => ({
              value: b.id,
              label: `${b.fiscal_year} — ${b.name} · v${b.version_number} (${b.status})`,
            }))
          "
          value-type="number"
        />
        <label>
          Realisasi per
          <input v-model="asOf" type="date" class="field" />
        </label>
        <AppButton @click="loadDetail">Terapkan</AppButton>
        <AppButton
          v-if="detail && auth.hasPermission('budgets.create')"
          variant="secondary"
          @click="show(true)"
        >
          Salin ke revisi baru
        </AppButton>
        <AppButton
          v-if="detail?.header.status === 'draft' && auth.hasPermission('budgets.approve')"
          :loading="busy"
          @click="approve"
        >
          Setujui versi ini
        </AppButton>
      </div>
      <p v-if="detail" class="mt-3 text-sm text-slate-500">
        Versi {{ detail.header.version_number }} · {{ detail.header.status }} · Data aktual
        mengikuti pusat biaya dan proyek yang sama. Tanpa dimensi berarti transaksi yang belum
        diberi dimensi.
      </p>
      <p v-if="error && !open" class="mt-3 text-red-600">{{ error }}</p>
    </section>
    <div class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="panel p-4">
        Target laba setahun
        <b class="mt-2 block text-xl">{{ money(kpis.budget) }}</b>
      </div>
      <div class="panel p-4">
        Laba aktual s.d. tanggal
        <b class="mt-2 block text-xl">{{ money(kpis.actual) }}</b>
      </div>
      <div class="panel p-4">
        Proyeksi laba akhir tahun
        <b class="mt-2 block text-xl text-blue-700">{{ money(kpis.forecast) }}</b>
      </div>
      <div class="panel p-4">
        Akun perlu perhatian
        <b class="mt-2 block text-xl text-amber-700">{{ kpis.alerts }}</b>
      </div>
    </div>
    <section class="panel mb-5 p-5">
      <label class="font-semibold">
        Simulasi perubahan rencana sisa tahun: {{ scenario }}%
        <input
          v-model.number="scenario"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="mt-3 block w-full"
        />
      </label>
      <p class="mt-2 text-xs text-slate-500">
        Proyeksi = aktual + rencana sisa tahun setelah penyesuaian. Anggaran bulan berjalan
        diprorata per hari. Simulasi tidak mengubah anggaran tersimpan; angka mengikuti pencarian
        akun.
      </p>
    </section>
    <section class="panel p-5">
      <input
        v-model="search"
        type="search"
        class="field mb-4 max-w-lg"
        placeholder="Ketik kode, nama akun, pusat biaya, atau proyek…"
      />
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr>
              <th v-for="c in columns" :key="c[0]" class="p-3">{{ c[1] }}</th>
              <th class="p-3">Pemakaian</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in analysis" :key="r.key" class="border-t">
              <td
                v-for="c in columns"
                :key="c[0]"
                class="p-3"
                :class="c[0] === 'variance' && r.variance < 0 ? 'text-red-600' : ''"
              >
                {{ typeof r[c[0]!] === 'number' ? money(r[c[0]!]) : r[c[0]!] }}
              </td>
              <td class="min-w-32 p-3">
                <span>
                  {{ r.utilization === null ? 'Tanpa anggaran' : `${r.utilization.toFixed(1)}%` }}
                </span>
                <div class="mt-1 h-2 rounded bg-slate-100">
                  <div
                    class="h-2 rounded"
                    :class="r.utilization > 100 ? 'bg-red-500' : 'bg-blue-500'"
                    :style="{ width: `${Math.min(100, Math.max(0, r.utilization ?? 0))}%` }"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!analysis.length">
              <td colspan="11" class="p-8 text-center text-slate-500">
                Pilih atau buat anggaran untuk melihat analisis.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section v-if="detail?.unbudgeted.length" class="panel mt-5 border-amber-200 p-5">
      <h2 class="font-bold text-amber-700">Realisasi di luar anggaran</h2>
      <p class="text-sm text-slate-500">
        Tidak termasuk KPI di atas. Lengkapi akun/dimensi ini pada revisi anggaran agar seluruh
        aktivitas tercakup.
      </p>
      <p v-for="r in detail.unbudgeted" :key="r.code" class="mt-2 text-sm">
        {{ r.code }} — {{ r.name }}: {{ money(Number(r.actual)) }}
      </p>
    </section>
    <AppModal
      :open="open"
      title="Rencana anggaran bulanan"
      size="xl"
      :close-disabled="busy"
      @close="open = false"
    >
      <form id="budget-form" class="space-y-4" @submit.prevent="save">
        <p v-if="error" class="text-red-600">{{ error }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label>
            Nama
            <input v-model="form.name" class="field" minlength="3" required />
          </label>
          <label>
            Tahun
            <input
              v-model.number="form.year"
              type="number"
              min="1900"
              max="2200"
              class="field"
              required
            />
          </label>
        </div>
        <div v-for="(l, index) in form.lines" :key="index" class="space-y-3 rounded border p-3">
          <div class="grid gap-3 sm:grid-cols-3">
            <AppSelect
              v-model="l.account_id"
              label="Akun laba rugi"
              :options="accounts"
              value-type="number"
              required
            />
            <AppSelect
              v-model="l.cost_center_id"
              label="Pusat biaya"
              :options="centers"
              value-type="number"
              empty-label="Tanpa pusat biaya"
            />
            <AppSelect
              v-model="l.project_id"
              label="Proyek"
              :options="projects"
              value-type="number"
              empty-label="Tanpa proyek"
            />
          </div>
          <div class="flex items-end gap-2">
            <label>
              Isi rata setahun
              <AppNumberInput v-model="l.annual" :min="0" :decimals="2" />
            </label>
            <AppButton variant="secondary" @click="distribute(l)">Bagi 12 bulan</AppButton>
            <button type="button" class="text-red-600" @click="form.lines.splice(index, 1)">
              Hapus
            </button>
          </div>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <label v-for="(m, i) in months" :key="m" class="text-xs">
              {{ m }}
              <AppNumberInput v-model="l.amounts[i]" :min="0" :decimals="2" required />
            </label>
          </div>
        </div>
        <AppButton variant="secondary" @click="add">Tambah akun</AppButton>
        <label class="block">
          Asumsi / catatan
          <textarea v-model="form.notes" class="field" />
        </label>
      </form>
      <template #footer>
        <AppButton type="submit" form="budget-form" :disabled="!form.lines.length" :loading="busy">
          Simpan sebagai draft
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
